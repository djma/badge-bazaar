import { Alchemy, Network } from "alchemy-sdk";
import { processAndSave as _processAndSave } from "./processAndSave";
import * as dotenv from "dotenv";

dotenv.config();
const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

async function main() {
  await nftHolders("bayc", "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d");
  await nftHolders("mayc", "0x60e4d786628fea6478f785a6d7e704777c86a7c6");
  await nftHolders("azuki", "0xed5af388653567af2f388e6224dc7c4b3241c544");
  await nftHolders("pudgy", "0xbd3531da5cf5857e7cfaa92426877b022e612cf8");
  await nftHolders("milady", "0x5af0d9827e0c53e4799bb226655a1de152a425a5");
}

async function nftHolders(name: string, nftContractAddr: string) {
  const owners = await alchemy.nft.getOwnersForContract(nftContractAddr);
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  await _processAndSave(`nft-${name}-${yyyymmdd}`, owners.owners);
}

main();
