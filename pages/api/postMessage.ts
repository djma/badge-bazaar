// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Message, PrismaClient } from "@prisma/client";
import { MembershipVerifier, PublicInput } from "@personaelabs/spartan-ecdsa";
import { hashMessage } from "ethers";
import AWS from "aws-sdk";
import * as dotenv from "dotenv";
import path from "path";

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | Error>
) {
  const { message, proofHex, publicInputHex } = req.body;

  const publicInputBuffer = Buffer.from(publicInputHex as string, "hex");
  const publicInput = PublicInput.deserialize(publicInputBuffer);
  const proof = Buffer.from(proofHex as string, "hex");

  const rootHex = publicInput.circuitPubInput.merkleRoot.toString(16);

  const msgHash = hashMessage(message as string);

  // Init verifier
  const verifier = new MembershipVerifier(addrMembershipConfig);
  await verifier.initWasm();
  const valid = await verifier.verify(proof, publicInputBuffer);
  console.log("valid", valid);

  // TODO check validity
  if (!valid) {
    res.status(400).json({ error: "Invalid proof" });
    return;
  }
  if (msgHash.slice(2) !== publicInput.msgHash.toString("hex")) {
    res.status(400).json({ error: "Message does not match signature" });
    return;
  }

  const newMessage = await prisma.message.create({
    data: {
      message: message as string,
      eip712: msgHash,
    },
  });

  const claim = await prisma.claimGroup.findFirst({
    where: {
      rootHex,
    },
    select: {
      id: true,
    },
  });

  // Upload proof to wasabi
  const proofUploadParams = {
    Bucket: bucketName,
    Key: `proofHex_${newMessage.id}_${claim.id}.txt`,
    Body: proofHex,
  };
  await s3
    .upload(proofUploadParams, (err, data) => {
      if (err) {
        console.log("error", err);
      }
      console.log("data", data);
    })
    .promise();
  const proofUri = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: `proofHex_${newMessage.id}_${claim.id}.txt`,
    Expires: 60 * 60 * 24 * 7,
  });

  await prisma.messageClaim.create({
    data: {
      messageId: newMessage.id,
      claimId: claim!.id,
      proofUri: proofUri,
    },
  });

  res.status(200).json(newMessage);
}
