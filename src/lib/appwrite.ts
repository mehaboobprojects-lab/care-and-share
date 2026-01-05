import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const sanitize = (val: string | undefined): string => {
    if (!val) return "";
    let s = val.trim();
    if (s.startsWith('=')) s = s.substring(1).trim();
    return s;
};

export const APPWRITE_CONFIG = {
    endpoint: sanitize(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1',
    projectId: sanitize(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) || 'dummy_project_id',
    databaseId: sanitize(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) || 'care_share_db',
    volunteersCollectionId: sanitize(process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID_VOLUNTEERS) || 'volunteers',
    checkinsCollectionId: sanitize(process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID_CHECKINS) || 'checkins',
};

export const client = new Client();

let finalEndpoint = APPWRITE_CONFIG.endpoint;

// Ensure protocol (avoid double https://)
if (!finalEndpoint.startsWith('http')) {
    finalEndpoint = `https://${finalEndpoint}`;
}

// Ensure /v1 suffix
if (!finalEndpoint.endsWith('/v1')) {
    finalEndpoint = finalEndpoint.endsWith('/')
        ? `${finalEndpoint}v1`
        : `${finalEndpoint}/v1`;
}

client
    .setEndpoint(finalEndpoint)
    .setProject(APPWRITE_CONFIG.projectId);

console.log('Appwrite Client Initialized', APPWRITE_CONFIG);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
