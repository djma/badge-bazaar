import {
  openSemaphoreSignaturePopup,
  usePassportPopupMessages,
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import * as React from "react";
import { createRoot } from "react-dom/client";

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
          Ethereum Genesis Badge: <button>prove</button>
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

  React.useEffect(() => {
    if (!pcdStr) return;
    const parsed = JSON.parse(pcdStr) as SerializedPCD;
    if (parsed.type !== SemaphoreSignaturePCDPackage.name) return;
    (async function () {
      const pcd = await SemaphoreSignaturePCDPackage.deserialize(parsed.pcd);
      console.log("Got Zuzalu PCD", pcd);
      setIdentity(pcd);
    })();
  }, [pcdStr]);

  if (identity) {
    return <p>PCDPass ID: {identity?.id}</p>;
  } else {
    return (
      <button
        onClick={() => {
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

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<App />);
