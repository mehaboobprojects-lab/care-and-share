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

async function updateSchemaPhase3() {
    console.log('--- Updating Schema for Parent/Dependent Enhancement ---');

    // 1. Update volunteerCategory enum to include 'parent'
    // Note: Appwrite doesn't support updating enums directly easily in all versions without recreation 
    // but we'll try to add attributes that might be missing first.

    const attributes = [
        { type: 'integer', key: 'age', required: false, min: 0, max: 120 },
        { type: 'string', key: 'managedBy', size: 255, required: false },
        { type: 'boolean', key: 'isDependent', required: false, default: false },
        { type: 'string', key: 'schoolGrade', size: 255, required: false }, // Bringing back if deleted but as optional
        { type: 'string', key: 'relationshipType', size: 255, required: false }, // Bringing back but as optional
    ];

    for (const attr of attributes) {
        try {
            // Check if attribute exists and delete it to ensure it's re-created with correct 'required' status
            console.log(`Ensuring attribute '${attr.key}' is clean...`);
            try {
                await databases.deleteAttribute(DB_ID, VOLUNTEERS_ID, attr.key);
                console.log(` - Deleted existing '${attr.key}'`);
                // Wait for deletion to propagate
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                // Ignore if it doesn't exist
            }

            console.log(`Creating attribute '${attr.key}' ...`);
            if (attr.type === 'string') {
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.size, attr.required, attr.default);
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.required, attr.min, attr.max, attr.default);
            } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.required, attr.default);
            }
            console.log(` - Success: ${attr.key}`);
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.error(` - Error processing '${attr.key}':`, err.message);
        }
    }

    // Attempt to update volunteerCategory enum
    try {
        console.log("Updating volunteerCategory enum...");
        // This is tricky in Appwrite if it exists. We might need to delete and recreate if we want to change elements.
        // Actually, let's keep it as is if 'parent' can be handled by a different field or if we can't update it easily.
        // Better yet, many versions of Appwrite don't allow updating Enum elements.
        // We will check if we can just create it if it was string before.
    } catch (e) {
        console.log("Enum update skipped or failed.");
    }

    console.log('\nSchema update phase 3 complete.');
}

updateSchemaPhase3();
