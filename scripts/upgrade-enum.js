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

async function upgradeEnum() {
    console.log('--- Upgrading volunteerCategory Enum to include "parent" ---');

    try {
        // 1. Delete existing attribute
        console.log('Deleting existing "volunteerCategory" attribute...');
        try {
            await databases.deleteAttribute(DB_ID, VOLUNTEERS_ID, 'volunteerCategory');
            console.log(' - Attribute deleted. Waiting for propagation (5s)...');
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log(' - Attribute not found or already deleted.');
        }

        // 2. Recreate as Enum with 'parent'
        console.log('Creating new "volunteerCategory" enum attribute...');
        await databases.createEnumAttribute(
            DB_ID,
            VOLUNTEERS_ID,
            'volunteerCategory',
            ['student', 'adult', 'parent'],
            true // required
        );
        console.log(' - Success: volunteerCategory updated to [student, adult, parent]');

    } catch (err) {
        console.error('Error upgrading enum:', err.message);
        console.log('\nTip: If this fails due to "Conflict", wait a few more seconds and try again. Appwrite takes a moment to process deletions.');
    }

    console.log('\nMigration complete.');
}

upgradeEnum();
