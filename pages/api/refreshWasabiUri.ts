import { refreshSignedUrl } from "../../common/uploadBlob";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const newUrl = await refreshSignedUrl(req.query.url as string);
    res.status(200).json({ newUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}
