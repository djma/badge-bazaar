import { Poseidon } from "@personaelabs/spartan-ecdsa";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import fs from "fs";
import JSONBig from "json-bigint";
import Tree from "../src/tree";

const prisma = new PrismaClient();
dotenv.config();

function readFileSyncIntoString(filePath: string): string {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return fileContent;
  } catch (err) {
    throw new Error("Error reading the file: " + err);
  }
}

/**
 * genesis.txt is taken from https://raw.githubusercontent.com/NethermindEth/nethermind/7dd897aa4a9607721fdaf5d16bad9fd618b7cabe/src/Nethermind/Chains/foundation.json
 */
async function main() {
  // Read genesis.txt. First column is the address, second column is the amount.

  const poseidon = new Poseidon();
  await poseidon.initWasm();
  const treeDepth = 20;
  const addresses: string[] = [];

  const data = readFileSyncIntoString("genesis.txt");

  // log current milliseconds
  const start = Date.now();
  console.log(Date.now());

  data
    .split("\n")
    // .slice(0, 10)
    .forEach(async (line) => {
      const [address, _amount] = line.split(",");
      // console.log(address);

      addresses.push(address);
    });

  console.log("addresses: ", addresses.length);
  console.log("addresses string size: ", addresses.join("\n").length);

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
  const addrPaths = [...Array(addresses.length).keys()].map((i) => {
    const proof = tree.createProof(i);
    return proof.siblings.map((s) => s[0].toString(16));
  });
  console.log("allPaths size: ", JSONBig.stringify(addrPaths).length);

  // timer end
  const end = Date.now();
  console.log(`Time elapsed: ${end - start} ms`);

  await prisma.badge.create({
    data: {
      name: "ethereumGenesis",
      rootHex: rootHex,
      addresses: JSON.stringify(addresses),
      addrPaths: JSON.stringify(addrPaths),
    },
  });
}

main();
