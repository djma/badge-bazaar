import { PrismaClient } from "@prisma/client";
import JSONBig from "json-bigint";
import { Poseidon } from "@personaelabs/spartan-ecdsa";
import Tree from "./tree";

const prisma = new PrismaClient();

export async function processAndSave(name: string, addresses: string[]) {
  // log current milliseconds
  const start = Date.now();
  console.log(Date.now());

  addresses = addresses.map((a) => a.toLowerCase()).sort();

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

  await prisma.claimGroup.create({
    data: {
      name: name,
      rootHex: rootHex,
      addresses: JSON.stringify(addresses),
      addrPaths: JSON.stringify(addrPaths),
    },
  });
}
