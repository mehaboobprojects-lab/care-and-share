import { Client, Account, Databases, Storage, Functions } from 'appwrite';

export const APPWRITE_CONFIG = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'dummy_project_id',
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'care_share_db',
    volunteersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID_VOLUNTEERS || 'volunteers',
    checkinsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID_CHECKINS || 'checkins',
};

export const client = new Client();

client
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

console.log('Appwrite Client Initialized', APPWRITE_CONFIG);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
