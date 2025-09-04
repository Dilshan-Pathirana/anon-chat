import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://127.0.0.1:27017');
await client.connect();
const db = client.db('anonChat');

export const Connections = db.collection('connections');
export const Images = db.collection('images');

console.log('Connected to MongoDB');
