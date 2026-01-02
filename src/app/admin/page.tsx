"use client"

import { useEffect, useState } from "react"
import { databases, account, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
    const router = useRouter()
    const [pendingVolunteers, setPendingVolunteers] = useState<any[]>([])
    const [activeCheckins, setActiveCheckins] = useState<any[]>([])
    const [pendingReviews, setPendingReviews] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Verify Admin
                // In a real app, strict server-side check or stronger role check
                // For now, client side check
                const user = await account.get()
                // Fetch profile to check role
                const profile = await databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.volunteersCollectionId, [
                    Query.equal('userId', user.$id)
                ])
                if (profile.documents.length === 0 || profile.documents[0].role !== 'admin') {
                    // Redirect if not admin
                    // router.push("/dashboard") 
                }

                // 1. Pending Volunteers
                const volunteersRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [Query.equal('isApproved', false)]
                );
                setPendingVolunteers(volunteersRes.documents);

                // 2. Active Checkins (Current volunteers onsite)
                const checkinsRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [Query.equal('status', 'active')]
                );
                setActiveCheckins(checkinsRes.documents);

                // 3. Pending Reviews (Completed check-ins needing approval)
                const reviewsRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [Query.equal('status', 'pending_review')]
                );
                setPendingReviews(reviewsRes.documents);

            } catch (error: any) {
                // Silently redirect to login if not authenticated
                if (error.code === 401 || error.type === 'general_unauthorized_scope') {
                    router.push("/login")
                }
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [router])

    const approveVolunteer = async (id: string) => {
        try {
            await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.volunteersCollectionId, id, {
                isApproved: true
            });
            setPendingVolunteers(prev => prev.filter(v => v.$id !== id));
        } catch (error) {
            console.error(error);
        }
    }

    const validateCheckIn = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.checkinsCollectionId, id, {
                status: status
            });
            setPendingReviews(prev => prev.filter(c => c.$id !== id));
            // Recalculate if active checkins changed (not relevant here as this is pending reviews)
        } catch (error) {
            console.error(error);
        }
    }

    if (isLoading) return null

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button onClick={() => router.push('/admin/reports')} variant="outline">View Reports</Button>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Active Check-ins */}
                <Card>
                    <CardHeader>
                        <CardTitle>Currently Volunteering ({activeCheckins.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeCheckins.length === 0 ? (
                            <p className="text-muted-foreground">No volunteers currently checked in.</p>
                        ) : (
                            <ul className="space-y-4">
                                {activeCheckins.map((checkin) => (
                                    <li key={checkin.$id} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <p className="font-medium">Volunteer ID: {checkin.volunteerId}</p>
                                            <p className="text-sm text-gray-500">Since: {new Date(checkin.startTime).toLocaleTimeString()}</p>
                                            <p className="text-xs badge bg-blue-100 text-blue-800 px-2 py-1 rounded">{checkin.type}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Reviews (Hours) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Timesheets to Approve ({pendingReviews.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pendingReviews.length === 0 ? (
                            <p className="text-muted-foreground">No hours pending approval.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Volunteer ID</th>
                                            <th className="px-4 py-2">Activity</th>
                                            <th className="px-4 py-2">Hours</th>
                                            <th className="px-4 py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingReviews.map((checkin) => (
                                            <tr key={checkin.$id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-2">{new Date(checkin.startTime).toLocaleDateString()}</td>
                                                <td className="px-4 py-2">{checkin.volunteerId}</td>
                                                <td className="px-4 py-2 badge text-xs">{checkin.type}</td>
                                                <td className="px-4 py-2 font-bold">{checkin.calculatedHours} hrs</td>
                                                <td className="px-4 py-2 space-x-2">
                                                    <Button size="sm" onClick={() => validateCheckIn(checkin.$id, 'approved')} className="bg-green-600">Accept</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => validateCheckIn(checkin.$id, 'rejected')}>Reject</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Approvals (Registrations) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Registrations ({pendingVolunteers.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pendingVolunteers.length === 0 ? (
                            <p className="text-muted-foreground">No pending registrations.</p>
                        ) : (
                            <ul className="space-y-4">
                                {pendingVolunteers.map((vol) => (
                                    <li key={vol.$id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded shadow-sm gap-4">
                                        <div>
                                            <p className="font-medium">{vol.firstName} {vol.lastName}</p>
                                            <p className="text-sm text-gray-500">{vol.email}</p>
                                            <div className="flex gap-2 text-xs text-gray-400">
                                                <span>{vol.relationshipType}</span>
                                                <span className="capitalize text-blue-500">{vol.role}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                            <Button onClick={() => approveVolunteer(vol.$id)} size="sm" className="bg-green-600 hover:bg-green-700">
                                                Approve
                                            </Button>
                                            {/* Simulate Super Admin Check - In real app, check current user role */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.volunteersCollectionId, vol.$id, { role: 'admin' });
                                                    setPendingVolunteers(prev => prev.map(p => p.$id === vol.$id ? { ...p, role: 'admin' } : p));
                                                }}
                                            >
                                                Make Admin
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
