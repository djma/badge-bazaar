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

const addrMembershipConfig = {
  circuit: path.join(process.cwd(), "public", "addr_membership.circuit"),
  witnessGenWasm: path.join(process.cwd(), "public", "addr_membership.wasm"),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // console.log("req.body", req.body);
  const { message, proofHex, publicInputHex } = req.body;

  const publicInputBuffer = Buffer.from(publicInputHex as string, "hex");
  const publicInput = PublicInput.deserialize(publicInputBuffer);
  // console.log("publicInput", publicInput);
  const proof = Buffer.from(proofHex as string, "hex");

  const rootHex = publicInput.circuitPubInput.merkleRoot.toString(16);
  // console.log("rootHex", rootHex);

  const msgHash = hashMessage(message as string);
  // console.log("msgHashes", msgHash, publicInput.msgHash.toString("hex"));

  // Init verifier
  const verifier = new MembershipVerifier(addrMembershipConfig);
  await verifier.initWasm();
  const valid = await verifier.verify(proof, publicInputBuffer);
  console.log("valid", valid);

  // TODO check validity

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
