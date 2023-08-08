import { processAndSave as _processAndSave } from "./processAndSave";
import * as dotenv from "dotenv";

dotenv.config();

const headers = new Headers();
headers.set("Authorization", `Bearer ${process.env.COVALENT_API_KEY}`);

async function getTop1000Holders(tokenAddr: string): Promise<string[]> {
  const resp = await fetch(
    `https://api.covalenthq.com/v1/eth-mainnet/tokens/${tokenAddr}/token_holders_v2/?page-size=1000`,
    { method: "GET", headers: headers }
  );
  const json = await resp.json();
  console.log(json);
  return json.data.items.map((item: any) => item.address);
}

async function top1000Holder(name: string, tokenAddr: string) {
  const top1000Owners = await getTop1000Holders(tokenAddr);
  console.log(name + " got: ", top1000Owners.length);
  await _processAndSave(`erc20-top1000-${name}-latest`, top1000Owners);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // await top1000Holder("steth", "0xae7ab96520de3a18e5e111b5eaab095312d7fe84");
  // sleep(1000);
  // await top1000Holder("usdc", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  // await sleep(1000);
  // await top1000Holder("weth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  // await sleep(1000);
  await top1000Holder("usdt", "0xdac17f958d2ee523a2206206994597c13d831ec7");
}

main();
