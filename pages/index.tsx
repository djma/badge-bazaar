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
import { ConnectWalletButton } from "../components/ConnectWalletButton";
import {
  adjectives,
  animals,
  colors,
  names,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { fetchWasabiJson, fetchWasabiText } from "../common/uploadBlob";

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

  // No idea why if I remove this block, I get a "window is not defined" error
  if (!ethereum) {
    return (
      <div>
        <Tabs />
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
  const [currentTab, setCurrentTab] = React.useState(null);

  React.useEffect(() => {
    setCurrentTab(window.location.hash.slice(1));
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
  } else if (currentTab === "claim-descriptions") {
    content = <ClaimDescriptions />;
  } else if (currentTab === "faq") {
    content = <FAQ />;
  } else {
    content = <Welcome />;
  }

  return (
    <div style={{ fontFamily: "monospace" }}>
      <a href="#welcome">Welcome</a>
      <Pipe />
      <a href="#message-board">Message Board</a>
      <Pipe />
      <a href="#claim-descriptions">Claims</a>
      <Pipe />
      <a href="#faq">FAQ</a>
      {content}
    </div>
  );
}

function FAQ() {
  return (
    <div>
      <h1>What is Badge Bazaar</h1>
      <p>
        Badge Bazaar is a message board where users can post messages
        anonymously but have claims attached to the messages. That is, a user
        can simultaneously:
        <ul>
          <li>Claim and prove they are a whale.</li>
          <li>Keep their address private, even from the server.</li>
        </ul>
      </p>
      <h1>How does it work?</h1>
      <p>
        Given a claim, the server pre-generates all the addresses that satisfy
        the claim. When a user wants to claim a badge, the user downloads the
        whole set of addresses. Using their browser wallet, the user signs a
        message where the public key/address is inside the claimed set. That
        message is used to generate a zero-knowledge proof that keeps the
        address private, but reveals the claimed set publicly. That proof is
        used to post messages.
      </p>
      <img src="/how.png" style={{ maxWidth: "100%" }} />
      <h1>How does it keep my anonymity?</h1>
      <p>
        To generate a proof, the user requests and downloads the whole set of
        addresses that satisfies the claim in order not to reveal their own
        address.
      </p>
      <p>
        The server only sees zk proofs of claims and claim requests. There is no
        way to back out the exact address that generated the proof and sent the
        message.
      </p>
      <h1>What is the Proof column next to the messages?</h1>
      <p>
        The proof column shows a checkmark if the server has verified the proof
        of the message.
      </p>
      <p>
        The client can also independently verify the proof by clicking the
        checkmark. If the client verifies the proof, the checkmark turns green.
        If the client rejects the proof, the checkmark turns red.
      </p>
    </div>
  );
}

function ClaimDescriptions() {
  return (
    <div>
      <h1>Claim Descriptions</h1>
      <h2>ethereumGenesis</h2>
      <p>
        Was part of the original <a href="https://etherscan.io/block/0">8893</a>{" "}
        addresses that received genesis eth.
      </p>
      <h2>debank-top10k</h2>
      <p>
        Is among the top 10k addresses that have{" "}
        <a href="https://debank.com/ranking">signed on to DeBank.</a>
      </p>
      <h2>nft-***</h2>
      <p> Owns at least one of the nft mentioned.</p>
      <h2>whale-1M</h2>
      <p>
        Owns at least 1M USD worth of assets according to{" "}
        <a href="https://github.com/DeBankDeFi/web3-data">DeBank.</a>
      </p>
      <h2>whale-10M</h2>
      <p>Same, but 10M USD.</p>
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
      <img src="/bazaar.png" alt="Badge Bazaar" width={"400px"} />
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

  const previousPseudonym =
    localStorage.getItem("pseudonym") ??
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: "-",
    });
  localStorage.setItem("pseudonym", previousPseudonym);
  const [pseudonym, setPseudonym] = React.useState(previousPseudonym);
  const [selectedClaim, setSelectedClaim] = React.useState<ClaimGroup>(null);
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
    console.log("Selected claims:", selectedClaim);

    const msgToPost = `${pseudonym}: ${message}`;

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
          MessageClaim: [
            {
              id: 0,
              claim: {
                name: selectedClaim.name,
                rootHex: selectedClaim.rootHex,
              },
              proofUri: "",
              publicInputUri: "",
              claimType: null,
            },
          ],
        },
      ].concat(messages)
    );

    // Heavy lifting starts
    const claimGroup: ClaimGroup = await (
      await fetch(`/api/claimGroup?name=${selectedClaim.name}`)
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
      alert("Your address isn't part of this group " + selectedClaim.name);
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
        message: msgToPost,
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
      <label htmlFor="pseudonym">Pseudonym:</label>
      <button
        onClick={() => {
          const newPseudonym = uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: "-",
          });
          localStorage.setItem("pseudonym", newPseudonym);
          setPseudonym(newPseudonym);
        }}
      >
        ↻
      </button>
      <br />
      <textarea
        id="pseudonym"
        contentEditable={false}
        value={pseudonym}
        // onChange={(e) => {
        //   localStorage.setItem("pseudonym", e.target.value);
        //   setPseudonym(e.target.value);
        // }}
        rows={1}
        cols={30}
      />
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
      <label htmlFor="claims">Claims:</label>
      <br />
      <select
        id="claims"
        onChange={(e) => {
          const selectedClaimId = parseInt(e.target.value);
          const selectedClaim = claimGroups.find(
            (claimGroup) => selectedClaimId === claimGroup.id
          );
          setSelectedClaim(selectedClaim);
        }}
      >
        {[<option key={"empty-claim-group"} value={0}></option>].concat(
          claimGroups.map((claimGroup) => (
            <option key={claimGroup.id} value={claimGroup.id}>
              {claimGroup.name}
            </option>
          ))
        )}
      </select>
      <br />
      <button
        style={{ marginTop: "6px" }}
        disabled={
          message.length === 0 ||
          selectedClaim == null ||
          selectedClaim.id === 0
        }
        onClick={handlePost}
      >
        Post
      </button>
      <br />
      <br />
      <br />
      <table style={{ borderSpacing: "10px 0" }}>
        <thead>
          <tr>
            <th
              style={{
                paddingLeft: "10px",
                minWidth: "340px",
                maxWidth: "340px",
                borderBottom: "1px solid black",
              }}
            >
              Messages
            </th>
            <th
              style={{
                paddingLeft: "10px",
                paddingRight: "10px",
                minWidth: "40px",
                maxWidth: "40px",
                borderBottom: "1px solid black",
              }}
            >
              <a href="/#faq">Proof</a>
            </th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => {
            const username =
              (message.message.includes(":") &&
                message.message.split(":")[0]) ||
              "anon";
            const msg = message.message.includes(":")
              ? message.message.split(":")[1]
              : message.message;
            const claimName = message.MessageClaim[0]?.claim.name;
            const createdAt = new Date(message.createdAt).toLocaleString();
            return (
              <tr key={message.id}>
                <td
                  style={{
                    paddingLeft: "10px",
                    minWidth: "340px",
                    maxWidth: "340px",
                  }}
                >
                  {
                    <div>
                      {msg}
                      <div style={{ textAlign: "right" }}>
                        <br />~{username}
                        <br />({claimName}){" "}
                      </div>
                      <hr />
                    </div>
                  }
                </td>

                <td
                  style={{
                    paddingLeft: "10px",
                    paddingRight: "10px",
                    textAlign: "center",
                  }}
                >
                  {message.MessageClaim[0] ? (
                    <ProofCheckmark message={message} />
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <br />
      <br />
      <div style={{ paddingLeft: "80px" }}>
        <WhaleASCII />
      </div>
    </div>
  );
}

function WhaleASCII() {
  const whale = `
      ▄██████████████▄▐█▄▄▄▄█▌
 sup  ████████████████▌▀▀██▀▀
      ████▄████████████▄▄█▌
      ▄▄▄▄▄██████████████▀
  `;
  return (
    <pre>
      <code>{whale}</code>
    </pre>
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
    if (typeof window === "undefined") {
      alert("Only supported in browser.");
    }
    const proofHex = await fetchWasabiText(message.MessageClaim[0].proofUri);
    const publicInputHex = await fetchWasabiText(
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
  const addrs: string[] = await fetchWasabiJson(idsUri);
  const index = addrs.findIndex((addr) => addr === id);
  if (index === -1) {
    return null;
  }

  const addrPaths: string[][] = await fetchWasabiJson(idsPathsUri);

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
