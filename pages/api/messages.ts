// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const messageClaims = await prisma.message.findMany({
    orderBy: {
      createdAt: "desc",
    },
    // limit 10

    include: {
      MessageClaim: {
        select: {
          id: true,
          claim: {
            select: {
              name: true,
              rootHex: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json(messageClaims);
}
