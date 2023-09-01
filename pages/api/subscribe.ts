import { NextApiRequest, NextApiResponse } from "next";
import { getPubKeyDBCache } from "../../common/pubkey";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const email = req.body.email;

    await prisma.subscribers.upsert({
      where: {
        email,
      },
      update: {},
      create: {
        email,
      },
    });

    res.status(200).json({ email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
