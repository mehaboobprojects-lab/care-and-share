const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'care_share_db';
const VOLUNTEERS_ID = 'volunteers';

if (!API_KEY) {
    console.error('Error: APPWRITE_API_KEY is missing.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function fixIndexes() {
    console.log('Checking Indexes...');

    try {
        console.log("Creating Index on 'userId' for Volunteers...");
        // Type: key, Attributes: ['userId'], Order: ASC
        await databases.createIndex(DB_ID, VOLUNTEERS_ID, 'idx_userId', 'key', ['userId'], ['ASC']);
        console.log(" - Index creation initiated. It might take a moment to become available.");
    } catch (err) {
        if (err.code === 409) console.log(" - Index 'idx_userId' already exists.");
        else console.error(" - Error creating index:", err.message);
    }

    console.log("Done.");
}

fixIndexes();
