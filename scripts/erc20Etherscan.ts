import { BigNumber } from "alchemy-sdk";
import { processAndSave as _processAndSave } from "./processAndSave";
import * as dotenv from "dotenv";
import JSONBig from "json-bigint";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

dotenv.config();

const headers = new Headers();
headers.set("Authorization", `Bearer ${process.env.COVALENT_API_KEY}`);

interface Holder {
  address: string;
  quantity: BigInt;
}

async function getHolders(
  tokenAddr: string,
  page: number,
  batchSize: number
): Promise<Holder[]> {
  const url = new URL("https://api.etherscan.io/api");
  url.searchParams.set("module", "token");
  url.searchParams.set("action", "tokenholderlist");
  url.searchParams.set("contractaddress", tokenAddr);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("offset", batchSize.toString());
  url.searchParams.set("apikey", process.env.ETHERSCAN_API_KEY);
  const resp = await fetch(url.toString());
  const json = await resp.json();
  // console.log(json);
  return json.result.map((item: any) => {
    return {
      address: item.TokenHolderAddress,
      quantity: BigInt(item.TokenHolderQuantity),
    };
  });
}

async function mapAllHolders(
  tokenAddr: string,
  sleepMs = 0,
  f: (holdersBatch: Holder[]) => any
) {
  const batchSize = 10000;
  let page = 1;
  while (true) {
    const pageHolders = await getHolders(tokenAddr, page, batchSize);
    console.log(
      `Got page ${page} with ${
        pageHolders.length
      } holders; first row: ${JSONBig.stringify(pageHolders[0])}`
    );
    await f(pageHolders);
    page++;

    if (pageHolders.length < batchSize) {
      break;
    }

    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }
}

async function getAllHolders(
  tokenAddr: string,
  sleepMs = 0
): Promise<Holder[]> {
  let holders: Holder[] = [];
  await mapAllHolders(tokenAddr, sleepMs, (holdersBatch) => {
    holders = holders.concat(holdersBatch);
  });
  return holders;
}

async function top1000Holder(name: string, tokenAddr: string) {
  const allHolders = await getAllHolders(tokenAddr, 1000);
  const top1000Owners = allHolders
    .sort((a, b) => {
      // reverse sort by quantity
      if (a.quantity > b.quantity) {
        return -1;
      } else if (a.quantity < b.quantity) {
        return 1;
      } else {
        return 0;
      }
    })
    .slice(0, 1000);

  console.log(name + " got: ", top1000Owners.length);
  await _processAndSave(
    `erc20-top1000-${name}-latest`,
    top1000Owners.map((e) => e.address)
  );
}

async function whaleHolder(name: string, tokenAddr: string) {
  const tokenInfo = await getTokenInfo(tokenAddr);
  console.log(tokenInfo);
  console.log(parseFloat(tokenInfo.tokenPriceUSD));
  const whale10MThreshold = 10_000_000 / parseFloat(tokenInfo.tokenPriceUSD);
  const whale1MThreshold = 1_000_000 / parseFloat(tokenInfo.tokenPriceUSD);

  console.log(
    `Whale (10M) threshold for ${name} is ${whale10MThreshold} ${tokenInfo.symbol}`
  );

  const whale10MHolders = [];
  const whale1MHolders = [];
  await mapAllHolders(tokenAddr, 1000, (holdersBatch) => {
    for (const holder of holdersBatch) {
      if (holder.address === "0xe831c8903de820137c13681e78a5780afddf7697") {
        console.log(holder.quantity);
        console.log(
          BigNumber.from(10).pow(parseInt(tokenInfo.divisor)).toString()
        );
        console.log(
          BigNumber.from(holder.quantity)
            .div(BigNumber.from(10).pow(parseInt(tokenInfo.divisor)))
            .toString()
        );
      }
      if (
        BigNumber.from(holder.quantity)
          .div(BigNumber.from(10).pow(parseInt(tokenInfo.divisor)))
          .gte(whale10MThreshold.toFixed(0)) // TODO: fix loss of precision
      ) {
        whale10MHolders.push(holder);
      }

      if (
        BigNumber.from(holder.quantity)
          .div(BigNumber.from(10).pow(parseInt(tokenInfo.divisor)))
          .gte(whale1MThreshold.toFixed(0)) // TODO: fix loss of precision
      ) {
        whale1MHolders.push(holder);
      }
    }
  });

  console.log(name + " got: ", whale10MHolders.length + " whale10M");
  console.log(name + " got: ", whale1MHolders.length + " whale1M");
  await _processAndSave(
    `erc20-whale10M-${name}-latest`,
    whale10MHolders.map((e) => e.address)
  );
  await _processAndSave(
    `erc20-whale1M-${name}-latest`,
    whale1MHolders.map((e) => e.address)
  );
}

async function whaleCombined() {
  let all10MHolders: string[] = [];
  let all1MHolders: string[] = [];

  const all10M = await prisma.claimGroup.findMany({
    where: {
      name: {
        startsWith: "erc20-whale10M-",
        endsWith: "-latest",
      },
    },
  });
  const all1M = await prisma.claimGroup.findMany({
    where: {
      name: {
        startsWith: "erc20-whale1M-",
        endsWith: "-latest",
      },
    },
  });

  for (const group of all10M) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    all10MHolders = all10MHolders.concat(addrs);
  }
  for (const group of all1M) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    all1MHolders = all1MHolders.concat(addrs);
  }

  console.log("all10M: ", all10MHolders.length);
  console.log("all1M: ", all1MHolders.length);

  await _processAndSave(`erc20-whale10M-latest`, all10MHolders);
  await _processAndSave(`erc20-whale1M-latest`, all1MHolders);
}

interface TokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenType: string;
  totalSupply: string;
  tokenPriceUSD: string;
}

async function getTokenInfo(tokenAddr: string): Promise<TokenInfo> {
  const url = new URL("https://api.etherscan.io/api");
  url.searchParams.set("module", "token");
  url.searchParams.set("action", "tokeninfo");
  url.searchParams.set("contractaddress", tokenAddr);
  url.searchParams.set("apikey", process.env.ETHERSCAN_API_KEY);
  const resp = await fetch(url.toString());
  const json = await resp.json();
  return json.result[0];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // await whaleHolder("wsteth", "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0");
  // await sleep(1000);
  // await whaleHolder("dai", "0x6b175474e89094c44da98b954eedeac495271d0f");
  // await sleep(1000);
  // await whaleHolder("steth", "0xae7ab96520de3a18e5e111b5eaab095312d7fe84");
  // await sleep(1000);
  // await whaleHolder("usdc", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  // await sleep(1000);
  // await whaleHolder("weth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  // await sleep(1000);
  // await whaleHolder("usdt", "0xdac17f958d2ee523a2206206994597c13d831ec7");
  // await sleep(1000);

  await whaleCombined();

  // await top1000Holder("wsteth", "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0");
  // await sleep(1000);
  // await top1000Holder("steth", "0xae7ab96520de3a18e5e111b5eaab095312d7fe84");
  // await sleep(1000);
  // await top1000Holder("usdc", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  // await sleep(1000);
  // await top1000Holder("weth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
  // await sleep(1000);
  // await top1000Holder("usdt", "0xdac17f958d2ee523a2206206994597c13d831ec7");
}

main();
