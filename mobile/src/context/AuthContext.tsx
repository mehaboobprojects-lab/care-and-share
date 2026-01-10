
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { account, databases, APPWRITE_CONFIG } from "../lib/appwrite";
import { Models, Query } from "react-native-appwrite";
import { useRouter, useSegments } from "expo-router";

interface Volunteer extends Models.Document {
    firstName: string;
    lastName: string;
    role: string;
    isApproved: boolean;
    email: string;
    phone?: string;
}

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    volunteer: Volunteer | null;
    isLoading: boolean;
    refreshAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    const fetchAuth = async () => {
        try {
            const sessionUser = await account.get();
            setUser(sessionUser);

            // Fetch volunteer profile
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [Query.equal('userId', sessionUser.$id)]
            );

            if (response.documents.length > 0) {
                setVolunteer(response.documents[0] as unknown as Volunteer);
            } else {
                setVolunteer(null);
            }
        } catch (err: any) {
            setUser(null);
            setVolunteer(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAuth();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Redirect to login if not logged in
            router.replace('/login');
        } else if (user && inAuthGroup) {
            // Redirect to home/dashboard if logged in
            router.replace('/');
        }
    }, [user, isLoading, segments]);

    const logout = async () => {
        setIsLoading(true);
        try {
            await account.deleteSession("current");
            setUser(null);
            setVolunteer(null);
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, volunteer, isLoading, refreshAuth: fetchAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
