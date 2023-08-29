import { PrismaClient } from "@prisma/client";
import { processAndSave } from "./processAndSave";
import { fetchWasabiJsonNode } from "../common/uploadBlob";

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
    const addrs: string[] = await fetchWasabiJsonNode(group.addressesUri);
    all10MHolders = all10MHolders.concat(addrs);
  }
  for (const group of all1M) {
    const addrs: string[] = await fetchWasabiJsonNode(group.addressesUri);
    all1MHolders = all1MHolders.concat(addrs);
  }

  console.log("all10M: ", all10MHolders.length);
  console.log("all1M: ", all1MHolders.length);

  await processAndSave(`whale10M`, all10MHolders);
  await processAndSave(`whale1M`, all1MHolders);
}

mergeWhales();
