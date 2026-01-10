
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { account } from '../../src/lib/appwrite';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { refreshAuth } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            // Clear existing session if any
            try {
                await account.deleteSession('current');
            } catch (e) {
                // Ignore if no session
            }

            await account.createEmailPasswordSession(email, password);
            await refreshAuth();
            // AuthContext will handle redirect
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Please check your credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-900 justify-center px-6">
            <View className="items-center mb-10 w-full">
                <Text className="text-4xl">🍞</Text>
                <Text className="text-3xl font-bold text-teal-400 mt-2 text-center" adjustsFontSizeToFit numberOfLines={1}>Care & Share</Text>
                <Text className="text-gray-400 mt-1 text-center">Volunteer Mobile App</Text>
            </View>

            <View className="space-y-4">
                <View>
                    <Text className="text-gray-300 mb-1 ml-1">Email</Text>
                    <TextInput
                        className="w-full bg-slate-800 text-white p-4 rounded-xl border border-slate-700"
                        placeholder="Enter your email"
                        placeholderTextColor="#64748b"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View>
                    <Text className="text-gray-300 mb-1 ml-1">Password</Text>
                    <TextInput
                        className="w-full bg-slate-800 text-white p-4 rounded-xl border border-slate-700"
                        placeholder="Enter your password"
                        placeholderTextColor="#64748b"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    className="w-full bg-teal-500 p-4 rounded-xl mt-4 items-center"
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-slate-900 font-bold text-lg text-center" adjustsFontSizeToFit numberOfLines={1}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
