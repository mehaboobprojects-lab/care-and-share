"use client"

import { useState, useEffect } from "react"
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { ID, Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface CheckInProps {
    volunteerId: string; // The primary ID (self)
    existingCheckIn?: any;
    onStatusChange: () => void;
    volunteerIds?: string[]; // Optional list for collective check-in
    volunteerNames?: Record<string, string>; // Optional mapping of ID to Name
}

export function CheckInManager({ volunteerId, existingCheckIn, onStatusChange, volunteerIds, volunteerNames }: CheckInProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [activeCheckIn, setActiveCheckIn] = useState(existingCheckIn)
    const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>(Array.from(new Set(volunteerIds || [volunteerId])))
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Sync state with props when data is fetched from parent
    useEffect(() => {
        if (existingCheckIn) {
            setActiveCheckIn(existingCheckIn)
        } else {
            setActiveCheckIn(null)
        }
    }, [existingCheckIn])

    useEffect(() => {
        if (volunteerIds) {
            setSelectedVolunteers(Array.from(new Set(volunteerIds)))
        }
    }, [volunteerIds])

    async function handleCheckIn(type: string = 'sandwich_making') {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const targets = volunteerIds?.length ? selectedVolunteers : [volunteerId];

            if (targets.length === 0) {
                setErrorMessage("Please select at least one person.");
                setIsLoading(false);
                return;
            }

            // 1. Fetch ALL existing active check-ins for the selected targets in ONE call
            const existingCheckInsRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                [
                    Query.equal('volunteerId', targets),
                    Query.equal('status', 'active')
                ]
            );

            const alreadyCheckedInIds = new Set(existingCheckInsRes.documents.map(doc => doc.volunteerId));

            if (alreadyCheckedInIds.size > 0) {
                // If anyone is already checked in, we stop and warn the user
                setErrorMessage("One or more selected people are already checked in.");
                setIsLoading(false);
                return;
            }

            // 2. Perform check-ins
            for (const targetId of targets) {
                const checkIn = await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    ID.unique(),
                    {
                        volunteerId: targetId,
                        startTime: new Date().toISOString(),
                        status: 'active',
                        type: type,
                    }
                );

                if (targetId === volunteerId) {
                    setActiveCheckIn(checkIn);
                }
            }

            onStatusChange();
            if (volunteerIds?.length) {
                alert("Check-in successful!");
            }
        } catch (error: any) {
            console.error(error);
            setErrorMessage("Failed to check in: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }



    // 2. If parent is NOT checked in, but we have some dependents selected who MIGHT be checked in?
    // Actually, the parent view shows "CHECK OUT" only if *activeCheckIn* (msg 130) is present, which is the parent's session.
    // We need to allow checking out OTHERS even if parent isn't checked in, OR change the UX.
    // BUT the requirement is "kids checkout time and updated".
    // The current CheckInManager primarily tracks 'activeCheckIn' which is passed from parent page as *the parent's* checkin.
    // If the parent checks in *just the kids*, activeCheckIn is null.
    // So the parent sees the "Start Sandwich Making" button again?
    // Yes. And if they click it again for kids who are already active, it says "already checked in".
    // So there is NO button to check out the kids if the parent isn't checked in.

    // FIX: We need to see if ANY of the selected volunteers have an active check-in.
    // However, the component structure relies on `existingCheckIn` prop from the parent page, which currently usually usually only tracks the logged-in user?
    // Let's look at how CheckInManager is used in parent/page.tsx... getting that file next.

    // For now, I will update the handleCheckOut to actually loop through `selectedVolunteers` (or all) if possible?
    // `activeCheckIn` is a single document.
    // If we want group checkout, we need to find active checkins for all targets.

    async function handleCheckOut() {
        setIsLoading(true);
        try {
            // If we are in "group mode", we should try to check out everyone in the list who is active?
            // Or just the people currently selected?
            // "volunteerIds" are the dependents + parent.
            // Let's fetch active checkins for ALL associated IDs.

            const targets = volunteerIds?.length ? volunteerIds : [volunteerId];

            const activeSessions = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                [
                    Query.equal('volunteerId', targets),
                    Query.equal('status', 'active')
                ]
            );

            const endTime = new Date();

            for (const session of activeSessions.documents) {
                const startTime = new Date(session.startTime);
                const durationMs = endTime.getTime() - startTime.getTime();
                const hours = durationMs / (1000 * 60 * 60);

                await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    session.$id,
                    {
                        endTime: endTime.toISOString(),
                        status: 'pending_review',
                        calculatedHours: parseFloat(hours.toFixed(2))
                    }
                );
            }

            setActiveCheckIn(null);
            onStatusChange();
            if (activeSessions.documents.length > 0) {
                alert(`Checked out ${activeSessions.documents.length} volunteer(s)!`);
            } else {
                // Fallback if state was out of sync
                setActiveCheckIn(null);
            }

        } catch (error: any) {
            console.error(error);
            setErrorMessage("Failed to check out: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }

    // Check for any active sessions in the group
    const [hasGroupActiveSession, setHasGroupActiveSession] = useState(false);

    useEffect(() => {
        async function checkGroupStatus() {
            if (volunteerIds && volunteerIds.length > 0) {
                try {
                    const existingCheckInsRes = await databases.listDocuments(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.checkinsCollectionId,
                        [
                            Query.equal('volunteerId', volunteerIds),
                            Query.equal('status', 'active')
                        ]
                    );
                    setHasGroupActiveSession(existingCheckInsRes.documents.length > 0);
                } catch (e) {
                    console.error("Failed to check group status", e);
                }
            } else if (activeCheckIn) {
                setHasGroupActiveSession(true);
            } else {
                setHasGroupActiveSession(false);
            }
        }
        checkGroupStatus();
    }, [volunteerIds, activeCheckIn, onStatusChange]); // Re-check when status changes

    if (activeCheckIn || hasGroupActiveSession) {
        return (
            <div className="flex flex-col gap-4 items-center">
                <div className="text-xl font-semibold border-b border-border pb-2 mb-2 animate-pulse text-primary dark:text-primary-foreground">
                    {/* If multiple people, just say "Active Session" */}
                    {hasGroupActiveSession ? "Active Group Session" : `Currently Checked In (${new Date(activeCheckIn.startTime).toLocaleTimeString()})`}
                </div>
                <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    className="w-full h-24 text-2xl"
                >
                    {isLoading ? "Processing..." : "CHECK OUT GROUP"}
                </Button>
                <p className="text-sm text-muted-foreground">Don't forget to check out to log your hours!</p>
            </div>
        )
    }



    return (
        <div className="grid grid-cols-1 gap-4 w-full">
            {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm mb-2">
                    {errorMessage}
                </div>
            )}

            {volunteerIds && volunteerIds.length > 0 && (
                <div className="mb-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium mb-3">Select who is attending:</p>
                    <div className="space-y-2">
                        {volunteerIds.map(id => (
                            <label key={id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={selectedVolunteers.includes(id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedVolunteers(prev => [...prev, id]);
                                        else setSelectedVolunteers(prev => prev.filter(sid => sid !== id));
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">
                                    {volunteerNames?.[id] || (id === volunteerId ? "Self (Parent)" : "Volunteer")}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <Button
                size="lg"
                onClick={() => handleCheckIn('sandwich_making')}
                disabled={isLoading}
                className="w-full h-20 text-xl"
            >
                {volunteerIds ? "Start Sandwich Making for Group" : "Start Sandwich Making"}
            </Button>
            {/* Other buttons updated to match if needed */}
        </div>
    )
}
