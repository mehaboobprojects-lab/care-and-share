"use client"

import { useState } from "react"
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { ID, Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface CheckInProps {
    volunteerId: string;
    existingCheckIn?: any;
    onStatusChange: () => void;
}

export function CheckInManager({ volunteerId, existingCheckIn, onStatusChange }: CheckInProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [activeCheckIn, setActiveCheckIn] = useState(existingCheckIn)

    async function handleCheckIn(type: string = 'sandwich_making') {
        setIsLoading(true);
        try {
            const checkIn = await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                ID.unique(),
                {
                    volunteerId: volunteerId,
                    startTime: new Date().toISOString(),
                    status: 'active',
                    type: type,
                }
            );
            setActiveCheckIn(checkIn);
            onStatusChange();
            // toast.success("Checked in successfully!");
        } catch (error) {
            console.error(error);
            // toast.error("Failed to check in");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCheckOut() {
        if (!activeCheckIn) return;
        setIsLoading(true);
        try {
            const endTime = new Date();
            const startTime = new Date(activeCheckIn.startTime);
            const durationMs = endTime.getTime() - startTime.getTime();
            const hours = durationMs / (1000 * 60 * 60);

            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                activeCheckIn.$id,
                {
                    endTime: endTime.toISOString(),
                    status: 'pending_review',
                    calculatedHours: parseFloat(hours.toFixed(2))
                }
            );
            setActiveCheckIn(null);
            onStatusChange();
            // toast.success("Checked out! Hours submitted for approval.");
        } catch (error) {
            console.error(error);
            // toast.error("Failed to check out");
        } finally {
            setIsLoading(false);
        }
    }

    if (activeCheckIn) {
        return (
            <div className="flex flex-col gap-4 items-center">
                <div className="text-xl font-semibold border-b border-border pb-2 mb-2 animate-pulse text-primary dark:text-primary-foreground">
                    Currently Checked In ({new Date(activeCheckIn.startTime).toLocaleTimeString()})
                </div>
                <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    className="w-full h-24 text-2xl"
                >
                    {isLoading ? "Processing..." : "CHECK OUT"}
                </Button>
                <p className="text-sm text-muted-foreground">Don't forget to check out to log your hours!</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 w-full">
            <Button
                size="lg"
                onClick={() => handleCheckIn('sandwich_making')}
                disabled={isLoading}
                className="w-full h-20 text-xl"
            >
                Start Sandwich Making
            </Button>
            <Button
                size="lg"
                variant="secondary"
                onClick={() => handleCheckIn('distribution')}
                disabled={isLoading}
                className="w-full h-16 text-lg"
            >
                Start Distribution
            </Button>
            <Button
                size="lg"
                variant="outline"
                onClick={() => handleCheckIn('parent_dropoff')}
                disabled={isLoading}
                className="w-full h-16 text-lg"
            >
                Parent Drop-off
            </Button>
        </div>
    )
}
