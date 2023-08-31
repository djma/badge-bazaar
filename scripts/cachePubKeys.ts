import { PrismaClient } from "@prisma/client";
import { getPubKeyDBCache, getRawPubKeyBuffer } from "../common/pubkey";
import Tree from "./tree";
import upload, {
  fetchWasabiJson,
  fetchWasabiJsonNode,
} from "../common/uploadBlob";
import { Poseidon } from "@personaelabs/spartan-ecdsa";

const prisma = new PrismaClient();

async function cachePubKeys() {
  const groups = await prisma.claimGroup.findMany({
    where: {
      OR: [
        { name: "debank-whale10M-20230829" },
        // { name: "whale1M-20230825" },
        // { name: "ethereumGenesis" },
        // { name: "nft-milady-20230823" },
        // {
        //   name: {
        //     startsWith: "nft-",
        //   },
        // },
      ],
    },
  });

  const poseidon = new Poseidon();
  await poseidon.initWasm();
  const treeDepth = 20;

  for (const group of groups) {
    const addresses: string[] = await fetchWasabiJsonNode(group.addressesUri);
    for (const addr of addresses) {
      // if (addr < "0x87e") continue;

      const pubkey = await getPubKeyDBCache(addr);
      console.log(addr, pubkey);
    }

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
      .filter((p) => p !== undefined && p !== null);
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

    const pubkeysUri = await upload(
      `${group.rootHex}_pubkeys.json`,
      pubkeysBlob
    );
    const pubkeyPathsUri = await upload(
      `${group.rootHex}_pubkeyPaths.json`,
      pubkeyPathsBlob
    );

    await prisma.claimGroup.update({
      where: { name: group.name },
      data: {
        rootHex: group.rootHex,
        size: addresses.length,
        addressesUri: group.addressesUri,
        addrPathsUri: group.addrPathsUri,

        pubKeysRootHex: pubkeyRootHex,
        pubKeysSize: pubkeys.length,
        pubKeysUri: pubkeysUri,
        pubKeysPathsUri: pubkeyPathsUri,
      },
    });
  }
}

cachePubKeys();
