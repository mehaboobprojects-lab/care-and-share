"use client"

import { useEffect, useState } from "react"
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import { Models, Query, ID } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { CheckInManager } from "@/components/check-in-manager"

interface Volunteer extends Models.Document {
    firstName: string;
    lastName: string;
    role: string;
    isApproved: boolean;
}

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function checkSession() {
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
                    // Handle edge case where auth exists but profile doesn't?
                    console.error("No volunteer profile found")
                }

            } catch (err: any) {
                console.error("Not logged in", err)
                // Redirect to login if not authenticated
                router.push("/login")
            } finally {
                setIsLoading(false);
            }
        }
        checkSession();
    }, [router]);

    const handleLogout = async () => {
        await account.deleteSession('current');
        router.push("/login");
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    if (!volunteer) return <div className="p-8">Access Denied. Please contact admin.</div>

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            <header className="bg-white shadow">
                <div className="mx-auto flex flex-col sm:flex-row max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8 gap-4 sm:gap-0">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">Hello, {volunteer.firstName}</span>
                        <Button variant="outline" onClick={handleLogout}>Logout</Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                {!volunteer.isApproved ? (
                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardHeader>
                            <CardTitle className="text-yellow-800">Account Pending Approval</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-yellow-700">
                                Your account is currently awaiting admin approval. You will be able to check in once approved.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle>Check In / Out</CardTitle>
                                <CardDescription>Record your volunteer hours</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CheckInManager
                                    volunteerId={volunteer.$id}
                                    existingCheckIn={null} // TODO: Fetch active checkin
                                    onStatusChange={() => { router.refresh() }}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0.0</div>
                                <p className="text-xs text-muted-foreground">Hours this month</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}
