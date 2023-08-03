import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/badge", async (req, res) => {
  const badges = req.query.id
    ? await prisma.badge.findUnique({
        where: {
          id: parseInt(req.query.id as string),
        },
      })
    : req.query.name
    ? await prisma.badge.findUnique({
        where: {
          name: req.query.name as string,
        },
      })
    : null;
  res.json(badges);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
