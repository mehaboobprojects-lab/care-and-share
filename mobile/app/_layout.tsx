import "../global.css";
import { Slot, useRouter } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
// import * as Notifications from 'expo-notifications'; 
// import * as Notifications from 'expo-notifications';
// Notifications is causing crashes in Expo Go Android SDK 53 due to remote push removal.
// We will rely on Alerts/Foreground UI for testing.

function RootLayoutNav() {
    const router = useRouter();

    // useEffect(() => {
    //     // Notification listener removed for Expo Go stability
    // }, []);

    return (
        <AuthProvider>
            <Slot />
        </AuthProvider>
    );
}

export default function RootLayout() {
    return (
        <RootLayoutNav />
    );
}
