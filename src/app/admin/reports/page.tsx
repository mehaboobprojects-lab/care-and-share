"use client"

import { useEffect, useState } from "react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ReportsPage() {
    const [checkins, setCheckins] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')

    useEffect(() => {
        async function fetchHistory() {
            try {
                // Fetch all approved checkins
                // NOTE: For large datasets, use pagination or cursor. simple list for now.
                const res = await databases.listDocuments(
                    'care_share_db',
                    'checkins',
                    [
                        Query.equal('status', 'approved'),
                        Query.limit(1000)
                    ]
                );
                setCheckins(res.documents);
            } catch (error) {
                console.error(error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchHistory();
    }, [])

    const getAggregatedData = () => {
        const now = new Date();
        const filtered = checkins.filter(c => {
            const date = new Date(c.startTime);
            if (reportType === 'weekly') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return date >= oneWeekAgo;
            } else if (reportType === 'monthly') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            } else {
                return date.getFullYear() === now.getFullYear();
            }
        });

        const totalHours = filtered.reduce((acc, curr) => acc + (curr.calculatedHours || 0), 0);
        const uniqueVolunteers = new Set(filtered.map(c => c.volunteerId)).size;

        return { totalHours, uniqueVolunteers, checkins: filtered };
    }

    const { totalHours, uniqueVolunteers, checkins: reportData } = getAggregatedData();

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 p-8">
            <h1 className="text-3xl font-bold mb-6">Reports</h1>

            <div className="flex gap-2 mb-6">
                <Button variant={reportType === 'weekly' ? 'default' : 'outline'} onClick={() => setReportType('weekly')}>Weekly</Button>
                <Button variant={reportType === 'monthly' ? 'default' : 'outline'} onClick={() => setReportType('monthly')}>Monthly</Button>
                <Button variant={reportType === 'yearly' ? 'default' : 'outline'} onClick={() => setReportType('yearly')}>Yearly</Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader><CardTitle>Total Hours</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalHours.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Volunteers Active</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{uniqueVolunteers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Sessions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{reportData.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Detailed Breakdown</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Volunteer ID</th>
                                    <th className="px-4 py-2">Activity</th>
                                    <th className="px-4 py-2">Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((c) => (
                                    <tr key={c.$id} className="border-b">
                                        <td className="px-4 py-2">{new Date(c.startTime).toLocaleDateString()}</td>
                                        <td className="px-4 py-2">{c.volunteerId}</td>
                                        <td className="px-4 py-2">{c.type}</td>
                                        <td className="px-4 py-2">{c.calculatedHours}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
