// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { ClaimGroup, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Data = ClaimGroup | null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const badge: ClaimGroup | null = req.query.id
    ? await prisma.claimGroup.findUnique({
        where: {
          id: parseInt(req.query.id as string),
        },
      })
    : req.query.name
    ? await prisma.claimGroup.findUnique({
        where: {
          name: req.query.name as string,
        },
      })
    : null;
  res.status(200).json(badge);
}
