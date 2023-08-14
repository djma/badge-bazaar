import {
  constructPassportPcdAddRequestUrl,
  constructPassportPcdProveAndAddRequestUrl,
  getWithoutProvingUrl,
  openPassportPopup,
  openSemaphoreSignaturePopup,
  usePassportPopupMessages,
} from "@pcd/passport-interface";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import {
  MembershipProver,
  MerkleProof,
  ProverConfig,
  defaultAddressMembershipPConfig,
} from "@personaelabs/spartan-ecdsa";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { ClaimGroup } from "@prisma/client";
import { SigningKey, computeAddress, ethers, hashMessage, id } from "ethers";
import {
  EthereumGroupPCD,
  EthereumGroupPCDPackage,
  GroupType,
} from "@pcd/ethereum-group-pcd";
import {
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName,
} from "@pcd/semaphore-identity-pcd";
import JSONBig from "json-bigint";

const IS_PROD = process.env.NODE_ENV === "prod";
// const PASSPORT_URL = IS_PROD ? "https://pcdpass.xyz/" : "http://localhost:3000/";
const PASSPORT_URL = "https://pcdpass.xyz/";
const { ethereum } = window as any;

// TODO: update these to point to pcd pass' static server
const addrMembershipConfig = {
  circuit: "../www/public/addr_membership.circuit",
  witnessGenWasm: "../www/public/addr_membership.wasm",
};
const pubkeyMembershipConfig: ProverConfig = {
  circuit:
    "https://storage.googleapis.com/personae-proving-keys/membership/pubkey_membership.circuit",
  witnessGenWasm:
    "https://storage.googleapis.com/personae-proving-keys/membership/pubkey_membership.wasm",
};
const prover = new MembershipProver(defaultAddressMembershipPConfig);
(async () => {
  await prover.initWasm();
})();

function App() {
  const [currentTab, setCurrentTab] = React.useState("welcome");

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentTab(window.location.hash.slice(1));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (!ethereum) {
    return (
      <div>
        <p>Please install a browser wallet</p>
      </div>
    );
  }

  return (
    <div>
      <Tabs />
    </div>
  );
}

function Tabs() {
  const [currentTab, setCurrentTab] = React.useState(
    window.location.hash.slice(1) ?? "welcome"
  );

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentTab(window.location.hash.slice(1));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  let content: any;
  if (currentTab === "pcd-ui") {
    content = <PcdUI />;
  } else if (currentTab === "message-board") {
    content = <MessageBoard />;
  } else {
    content = <Welcome />;
  }

  return (
    <div>
      <a href="#welcome">Welcome</a>
      <Pipe />
      <a href="#message-board">Message Board</a>
      <Pipe />
      <a href="#pcd-ui">PCD UI</a>
      {content}
    </div>
  );
}

function Pipe() {
  return <span>&nbsp; | &nbsp;</span>;
}

function MessageBoard() {
  const [message, setMessage] = React.useState("");
  const [signature, setSignature] = React.useState<string | null>(null);
  const [selectedClaims, setSelectedClaims] = React.useState<ClaimGroup[]>([]);
  const [claimGroups, setClaimGroups] = React.useState<ClaimGroup[]>([]);

  React.useEffect(() => {
    fetch("/claimGroups")
      .then((res) => res.json())
      .then((data) => setClaimGroups(data));
  }, []);

  React.useEffect(() => {
    setSignature(null);
  }, [message]);

  const handleSign = () => {
    if (!ethereum) {
      console.log("No ethereum");
      return;
    }

    ethereum
      .request({
        method: "personal_sign",
        params: [message, ethereum.selectedAddress],
      })
      .then((result: string) => {
        setSignature(result);
      });
  };

  const handlePost = async () => {
    console.log("Signature:", signature);
    console.log("Selected claims:", selectedClaims);

    const claimGroup: ClaimGroup = await (
      await fetch(`/claimGroup?name=${selectedClaims[0].name}`)
    ).json();
    const merklePath = getMerklePath(ethereum.selectedAddress, claimGroup);
    if (!merklePath) {
      alert("You don't have this badge " + selectedClaims[0].name);
      return;
    }

    const msgHash = hashMessage(message);
    const msgHashBuffer = Buffer.from(msgHash.slice(2), "hex");
    const groupProof = await prover.prove(
      signature!,
      msgHashBuffer,
      merklePath
    );

    console.log("groupProof", groupProof);
  };

  return (
    <div>
      <h2>1. Connect Ethereum Wallet</h2>
      <ConnectWalletButton />
      <h2>2. Post Message</h2>
      <label htmlFor="message">Message:</label>
      <br />
      <textarea
        id="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        cols={50}
      />
      <br />
      <button onClick={handleSign}>Sign</button>
      <br />
      {signature && <p>Signature: {signature}</p>}
      <br />
      <label htmlFor="claims">Claims:</label>
      <br />
      <select
        id="claims"
        multiple
        size={5}
        onChange={(e) => {
          const selectedClaimIds = Array.from(
            e.target.selectedOptions,
            (option) => parseInt(option.value)
          );
          const selectedClaims = claimGroups.filter((claimGroup) =>
            selectedClaimIds.includes(claimGroup.id)
          );
          setSelectedClaims(selectedClaims);
        }}
      >
        {claimGroups.map((claimGroup) => (
          <option key={claimGroup.id} value={claimGroup.id}>
            {claimGroup.name}
          </option>
        ))}
      </select>
      <br />
      <button
        disabled={signature === null || selectedClaims.length === 0}
        onClick={handlePost}
      >
        Post
      </button>
    </div>
  );
}

