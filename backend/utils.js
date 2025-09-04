import { Connections } from './db.js';

export const addConnection = async (connectionId) => {
  await Connections.insertOne({ connectionId });
};

export const removeConnection = async (connectionId) => {
  await Connections.deleteOne({ connectionId });
};

export const listConnections = async () => {
  const all = await Connections.find({}).toArray();
  return all.map(c => c.connectionId);
};
