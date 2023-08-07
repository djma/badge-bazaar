import {
  openSemaphoreSignaturePopup,
  usePassportPopupMessages,
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { MerkleProof, Poseidon } from "@personaelabs/spartan-ecdsa";
import * as React from "react";
import { createRoot } from "react-dom/client";
import Tree from "../tree";
import { Badge } from "@prisma/client";

const IS_PROD = process.env.NODE_ENV === "prod";
// const PASSPORT_URL = IS_PROD ? "https://zupass.org/" : "http://localhost:3000/";
const PASSPORT_URL = "https://zupass.org/";

function App() {
  return (
    <div>
      <h1>Welcome to Badge Bazaar</h1>
      <p>This is Badge Bazaar</p>
      <p>You can do anything at Badge Bazaar</p>
      <p>Anything is possible at Badge Bazaar</p>
      <p>Welcome</p>
      <p>The only limit is yourself</p>
      <p>Welcome to Badge Bazaar</p>

      <h2>1. Connect Ethereum Wallet</h2>
      <ConnectWalletButton />
      <h2>2. Connect PCD Pass</h2>
      <ConnectPCDPassButton />
      <h2>3. Browse Badge Bazaar</h2>
      <ol>
        <li>
          Ethereum Genesis Badge:
          <ul>
            <li>
              <a href="/badge?name=ethereumGenesis">Data</a>
            </li>
            <li>
              <GetBadgeButton />
            </li>
          </ul>
        </li>
        <li>
          NFT Badge (Azuki):
          <ul>
            <li>Data</li>
            <li>
              <GetBadgeButton disabled={true} />
            </li>
          </ul>
        </li>
      </ol>
    </div>
  );
}

function ConnectWalletButton() {
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);

  React.useEffect(() => {
    const { ethereum } = window as any;
    if (!ethereum) {
      console.log("No ethereum");
      return;
    }

    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length === 0) {
        console.log("No accounts");
        return;
      }

      setWalletAddress(accounts[0]);
    });
  }, []);

  if (walletAddress) {
    return <p>Wallet address: {walletAddress}</p>;
  }

  return (
    <button
      onClick={() => {
        const { ethereum } = window as any;
        ethereum
          .request({ method: "eth_requestAccounts" })
          .then((accounts: string[]) => {
            setWalletAddress(accounts[0]);
          });
      }}
    >
      Connect Wallet
    </button>
  );
}

function ConnectPCDPassButton() {
  const [identity, setIdentity] = React.useState<SemaphoreSignaturePCD | null>(
    null
  );
  const [pcdStr] = usePassportPopupMessages();
  const [isListening, setIsListening] = React.useState(false);

  React.useEffect(() => {
    if (!pcdStr) return;
    if (!isListening) return;
    setIsListening(false);

    const parsed = JSON.parse(pcdStr) as SerializedPCD;
    if (parsed.type !== SemaphoreSignaturePCDPackage.name) return;
    (async function () {
      const pcd = await SemaphoreSignaturePCDPackage.deserialize(parsed.pcd);
      console.log("Got Zuzalu PCD", pcd);
      setIdentity(pcd);
    })();
  }, [isListening, pcdStr]);

  if (identity) {
    return <p>PCDPass ID: {identity?.id}</p>;
  } else {
    return (
      <button
        onClick={() => {
          setIsListening(true);
          openSemaphoreSignaturePopup(
            PASSPORT_URL,
            window.location.origin + "/popup",
            "message to be signed",
            false
          );
        }}
        // disabled={loggingIn}
      >
        Connect PCD Pass
      </button>
    );
  }
}

interface GetBadgeButtonProps {
  disabled?: boolean;
}

function GetBadgeButton({ disabled = false }: GetBadgeButtonProps) {
  const [pcdStr] = usePassportPopupMessages();
  const [isListening, setIsListening] = React.useState(false);

  React.useEffect(() => {
    if (!isListening) return;
    setIsListening(false);
  }, [isListening]);

  return (
    <button
      disabled={disabled}
      onClick={async () => {
        const preBadge: Badge = await (
          await fetch("/badge?name=ethereumGenesis")
        ).json();

        console.log("preBadge", preBadge);
        console.log("size", preBadge.addresses.split("\n").length);

        const poseidon = new Poseidon();
        await poseidon.initWasm();
        const treeDepth = 20; // Provided circuits have tree depth = 20

        const startMs = Date.now();
        // const addrTree = new Tree(
        //   treeDepth,
        //   poseidon,
        //   preBadge.addresses.split("\n").map((addr) => BigInt(addr))
        // );
        const addrs: string[] = JSON.parse(preBadge.addresses);
        const addrPaths: string[][] = JSON.parse(preBadge.addrPaths);
        const index = addrs.findIndex(
          (addr) => addr === "0x0032403587947b9f15622a68d104d54d33dbd1cd"
        );

        // Manually constructed merkle proof object because browser slow,
        // so we precalculate all the proofs from the server and send them to the client
        const proof: MerkleProof = {
          root: BigInt("0x" + preBadge.rootHex),
          siblings: addrPaths[index].map((siblingHex) => [
            BigInt("0x" + siblingHex),
          ]),
          pathIndices: index
            .toString(2)
            .padStart(treeDepth, "0")
            .split("")
            .map((bit) => (bit === "1" ? 1 : 0))
            .reverse(), // little endian
        };
        console.log("Merkle proof", proof);
        const endMs = Date.now();
        console.log("Merkle proof time", endMs - startMs, "ms");

        alert("Getting badge");
      }}
    >
      Get badges
    </button>
  );
}

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<App />);
