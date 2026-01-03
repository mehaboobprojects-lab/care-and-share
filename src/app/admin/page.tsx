"use client"

import { useEffect, useState } from "react"
import { databases, account, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/AuthContext"
import { sendApprovalEmail } from "@/lib/email-actions"

export default function AdminDashboard() {
    const router = useRouter()
    const { user, volunteer, isLoading } = useAuth()
    const [pendingVolunteers, setPendingVolunteers] = useState<any[]>([])
    const [activeCheckins, setActiveCheckins] = useState<any[]>([])
    const [pendingReviews, setPendingReviews] = useState<any[]>([])

    const fetchData = async () => {
        try {
            // Assuming user is authenticated and potentially admin status is handled by useAuth or a wrapper
            // If not, a check like `if (!user || volunteer?.role !== 'admin') { router.push('/dashboard'); return; }` might be needed here.

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
            console.error("Failed to fetch admin dashboard data:", error);
            // If useAuth doesn't handle redirection for unauthenticated users,
            // you might still need a check here, e.g., if (error.code === 401) router.push("/login");
        }
    }

    useEffect(() => {
        if (!isLoading && user) {
            fetchData()
        }
        // If user is null and not loading, it means they are not authenticated.
        // The useAuth hook or a parent component should ideally handle redirection to login.
        // If not, you might add: `if (!isLoading && !user) { router.push("/login"); }`
    }, [isLoading, user])


    const approveVolunteer = async (id: string) => {
        try {
            // Find the volunteer to get their email and name
            const volunteerToApprove = pendingVolunteers.find(v => v.$id === id);

            await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.volunteersCollectionId, id, {
                isApproved: true
            });

            setPendingVolunteers(prev => prev.filter(v => v.$id !== id));

            // Send approval email
            if (volunteerToApprove?.email) {
                await sendApprovalEmail(volunteerToApprove.email, volunteerToApprove.firstName);
            }
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
        <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
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
                                    <li key={checkin.$id} className="flex justify-between items-center border-b border-border pb-4">
                                        <div className="space-y-1">
                                            <p className="font-medium">Volunteer ID: {checkin.volunteerId}</p>
                                            <p className="text-sm text-muted-foreground">Since: {new Date(checkin.startTime).toLocaleTimeString()}</p>
                                            <div className="inline-block">
                                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                                                    {checkin.type}
                                                </span>
                                            </div>
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
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Volunteer ID</th>
                                            <th className="px-4 py-3">Activity</th>
                                            <th className="px-4 py-3">Hours</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingReviews.map((checkin) => (
                                            <tr key={checkin.$id} className="bg-card border-b border-border hover:bg-muted/30 transition-colors">
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
                                {pendingVolunteers.map((volunteer) => (
                                    <li key={volunteer.$id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-4 rounded-lg shadow-sm gap-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold">{volunteer.firstName} {volunteer.lastName}</p>
                                            <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground/70">
                                                <span>{volunteer.relationshipType}</span>
                                                <span className="capitalize text-primary font-medium">{volunteer.role}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                            <Button onClick={() => approveVolunteer(volunteer.$id)} size="sm" className="bg-green-600 hover:bg-green-700">
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.volunteersCollectionId, volunteer.$id, { role: 'admin' });
                                                        setPendingVolunteers(prev => prev.map(p => p.$id === volunteer.$id ? { ...p, role: 'admin' } : p));
                                                    } catch (e) { console.error(e) }
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
