// https://api.debank.com/user/rank_list?start=0&limit=50

import https from "https";
import fs from "fs";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

const BASE_URL = "https://api.debank.com/user/rank_list?start=";
const LIMIT = 50;
const WAIT_TIME = 10000;

async function downloadAndSave(start: number) {
  const url = `${BASE_URL}${start}&limit=${LIMIT}`;

  https
    .get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", async () => {
        if (res.statusCode === 200) {
          const fileName = `rank_from_${start}_to_${start + LIMIT - 1}.json`;
          const filePath = `./rank_list/${fileName}`;

          try {
            await writeFile(filePath, data, "utf8");
            console.log(`Data saved to ${filePath}, length = ${data.length}`);
          } catch (err) {
            console.error(`Error writing to ${filePath}:`, err);
          }

          // Schedule next download
          setTimeout(() => {
            downloadAndSave(start + LIMIT);
          }, WAIT_TIME);
        } else {
          console.error(
            `Error fetching data for start = ${start}. Status Code: ${res.statusCode}`
          );
        }
      });
    })
    .on("error", (err) => {
      console.error(`Error making request to ${url}:`, err);
    });
}

// Entry point
(async function main() {
  if (!fs.existsSync("./rank_list")) {
    await mkdir("./rank_list");
  }

  downloadAndSave(9100);
})();
