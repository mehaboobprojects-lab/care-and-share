const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'care_share_db';
const VOLUNTEERS_ID = 'volunteers';
const CHECKINS_ID = 'checkins';

if (!API_KEY) {
    console.error('Error: APPWRITE_API_KEY is missing.');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function verifySchema() {
    console.log('--- Verifying Schema & Permissions ---');

    try {
        const volunteers = await databases.getCollection(DB_ID, VOLUNTEERS_ID);
        console.log(`\nCollection: Volunteers (${volunteers.$id})`);
        console.log('Permissions:', volunteers.$permissions);
        console.log('Attributes:');
        volunteers.attributes.forEach(attr => {
            console.log(` - ${attr.key} (${attr.type}): required=${attr.required}, status=${attr.status}`);
        });

        const missingRole = !volunteers.attributes.find(a => a.key === 'role');
        const missingApproved = !volunteers.attributes.find(a => a.key === 'isApproved');

        if (missingRole || missingApproved) {
            console.log('\n[!] MISSING ATTRIBUTES DETECTED');
            if (missingRole) console.log(' -> role');
            if (missingApproved) console.log(' -> isApproved');
            console.log('Attempting to fix...');
            await fixAttributes();
        } else {
            console.log('\n[OK] All attributes present.');
        }

    } catch (err) {
        console.error('Error fetching Volunteers collection:', err.message);
    }
}

async function fixAttributes() {
    try {
        console.log("Creating 'role' attribute (String, Required)...");
        // Creating as required=false first to avoid default value issues, can update later or app logic handles it
        // Actually, if we provide no default, required=true is fine.
        await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'role', 255, true);
        console.log(" - Created 'role'. Wait for it to be 'available'.");
    } catch (err) {
        console.log(` - Role creation failed: ${err.message}`);
    }

    try {
        console.log("Creating 'isApproved' attribute (Boolean, Required)...");
        await databases.createBooleanAttribute(DB_ID, VOLUNTEERS_ID, 'isApproved', true);
        console.log(" - Created 'isApproved'.");
    } catch (err) {
        console.log(` - isApproved creation failed: ${err.message}`);
    }
}

verifySchema();
