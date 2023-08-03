import { Poseidon, Tree } from "@personaelabs/spartan-ecdsa";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import fs from "fs";
import JSONBig from "json-bigint";

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
  const tree = new Tree(treeDepth, poseidon);
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

      tree.insert(BigInt(address));
      addresses.push(address);
    });

  // timer end
  const end = Date.now();
  console.log(`Time elapsed: ${end - start} ms`);

  const root = tree.root();
  const rootHex = root.toString(16);

  const serializedTree = JSONBig.stringify(tree);
  // console.log(serializedTree);

  console.log(rootHex);

  console.log(addresses.join("\n"));

  await prisma.badge.create({
    data: {
      name: "ethereumGenesis",
      addresses: addresses.join("\n"),
      addrMerkle: tree.root().toString(16),
    },
  });
}

main();
