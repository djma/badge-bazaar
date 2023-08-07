import express from "express";
import { Badge, PrismaClient } from "@prisma/client";
import path from "path";
import { usePassportPopupSetup } from "@pcd/passport-interface";

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

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

app.get("/badge", async (req, res) => {
  const badge: Badge | null = req.query.id
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
  res.json(badge);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
