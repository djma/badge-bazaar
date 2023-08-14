import express from "express";
import { ClaimGroup, PrismaClient } from "@prisma/client";
import path from "path";
import { usePassportPopupSetup } from "@pcd/passport-interface";

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3010;

// app.get("/", (req, res) => {
//   res.send("Hello, world!");
// });

console.log(__dirname);

// app.use(express.static(path.join(__dirname, "..", "..", "www")));

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "..", "..", "www", "index.html"));
// });

// Determine whether we're in development mode
const isDevMode = process.env.NODE_ENV !== "prod";

// Serve the static files from the appropriate directory
app.use(
  "/dist",
  express.static(
    path.resolve(__dirname, isDevMode ? "../www/dist" : "../../www/dist")
  )
);
app.use(
  "/public",
  express.static(
    path.resolve(__dirname, isDevMode ? "../www/public" : "../../www/public")
  )
);

app.get("/", (req, res) => {
  res.sendFile(
    path.resolve(
      __dirname,
      isDevMode ? "../www/index.html" : "../../www/index.html"
    )
  );
});

app.get("/popup", (req, res) => {
  res.sendFile(
    path.resolve(
      __dirname,
      isDevMode ? "../www/popup.html" : "../../www/popup.html"
    )
  );
});

app.get("/claimGroup", async (req, res) => {
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
  res.json(badge);
});

app.get("/claimGroups", async (_req, res) => {
  const claimGroups = await prisma.claimGroup.findMany({
    select: {
      id: true,
      name: true,
      rootHex: true,
    },
  });
  res.json(claimGroups);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
