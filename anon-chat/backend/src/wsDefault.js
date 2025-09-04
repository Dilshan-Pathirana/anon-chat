import { postToAll } from './utils.js';


export const handler = async (event) => {
const { domainName, stage } = event.requestContext;


// Incoming client message should be JSON: { type: 'message', body: {...} }
let payload;
try {
payload = JSON.parse(event.body || '{}');
} catch (_) {
payload = { type: 'error', body: { message: 'Invalid JSON' } };
}


// Enforce minimal schema; we do not store history
const message = {
type: 'broadcast',
body: {
text: payload?.body?.text || null,
imageUrl: payload?.body?.imageUrl || null,
username: payload?.body?.username || 'Anonymous',
ts: Date.now()
}
};


await postToAll(domainName, stage, message);


return { statusCode: 200, body: 'ok' };
};