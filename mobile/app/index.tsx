
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl, LogBox } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { databases, APPWRITE_CONFIG } from '../src/lib/appwrite';

// Ignore specific warnings
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function Dashboard() {
    const { user, volunteer, logout, isLoading } = useAuth();
    const router = useRouter();
    const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
    const [centers, setCenters] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isLoading || !user) return;

        (async () => {
            // Request permissions on mount
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Location permission is required for auto check-in.');
            } else {
                // Also request background (might fail on iOS Expo Go)
                try {
                    await Location.requestBackgroundPermissionsAsync();
                } catch (e) {
                    console.log("Background permission not supported in this client");
                }
            }

            fetchCenters();
        })();
    }, [isLoading, user]);

    const fetchCenters = async () => {
        try {
            const res = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.centersCollectionId
            );
            setCenters(res.documents);
            console.log(`Fetched ${res.documents.length} centers.`);

            // Start Geofencing
            if (res.documents.length > 0) {
                const { startGeofencing } = require('../src/lib/geofencing');
                startGeofencing(res.documents);
            }
        } catch (error: any) {
            console.error("Failed to fetch centers", error);
            Alert.alert("Error Loading Centers", error.message || "Unknown error");
        }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCenters();
        setRefreshing(false);
    };

    const handleDeleteCenter = async (centerId: string, centerName: string) => {
        Alert.alert(
            "Delete Center",
            `Are you sure you want to delete "${centerName}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await databases.deleteDocument(
                                APPWRITE_CONFIG.databaseId,
                                APPWRITE_CONFIG.centersCollectionId,
                                centerId
                            );
                            // Refresh list
                            fetchCenters();
                            Alert.alert("Deleted", "Center removed successfully.");
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete center");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="bg-white p-6 shadow-sm border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-bold text-slate-800">Hello, {volunteer?.firstName || 'Volunteer'}</Text>
                        <Text className="text-slate-500">Ready to serve?</Text>
                    </View>
                    <TouchableOpacity onPress={logout} className="shrink-0 p-2">
                        <Text className="text-red-500 font-medium" numberOfLines={1} adjustsFontSizeToFit>Log out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="p-6"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#14b8a6']} />
                }
            >
                <View className="bg-teal-500 p-6 rounded-2xl mb-6 shadow-sm">
                    <Text className="text-white font-bold text-lg mb-2">📍 Auto Check-In Active</Text>
                    <Text className="text-teal-50">
                        You will be automatically prompted to check in when you arrive at a registered center.
                    </Text>
                    {locationPermission === 'granted' ? (
                        <View className="bg-teal-600 self-start px-3 py-1 rounded-full mt-4">
                            <Text className="text-xs text-white font-medium">GPS Monitoring On</Text>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => Location.requestForegroundPermissionsAsync()} className="bg-white self-start px-4 py-2 rounded-full mt-4">
                            <Text className="text-teal-600 font-bold">Enable Location</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {volunteer?.role === 'super_admin' && (
                    <TouchableOpacity
                        className="bg-purple-600 p-5 rounded-2xl mb-6 flex-row items-center justify-between shadow-sm"
                        onPress={() => router.push('/add-center')}
                    >
                        <View>
                            <Text className="text-white font-bold text-lg">Manage Centers</Text>
                            <Text className="text-purple-100">Add or remove geofence locations</Text>
                        </View>
                        <Text className="text-3xl">🏢</Text>
                    </TouchableOpacity>
                )}

                <Text className="text-lg font-bold text-slate-800 mb-4">Nearby Centers</Text>
                {centers.length === 0 ? (
                    <Text className="text-slate-500 italic">No centers configured yet.</Text>
                ) : (
                    centers.map(center => (
                        <View key={center.$id} className="bg-white p-4 rounded-xl mb-3 border border-gray-100 flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="font-semibold text-slate-800">{center.name}</Text>
                                <Text className="text-xs text-slate-400">Radius: {center.radius}m</Text>
                            </View>

                            {volunteer?.role === 'super_admin' && (
                                <View className="flex-row">
                                    <TouchableOpacity
                                        onPress={() => router.push(`/edit-center/${center.$id}`)}
                                        className="bg-blue-50 p-2 rounded-full ml-2"
                                    >
                                        <Text>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteCenter(center.$id, center.name)}
                                        className="bg-red-50 p-2 rounded-full ml-2"
                                    >
                                        <Text>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}

            </ScrollView>
        </SafeAreaView>
    );
}
