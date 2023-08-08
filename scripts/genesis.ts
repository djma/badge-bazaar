import * as dotenv from "dotenv";
import fs from "fs";
import { processAndSave as _processAndSave } from "./processAndSave";

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
  const addresses: string[] = [];
  const data = readFileSyncIntoString("genesis.txt");

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

  await _processAndSave("ethereumGenesis", addresses);
}

main();
