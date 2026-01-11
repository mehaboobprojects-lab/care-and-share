"use client"

import { useEffect, useState } from "react"
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface VolunteerReport {
    id: string;
    date: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    category: string;
    hours: number;
}

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
    const [totals, setTotals] = useState({ hours: 0, volunteers: 0, sessions: 0 })

    const [allVolunteers, setAllVolunteers] = useState<any[]>([])
    const [allCheckins, setAllCheckins] = useState<any[]>([])
    const [isInitialLoading, setIsInitialLoading] = useState(true)

    useEffect(() => {
        async function loadBaseData() {
            try {
                const volRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [Query.limit(1000)]
                );
                const checkRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [
                        Query.equal('status', 'approved'),
                        Query.limit(10000)
                    ]
                );
                setAllVolunteers(volRes.documents);
                setAllCheckins(checkRes.documents);
            } catch (e) {
                console.error(e);
            } finally {
                setIsInitialLoading(false);
            }
        }
        loadBaseData();
    }, []);

                    <td className="px-4 py-2 uppercase text-xs font-semibold tracking-wide">
                        <span className={`px-2 py-1 rounded-full ${row.category === 'parent' ? 'bg-blue-100 text-blue-700' :
                                row.category === 'student' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                            }`}>
                            {row.category}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{row.hours.toFixed(2)}</td>
    const [isLoading, setIsLoading] = useState(true)
    const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
    const [totals, setTotals] = useState({ hours: 0, volunteers: 0, sessions: 0 })



    const [allVolunteers, setAllVolunteers] = useState<any[]>([])
    const [allCheckins, setAllCheckins] = useState<any[]>([])
    const [isInitialLoading, setIsInitialLoading] = useState(true)

    useEffect(() => {
        async function loadBaseData() {
            try {
                const volRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [Query.limit(1000)]
                );
                const checkRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [
                        Query.equal('status', 'approved'),
                        Query.limit(10000)
                    ]
                );
                setAllVolunteers(volRes.documents);
                setAllCheckins(checkRes.documents);
            } catch (e) {
                console.error(e);
            } finally {
                setIsInitialLoading(false);
            }
        }
        loadBaseData();
    }, []);

    useEffect(() => {
        if (isInitialLoading) return;

        const now = new Date();
        const filteredCheckins = allCheckins.filter(c => {
            const date = new Date(c.startTime);
            // Verify if volunteer exists in map (it should, as we fetched all volunteers)
            // Students are just volunteers with category='student'
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

        // Create a map of volunteers for easy lookup
        const volMap = new Map<string, any>();
        allVolunteers.forEach(v => volMap.set(v.$id, v));

        // Build detailed report rows (one per check-in)
        const rows: VolunteerReport[] = [];

        filteredCheckins.forEach(c => {
            const volunteer = volMap.get(c.volunteerId);
            if (volunteer) {
                rows.push({
                    id: c.$id,
                    date: c.startTime,
                    firstName: volunteer.firstName,
                    lastName: volunteer.lastName,
                    email: volunteer.email,
                    phone: volunteer.phone,
                    hours: c.calculatedHours || 0
                });
            }
        });

        // Sort by Date descending (newest first)
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setReportData(rows);
        setTotals({
            hours: filteredCheckins.reduce((acc, c) => acc + (c.calculatedHours || 0), 0),
            volunteers: new Set(rows.map(r => r.email)).size,
            sessions: filteredCheckins.length
        });

    }, [isInitialLoading, reportType, allVolunteers, allCheckins]);


    if (isInitialLoading) return <div className="p-8">Loading data...</div>;

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 p-8 overflow-x-hidden">
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
                        <div className="text-3xl font-bold">{totals.hours.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Active Volunteers</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totals.volunteers}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Sessions</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totals.sessions}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Detailed Log ({reportType})</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">First Name</th>
                                    <th className="px-4 py-2">Last Name</th>
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">Phone</th>
                                    <th className="px-4 py-2 text-right">Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row) => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50/50">
                                        <td className="px-4 py-2 text-muted-foreground">{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 font-medium">{row.firstName}</td>
                                        <td className="px-4 py-2 font-medium">{row.lastName}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{row.email}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{row.phone}</td>
                                        <td className="px-4 py-2 text-right font-bold">{row.hours.toFixed(2)}</td>
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


