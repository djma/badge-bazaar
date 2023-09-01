import fs from "fs";
import { promisify } from "util";
import { processAndSave } from "./processAndSave";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const RANK_LIST_DIR = "./rank_list";

interface RankResponse {
  _cache_seconds: number;
  _seconds: number;
  _use_cache: boolean;
  data: {
    rank_list: {
      id: string; // 0x...
      desc: {
        id: string; // 0x...
        born_at: number;
        tags: {
          id: string; // nft_top10_holder
          name: string;
        }[];
        usd_value: number;
      };
    }[];
  };
  error_code: number;
}

const allRanked = [];
const whale10m = [];
const whale1m = [];

async function processData(data: any): Promise<void> {
  const { rank_list } = data.data;

  for (const rank of rank_list) {
    const { id, desc } = rank;

    if (desc.usd_value >= 10000000) {
      whale10m.push(id);
    }

    if (desc.usd_value >= 1000000) {
      whale1m.push(id);
    }

    allRanked.push(id);
  }
}

async function processFiles() {
  try {
    // List all files in the directory
    const files = await readdir(RANK_LIST_DIR);

    // Iterate over each file
    for (const file of files) {
      console.log(`Processing ${file}`);
      // Check if it's a JSON file
      if (file.endsWith(".json")) {
        const filePath = `${RANK_LIST_DIR}/${file}`;
        const content = await readFile(filePath, "utf8");

        // Parse the content and process it
        const jsonData = JSON.parse(content);
        await processData(jsonData);
      }
    }
    console.log(`whale10m: ${whale10m.length}`);
    console.log(`whale1m: ${whale1m.length}`);
    console.log(`allRanked: ${allRanked.length}`);

    // await processAndSave(`debank-whale10M-20230825`, whale10m);
    // await processAndSave(`debank-whale1M-20230825`, whale1m);
    await processAndSave(`debank-top10k`, allRanked);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Entry point
processFiles();
