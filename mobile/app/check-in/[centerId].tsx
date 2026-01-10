
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, APPWRITE_CONFIG } from '../../src/lib/appwrite';
import { useAuth } from '../../src/context/AuthContext';
import { ID } from 'react-native-appwrite';
import * as Location from 'expo-location';

export default function CheckInScreen() {
    const { centerId } = useLocalSearchParams();
    const { user, volunteer } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [centerName, setCenterName] = useState(centerId); // Initially use ID as name until potentially fetched

    const handleCheckIn = async () => {
        if (!user || !volunteer) return;
        setLoading(true);

        try {
            const location = await Location.getCurrentPositionAsync({});

            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                ID.unique(),
                {
                    volunteerId: volunteer.$id,
                    centerId: centerId, // Assuming centerId passed is the name or ID. If Name, we might want to store Name or lookup ID.
                    checkInTime: new Date().toISOString(),
                    location: `${location.coords.latitude},${location.coords.longitude}`,
                }
            );

            Alert.alert("Success!", "You have checked in successfully.");
            router.replace('/');
        } catch (error: any) {
            Alert.alert("Check-in Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-teal-500 justify-center items-center p-6">
            <View className="bg-white p-8 rounded-3xl w-full items-center shadow-lg">
                <Text className="text-4xl mb-4">📍</Text>
                <Text className="text-slate-500 text-lg mb-1">Welcome to</Text>
                <Text className="text-2xl font-bold text-slate-900 text-center mb-6">{centerId}</Text>

                <Text className="text-center text-slate-500 mb-8">
                    Please confirm your check-in to record your service hours.
                </Text>

                <TouchableOpacity
                    className="bg-teal-600 w-full p-5 rounded-2xl items-center shadow-md active:bg-teal-700"
                    onPress={handleCheckIn}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : (
                        <Text className="text-white font-bold text-xl uppercase tracking-wider">Check In Now</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-6 p-2"
                    onPress={() => router.replace('/')}
                >
                    <Text className="text-slate-400">Cancel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
