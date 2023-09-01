import OAuth from "oauth-1.0a";
import crypto from "crypto";

const TWITTER_TWEET_ENDPOINT = `https://api.twitter.com/2/tweets`;

const OAUTH = new OAuth({
  consumer: {
    key: process.env.TWITTER_CONSUMER_KEY,
    secret: process.env.TWITTER_CONSUMER_SECRET,
  },
  signature_method: "HMAC-SHA1",
  hash_function: (baseString, key) =>
    crypto.createHmac("sha1", key).update(baseString).digest("base64"),
});

export async function tweet(text: string) {
  const { oauth_token, oauth_token_secret } = {
    oauth_token: process.env.WHALESONG_OAUTH_TOKEN,
    oauth_token_secret: process.env.WHALESONG_OAUTH_TOKEN_SECRET,
  };
  const token = {
    key: oauth_token,
    secret: oauth_token_secret,
  };

  const authHeader = OAUTH.toHeader(
    OAUTH.authorize(
      {
        url: TWITTER_TWEET_ENDPOINT,
        method: "POST",
      },
      token
    )
  );

  const choppedText = text.length > 280 ? text.slice(0, 279) + "…" : text;

  const req = await fetch(TWITTER_TWEET_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ text: choppedText }),
    // responseType: "json",
    headers: {
      Authorization: authHeader["Authorization"],
      "user-agent": "v2CreateTweetJS",
      "content-type": "application/json",
      accept: "application/json",
    },
  });
}
