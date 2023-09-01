// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Data = {
  id: number;
  name: string;
  rootHex: string;
}[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const claimGroups = await prisma.claimGroup.findMany({
    where: {
      OR: [
        {
          name: {
            in: [
              "ethereumGenesis",
              "alliance-hot-wallet",
              "whale10M",
              "whale1M",
              "debank-top10k",
            ],
          },
        },
        {
          name: {
            startsWith: "nft-",
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      rootHex: true,
    },
  });

  res.status(200).json(claimGroups);
}
