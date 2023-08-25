import { PrismaClient } from "@prisma/client";
import { getPubKeyDBCache } from "../common/pubkey";

const prisma = new PrismaClient();

async function cachePubKeys() {
  const groups = await prisma.claimGroup.findMany({
    where: {
      OR: [
        // { name: "erc20-whale1M-latest" },
        // { name: "ethereumGenesis" },
        // { name: "all-tester" },
        // { name: "nft-milady-20230823" },
        // { name: "nft-pudgy-20230823" },
        // { name: "nft-azuki-20230823" },
        // { name: "nft-nouns-20230823" },
      ],
    },
  });

  for (const group of groups) {
    const addrs: string[] = await fetch(group.addressesUri).then((res) =>
      res.json()
    );
    for (const addr of addrs) {
      const pubkey = await getPubKeyDBCache(addr);
      console.log(addr, pubkey);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

cachePubKeys();
