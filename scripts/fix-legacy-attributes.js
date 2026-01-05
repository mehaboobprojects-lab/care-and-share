const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'care_share_db';
const VOLUNTEERS_ID = 'volunteers';

if (!API_KEY) {
    console.error('Error: APPWRITE_API_KEY is missing in .env.local.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const LEGACY_ATTRIBUTES = ['age', 'relationshipType', 'schoolGrade'];

async function fixLegacyAttributes() {
    console.log('--- Cleaning Up Legacy Required Attributes ---');
    console.log(`Targeting Database: ${DB_ID}, Collection: ${VOLUNTEERS_ID}`);

    for (const key of LEGACY_ATTRIBUTES) {
        try {
            console.log(`Checking attribute: ${key} ...`);
            await databases.deleteAttribute(DB_ID, VOLUNTEERS_ID, key);
            console.log(` - Successfully deleted key: ${key}`);

            // Wait for attribute to be deleted before moving to the next
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            if (err.code === 404) {
                console.log(` - Key '${key}' not found, skipping.`);
            } else {
                console.error(` - Error deleting '${key}':`, err.message);
            }
        }
    }

    console.log('\nLegacy cleanup complete. You can now try to register again.');
}

fixLegacyAttributes();
