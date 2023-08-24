import * as React from "react";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  openSemaphoreSignaturePopup,
  usePassportPopupMessages,
} from "@pcd/passport-interface";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { ethers } from "ethers";

const PASSPORT_URL = "https://pcdpass.xyz/";

export function PcdUI() {
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
      {/* <AddBadgesForAction /> */}
    </div>
  );
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
  return <button>Get badge</button>;
  // const [isListening, setIsListening] = React.useState(false);

  // React.useEffect(() => {
  //   if (!isListening) return;
  //   setIsListening(false);
  // }, [isListening]);

  // const disabled = !pcdPassId || !ethSignature;

  // if (disabled) {
  //   return <button disabled={true}>Get badge</button>;
  // }

  // return (
  //   <button
  //     onClick={async () => {
  //       const claimGroup: ClaimGroup = await (
  //         await fetch(`/claimGroup?name=${claimGroupName}`)
  //       ).json();

  //       console.log("claimGroup", claimGroup);
  //       console.log("size", claimGroup.addresses.split("\n").length);

  //       const userAddr = computeAddress(
  //         SigningKey.recoverPublicKey(
  //           hashMessage(pcdPassId.claim.identityCommitment),
  //           ethSignature!
  //         )
  //       ).toLowerCase();

  //       console.log("userAddr", userAddr);

  //       const startMs = Date.now();
  //       const proof = getMerklePath(userAddr, claimGroup);
  //       console.log("Merkle proof", proof);
  //       const endMs = Date.now();
  //       console.log("Merkle proof time", endMs - startMs, "ms");

  //       const popupUrl = window.location.origin + "/popup";
  //       const proofUrl = constructPassportPcdProveAndAddRequestUrl<
  //         typeof EthereumGroupPCDPackage
  //       >(PASSPORT_URL, popupUrl, EthereumGroupPCDPackage.name, {
  //         identity: {
  //           argumentType: ArgumentTypeName.PCD,
  //           pcdType: SemaphoreIdentityPCDPackage.name,
  //           value: undefined,
  //           userProvided: true,
  //           description:
  //             "The Semaphore Identity which you are signing the message.",
  //         },
  //         groupType: {
  //           argumentType: ArgumentTypeName.String,
  //           value: GroupType.ADDRESS,
  //         },
  //         signatureOfIdentityCommitment: {
  //           argumentType: ArgumentTypeName.String,
  //           value: ethSignature,
  //         },
  //         merkleProof: {
  //           argumentType: ArgumentTypeName.String,
  //           value: JSONBig({ useNativeBigInt: true }).stringify(proof),
  //         },
  //       });

  //       // openPassportPopup(popupUrl, proofUrl);
  //       const url = `/popup?proofUrl=${encodeURIComponent(proofUrl)}`;
  //       window.open(url, "_blank", "width=360,height=480,top=100,popup");
  //     }}
  //   >
  //     Get badge
  //   </button>
  // );
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
      const { ethereum } = window as any;
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
    const { ethereum } = window as any;
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

// function AddBadgesForAction() {
//   const [pcds, setPcds] = React.useState<EthereumGroupPCD[]>([]);
//   const [pcdStr] = usePassportPopupMessages();
//   const [isListening, setIsListening] = React.useState(false);

//   React.useEffect(() => {
//     if (!pcdStr) return;
//     if (!isListening) return;
//     setIsListening(false);

//     const parsed = JSON.parse(pcdStr) as SerializedPCD;
//     if (parsed.type !== EthereumGroupPCDPackage.name) return;
//     EthereumGroupPCDPackage.deserialize(parsed.pcd).then(
//       (pcd: EthereumGroupPCD) => {
//         console.log("Got Ethereum Group PCD", pcd);
//         setPcds((prev) => [...prev, pcd]);
//       }
//     );
//   }, [isListening, pcdStr]);

//   return (
//     <div>
//       <button
//         onClick={() => {
//           setIsListening(true);
//           const popupUrl = window.location.origin + "/popup";
//           const proofUrl = getWithoutProvingUrl(
//             PASSPORT_URL,
//             popupUrl,
//             EthereumGroupPCDPackage.name
//           );

//           // console.log("proofUrl", proofUrl);

//           // const newLocal = encodeURIComponent(proofUrl);
//           // const url = `/popup?${newLocal}`;
//           const url = `${popupUrl}?proofUrl=${encodeURIComponent(proofUrl)}`;
//           window.open(url, "_blank", "width=360,height=480,top=100,popup");
//           // openPassportPopup(PASSPORT_URL, proofUrl);
//         }}
//       >
//         Add badges for action
//       </button>
//       <ul>
//         {pcds.map((pcd) => (
//           <li key={pcd.id}>
//             {pcd.claim.groupType}:{" "}
//             {pcd.claim.publicInput.circuitPubInput.merkleRoot.toString(16)}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

function BadgeListItem({ badgeName, title, pcdPassId, ethSignature }: any) {
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
