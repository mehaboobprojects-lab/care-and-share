'use server'

import { createAdminClient } from "@/lib/server-appwrite";
import { APPWRITE_CONFIG } from "@/lib/appwrite";
import { Query } from "node-appwrite";

export async function checkEmailUnique(email: string): Promise<boolean> {
    if (!process.env.APPWRITE_API_KEY) {
        // If no API Key is configured, we cannot safely check server-side.
        // We allow the flow to proceed; Step 4 will fail if duplicate exists.
        console.warn("Skipping unique email check: APPWRITE_API_KEY not found.");
        return true;
    }

    try {
        const { database } = await createAdminClient();
        const { documents } = await database.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.volunteersCollectionId,
            [Query.equal('email', email)]
        );

        return documents.length === 0;
    } catch (error) {
        console.error("Failed to check email uniqueness:", error);
        // If check fails (e.g. network), we default to allowing (optimistic), 
        // to not block the user.
        return true;
    }
}
