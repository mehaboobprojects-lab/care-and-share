"use client"

import { useEffect, useState } from "react"
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function HistoryList({ volunteerId, refreshTrigger }: { volunteerId: string, refreshTrigger?: number }) {
    const [checkins, setCheckins] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [
                        Query.equal('volunteerId', volunteerId),
                        Query.orderDesc('startTime'),
                        Query.limit(20)
                    ]
                )
                setCheckins(response.documents)
            } catch (error) {
                console.error("Failed to fetch history:", error)
            } finally {
                setIsLoading(false)
            }
        }

        if (volunteerId) {
            fetchHistory()
        }
    }, [volunteerId, refreshTrigger])

    if (isLoading) {
        return <div className="text-sm text-gray-500">Loading history...</div>
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {checkins.length === 0 ? (
                    <p className="text-sm text-gray-500">No activity recorded yet.</p>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checkins.map((checkin) => (
                                    <TableRow key={checkin.$id}>
                                        <TableCell>
                                            {new Date(checkin.startTime).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {checkin.type?.replace(/_/g, " ") || "Volunteer Service"}
                                        </TableCell>
                                        <TableCell>
                                            {checkin.calculatedHours ? `${checkin.calculatedHours} hrs` : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${checkin.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                checkin.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {checkin.status === 'active' ? 'Active' :
                                                    checkin.status === 'approved' ? 'Approved' : 'Pending'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
