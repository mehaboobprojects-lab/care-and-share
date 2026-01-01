const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

// Config
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY; // User must provide this
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'care_share_db';
const VOLUNTEERS_ID = 'volunteers';
const CHECKINS_ID = 'checkins';

if (!API_KEY) {
    console.error('Error: APPWRITE_API_KEY environment variable is missing.');
    console.error('Please create an API Key in your Appwrite Console with the following scopes:');
    console.error('- database.read, database.write');
    console.error('- collections.read, collections.write');
    console.error('- attributes.read, attributes.write');
    console.error('\nThen run: $env:APPWRITE_API_KEY="your_key_here"; node scripts/setup-appwrite.js');
    process.exit(1);
}

const client = new sdk.Client();
client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function setup() {
    console.log(`Using Endpoint: ${ENDPOINT}`);
    console.log(`Using Project: ${PROJECT_ID}`);

    // 1. Create Database
    try {
        await databases.get(DB_ID);
        console.log(`Database '${DB_ID}' already exists.`);
    } catch (err) {
        if (err.code === 404) {
            console.log(`Creating database '${DB_ID}'...`);
            await databases.create(DB_ID, 'Care Share DB');
            console.log('Database created.');
        } else {
            console.error('Error checking database:', err.message);
            return;
        }
    }

    // 2. Create Volunteers Collection
    await createCollection(DB_ID, VOLUNTEERS_ID, 'Volunteers', [
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'firstName', type: 'string', size: 255, required: true },
        { key: 'lastName', type: 'string', size: 255, required: true },
        { key: 'email', type: 'string', size: 255, required: true },
        { key: 'phone', type: 'string', size: 255, required: true },
        { key: 'age', type: 'integer', required: true },
        { key: 'relationshipType', type: 'string', size: 255, required: true },
        { key: 'schoolGrade', type: 'string', size: 255, required: true },
        { key: 'role', type: 'string', size: 255, required: true, default: 'volunteer' },
        { key: 'isApproved', type: 'boolean', required: true, default: false },
    ]);

    // 3. Create Checkins Collection
    await createCollection(DB_ID, CHECKINS_ID, 'Checkins', [
        { key: 'volunteerId', type: 'string', size: 255, required: true },
        { key: 'startTime', type: 'datetime', required: true },
        { key: 'endTime', type: 'datetime', required: false },
        { key: 'status', type: 'string', size: 255, required: true },
        { key: 'type', type: 'string', size: 255, required: true },
        { key: 'calculatedHours', type: 'double', required: false },
    ]);

    console.log('\nSetup Complete! Don\'t forget to restart your Next.js server.');
}

async function createCollection(dbId, colId, name, attributes) {
    try {
        await databases.getCollection(dbId, colId);
        console.log(`Collection '${colId}' already exists.`);
    } catch (err) {
        if (err.code === 404) {
            console.log(`Creating collection '${colId}'...`);
            await databases.createCollection(dbId, colId, name);
            console.log('Collection created.');
        } else {
            console.error(`Error checking collection ${colId}:`, err.message);
            return;
        }
    }

    // Process attributes
    console.log(`Checking attributes for '${colId}'...`);
    // Note: In a real robust script, we'd check if attribute exists before creating.
    // For simplicity, we'll try to create and ignore "Attribute already exists" (409) errors.

    for (const attr of attributes) {
        try {
            switch (attr.type) {
                case 'string':
                    await databases.createStringAttribute(dbId, colId, attr.key, attr.size, attr.required, attr.default);
                    break;
                case 'integer':
                    await databases.createIntegerAttribute(dbId, colId, attr.key, attr.required, 0, 1000, attr.default); // min/max dummy
                    break;
                case 'boolean':
                    await databases.createBooleanAttribute(dbId, colId, attr.key, attr.required, attr.default);
                    break;
                case 'datetime':
                    await databases.createDatetimeAttribute(dbId, colId, attr.key, attr.required, attr.default);
                    break;
                case 'double':
                    await databases.createFloatAttribute(dbId, colId, attr.key, attr.required, 0, 1000, attr.default);
                    break;
            }
            console.log(` - Created attribute: ${attr.key}`);
            // Wait a bit to ensure potential race conditions in Appwrite (sometimes it's fast enough though)
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            if (err.code === 409) {
                // console.log(` - Attribute '${attr.key}' already exists.`);
            } else {
                console.error(` - Error creating attribute '${attr.key}':`, err.message);
            }
        }
    }
}

setup();
