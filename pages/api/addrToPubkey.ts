import { NextApiRequest, NextApiResponse } from "next";
import { getPubKeyDBCache } from "../../common/pubkey";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const result = await getPubKeyDBCache(req.query.addr as string);
    res.status(200).json({ pubkey: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
