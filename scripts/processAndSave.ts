import { PrismaClient } from "@prisma/client";
import JSONBig from "json-bigint";
import { Poseidon } from "@personaelabs/spartan-ecdsa";
import Tree from "./tree";
import AWS from "aws-sdk";
import * as dotenv from "dotenv";

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

  addresses = [...new Set(addresses)].map((a) => a.toLowerCase()).sort();

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

  const serializedTree = JSONBig.stringify(tree);
  console.log("tree size: ", serializedTree.length);

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

  const addressesParams = {
    Bucket: bucketName,
    Key: `${rootHex}_addresses.json`,
    Body: addressesBlob,
  };

  const addrPathsParams = {
    Bucket: bucketName,
    Key: `${rootHex}_addrPaths.json`,
    Body: addrPathsBlob,
  };

  let addressesUri = "";
  let addrPathsUri = "";

  // Use Promise.all to wait for both uploads to complete
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      s3.upload(addressesParams, function (err, data) {
        if (err) {
          console.log("Error", err);
          reject(err);
        } else {
          addressesUri = data.Location.toString();
          console.log("Success", addressesUri);
          resolve();
        }
      });
    }),
    new Promise<void>((resolve, reject) => {
      s3.upload(addrPathsParams, function (err, data) {
        if (err) {
          console.log("Error", err);
          reject(err);
        } else {
          addrPathsUri = data.Location.toString();
          console.log("Success", addrPathsUri);
          resolve();
        }
      });
    }),
  ]);

  addressesUri = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: `${rootHex}_addresses.json`,
    Expires: 60 * 60 * 24 * 7,
  });
  console.log("Success", addressesUri);

  addrPathsUri = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: `${rootHex}_addrPaths.json`,
    Expires: 60 * 60 * 24 * 7,
  });
  console.log("Success", addrPathsUri);

  await prisma.claimGroup.upsert({
    where: { name: name },
    update: {
      rootHex: rootHex,
      size: addresses.length,
      addressesUri: addressesUri,
      addrPathsUri: addrPathsUri,
    },
    create: {
      name: name,
      rootHex: rootHex,
      size: addresses.length,
      addressesUri: addressesUri,
      addrPathsUri: addrPathsUri,
    },
  });
}
