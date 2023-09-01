export function FAQ() {
  return (
    <div>
      <h1>What is Badge Bazaar</h1>
      <p>
        Badge Bazaar is a zero-knowledge proof demo where users can post
        messages anonymously and have claims attached to the messages. That is,
        a user can simultaneously:
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
