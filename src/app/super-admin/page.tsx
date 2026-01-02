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
}

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [filter, setFilter] = useState<string>("all") // all, admin, volunteer, pending
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Verify Super Admin access
                const user = await account.get()
                const profile = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [Query.equal('userId', user.$id)]
                )

                if (profile.documents.length === 0 || profile.documents[0].role !== 'super_admin') {
                    router.push("/dashboard")
                    return
                }

                setCurrentUser(profile.documents[0])

                // Fetch ALL users
                const usersRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [Query.limit(100)] // Adjust limit as needed
                )
                setAllUsers(usersRes.documents as unknown as User[])
                setFilteredUsers(usersRes.documents as unknown as User[])
            } catch (error: any) {
                console.error("Error fetching super admin data", error)
                // Redirect to login if not authenticated
                router.push("/login")
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [router])

    useEffect(() => {
        // Apply filter
        if (filter === "all") {
            setFilteredUsers(allUsers)
        } else if (filter === "admin") {
            setFilteredUsers(allUsers.filter(u => u.role === "admin"))
        } else if (filter === "volunteer") {
            setFilteredUsers(allUsers.filter(u => u.role === "volunteer"))
        } else if (filter === "pending") {
            setFilteredUsers(allUsers.filter(u => !u.isApproved))
        }
    }, [filter, allUsers])

    const promoteToAdmin = async (userId: string) => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId,
                { role: 'admin' }
            )
            setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, role: 'admin' } : u))
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
            setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, role: 'volunteer' } : u))
        } catch (error) {
            console.error(error)
        }
    }

    const approveUser = async (userId: string) => {
        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                userId,
                { isApproved: true }
            )
            setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, isApproved: true } : u))
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
            setAllUsers(prev => prev.filter(u => u.$id !== userId))
        } catch (error) {
            console.error(error)
        }
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading Super Admin Panel...</div>

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                <div className="flex gap-2">
                    <Button onClick={() => router.push('/dashboard')} variant="outline">My Dashboard</Button>
                    <Button onClick={() => router.push('/admin')} variant="outline">Admin View</Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <Button
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                    size="sm"
                >
                    All Users ({allUsers.length})
                </Button>
                <Button
                    variant={filter === "admin" ? "default" : "outline"}
                    onClick={() => setFilter("admin")}
                    size="sm"
                >
                    Admins ({allUsers.filter(u => u.role === "admin").length})
                </Button>
                <Button
                    variant={filter === "volunteer" ? "default" : "outline"}
                    onClick={() => setFilter("volunteer")}
                    size="sm"
                >
                    Volunteers ({allUsers.filter(u => u.role === "volunteer").length})
                </Button>
                <Button
                    variant={filter === "pending" ? "default" : "outline"}
                    onClick={() => setFilter("pending")}
                    size="sm"
                >
                    Pending Approval ({allUsers.filter(u => !u.isApproved).length})
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
                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm gap-4 border-l-4"
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
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                                user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.role === 'super_admin' ? 'SUPER ADMIN' : user.role.toUpperCase()}
                                            </span>
                                            {!user.isApproved && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                                    PENDING
                                                </span>
                                            )}
                                            {user.volunteerCategory && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                                    {user.volunteerCategory === 'student' ? `Student - Grade ${user.grade}` : 'Adult'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">{user.email}</p>
                                        {user.schoolName && (
                                            <p className="text-xs text-gray-500 mt-1">🏫 {user.schoolName}</p>
                                        )}
                                    </div>

                                    {user.$id !== currentUser?.$id && (
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
                                            {user.role === 'volunteer' && (
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
                                    {user.$id === currentUser?.$id && (
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
