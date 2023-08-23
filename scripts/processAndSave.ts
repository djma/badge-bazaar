import { PrismaClient } from "@prisma/client";
import JSONBig from "json-bigint";
import { Poseidon } from "@personaelabs/spartan-ecdsa";
import Tree from "./tree";
import AWS from "aws-sdk";
import * as dotenv from "dotenv";
import { getRawPubKeyBuffer } from "../common/pubkey";

dotenv.config();

const prisma = new PrismaClient();

const wasabiConfig = {
  endpoint: "s3.wasabisys.com",
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
};

const s3 = new AWS.S3(wasabiConfig);
const bucketName = "badge-bazaar";

export async function processAndSave(name: string, addresses: string[]) {
  // log current milliseconds
  const start = Date.now();
  console.log(Date.now());
  addresses = [...new Set(addresses.filter((a) => a.length == 42))]
    .map((a) => a.toLowerCase())
    .sort();

  const poseidon = new Poseidon();
  await poseidon.initWasm();
  const treeDepth = 20;
  const tree = new Tree(
    treeDepth,
    poseidon,
    addresses.map((a) => BigInt(a))
  );

  const root = tree.root();
  const rootHex = root.toString(16);

  // const serializedTree = JSONBig.stringify(tree);
  // console.log("tree size: ", serializedTree.length);

  console.log(rootHex);

  // Manually constructed merkle proof object because browser slow,
  // so we precalculate all the proofs from the server and send them to the client
  const addrIndices = [];
  for (let i = 0; i < addresses.length; i++) {
    addrIndices.push(i);
  }
  // const addrPaths = [...Array(addresses.length).keys()].map((i) => {
  const addrPaths = addrIndices.map((i) => {
    const proof = tree.createProof(i);
    return proof.siblings.map((s) => s[0].toString(16));
  });
  console.log("allPaths size: ", JSONBig.stringify(addrPaths).length);

  // timer end
  const end = Date.now();
  console.log(`Time elapsed: ${end - start} ms`);

  const addressesBlob = JSON.stringify(addresses);
  const addrPathsBlob = JSON.stringify(addrPaths);

  const addressesUri = await upload(`${rootHex}_addresses.json`, addressesBlob);
  const addrPathsUri = await upload(`${rootHex}_addrPaths.json`, addrPathsBlob);

  // pubkey groups //

  console.log(addresses.map((a) => a.toLowerCase()).slice(0, 10));

  const addrPubkeys = await prisma.addressPublicKey.findMany({
    where: {
      address: {
        in: addresses.map((a) => a.toLowerCase()),
      },
    },
    select: {
      address: true,
      publicKey: true,
    },
  });

  console.log("addrPubkeys size: ", addrPubkeys.length);

  const addrPubkeysMap = new Map(
    addrPubkeys.map((ap) => [ap.address.toLowerCase(), ap.publicKey])
  );
  const pubkeys = addresses
    .map((a) => addrPubkeysMap.get(a.toLowerCase()))
    .filter((p) => p !== undefined);
  console.log("pubkeys size: ", pubkeys.length);
  const pubkeyTree = new Tree(
    treeDepth,
    poseidon,
    pubkeys.map((a) => poseidon.hashPubKey(getRawPubKeyBuffer(a)))
  );
  const pubkeyRoot = pubkeyTree.root();
  const pubkeyRootHex = pubkeyRoot.toString(16);
  const pubkeyIndices = [];
  for (let i = 0; i < pubkeys.length; i++) {
    pubkeyIndices.push(i);
  }
  const pubkeyPaths = pubkeyIndices.map((i) => {
    const proof = pubkeyTree.createProof(i);
    return proof.siblings.map((s) => s[0].toString(16));
  });

  const pubkeysBlob = JSON.stringify(pubkeys);
  const pubkeyPathsBlob = JSON.stringify(pubkeyPaths);

  const pubkeysUri = await upload(`${rootHex}_pubkeys.json`, pubkeysBlob);
  const pubkeyPathsUri = await upload(
    `${rootHex}_pubkeyPaths.json`,
    pubkeyPathsBlob
  );

  await prisma.claimGroup.upsert({
    where: { name: name },
    update: {
      rootHex: rootHex,
      size: addresses.length,
      addressesUri: addressesUri,
      addrPathsUri: addrPathsUri,

      pubKeysRootHex: pubkeyRootHex,
      pubKeysSize: pubkeys.length,
      pubKeysUri: pubkeysUri,
      pubKeysPathsUri: pubkeyPathsUri,
    },
    create: {
      name: name,
      rootHex: rootHex,
      size: addresses.length,
      addressesUri: addressesUri,
      addrPathsUri: addrPathsUri,

      pubKeysRootHex: pubkeyRootHex,
      pubKeysSize: pubkeys.length,
      pubKeysUri: pubkeysUri,
      pubKeysPathsUri: pubkeyPathsUri,
    },
  });
}

async function upload(key: string, body: string) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
  };
  await s3
    .upload(params, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data.Location.toString());
      }
    })
    .promise();

  const signedUrl = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60 * 24 * 7,
  });
  console.log("Success", signedUrl);

  return signedUrl;
}
