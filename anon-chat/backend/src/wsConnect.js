import { putConnection } from './utils.js';


export const handler = async (event) => {
const { connectionId } = event.requestContext;
await putConnection(connectionId);
return { statusCode: 200, body: 'Connected.' };
};