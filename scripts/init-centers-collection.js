const sdk = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = '6953de7c00347b6446b3';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'care_share_db';
const CENTERS_COLLECTION_ID = 'centers';

if (!API_KEY || !PROJECT_ID) {
    console.error('Error: Missing API_KEY or PROJECT_ID');
    process.exit(1);
}

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);


async function initCentersCollection() {
    console.log('Initializing Centers Collection...');

    try {
        // 1. Create Collection (if not exists)
        try {
            await databases.createCollection(DATABASE_ID, CENTERS_COLLECTION_ID, 'Centers');
            console.log('Created centers collection');
        } catch (error) {
            if (error.code === 409) {
                console.log('Centers collection already exists');
            } else {
                throw error;
            }
        }

        // 2. Create Attributes
        const attributes = [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'latitude', type: 'double', required: true },
            { key: 'longitude', type: 'double', required: true },
            { key: 'radius', type: 'integer', required: false, default: 150 }, // Radius in meters
            { key: 'createdBy', type: 'string', size: 255, required: false }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DATABASE_ID, CENTERS_COLLECTION_ID, attr.key, attr.size, attr.required, attr.default);
                } else if (attr.type === 'double') {
                    await databases.createFloatAttribute(DATABASE_ID, CENTERS_COLLECTION_ID, attr.key, attr.required, 0, 1000000, attr.default); // min/max required for float in some SDK versions, or strictly type 'double'
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DATABASE_ID, CENTERS_COLLECTION_ID, attr.key, attr.required, 0, 10000, attr.default);
                }
                console.log(`Created attribute: ${attr.key}`);
            } catch (error) {
                if (error.code === 409) {
                    console.log(`Attribute ${attr.key} already exists`);
                } else {
                    console.error(`Failed to create attribute ${attr.key}:`, error.message);
                }
            }
            // Wait a bit to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('Centers collection setup complete!');

    } catch (error) {
        console.error('Error initializing centers collection:', error);
    }
}

initCentersCollection();
