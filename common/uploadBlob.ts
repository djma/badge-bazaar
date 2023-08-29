import AWS from "aws-sdk";
const wasabiConfig = {
  endpoint: "s3.wasabisys.com",
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
};
const s3 = new AWS.S3(wasabiConfig);
const bucketName = "badge-bazaar";

export default async function upload(key: string, body: string) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
  };
  await s3
    .upload(params, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data.Location.toString());
      }
    })
    .promise();

  return refreshSignedUrl(key);
}

export async function refreshSignedUrl(key: string) {
  // hacks
  if (key.includes("?")) {
    // it's not a key, it's a url of the form
    // https://badge-bazaar.s3.wasabisys.com/key?params
    key = key.split("?")[0];
    const keySplit = key.split("/");
    key = keySplit[keySplit.length - 1];
  }

  const signedUrl = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60 * 24 * 7,
  });
  console.log("SignedUrl: ", signedUrl);

  // wtf am I doing?
  const cleanedSignedUrl = signedUrl.split("%3D")[0] + "%3D";

  return cleanedSignedUrl;
}

async function fetchJson(url: string) {
  return fetch(url).then((res) => res.json());
}
async function fetchText(url: string) {
  const res = await fetch(url);
  return await res.text();
}

export async function fetchWasabiText(url: string) {
  const refresh = await fetchJson(`/api/refreshWasabiUri?url=${url}`);
  const res = await fetch(refresh.newUrl);
  return res.text();
}
export async function fetchWasabiJson(url: string) {
  const refresh = await fetchJson(`/api/refreshWasabiUri?url=${url}`);
  const res = await fetch(refresh.newUrl);
  return res.json();
}

export async function fetchWasabiTextNode(url: string) {
  const newUrl = await refreshSignedUrl(url);
  const res = await fetch(newUrl);
  return res.text();
}
export async function fetchWasabiJsonNode(url: string) {
  const newUrl = await refreshSignedUrl(url);
  const res = await fetch(newUrl);
  return res.json();
}
