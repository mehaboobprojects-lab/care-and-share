
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { databases, APPWRITE_CONFIG, account } from '../../src/lib/appwrite';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

export default function EditCenterScreen() {
    const router = useRouter();
    const { centerId } = useLocalSearchParams(); // Get centerId from params
    const { user } = useAuth();
    const [loading, setLoading] = useState(true); // Start loading to fetch data
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('150');

    useEffect(() => {
        if (centerId) {
            fetchCenterData();
        }
    }, [centerId]);

    const fetchCenterData = async () => {
        try {
            const doc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.centersCollectionId,
                centerId as string
            );
            setName(doc.name);
            setLatitude(doc.latitude.toString());
            setLongitude(doc.longitude.toString());
            setRadius(doc.radius?.toString() || '150');
        } catch (error) {
            Alert.alert('Error', 'Failed to load center details.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = async () => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to get current coordinates.');
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setLatitude(location.coords.latitude.toString());
            setLongitude(location.coords.longitude.toString());
        } catch (e) {
            Alert.alert('Error', 'Could not fetch location');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!name || !latitude || !longitude || !radius) {
            Alert.alert('Missing fields', 'Please fill in all fields.');
            return;
        }

        setSaving(true);
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.centersCollectionId,
                centerId as string,
                {
                    name,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    radius: parseInt(radius)
                }
            );
            Alert.alert('Success', 'Center updated successfully!');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update center');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
                <ActivityIndicator size="large" color="#14b8a6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="bg-white p-4 items-center border-b border-gray-100 flex-row justify-between">
                <TouchableOpacity onPress={() => router.back()} className="py-2 pr-4 shrink-0">
                    <Text className="text-teal-600 font-bold text-base" numberOfLines={1} adjustsFontSizeToFit>Cancel</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold text-center shrink" numberOfLines={1} adjustsFontSizeToFit>Edit Center</Text>
                <View className="w-10 opacity-0" />
            </View>

            <ScrollView className="p-6 space-y-4">
                <View>
                    <Text className="mb-2 text-slate-600 font-medium">Center Name</Text>
                    <TextInput
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        placeholder="e.g. North Brunswick High School"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View>
                    <Text className="mb-2 text-slate-600 font-medium">Coordinates</Text>
                    <View className="flex-row gap-2 mb-2">
                        <TextInput
                            className="flex-1 bg-white p-4 rounded-xl border border-gray-200"
                            placeholder="Latitude"
                            keyboardType="numeric"
                            value={latitude}
                            onChangeText={setLatitude}
                        />
                        <TextInput
                            className="flex-1 bg-white p-4 rounded-xl border border-gray-200"
                            placeholder="Longitude"
                            keyboardType="numeric"
                            value={longitude}
                            onChangeText={setLongitude}
                        />
                    </View>
                    <TouchableOpacity onPress={handleGetCurrentLocation} className="bg-slate-200 p-3 rounded-xl items-center">
                        <Text className="text-slate-700">📍 Update to Current Location</Text>
                    </TouchableOpacity>
                </View>

                <View>
                    <Text className="mb-2 text-slate-600 font-medium">Geofence Radius (meters)</Text>
                    <TextInput
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        placeholder="150"
                        keyboardType="numeric"
                        value={radius}
                        onChangeText={setRadius}
                    />
                    <Text className="text-xs text-gray-400 mt-1">Default is 150 meters.</Text>
                </View>

                <TouchableOpacity
                    className="bg-teal-500 p-4 rounded-xl mt-6 items-center"
                    onPress={handleUpdate}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Update Center</Text>}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}
