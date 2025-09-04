import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';


const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();
const BUCKET = process.env.UPLOAD_BUCKET;
const IMAGES_TABLE = process.env.IMAGES_TABLE;


export const handler = async (event) => {
try {
const body = JSON.parse(event.body || '{}');
const contentType = body.contentType || 'image/jpeg';


// Generate S3 key and imageId
const imageId = uuid();
const key = `uploads/${imageId}`;


const url = await s3.getSignedUrlPromise('putObject', {
Bucket: BUCKET,
Key: key,
ContentType: contentType,
ACL: 'public-read',
Expires: 300 // 5 minutes
});


// Record metadata in DynamoDB (image stored in S3; DB keeps a record)
await ddb.put({
TableName: IMAGES_TABLE,
Item: {
imageId,
s3Key: key,
bucket: BUCKET,
contentType,
createdAt: Date.now()
}
}).promise();


// Public URL (since ACL public-read). For private buckets, return a GET presigned URL instead
const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;


return {
statusCode: 200,
headers: {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': '*'
},
body: JSON.stringify({ uploadUrl: url, publicUrl })
};
} catch (err) {
return {
statusCode: 500,
headers: { 'Access-Control-Allow-Origin': '*' },
body: JSON.stringify({ error: err.message })
};
}
};