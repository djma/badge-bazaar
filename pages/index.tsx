import Head from "next/head";
import * as React from "react";
import {
  MembershipProver,
  MembershipVerifier,
  MerkleProof,
  defaultAddressMembershipPConfig,
  defaultAddressMembershipVConfig,
  defaultPubkeyMembershipPConfig,
  defaultPubkeyMembershipVConfig,
} from "@personaelabs/spartan-ecdsa";
import { ClaimGroup, ClaimType, Message } from "@prisma/client";
import { hashMessage } from "ethers";
import { PostMessageRequest } from "./api/postMessage";
import { PcdUI } from "@/components/PcdUI";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export default function Home() {
  return (
    <>
      <Head>
        <title>Badge Bazaar</title>
        <meta name="description" content="Message Board with EVM claims" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <App />
      </main>
    </>
  );
}

function App() {
  const [currentTab, setCurrentTab] = React.useState("welcome");
  const [ethereum, setEthereum] = React.useState<any>(null);

  React.useEffect(() => {
    const { ethereum } = window as any;
    setEthereum(ethereum);
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
      PCD UI
      {content}
    </div>
  );
}

function Pipe() {
  return <span>&nbsp; | &nbsp;</span>;
}

function Welcome() {
  return (
    <div>
      <h1>Welcome to Badge Bazaar</h1>
      <img src="/bazaar.png" alt="Badge Bazaar" />
      <p>This is Badge Bazaar</p>
      <p>You can do anything at Badge Bazaar</p>
      <p>Anything is possible at Badge Bazaar</p>
      <p>Welcome</p>
      <p>The only limit is yourself</p>
      <p>Welcome to Badge Bazaar</p>
    </div>
  );
}

type MessageWithClaims = {
  MessageClaim: ({
    claim: {
      name: string;
      rootHex: string;
    };
    proofUri: string;
    publicInputUri: string;
    claimType: ClaimType;
  } & {
    id: number;
    // createdAt: Date;
    // messageId: number;
    // claimId: number;
    // proof: string;
  })[];
} & Message;

function MessageBoard() {
  // Message to post
  const [message, setMessage] = React.useState("");
  const [selectedClaims, setSelectedClaims] = React.useState<ClaimGroup[]>([]);
  const [claimGroups, setClaimGroups] = React.useState<ClaimGroup[]>([]);

  // Message board
  const [messages, setMessages] = React.useState<MessageWithClaims[]>([]);
  async function fetchMessages() {
    const response = await fetch("/api/messages");
    const data = await response.json();
    setMessages(data);
  }

  React.useEffect(() => {
    fetch("/api/claimGroups")
      .then((res) => res.json())
      .then((data) => setClaimGroups(data));
    fetchMessages();
  }, []);

  const handlePost = async () => {
    const { ethereum } = window as any;
    console.log("Selected claims:", selectedClaims);

    const msgToPost = message;

    const signature = await ethereum.request({
      method: "personal_sign",
      params: [msgToPost, ethereum.selectedAddress],
    });

    // Make it feel instant
    setMessage("");
    setMessages(
      [
        {
          id: 0,
          eip712: "",
          message: msgToPost,
          createdAt: new Date(),
          MessageClaim: selectedClaims.map((claimGroup) => ({
            id: 0,
            claim: {
              name: claimGroup.name,
              rootHex: claimGroup.rootHex,
            },
            proofUri: "",
            publicInputUri: "",
            claimType: null,
          })),
        },
      ].concat(messages)
    );

    // Heavy lifting starts
    const claimGroup: ClaimGroup = await (
      await fetch(`/api/claimGroup?name=${selectedClaims[0].name}`)
    ).json();

    let addrOrPubKey: ClaimType = "PUBKEY";
    const pubkey = await fetch(
      `/api/addrToPubkey?addr=${ethereum.selectedAddress}`
    )
      .then((res) => res.json())
      .then((data) => data.pubkey);
    let merklePath = await getMerklePath(
      pubkey,
      claimGroup.pubKeysUri,
      claimGroup.pubKeysPathsUri,
      claimGroup.pubKeysRootHex
    );
    if (!merklePath) {
      addrOrPubKey = "ADDRESS";
      merklePath = await getMerklePath(
        ethereum.selectedAddress,
        claimGroup.addressesUri,
        claimGroup.addrPathsUri,
        claimGroup.rootHex
      );
    }
    if (!merklePath) {
      alert("You don't have this badge " + selectedClaims[0].name);
      return;
    }

    const msgHash = hashMessage(Buffer.from(msgToPost));
    const msgHashBuffer = Buffer.from(msgHash.slice(2), "hex");
    const prover = new MembershipProver(
      addrOrPubKey === "PUBKEY"
        ? defaultPubkeyMembershipPConfig
        : defaultAddressMembershipPConfig
    );
    await prover.initWasm();
    const nizk = await prover.prove(signature!, msgHashBuffer, merklePath);
    const publicInputHex = Buffer.from(nizk.publicInput.serialize()).toString(
      "hex"
    );
    const proofHex = Buffer.from(nizk.proof).toString("hex");

    console.log("groupProof", nizk);

    await fetch("/api/postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        proofHex,
        publicInputHex,
        addrOrPubKey,
      } as PostMessageRequest),
    });
    // Heavy lifting ends

    await fetchMessages();
  };

  return (
    <div>
      <h2>1. Connect Ethereum Wallet</h2>
      <ConnectWalletButton />
      <h2>2. Post Message</h2>
      <label htmlFor="claims">Claims:</label>
      <br />
      <select
        id="claims"
        onChange={(e) => {
          const selectedClaimId = parseInt(e.target.value);
          const selectedClaim = claimGroups.find(
            (claimGroup) => selectedClaimId === claimGroup.id
          );
          setSelectedClaims([selectedClaim]);
        }}
      >
        {claimGroups.map((claimGroup) => (
          <option key={claimGroup.id} value={claimGroup.id}>
            {claimGroup.name}
          </option>
        ))}
      </select>
      <br />
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
      <button
        disabled={message.length === 0 || selectedClaims.length === 0}
        onClick={handlePost}
      >
        Post
      </button>
      <h2>3. Messages</h2>
      <table style={{ borderSpacing: "10px 0" }}>
        <thead>
          <tr>
            <th>Created At</th>
            <th style={{ paddingLeft: "10px" }}>Claim Name</th>
            <th style={{ paddingLeft: "10px" }}>Message</th>
            <th style={{ paddingLeft: "10px" }}>Proof</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr key={message.id}>
              <td>{new Date(message.createdAt).toLocaleString()}</td>
              <td style={{ paddingLeft: "10px" }}>
                {message.MessageClaim[0]?.claim.name}
              </td>
              <td style={{ paddingLeft: "10px" }}>{message.message}</td>
              <td style={{ paddingLeft: "10px" }}>
                {message.MessageClaim[0] ? (
                  <ProofCheckmark message={message} />
                ) : (
                  ""
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProofCheckmark({ message }: { message: MessageWithClaims }) {
  const [isVerified, setIsVerified] = React.useState(null);
  const isServerVerified = message.id > 0;

  return (
    <div id={message.id.toString()}>
      {!isServerVerified ? (
        <div className="lds-dual-ring"></div>
      ) : isVerified === null ? (
        <button title="Server verified" onClick={verifyProof}>
          {"✓"}
        </button>
      ) : isVerified ? (
        <button
          title="Client and server verified"
          style={{ backgroundColor: "lightgreen" }}
        >
          {"✓"}
        </button>
      ) : (
        <button
          title="Client rejected"
          style={{ backgroundColor: "lightcoral" }}
        >
          {"✗"}
        </button>
      )}
    </div>
  );

  async function verifyProof() {
    const proofHex = await fetchText(message.MessageClaim[0].proofUri);
    const publicInputHex = await fetchText(
      message.MessageClaim[0].publicInputUri
    );
    const publicInputBuffer = Buffer.from(publicInputHex, "hex");

    // Init verifier
    const verifier = new MembershipVerifier(
      message.MessageClaim[0].claimType === "PUBKEY"
        ? defaultPubkeyMembershipVConfig
        : defaultAddressMembershipVConfig
    );
    await verifier.initWasm();
    const valid = await verifier.verify(
      Buffer.from(proofHex, "hex"),
      publicInputBuffer
    );

    setIsVerified(valid);
  }
}

async function fetchJson(url: string) {
  return fetch(url).then((res) => res.json());
}
async function fetchText(url: string) {
  const res = await fetch(url);
  return await res.text();
}

async function getMerklePath(
  id: string,
  idsUri: string,
  idsPathsUri: string,
  idsRootHex: string
): Promise<MerkleProof> | null {
  if (!id) {
    return null;
  }
  const addrs: string[] = await fetchJson(idsUri);
  const index = addrs.findIndex((addr) => addr === id);
  if (index === -1) {
    return null;
  }

  const addrPaths: string[][] = await fetchJson(idsPathsUri);

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
    root: BigInt("0x" + idsRootHex),
  };

  return path;
}
