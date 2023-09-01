// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ClaimType, Message, PrismaClient } from "@prisma/client";
import { MembershipVerifier, PublicInput } from "@personaelabs/spartan-ecdsa";
import { hashMessage } from "ethers";
import AWS from "aws-sdk";
import * as dotenv from "dotenv";
import path from "path";
import upload from "@/common/uploadBlob";
import { tweet } from "@/common/tweet";

dotenv.config();

const wasabiConfig = {
  endpoint: "s3.wasabisys.com",
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
};

const s3 = new AWS.S3(wasabiConfig);
const bucketName = "badge-bazaar";

const prisma = new PrismaClient();

type Data = Message | null;
type Error = any;

const addrMembershipConfig = {
  circuit: path.join(process.cwd(), "public", "addr_membership.circuit"),
  witnessGenWasm: path.join(process.cwd(), "public", "addr_membership.wasm"),
};
const pubkeyMembershipConfig = {
  circuit: path.join(process.cwd(), "public", "pubkey_membership.circuit"),
  witnessGenWasm: path.join(process.cwd(), "public", "pubkey_membership.wasm"),
};

export interface PostMessageRequest {
  message: string;
  proofHex: string;
  publicInputHex: string;
  addrOrPubKey: ClaimType;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | Error>
) {
  const {
    message,
    proofHex,
    publicInputHex,
    addrOrPubKey,
  }: PostMessageRequest = req.body;

  const publicInputBuffer = Buffer.from(publicInputHex as string, "hex");
  const publicInput = PublicInput.deserialize(publicInputBuffer);
  const proof = Buffer.from(proofHex as string, "hex");

  const rootHex = publicInput.circuitPubInput.merkleRoot.toString(16);

  const msgHash = hashMessage(message as string);

  if (msgHash.slice(2) !== publicInput.msgHash.toString("hex")) {
    res.status(400).json({ error: "Message does not match signature" });
    return;
  }

  // Init verifier
  const verifier = new MembershipVerifier(
    addrOrPubKey === "PUBKEY" ? pubkeyMembershipConfig : addrMembershipConfig
  );
  await verifier.initWasm();
  const valid = await verifier.verify(proof, publicInputBuffer);
  console.log("valid", valid);

  if (!valid) {
    res.status(400).json({ error: "Invalid proof" });
    return;
  }

  const newMessage = await prisma.message.create({
    data: {
      message: message as string,
      eip712: msgHash,
    },
  });

  const claim =
    addrOrPubKey === "PUBKEY"
      ? await prisma.claimGroup.findFirst({
          where: {
            pubKeysRootHex: rootHex,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : await prisma.claimGroup.findFirst({
          where: {
            rootHex,
          },
          select: {
            id: true,
            name: true,
          },
        });

  // Upload proof to wasabi
  const proofKey = `proofHex_${newMessage.id}_${claim.id}.txt`;
  const proofUri = await upload(proofKey, proofHex);

  // Upload publicInput to wasabi
  const publicInputKey = `publicInputHex_${newMessage.id}_${claim.id}.txt`;
  const publicInputUri = await upload(publicInputKey, publicInputHex);

  await prisma.messageClaim.create({
    data: {
      messageId: newMessage.id,
      claimId: claim!.id,
      proofUri: proofUri,
      publicInputUri: publicInputUri,
      claimType: addrOrPubKey,
    },
  });

  try {
    const msg = message.includes(":") ? message.split(":")[1] : message;
    const tweetMsg = `(${claim.name}): ${msg}`;
    await tweet(tweetMsg);
  } catch (e) {
    console.log(e);
  }

  res.status(200).json(newMessage);
}
