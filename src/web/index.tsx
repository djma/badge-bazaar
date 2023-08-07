import {
  constructPassportPcdProveAndAddRequestUrl,
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
import { SigningKey, computeAddress, ethers, hashMessage, id } from "ethers";
import { EthereumGroupPCDPackage } from "@pcd/ethereum-group-pcd";

const IS_PROD = process.env.NODE_ENV === "prod";
// const PASSPORT_URL = IS_PROD ? "https://zupass.org/" : "http://localhost:3000/";
const PASSPORT_URL = "https://zupass.org/";
const { ethereum } = window as any;

function App() {
  const [pcdPassId, setpcdPassId] =
    React.useState<SemaphoreSignaturePCD | null>(null);
  const [ethSignature, setEthSignature] = React.useState<string | null>(null);

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
      <ConnectPCDPassButton
        onConnect={(pcd, ethSig) => {
          setpcdPassId(pcd);
          setEthSignature(ethSig);
        }}
      />
      <h2>3. Browse Badge Bazaar</h2>
      <ol>
        <li>
          Ethereum Genesis Badge:
          <ul>
            <li>
              <a href="/badge?name=ethereumGenesis">Data</a>
            </li>
            <li>
              <GetBadgeButton
                pcdPassId={pcdPassId}
                ethSignature={ethSignature}
              />
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

function ConnectPCDPassButton({
  onConnect,
}: {
  onConnect?: (pcd: SemaphoreSignaturePCD, ethSignature: string) => void;
}) {
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
    SemaphoreSignaturePCDPackage.deserialize(parsed.pcd).then((pcd) => {
      console.log("Got Zuzalu PCD", pcd);
      setIdentity(pcd);

      // Sign the identity commitment
      const provider = new ethers.BrowserProvider(ethereum);
      provider
        .getSigner()
        .then((signer) => {
          return signer.signMessage(pcd!.id!);
        })
        .then((signature) => {
          onConnect?.(pcd!, signature);
        });
    });
  }, [isListening, pcdStr]);

  if (identity) {
    return <p>PCDPass ID: {identity?.id}</p>;
  } else {
    let walletAddress;
    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      walletAddress = accounts[0];
    });

    return (
      <button
        onClick={() => {
          setIsListening(true);
          openSemaphoreSignaturePopup(
            PASSPORT_URL,
            window.location.origin + "/popup",
            walletAddress,
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
  pcdPassId?: SemaphoreSignaturePCD | null;
  ethSignature?: string | null;
  disabled?: boolean;
}

function GetBadgeButton({ pcdPassId, ethSignature }: GetBadgeButtonProps) {
  const [pcdStr] = usePassportPopupMessages();
  const [isListening, setIsListening] = React.useState(false);

  React.useEffect(() => {
    if (!isListening) return;
    setIsListening(false);
  }, [isListening]);

  const disabled = !pcdPassId || !ethSignature;

  if (disabled) {
    return <button disabled={true}>Get badges</button>;
  }

  return (
    <button
      onClick={async () => {
        const preBadge: Badge = await (
          await fetch("/badge?name=ethereumGenesis")
        ).json();

        console.log("preBadge", preBadge);
        console.log("size", preBadge.addresses.split("\n").length);

        const userAddr = computeAddress(
          SigningKey.recoverPublicKey(hashMessage(pcdPassId.id), ethSignature!)
        ).toLowerCase();

        console.log("userAddr", userAddr);

        const poseidon = new Poseidon();
        await poseidon.initWasm();
        const treeDepth = 20; // Provided circuits have tree depth = 20

        const startMs = Date.now();
        const addrs: string[] = JSON.parse(preBadge.addresses);
        const addrPaths: string[][] = JSON.parse(preBadge.addrPaths);
        const index = addrs.findIndex((addr) => addr === userAddr);

        if (index === -1) {
          alert("You can't get this badge");
          return;
        }

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

        const popupUrl = window.location.origin + "/popup";
        // const proofUrl = constructPassportPcdProveAndAddRequestUrl<
        //   typeof EthereumGroupPCDPackage
        // >(ZUPASS_URL, popupUrl, EthereumGroupPCDPackage.name, {
        //   identity: {
        //     argumentType: ArgumentTypeName.PCD,
        //     pcdType: SemaphoreIdentityPCDPackage.name,
        //     value: undefined,
        //     userProvided: true,
        //     description:
        //       "The Semaphore Identity which you are signing the message.",
        //   },
        //   groupType: {
        //     argumentType: ArgumentTypeName.String,
        //     value: GroupType.PUBLICKEY,
        //   },
        //   signatureOfIdentityCommitment: {
        //     argumentType: ArgumentTypeName.String,
        //     value: signatureOfIdentityCommitment,
        //   },
        //   merkleProof: {
        //     argumentType: ArgumentTypeName.String,
        //     value: JSONBig({ useNativeBigInt: true }).stringify(
        //       merkleProof
        //     ),
        //   },
        // });

        // sendPassportRequest(proofUrl);

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
