import { PrismaClient } from "@prisma/client";
import {
  Alchemy,
  AssetTransfersCategory,
  Network,
  TransactionResponse,
} from "alchemy-sdk";
import * as dotenv from "dotenv";
import { ethers } from "ethers";
const prisma = new PrismaClient();

dotenv.config();
const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

async function getPubKeyDBCache(address: string) {
  const addrPubkey = await prisma.addressPublicKey.findUnique({
    where: {
      address: address,
    },
  });
  if (addrPubkey) {
    return addrPubkey.publicKey;
  }

  const pubkeyFromTxn = await getPubKeyFromTxn(address);

  if (pubkeyFromTxn) {
    await prisma.addressPublicKey.create({
      data: {
        address: address,
        publicKey: pubkeyFromTxn,
      },
    });
  }
  return pubkeyFromTxn;
}

async function getPubKeyFromTxn(address: string) {
  const res = await alchemy.core.getAssetTransfers({
    fromAddress: address,
    category: [
      AssetTransfersCategory.EXTERNAL,
      AssetTransfersCategory.INTERNAL,
      AssetTransfersCategory.ERC20,
      AssetTransfersCategory.ERC721,
      AssetTransfersCategory.ERC1155,
    ],
    maxCount: 1,
  });
  const transfers = res.transfers;
  if (transfers.length === 0) {
    console.log("No transfers found for address", address);
    return null;
  }
  const transfer = transfers[0];

  const txn = await alchemy.core.getTransaction(transfer.hash);

  const pubkey = ethers.SigningKey.recoverPublicKey(
    Buffer.from(getMsgHashFromTxn(txn).slice(2), "hex"),
    { r: txn.r, s: txn.s, v: txn.v }
  );

  const addressFromPubkey = ethers.computeAddress(pubkey);

  if (addressFromPubkey.toLowerCase() !== address.toLowerCase()) {
    console.error(
      "Address from pubkey does not match address from transfer",
      addressFromPubkey,
      address
    );
    return null;
  }

  return pubkey;
}

/**
 * Adapted from https://github.com/personaelabs/noun-nyms/blob/d28561a981887ffb49314c560e3ec365a6d4bd62/packages/merkle_tree/src/pubkey.ts#L15
 */
function getMsgHashFromTxn(tx: TransactionResponse) {
  let msgHash;
  if (tx.type === 0) {
    // Legacy and EIP-155 Transaction
    const txData = {
      chainId: tx.chainId,
      nonce: tx.nonce,
      gasPrice: tx.gasPrice?.toBigInt(),
      gasLimit: tx.gasLimit?.toBigInt(),
      to: tx.to,
      value: tx.value.toBigInt(),
      data: tx.data,

      // Need to pass these so Transaction.fromTxData can detect
      // the correct transaction type
      v: tx.v,
      r: tx.r,
      s: tx.s,
      type: tx.type,
    };

    msgHash = ethers.Transaction.from(txData).unsignedHash;
  } else if (tx.type === 1) {
    // EIP-2930 Transaction (access lists)
    const txData = {
      chainId: tx.chainId,
      nonce: tx.nonce,
      gasPrice: tx.gasPrice?.toBigInt(),
      gasLimit: tx.gasLimit?.toBigInt(),
      to: tx.to,
      value: tx.value.toBigInt(),
      accessList: tx.accessList,
      data: tx.data,
    };

    msgHash = ethers.Transaction.from(txData).unsignedHash;
  } else if (tx.type === 2) {
    // EIP-1559 Transaction
    const txData = {
      chainId: tx.chainId,
      nonce: tx.nonce,
      maxFeePerGas: tx.maxFeePerGas?.toBigInt(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toBigInt(),
      gasLimit: tx.gasLimit?.toBigInt(),
      to: tx.to,
      value: tx.value.toBigInt(),
      accessList: tx.accessList,
      data: tx.data,
    };

    msgHash = ethers.Transaction.from(txData).unsignedHash;
  } else {
    console.error("Unknown tx type", tx.type);
    return null;
  }
  return msgHash;
}

async function cachePubKeys() {
  const groups = await prisma.claimGroup.findMany({
    where: {
      OR: [
        { name: "erc20-whale1M-latest" },
        { name: "ethereumGenesis" },
        { name: "all-tester" },
      ],
    },
  });

  for (const group of groups) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    for (const addr of addrs) {
      const pubkey = await getPubKeyDBCache(addr);
      console.log(addr, pubkey);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

cachePubKeys();
