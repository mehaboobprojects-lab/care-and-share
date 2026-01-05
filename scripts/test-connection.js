const { Client, Account } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    // Sanitize like the app does
    const sanitize = (val) => {
        if (!val) return "";
        let s = val.trim();
        if (s.startsWith('=')) s = s.substring(1).trim();
        return s;
    };

    const finalEndpoint = sanitize(endpoint);
    const finalProjectId = sanitize(projectId);

    console.log('--- Appwrite Connection Diagnostic ---');
    console.log('Endpoint:', finalEndpoint);
    console.log('Project ID:', finalProjectId);

    const client = new Client()
        .setEndpoint(finalEndpoint)
        .setProject(finalProjectId);

    const account = new Account(client);

    try {
        console.log('\nTesting reachability...');
        // Try a public call (health check or list)
        // Note: listDocuments requires API Key, but we just want to see if the project exists
        // Get account usually returns 401 if valid but no session, or 404/403 if project invalid
        await account.get();
        console.log('✅ Connection Successful (Session check returned as expected).');
    } catch (err) {
        if (err.code === 401) {
            console.log('✅ Success: The Project ID is VALID (Received expected 401 Unauthorized for no session).');
        } else {
            console.error('❌ Error: Connection Failed');
            console.error('Code:', err.code);
            console.error('Message:', err.message);
            console.log('\nTIP: If code is 404 or 403, your Project ID is likely wrong.');
        }
    }
}

testConnection();
