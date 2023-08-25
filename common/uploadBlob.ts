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

  const signedUrl = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60 * 24 * 7,
  });
  console.log("Success", signedUrl);

  return signedUrl;
}
