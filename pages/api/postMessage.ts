// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ClaimGroup, Message, PrismaClient } from "@prisma/client";
import {
  MembershipVerifier,
  PublicInput,
  defaultAddressMembershipVConfig,
} from "@personaelabs/spartan-ecdsa";
import { hashMessage } from "ethers";

const prisma = new PrismaClient();

type Data = Message | null;

const addrMembershipConfig = {
  circuit: "public/addr_membership.circuit",
  witnessGenWasm: "public/addr_membership.wasm",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log("req.body", req.body);
  const { message, proofHex, publicInputHex } = req.body;

  const publicInputBuffer = Buffer.from(publicInputHex as string, "hex");
  const publicInput = PublicInput.deserialize(publicInputBuffer);
  console.log("publicInput", publicInput);
  const proof = Buffer.from(proofHex as string, "hex");

  const rootHex = publicInput.circuitPubInput.merkleRoot.toString(16);
  console.log("rootHex", rootHex);

  const msgHash = hashMessage(message as string);
  console.log("msgHashes", msgHash, publicInput.msgHash.toString("hex"));

  // Init verifier
  const verifier = new MembershipVerifier(addrMembershipConfig);
  await verifier.initWasm();
  const valid = await verifier.verify(proof, publicInputBuffer);
  console.log("valid", valid);

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

  await prisma.messageClaim.create({
    data: {
      messageId: newMessage.id,
      claimId: claim!.id,
      proof: proofHex as string,
    },
  });

  res.status(200).json(newMessage);
}
