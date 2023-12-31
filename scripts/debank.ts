import fs from "fs";
import { promisify } from "util";
import { processAndSave } from "./processAndSave";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const DEBANK_DIR = "./debank";

interface User {
  id: string;
  usd_value: number;
  web3_id: string | null;
  follower_count: number;
  tvf: number;
}

const whale10m = [];
const whale1m = [];

/**
 * Data comes from https://github.com/DeBankDeFi/web3-data/tree/main/valuable-users
 */
async function processData(data: User[]): Promise<void> {
  for (const rank of data) {
    const { id, usd_value } = rank;

    if (usd_value >= 100000000) {
      console.log("whale100m: ", id);
    }

    if (usd_value >= 10000000) {
      whale10m.push(id);
    }

    if (usd_value >= 1000000) {
      whale1m.push(id);
    }
  }
}

async function processFiles() {
  try {
    // List all files in the directory
    const files = await readdir(DEBANK_DIR);

    // Iterate over each file
    for (const file of files) {
      console.log(`Processing ${file}`);
      // Check if it's a JSON file
      if (file.endsWith(".json")) {
        const filePath = `${DEBANK_DIR}/${file}`;
        const content = await readFile(filePath, "utf8");

        // Parse the content and process it
        const jsonData = JSON.parse(content);
        await processData(jsonData);
      }
    }
    console.log(`whale10m: ${whale10m.length}`);
    console.log(`whale1m: ${whale1m.length}`);

    // await processAndSave(`whale10M`, whale10m);
    await processAndSave(`whale1M`, whale1m);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Entry point
processFiles();
