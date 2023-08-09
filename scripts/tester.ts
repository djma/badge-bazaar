import * as dotenv from "dotenv";
import { processAndSave as _processAndSave } from "./processAndSave";

dotenv.config();

async function main() {
  const addresses: string[] = ["0xc83baFa2263591Cf05B1Abba0e704AcE0373d9F6"];

  console.log("addresses: ", addresses.length);
  console.log("addresses string size: ", addresses.join("\n").length);

  await _processAndSave("all-tester", addresses);
}

main();
