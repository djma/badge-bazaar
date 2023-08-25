import { Prisma, PrismaClient } from "@prisma/client";
import { processAndSave } from "./processAndSave";

const prisma = new PrismaClient();

async function mergeWhales() {
  let all10MHolders: string[] = [];
  let all1MHolders: string[] = [];

  const all10M = await prisma.claimGroup.findMany({
    where: {
      name: {
        startsWith: "%-whale10M-%",
      },
    },
  });
  const all1M = await prisma.claimGroup.findMany({
    where: {
      name: {
        startsWith: "%-whale1M-%",
      },
    },
  });

  for (const group of all10M) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    all10MHolders = all10MHolders.concat(addrs);
  }
  for (const group of all1M) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    all1MHolders = all1MHolders.concat(addrs);
  }

  console.log("all10M: ", all10MHolders.length);
  console.log("all1M: ", all1MHolders.length);

  const date = new Date().toISOString().split("T")[0];

  await processAndSave(`whale10M-${date}`, all10MHolders);
  await processAndSave(`whale1M-${date}`, all1MHolders);
}

mergeWhales();
