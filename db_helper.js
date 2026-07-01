const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://suku:ijiwy45riw@cluster0.envwpjf.mongodb.net/";
const DB_NAME = "ugc_marketing";
const COLLECTION_NAME = "ugc_items";
const OUTPUT_JSON_PATH = path.join(__dirname, "public", "ugc-data.json");

// Helper to generate a unique string ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Default seed data
const DEFAULT_ITEMS = [
  {
    _id: generateId(),
    productName: "Petal Glow Lip Oil",
    platform: "instagram",
    username: "sudarshona gogoi",
    userHandle: "@ugc_sudarshona",
    content: "Literally the prettiest pink shade ever! 🌸 It smells like vanilla and isn't sticky at all. My lips look so juicy and plump! 💕 #lipoil #makeup #aesthetic #softgirl",
    mediaUrl: "/ugc/petal_glow_1.jpg",
    mediaType: "image",
    rating: 5,
    buyUrl: "https://example.com/shop/petal-glow-pink",
    postUrl: "https://www.instagram.com/ugc_sudarshona",
    tags: ["lipoil", "makeup", "aesthetic", "softgirl"],
    approved: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: generateId(),
    productName: "Petal Glow Lip Oil",
    platform: "youtube",
    username: "sudarshona gogoi",
    userHandle: "@ugc_sudarshona",
    content: "OMG petal glow lip oil obsessed! ✨ The gloss is so nourishing, and look at that shimmer! Absolutely a 10/10 unboxing review. Grab it before it sells out! 💖💅 #makeup #petalglow",
    mediaUrl: "/ugc/petal_glow_2.jpg",
    mediaType: "image",
    rating: 5,
    buyUrl: "https://example.com/shop/petal-glow-shimmer",
    postUrl: "https://youtube.com",
    tags: ["makeup", "petalglow"],
    approved: true,
    createdAt: new Date().toISOString()
  },
  {
    _id: generateId(),
    productName: "Petal Glow Lip Oil",
    platform: "instagram",
    username: "sudarshona gogoi",
    userHandle: "@ugc_sudarshona",
    content: "Reordered my third bottle of the Petal Glow Lip Oil in 'Rosy Dew'. Truly the only formula that keeps my lips hydrated in the winter. Highly recommend! 🎀💌 #beautyfaves",
    mediaUrl: "",
    mediaType: "text",
    rating: 5,
    buyUrl: "https://example.com/shop/petal-glow-rosy",
    postUrl: "https://www.instagram.com/ugc_sudarshona",
    tags: ["beautyfaves", "lipoil"],
    approved: true,
    createdAt: new Date().toISOString()
  }
];

function readLocalData() {
  try {
    if (fs.existsSync(OUTPUT_JSON_PATH)) {
      const raw = fs.readFileSync(OUTPUT_JSON_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Local read error:", e.message);
  }
  return [];
}

function writeLocalData(data) {
  fs.mkdirSync(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action) {
    console.error("No action specified. Choose: count, seed, insert, sync");
    process.exit(1);
  }

  let client;
  let useFallback = false;

  // Try to connect to MongoDB Atlas
  try {
    client = new MongoClient(MONGODB_URI, { connectTimeoutMS: 5000, socketTimeoutMS: 5000 });
    await client.connect();
  } catch (err) {
    // Graceful fallback to local JSON file
    useFallback = true;
  }

  try {
    if (useFallback) {
      // Local Fallback operations
      if (action === 'count') {
        const data = readLocalData();
        console.log(`local-fallback:${data.length}`);
      } else if (action === 'seed') {
        writeLocalData(DEFAULT_ITEMS);
        console.log(`local-seeded:${DEFAULT_ITEMS.length}`);
      } else if (action === 'insert') {
        const dataStr = args[1];
        if (!dataStr) throw new Error("No data provided");
        const newItem = JSON.parse(dataStr);
        newItem._id = generateId();
        newItem.createdAt = new Date().toISOString();
        newItem.approved = true;

        const data = readLocalData();
        data.unshift(newItem); // add to beginning
        writeLocalData(data);
        console.log(`local-inserted:${newItem._id}`);
      } else if (action === 'sync') {
        // Local sync is a no-op since it writes directly to json
        const data = readLocalData();
        console.log(`local-synced:${data.length}`);
      } else if (action === 'delete') {
        const targetId = args[1];
        if (!targetId) throw new Error("No ID provided");
        const data = readLocalData();
        const updated = data.filter(item => item._id !== targetId);
        writeLocalData(updated);
        console.log(`local-deleted:${targetId}`);
      }
    } else {
      // Atlas DB operations
      const db = client.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      if (action === 'count') {
        const count = await collection.countDocuments({});
        console.log(`db:${count}`);
      } else if (action === 'seed') {
        await collection.deleteMany({});
        const result = await collection.insertMany(DEFAULT_ITEMS.map(item => ({ ...item, _id: undefined, createdAt: new Date() })));
        console.log(`db-seeded:${result.insertedCount}`);
      } else if (action === 'insert') {
        const dataStr = args[1];
        if (!dataStr) throw new Error("No data provided");
        const newItem = JSON.parse(dataStr);
        newItem.createdAt = new Date();
        newItem.approved = true;
        const result = await collection.insertOne(newItem);
        console.log(`db-inserted:${result.insertedId}`);
      } else if (action === 'sync') {
        const items = await collection.find({ approved: true }).sort({ createdAt: -1 }).toArray();
        writeLocalData(items);
        console.log(`db-synced:${items.length}`);
      } else if (action === 'delete') {
        const targetId = args[1];
        if (!targetId) throw new Error("No ID provided");
        let query = { _id: targetId };
        try {
          if (targetId.length === 24) {
            query = { _id: new ObjectId(targetId) };
          }
        } catch (e) {}
        const result = await collection.deleteOne(query);
        console.log(`db-deleted:${result.deletedCount}`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    if (client && !useFallback) {
      await client.close();
    }
  }
}

main();
