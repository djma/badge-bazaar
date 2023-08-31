import * as React from "react";

export function ConnectWalletButton() {
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [showAddress, setShowAddress] = React.useState(false);

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

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) {
    return (
      <div>
        <p>
          The libraries for generating zk-proofs are only supported in the
          browser.
        </p>
      </div>
    );
  }

  const { ethereum } = window as any;
  if (!ethereum) {
    return (
      <div>
        <p>Please install a browser wallet.</p>
      </div>
    );
  }

  const addressToDisplay = showAddress ? walletAddress : "*".repeat(10);

  return (
    <div>
      {!walletAddress && (
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
      )}
      {walletAddress && (
        <label>
          <input
            type="checkbox"
            checked={showAddress}
            onChange={(e) => setShowAddress(e.target.checked)}
          />
          Show address: {addressToDisplay}
        </label>
      )}
    </div>
  );
}
