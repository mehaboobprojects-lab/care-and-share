import { Client, Databases } from 'node-appwrite';

export const createAdminClient = async () => {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
        .setKey(process.env.APPWRITE_API_KEY || ''); // This MUST be set in .env.local

    return {
        get database() {
            return new Databases(client);
        }
    };
};
