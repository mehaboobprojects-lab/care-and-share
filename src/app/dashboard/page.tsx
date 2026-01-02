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

import { useAuth } from "@/context/AuthContext"

export default function DashboardPage() {
    const router = useRouter()
    const { user, volunteer, isLoading, logout } = useAuth()

    const handleLogout = async () => {
        await logout()
    }

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>

    if (!volunteer) return <div className="p-8">Access Denied. Please contact admin.</div>

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="bg-card border-b border-border shadow-sm">
                <div className="mx-auto flex flex-col sm:flex-row max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8 gap-4 sm:gap-0">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground">Hello, {volunteer.firstName}</span>
                        <Button variant="outline" onClick={handleLogout}>Logout</Button>
                    </div>
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
