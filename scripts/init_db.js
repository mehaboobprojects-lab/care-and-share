const sdk = require('node-appwrite');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('.env.local file not found.');
    process.exit(1);
}

const client = new sdk.Client();
const databases = new sdk.Databases(client);

// Check for API Key
if (!process.env.APPWRITE_API_KEY) {
    console.error('Error: APPWRITE_API_KEY is missing in .env.local');
    console.log('Please add your Appwrite API Key to .env.local with the following scopes:');
    console.log('collections.read, collections.write, attributes.read, attributes.write, indexes.read, indexes.write, documents.read, documents.write');
    process.exit(1);
}

client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const DB_ID = 'care_share_db';

async function initDB() {
    try {
        // 1. Create Database
        try {
            await databases.get(DB_ID);
            console.log(`Database ${DB_ID} already exists.`);
        } catch (error) {
            if (error.code === 404) {
                await databases.create(DB_ID, 'Care and Share DB');
                console.log(`Database ${DB_ID} created.`);
            } else {
                throw error;
            }
        }

        // 2. Create Volunteers Collection
        const VOLUNTEERS_ID = 'volunteers';
        try {
            await databases.getCollection(DB_ID, VOLUNTEERS_ID);
            console.log(`Collection ${VOLUNTEERS_ID} already exists.`);
        } catch (error) {
            if (error.code === 404) {
                await databases.createCollection(DB_ID, VOLUNTEERS_ID, 'Volunteers');
                console.log(`Collection ${VOLUNTEERS_ID} created.`);

                // Attributes
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'firstName', 100, true);
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'lastName', 100, true);
                await databases.createEmailAttribute(DB_ID, VOLUNTEERS_ID, 'email', true);
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'phone', 20, true);
                await databases.createIntegerAttribute(DB_ID, VOLUNTEERS_ID, 'age', true);
                await databases.createEnumAttribute(DB_ID, VOLUNTEERS_ID, 'relationshipType', ['son', 'daughter', 'friend', 'self'], true);
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'schoolGrade', 50, true);
                await databases.createEnumAttribute(DB_ID, VOLUNTEERS_ID, 'role', ['volunteer', 'admin', 'super_admin'], false, 'volunteer');
                await databases.createBooleanAttribute(DB_ID, VOLUNTEERS_ID, 'isApproved', false, false);
                await databases.createStringAttribute(DB_ID, VOLUNTEERS_ID, 'userId', 255, true); // Link to Auth ID

                // Indexes
                await databases.createIndex(DB_ID, VOLUNTEERS_ID, 'idx_email', 'unique', ['email']);
                await databases.createIndex(DB_ID, VOLUNTEERS_ID, 'idx_userId', 'unique', ['userId']);
                console.log(`Attributes and Indexes for ${VOLUNTEERS_ID} created.`);
            } else {
                throw error;
            }
        }

        // 3. Create Checkins Collection
        const CHECKINS_ID = 'checkins';
        try {
            await databases.getCollection(DB_ID, CHECKINS_ID);
            console.log(`Collection ${CHECKINS_ID} already exists.`);
        } catch (error) {
            if (error.code === 404) {
                await databases.createCollection(DB_ID, CHECKINS_ID, 'Checkins');
                console.log(`Collection ${CHECKINS_ID} created.`);

                // Attributes
                await databases.createStringAttribute(DB_ID, CHECKINS_ID, 'volunteerId', 255, true);
                await databases.createDatetimeAttribute(DB_ID, CHECKINS_ID, 'startTime', true);
                await databases.createDatetimeAttribute(DB_ID, CHECKINS_ID, 'endTime', false);
                await databases.createEnumAttribute(DB_ID, CHECKINS_ID, 'status', ['active', 'pending_review', 'approved', 'rejected'], false, 'active');
                await databases.createEnumAttribute(DB_ID, CHECKINS_ID, 'type', ['sandwich_making', 'distribution', 'parent_dropoff'], true);
                await databases.createFloatAttribute(DB_ID, CHECKINS_ID, 'calculatedHours', false, 0.0);
                await databases.createStringAttribute(DB_ID, CHECKINS_ID, 'adminNotes', 1000, false);

                // Indexes
                await databases.createIndex(DB_ID, CHECKINS_ID, 'idx_volunteer', 'key', ['volunteerId']);
                await databases.createIndex(DB_ID, CHECKINS_ID, 'idx_startTime', 'key', ['startTime']);
                await databases.createIndex(DB_ID, CHECKINS_ID, 'idx_status', 'key', ['status']);
                console.log(`Attributes and Indexes for ${CHECKINS_ID} created.`);
            } else {
                throw error;
            }
        }

        console.log('Database initialization complete!');

    } catch (error) {
        console.error('Database initialization failed:', error);
    }
}

initDB();
