import { Client, Account, Databases } from 'react-native-appwrite';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject('6953de7c00347b6446b3')
    .setPlatform('com.careandshare.mobile');

export const account = new Account(client);
export const databases = new Databases(client);

export const APPWRITE_CONFIG = {
    databaseId: 'care_share_db',
    volunteersCollectionId: 'volunteers',
    checkinsCollectionId: 'checkins',
    centersCollectionId: 'centers',
};