function Welcome() {
  return (
    <div>
      <h1>Welcome to Badge Bazaar</h1>
      <img src="../public/bazaar.png" />
      <p>This is Badge Bazaar</p>
      <p>You can do anything at Badge Bazaar</p>
      <p>Anything is possible at Badge Bazaar</p>
      <p>Welcome</p>
      <p>The only limit is yourself</p>
      <p>Welcome to Badge Bazaar</p>
    </div>
  );
}

function PcdUI() {
  const [pcdPassId, setpcdPassId] =
    React.useState<SemaphoreSignaturePCD | null>(null);
  const [ethSignature, setEthSignature] = React.useState<string | null>(null);

  return (
    <div>
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
        <BadgeListItem
          badgeName={"all-tester"}
          title={"Owner of the tester address Badge"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"ethereumGenesis"}
          title={"Ethereum Genesis Badge"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"nft-bayc-20230808"}
          title={"NFT Badge (BAYC)"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"nft-mayc-20230808"}
          title={"NFT Badge (MAYC)"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"nft-azuki-20230808"}
          title={"NFT Badge (Azuki)"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"nft-pudgy-20230808"}
          title={"NFT Badge (Pudgy Penguins)"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"nft-milady-20230808"}
          title={"NFT Badge (Milady)"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
        <BadgeListItem
          badgeName={"erc20-top1000-steth-latest"}
          title={"Top 1000 stETH holder badge"}
          pcdPassId={pcdPassId}
          ethSignature={ethSignature}
        />
      </ol>
      <h2>4. Use badges</h2>
      <AddBadgesForAction />
    </div>
  );
}

function AddBadgesForAction() {
  const [pcds, setPcds] = React.useState<EthereumGroupPCD[]>([]);
  const [pcdStr] = usePassportPopupMessages();
  const [isListening, setIsListening] = React.useState(false);

  React.useEffect(() => {
    if (!pcdStr) return;
    if (!isListening) return;
    setIsListening(false);

    const parsed = JSON.parse(pcdStr) as SerializedPCD;
    if (parsed.type !== EthereumGroupPCDPackage.name) return;
    EthereumGroupPCDPackage.deserialize(parsed.pcd).then((pcd) => {
      console.log("Got Ethereum Group PCD", pcd);
      setPcds((prev) => [...prev, pcd]);
    });
  }, [isListening, pcdStr]);

  return (
    <div>
      <button
        onClick={() => {
          setIsListening(true);
          const popupUrl = window.location.origin + "/popup";
          const proofUrl = getWithoutProvingUrl(
            PASSPORT_URL,
            popupUrl,
            EthereumGroupPCDPackage.name
          );

          // console.log("proofUrl", proofUrl);

          // const newLocal = encodeURIComponent(proofUrl);
          // const url = `/popup?${newLocal}`;
          const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
          window.open(url, "_blank", "width=360,height=480,top=100,popup");
          // openPassportPopup(PASSPORT_URL, proofUrl);
        }}
      >
        Add badges for action
      </button>
      <ul>
        {pcds.map((pcd) => (
          <li key={pcd.id}>
            {pcd.claim.groupType}:{" "}
            {pcd.claim.publicInput.circuitPubInput.merkleRoot.toString(16)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BadgeListItem({ badgeName, title, pcdPassId, ethSignature }) {
  return (
    <li>
      {title}
      <ul>
        <li>
          <a href={`/claimGroup?name=${badgeName}`}>Data</a>
        </li>
        <li>
          <GetBadgeButton
            badgeName={badgeName}
            pcdPassId={pcdPassId}
            ethSignature={ethSignature}
          />
        </li>
      </ul>
    </li>
  );
}

function ConnectWalletButton() {
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [showAddress, setShowAddress] = React.useState(false);

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

  const addressToDisplay = showAddress ? walletAddress : "*".repeat(10);

  return (
    <div>
      {!walletAddress && (
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
      )}
      {walletAddress && (
        <label>
          <input
            type="checkbox"
            checked={showAddress}
            onChange={(e) => setShowAddress(e.target.checked)}
          />
          Show address
        </label>
      )}
      <p>Wallet address: {addressToDisplay}</p>
    </div>
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
          return signer.signMessage(pcd!.claim.identityCommitment!);
        })
        .then((signature) => {
          onConnect?.(pcd!, signature);
        });
    });
  }, [isListening, pcdStr]);

  if (identity) {
    return (
      <p>PCDPass Semaphore Commitment: {identity?.claim.identityCommitment}</p>
    );
  } else {
    let walletAddress: string;
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
  badgeName: string;
  pcdPassId?: SemaphoreSignaturePCD | null;
  ethSignature?: string | null;
}

function GetBadgeButton({
  badgeName: claimGroupName,
  pcdPassId,
  ethSignature,
}: GetBadgeButtonProps) {
  const [pcdStr] = usePassportPopupMessages();
  const [isListening, setIsListening] = React.useState(false);

  React.useEffect(() => {
    if (!isListening) return;
    setIsListening(false);
  }, [isListening]);

  const disabled = !pcdPassId || !ethSignature;

  if (disabled) {
    return <button disabled={true}>Get badge</button>;
  }

  return (
    <button
      onClick={async () => {
        const claimGroup: ClaimGroup = await (
          await fetch(`/claimGroup?name=${claimGroupName}`)
        ).json();

        console.log("claimGroup", claimGroup);
        console.log("size", claimGroup.addresses.split("\n").length);

        const userAddr = computeAddress(
          SigningKey.recoverPublicKey(
            hashMessage(pcdPassId.claim.identityCommitment),
            ethSignature!
          )
        ).toLowerCase();

        console.log("userAddr", userAddr);

        const startMs = Date.now();
        const proof = getMerklePath(userAddr, claimGroup);
        console.log("Merkle proof", proof);
        const endMs = Date.now();
        console.log("Merkle proof time", endMs - startMs, "ms");

        const popupUrl = window.location.origin + "/popup";
        const proofUrl = constructPassportPcdProveAndAddRequestUrl<
          typeof EthereumGroupPCDPackage
        >(PASSPORT_URL, popupUrl, EthereumGroupPCDPackage.name, {
          identity: {
            argumentType: ArgumentTypeName.PCD,
            pcdType: SemaphoreIdentityPCDPackage.name,
            value: undefined,
            userProvided: true,
            description:
              "The Semaphore Identity which you are signing the message.",
          },
          groupType: {
            argumentType: ArgumentTypeName.String,
            value: GroupType.ADDRESS,
          },
          signatureOfIdentityCommitment: {
            argumentType: ArgumentTypeName.String,
            value: ethSignature,
          },
          merkleProof: {
            argumentType: ArgumentTypeName.String,
            value: JSONBig({ useNativeBigInt: true }).stringify(proof),
          },
        });

        // openPassportPopup(popupUrl, proofUrl);
        const url = `/popup?proofUrl=${encodeURIComponent(proofUrl)}`;
        window.open(url, "_blank", "width=360,height=480,top=100,popup");
      }}
    >
      Get badges
    </button>
  );
}

function getMerklePath(
  userAddr: string,
  claimGroup: ClaimGroup
): MerkleProof | null {
  const addrs: string[] = JSON.parse(claimGroup.addresses);
  const addrPaths: string[][] = JSON.parse(claimGroup.addrPaths);
  const index = addrs.findIndex((addr) => addr === userAddr);

  if (index === -1) {
    return null;
  }

  const treeDepth = 20; // Provided circuits have tree depth = 20

  // Manually constructed merkle proof object because browser slow,
  // so we precalculate all the proofs from the server and send them to the client
  const path: MerkleProof = {
    siblings: addrPaths[index].map((siblingHex) => [BigInt("0x" + siblingHex)]),
    pathIndices: index
      .toString(2)
      .padStart(treeDepth, "0")
      .split("")
      .map((bit) => (bit === "1" ? 1 : 0))
      .reverse(), // little endian
    root: BigInt("0x" + claimGroup.rootHex),
  };

  return path;
}

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<App />);
