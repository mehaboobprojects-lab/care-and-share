"use client"

import { useEffect, useState } from "react"
import { databases, account, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface User {
    $id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isApproved: boolean
    volunteerCategory?: string
    grade?: string
    schoolName?: string
    contactEmail?: string
}

import { useAuth } from "@/context/AuthContext"
import { sendApprovalEmail } from "@/lib/email-actions"

export default function SuperAdminDashboard() {
    const router = useRouter()
    const { user, volunteer, isLoading: authLoading } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [filter, setFilter] = useState<'all' | 'admin' | 'volunteer' | 'pending'>('all')
    const [dataLoading, setDataLoading] = useState(true)
    const [lastEmailStatus, setLastEmailStatus] = useState<string | null>(null);

    const fetchUsers = async () => {
        setDataLoading(true)
        try {
            // Verify Super Admin access
            if (!volunteer || volunteer.role !== 'super_admin') {
                router.push("/dashboard")
                return
            }

            // Fetch ALL users
            const usersRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [Query.limit(100)]
            )
            setUsers(usersRes.documents as unknown as User[])
            setFilteredUsers(usersRes.documents as unknown as User[])
        } catch (error: any) {
            console.error("Failed to fetch users:", error)
        } finally {
            setDataLoading(false)
        }
    }

    useEffect(() => {
        if (!authLoading && user) {
            fetchUsers()
        } else if (!authLoading && !user) {
            router.push("/login")
        }
    }, [authLoading, user, router])

    useEffect(() => {
        // Apply filter
        if (filter === "all") {
            setFilteredUsers(users)
        } else if (filter === "admin") {
            setFilteredUsers(users.filter(u => u.role === "admin"))
        } else if (filter === "volunteer") {
            setFilteredUsers(users.filter(u => u.role === "volunteer" || u.role === "parent"))
        } else if (filter === "pending") {
            setFilteredUsers(users.filter(u => !u.isApproved))
        }
    }, [filter, users])

    const promoteToAdmin = async (userId: string) => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId,
                { role: 'admin' }
            )
            setUsers(prev => prev.map(u => u.$id === userId ? { ...u, role: 'admin' } : u))
        } catch (error) {
            console.error(error)
        }
    }

    const demoteToVolunteer = async (userId: string) => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId,
                { role: 'volunteer' }
            )
            setUsers(prev => prev.map(u => u.$id === userId ? { ...u, role: 'volunteer' } : u))
        } catch (error) {
            console.error(error)
        }
    }

    const approveUser = async (userId: string) => {
        try {
            console.log(`Super Admin approving user: ${userId}`);
            const userToApprove = users.find(u => u.$id === userId);
            console.log(`User email found: ${userToApprove?.email}`);

            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId,
                { isApproved: true }
            )
            setUsers(prev => prev.map(u => u.$id === userId ? { ...u, isApproved: true } : u))

            const targetEmail = userToApprove?.email || userToApprove?.contactEmail;

            if (targetEmail) {
                console.log(`Triggering approval email to ${targetEmail}`);
                const res = await sendApprovalEmail(targetEmail, userToApprove.firstName);
                console.log(`Email action response:`, res);
                if (res.success) {
                    console.log(`User approved and welcome email sent to ${targetEmail}`);
                    setLastEmailStatus(`✅ Email sent to ${targetEmail}`);
                } else {
                    const errorMsg = typeof res.error === 'string' ? res.error : (res.error as any)?.message || 'Unknown error';
                    console.error(`User approved, but email failed: ${errorMsg}`);
                    setLastEmailStatus(`❌ Email FAILED to ${targetEmail}: ${errorMsg}`);
                }
            } else {
                console.warn(`No email found for user ${userId}, skipping notification.`);
                setLastEmailStatus(`⚠️ No email address for user ${userId}`);
            }
            // Clear status after 5 seconds
            setTimeout(() => setLastEmailStatus(null), 10000);
        } catch (error) {
            console.error(error)
        }
    }

    const deleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return
        }
        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId
            )
            setUsers(prev => prev.filter(u => u.$id !== userId))
        } catch (error) {
            console.error(error)
        }
    }

    if (authLoading || dataLoading) return <div className="flex h-screen items-center justify-center">Loading Super Admin Panel...</div>

    return (
        <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            </div>
            {lastEmailStatus && (
                <div className={`mb-6 p-4 rounded-md border ${lastEmailStatus.includes('FAILED') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <strong>Email Status:</strong> {lastEmailStatus}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <Button
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                    size="sm"
                >
                    All Users ({users.length})
                </Button>
                <Button
                    variant={filter === "admin" ? "default" : "outline"}
                    onClick={() => setFilter("admin")}
                    size="sm"
                >
                    Admins ({users.filter(u => u.role === "admin").length})
                </Button>
                <Button
                    variant={filter === "volunteer" ? "default" : "outline"}
                    onClick={() => setFilter("volunteer")}
                    size="sm"
                >
                    Volunteers ({users.filter(u => u.role === "volunteer" || u.role === "parent").length})
                </Button>
                <Button
                    variant={filter === "pending" ? "default" : "outline"}
                    onClick={() => setFilter("pending")}
                    size="sm"
                >
                    Pending Approval ({users.filter(u => !u.isApproved).length})
                </Button>
            </div>

            {/* Users List */}
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredUsers.length === 0 ? (
                        <p className="text-muted-foreground">No users found.</p>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.$id}
                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-4 rounded-lg shadow-sm gap-4 border-l-4"
                                    style={{
                                        borderLeftColor:
                                            user.role === 'super_admin' ? '#9333ea' :
                                                user.role === 'admin' ? '#3b82f6' :
                                                    '#6b7280'
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-lg">{user.firstName} {user.lastName}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                user.role === 'admin' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                                    'bg-muted text-muted-foreground border-border text-[10px]'
                                                }`}>
                                                {user.role === 'super_admin' ? 'SUPER ADMIN' : user.role.toUpperCase()}
                                            </span>
                                            {!user.isApproved && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 font-semibold text-[10px]">
                                                    PENDING
                                                </span>
                                            )}
                                            {user.volunteerCategory && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-semibold text-[10px]">
                                                    {user.volunteerCategory === 'student' ? `Student - Grade ${user.grade}` : 'Adult'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                                        {user.schoolName && (
                                            <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                                                <span>🏫</span> {user.schoolName}
                                            </p>
                                        )}
                                    </div>

                                    {user.$id !== volunteer?.$id && (
                                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                            {!user.isApproved && (
                                                <Button
                                                    onClick={() => approveUser(user.$id)}
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            {(user.role === 'volunteer' || user.role === 'parent') && user.volunteerCategory !== 'student' && (
                                                <Button
                                                    onClick={() => promoteToAdmin(user.$id)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Make Admin
                                                </Button>
                                            )}
                                            {user.role === 'admin' && (
                                                <Button
                                                    onClick={() => demoteToVolunteer(user.$id)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Demote to Volunteer
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => deleteUser(user.$id)}
                                                size="sm"
                                                variant="destructive"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                    {user.$id === volunteer?.$id && (
                                        <span className="text-sm text-gray-500 italic">You</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
