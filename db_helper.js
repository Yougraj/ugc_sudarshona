/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "ugc_marketing";
const COLLECTION_NAME = "ugc_items";

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI environment variable is not defined in .env.local");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action) {
    console.error("No action specified. Choose: count, list, insert, delete");
    process.exit(1);
  }

  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  } catch (err) {
    console.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  try {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    if (action === 'count') {
      const count = await collection.countDocuments({});
      console.log(`db:${count}`);
    } else if (action === 'list') {
      const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
      // Map ObjectId _id to string for simpler parsing in Python/JSON
      const mappedItems = items.map(item => ({
        ...item,
        _id: item._id.toString()
      }));
      console.log(JSON.stringify(mappedItems));
    } else if (action === 'insert') {
      const dataStr = args[1];
      if (!dataStr) throw new Error("No data provided");
      const newItem = JSON.parse(dataStr);
      newItem.createdAt = new Date();
      newItem.approved = true;
      const result = await collection.insertOne(newItem);
      console.log(`db-inserted:${result.insertedId}`);
    } else if (action === 'delete') {
      let targetId = args[1];
      if (!targetId) throw new Error("No ID provided");
      // Strip leading and trailing quotes if present
      if (targetId.startsWith('"') && targetId.endsWith('"')) {
        targetId = targetId.slice(1, -1);
      }
      let query = { _id: targetId };
      try {
        if (ObjectId.isValid(targetId)) {
          query = { _id: { $in: [targetId, new ObjectId(targetId)] } };
        }
      } catch {}
      const result = await collection.deleteOne(query);
      console.log(`db-deleted:${result.deletedCount}`);
    } else if (action === 'update') {
      let targetId = args[1];
      const dataStr = args[2];
      if (!targetId) throw new Error("No ID provided");
      if (!dataStr) throw new Error("No data provided");
      if (targetId.startsWith('"') && targetId.endsWith('"')) {
        targetId = targetId.slice(1, -1);
      }
      let query = { _id: targetId };
      try {
        if (ObjectId.isValid(targetId)) {
          query = { _id: { $in: [targetId, new ObjectId(targetId)] } };
        }
      } catch {}
      const updatedFields = JSON.parse(dataStr);
      delete updatedFields._id;
      if (updatedFields.createdAt && typeof updatedFields.createdAt === 'string') {
        updatedFields.createdAt = new Date(updatedFields.createdAt);
      }
      const result = await collection.updateOne(query, { $set: updatedFields });
      console.log(`db-updated:${result.modifiedCount}`);
    } else {
      console.error(`Unknown action: ${action}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main();
