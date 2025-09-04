import { deleteConnection } from './utils.js';


export const handler = async (event) => {
const { connectionId } = event.requestContext;
await deleteConnection(connectionId);
return { statusCode: 200, body: 'Disconnected.' };
};