
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
// import * as Notifications from 'expo-notifications'; // Removed for Android Expo Go stability
import { databases, APPWRITE_CONFIG } from './appwrite';

const GEOFENCE_TASK_NAME = 'GEOFENCE_TASK';

// Define the task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error('Geofencing task error:', error);
        return;
    }

    if (data.eventType === Location.GeofencingEventType.Enter) {
        const region = data.region;
        console.log('You entered region:', region.identifier);

        // Use Alert instead of Notification for Expo Go
        // Note: TaskManager runs in background, so Alert might not show if app is backgrounded.
        // But for "Foreground Simulation" (which calls checkRegions below), Alert works fine.
        console.log("Check-in prompt triggered for " + region.identifier);
    }
});

// Function to start monitoring
export async function startGeofencing(centers: any[]) {
    let hasBackgroundPerm = false;
    // Check permissions first
    try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status === 'granted') {
            hasBackgroundPerm = true;
        } else {
            console.log('Background location permission not granted');
        }
    } catch (e) {
        console.log('Background location request failed (likely Expo Go on iOS). Using foreground fallback.');
    }

    const regions = centers.map(center => ({
        identifier: center.name, // Using name as identifier for notification readability
        latitude: center.latitude,
        longitude: center.longitude,
        radius: center.radius || 150,
        notifyOnEnter: true,
        notifyOnExit: false,
    }));

    if (regions.length > 0) {
        if (hasBackgroundPerm) {
            await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
            console.log(`Monitoring ${regions.length} regions (Background Mode).`);
        } else {
            console.log(`Monitoring ${regions.length} regions (Foreground Mode - Simulation).`);
            // Fallback: Use foreground watcher to simulate geofencing
            await startForegroundGeofencing(regions);
        }
    }
}

// Simple foreground watcher for testing in Expo Go
let foregroundSubscription: Location.LocationSubscription | null = null;

async function startForegroundGeofencing(regions: any[]) {
    if (foregroundSubscription) {
        foregroundSubscription.remove();
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    foregroundSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
            const { latitude, longitude } = location.coords;
            checkRegions(latitude, longitude, regions);
        }
    );
}

// Helper to calculate distance and trigger notification
// Helper to calculate distance and trigger notification
// Actually, let's write a simple Haversine function to avoid new dependencies if possible, or just install geolib.
// Let's stick to a simple function to avoid install steps if possible.

function checkRegions(lat: number, lng: number, regions: any[]) {
    regions.forEach(region => {
        const distance = calculateDistance(lat, lng, region.latitude, region.longitude);
        if (distance <= region.radius) {
            // mimic the event
            console.log(`Foreground Entry: ${region.identifier}`);

            Alert.alert(
                "You've arrived! 🥪",
                `Tap 'OK' to check in at ${region.identifier}`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Check In", onPress: () => {
                            // In a real app we'd navigate, but for now just show confirmation or use a global event listener/router 
                            // Since we don't have navigation context here easily, we rely on the user seeing the center in the list.
                            // Or we can try to find a way to navigate.
                            console.log("Navigate to check-in " + region.identifier);
                            // Ideally: router.push(`/check-in/${region.identifier}`) if we had access to it.
                        }
                    }
                ]
            );
        }
    });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

export async function stopGeofencing() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    if (foregroundSubscription) {
        foregroundSubscription.remove();
        foregroundSubscription = null;
    }
}
