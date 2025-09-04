import AWS from 'aws-sdk';
const ddb = new AWS.DynamoDB.DocumentClient();


export const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;


export const putConnection = async (connectionId) => {
await ddb.put({
TableName: CONNECTIONS_TABLE,
Item: { connectionId }
}).promise();
};


export const deleteConnection = async (connectionId) => {
await ddb.delete({
TableName: CONNECTIONS_TABLE,
Key: { connectionId }
}).promise();
};


export const listConnections = async () => {
const res = await ddb.scan({ TableName: CONNECTIONS_TABLE }).promise();
return res.Items?.map(i => i.connectionId) || [];
};


export const postToAll = async (domainName, stage, payload) => {
const mgmt = new AWS.ApiGatewayManagementApi({
endpoint: `${domainName}/${stage}`
});


const connections = await listConnections();
const postCalls = connections.map(async (connectionId) => {
try {
await mgmt.postToConnection({
ConnectionId: connectionId,
Data: JSON.stringify(payload)
}).promise();
} catch (err) {
if (err.statusCode === 410) {
// stale connection — remove it
await deleteConnection(connectionId);
}
}
});


await Promise.all(postCalls);
};