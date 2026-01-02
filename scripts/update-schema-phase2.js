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

async function updateSchemaPhase2() {
    console.log('--- Updating Schema for Phase 2 ---');

    const attributes = [
        // Category & Relationship
        { type: 'enum', key: 'volunteerCategory', elements: ['student', 'adult'], required: false, default: 'adult' },
        // Making required:false initially to avoid breaking existing records, defaulting to 'adult'

        { type: 'enum', key: 'contactRelationship', elements: ['self', 'parent', 'guardian', 'other'], required: false, default: 'self' },

        // Contact Owner Info
        { type: 'string', key: 'contactName', size: 255, required: false }, // Optional for existing
        { type: 'string', key: 'contactEmail', size: 255, required: false },
        { type: 'string', key: 'contactPhone', size: 50, required: false },
        { type: 'string', key: 'address', size: 500, required: false },

        // Student Specific (Optional)
        { type: 'string', key: 'schoolName', size: 255, required: false },
        { type: 'string', key: 'schoolAddress', size: 500, required: false },
        { type: 'string', key: 'grade', size: 50, required: false },
        { type: 'string', key: 'parentName', size: 255, required: false },
        { type: 'string', key: 'parentPhone', size: 50, required: false },
        { type: 'string', key: 'studentId', size: 100, required: false },

        // Consent & Management
        { type: 'boolean', key: 'termsAccepted', required: false, default: false },
        { type: 'boolean', key: 'parentConsent', required: false, default: false },
        { type: 'string', key: 'managedBy', size: 255, required: false }, // User ID of parent
    ];

    for (const attr of attributes) {
        try {
            console.log(`Creating attribute '${attr.key}' ...`);
            if (attr.type === 'string') {
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.size, attr.required, attr.default);
            } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.required, attr.default);
            } else if (attr.type === 'enum') {
                await databases.createEnumAttribute(DB_ID, VOLUNTEERS_ID, attr.key, attr.elements, attr.required, attr.default);
            }
            console.log(` - Success: ${attr.key}`);
            // Small delay to prevent rate limits or race conditions
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            if (err.code === 409) {
                console.log(` - Attribute '${attr.key}' already exists.`);
            } else {
                console.error(` - Error creating '${attr.key}':`, err.message);
            }
        }
    }

    console.log('\nSchema update complete. Please wait a few minutes for attributes to become "Available" in Appwrite.');
}

updateSchemaPhase2();
