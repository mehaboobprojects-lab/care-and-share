"use client"

import { useEffect, useState } from "react"
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import { Models, Query, ID } from "appwrite"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { CheckInManager } from "@/components/check-in-manager"
import { HistoryList } from "@/components/history-list"

interface Volunteer extends Models.Document {
    firstName: string;
    lastName: string;
    role: string;
    isApproved: boolean;
}

import { useAuth } from "@/context/AuthContext"

export default function DashboardPage() {
    const router = useRouter()
    const { user, volunteer, isLoading, logout } = useAuth()
    const [activeCheckIn, setActiveCheckIn] = useState<any>(null)
    const [isDataLoading, setIsDataLoading] = useState(false)

    const fetchActiveCheckIn = async () => {
        if (!volunteer) return
        setIsDataLoading(true)
        try {
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                [
                    Query.equal('volunteerId', volunteer.$id),
                    Query.equal('status', 'active'),
                    Query.limit(1)
                ]
            )
            if (response.total > 0) {
                setActiveCheckIn(response.documents[0])
            } else {
                setActiveCheckIn(null)
            }
        } catch (error) {
            console.error("Error fetching active check-in:", error)
        } finally {
            setIsDataLoading(false)
        }
    }

    useEffect(() => {
        if (!isLoading && volunteer) {
            fetchActiveCheckIn()
        }
    }, [isLoading, volunteer])

    const handleLogout = async () => {
        await logout()
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    if (!volunteer) return (
        <div className="flex flex-col h-screen items-center justify-center p-8 text-center gap-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-2xl font-bold italic">Profile Not Found</h2>
            <p className="max-w-md text-muted-foreground">
                Your account session is active, but your volunteer profile is missing.
                This usually happens if a registration was interrupted.
            </p>
            <div className="flex gap-4">
                <Button asChild>
                    <Link href="/register">Complete Registration</Link>
                </Button>
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="bg-card border-b border-border shadow-sm">
                <div className="mx-auto flex flex-col sm:flex-row max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8 gap-4 sm:gap-0">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                </div>
            </header>
            <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
                {!volunteer.isApproved ? (
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                        <CardHeader>
                            <CardTitle className="text-yellow-600 dark:text-yellow-400">Account Pending Approval</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-yellow-700 dark:text-yellow-300/80">
                                Your account is currently awaiting admin approval. You will be able to check in once approved.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="col-span-2">
                                <CardHeader>
                                    <CardTitle>Check In / Out</CardTitle>
                                    <CardDescription>Record your volunteer hours</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CheckInManager
                                        volunteerId={volunteer.$id}
                                        existingCheckIn={activeCheckIn}
                                        onStatusChange={fetchActiveCheckIn}
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
                        <HistoryList volunteerId={volunteer.$id} />
                    </div>
                )}
            </main>
        </div >
    )
}
