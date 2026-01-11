"use client"

import { useEffect, useState } from "react"
import { databases, account, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query, ID } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { CheckInManager } from "@/components/check-in-manager"
import { useAuth } from "@/context/AuthContext"

interface Dependent {
    $id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    grade?: string
    schoolName?: string
    isApproved: boolean
    managedBy?: string
}

export default function ParentDashboard() {
    const router = useRouter()
    const { user, volunteer, isLoading: authLoading } = useAuth()
    const [dependents, setDependents] = useState<Dependent[]>([])
    const [dataLoading, setDataLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [activeCheckIn, setActiveCheckIn] = useState<any>(null)
    const [activeDependentIds, setActiveDependentIds] = useState<Set<string>>(new Set())

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        age: "",
        grade: "",
        schoolName: "",
        schoolAddress: "",
        volunteerCategory: "student" as "student" | "adult",
        password: "",
    })

    const fetchDependents = async () => {
        if (!user || !volunteer) return
        setDataLoading(true)
        try {
            // 1. Fetch dependents
            const dependentsRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [
                    Query.or([
                        Query.equal('managedBy', user.$id),
                        Query.equal('contactEmail', user.email)
                    ]),
                    Query.notEqual('$id', volunteer.$id),
                    Query.limit(100)
                ]
            )
            // Ensure uniqueness by ID and filter out parent
            const uniqueMap = new Map();
            dependentsRes.documents.forEach(doc => {
                if (doc.$id !== volunteer.$id) {
                    uniqueMap.set(doc.$id, doc);
                }
            });
            setDependents(Array.from(uniqueMap.values()) as unknown as Dependent[])

            // 2. Fetch parent's own active check-in
            const activeRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.checkinsCollectionId,
                [
                    Query.equal('volunteerId', volunteer.$id),
                    Query.equal('status', 'active'),
                    Query.limit(1)
                ]
            )
            if (activeRes.total > 0) setActiveCheckIn(activeRes.documents[0])
            else setActiveCheckIn(null)

            // 3. Fetch dependents' active check-ins
            const depIds = Array.from(uniqueMap.keys());
            if (depIds.length > 0) {
                const depCheckinsRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.checkinsCollectionId,
                    [
                        Query.equal('volunteerId', depIds),
                        Query.equal('status', 'active')
                    ]
                );
                const activeIds = new Set(depCheckinsRes.documents.map((doc: any) => doc.volunteerId));
                setActiveDependentIds(activeIds as Set<string>);
            } else {
                setActiveDependentIds(new Set());
            }
        } catch (error: any) {
            console.error("Error fetching data:", error)
        } finally {
            setDataLoading(false)
        }
    }

    useEffect(() => {
        if (!authLoading && user) {
            fetchDependents()
        } else if (!authLoading && !user) {
            router.push("/login")
        }
    }, [authLoading, user, router])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleAddDependent = async (e: React.FormEvent) => {
        e.preventDefault()
        setDataLoading(true)

        try {
            // Generate a unique ID for the document, which we will also use as the 'userId' 
            // for dependents so they have a unique identifier in reports/tables, 
            // even if they don't have an Appwrite Auth account.
            const newDependentId = ID.unique();

            // Create dependent's volunteer document
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                newDependentId,
                {
                    userId: newDependentId, // Use document ID as pseudo-userId
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email || "",
                    phone: formData.phone || volunteer?.phone || "",
                    volunteerCategory: formData.volunteerCategory,
                    contactRelationship: "parent",
                    contactName: volunteer?.firstName + " " + volunteer?.lastName,
                    contactEmail: user?.email || "",
                    contactPhone: volunteer?.phone || "",
                    age: formData.volunteerCategory === 'student' ? parseInt(formData.age) : null,
                    grade: formData.volunteerCategory === 'student' ? formData.grade : "",
                    schoolName: formData.volunteerCategory === 'student' ? formData.schoolName : "",
                    schoolAddress: formData.volunteerCategory === 'student' ? formData.schoolAddress : "",
                    role: 'volunteer',
                    isApproved: false,
                    managedBy: user?.$id || "",
                    termsAccepted: true,
                    parentConsent: true,
                }
            )

            await fetchDependents()
            setShowAddForm(false)
            resetForm()
        } catch (error: any) {
            console.error("Error adding dependent:", error)
            alert("Failed to add dependent: " + error.message)
        } finally {
            setDataLoading(false)
        }
    }

    const handleEditDependent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId) return
        setDataLoading(true)

        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                editingId,
                {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    email: formData.email,
                    volunteerCategory: formData.volunteerCategory,
                    age: formData.volunteerCategory === 'student' ? parseInt(formData.age) : null,
                    grade: formData.volunteerCategory === 'student' ? formData.grade : "",
                    schoolName: formData.volunteerCategory === 'student' ? formData.schoolName : "",
                    schoolAddress: formData.volunteerCategory === 'student' ? formData.schoolAddress : "",
                }
            )

            await fetchDependents()
            setEditingId(null)
            resetForm()
        } catch (error: any) {
            console.error("Error updating dependent:", error)
            alert("Failed to update dependent: " + error.message)
        } finally {
            setDataLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            age: "",
            grade: "",
            schoolName: "",
            schoolAddress: "",
            volunteerCategory: "student",
            password: "",
        })
    }

    const startEdit = (dependent: Dependent) => {
        setEditingId(dependent.$id)
        setFormData({
            firstName: dependent.firstName,
            lastName: dependent.lastName,
            email: dependent.email,
            phone: dependent.phone,
            age: (dependent as any).age?.toString() || "",
            grade: dependent.grade || "",
            schoolName: dependent.schoolName || "",
            schoolAddress: "",
            volunteerCategory: (dependent as any).volunteerCategory || "student",
            password: "",
        })
        setShowAddForm(false)
    }

    const handleRemoveDependent = async (id: string) => {
        if (!confirm("Are you sure you want to remove this dependent?")) return
        setDataLoading(true)

        try {
            await databases.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                id
            )
            setDependents(prev => prev.filter(d => d.$id !== id))
        } catch (error: any) {
            console.error("Error removing dependent:", error)
            alert("Failed to remove dependent: " + error.message)
        } finally {
            setDataLoading(false)
        }
    }

    if (authLoading || (dataLoading && dependents.length === 0)) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>
    }

    return (
        <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Parent Dashboard</h1>
            </div>

            {/* Collective Check-in Section */}
            {volunteer && (volunteer.isApproved || dependents.some(d => d.isApproved)) && (
                <Card className="mb-8 border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2">
                            <span>🚀</span> Program Check-in
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Select everyone who arrived for today's program and click start.</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <CheckInManager
                            volunteerId={volunteer.$id}
                            existingCheckIn={activeCheckIn}
                            volunteerIds={Array.from(new Set([
                                volunteer.$id,
                                ...dependents.filter(d => d.isApproved).map(d => d.$id)
                            ]))}
                            volunteerNames={{
                                [volunteer.$id]: "Self (Parent)",
                                ...Object.fromEntries(dependents.map(d => [d.$id, d.firstName]))
                            }}
                            onStatusChange={fetchDependents}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Add New Dependent Button */}
            {!showAddForm && !editingId && (
                <div className="mb-6">
                    <Button onClick={() => setShowAddForm(true)}>+ Add New Dependent</Button>
                </div>
            )}

            {/* Add/Edit Form */}
            {(showAddForm || editingId) && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{editingId ? "Edit Dependent" : "Add New Dependent"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={editingId ? handleEditDependent : handleAddDependent} className="space-y-6">
                            <div className="space-y-4">
                                <Label>Dependent Type</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="volunteerCategory"
                                            value="student"
                                            checked={formData.volunteerCategory === "student"}
                                            onChange={handleInputChange}
                                        />
                                        Student (Grade 6-12)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="volunteerCategory"
                                            value="adult"
                                            checked={formData.volunteerCategory === "adult"}
                                            onChange={handleInputChange}
                                        />
                                        Adult
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="email">Email {formData.volunteerCategory === 'student' ? '(Optional)' : '*'}</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required={formData.volunteerCategory === 'adult'}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="phone">Phone Number {formData.volunteerCategory === 'student' ? '(Optional)' : '*'}</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required={formData.volunteerCategory === 'adult'}
                                    />
                                </div>
                            </div>

                            {formData.volunteerCategory === "student" && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                                    <div>
                                        <Label htmlFor="age">Age *</Label>
                                        <Input
                                            id="age"
                                            name="age"
                                            type="number"
                                            value={formData.age}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="grade">Grade *</Label>
                                        <select
                                            id="grade"
                                            name="grade"
                                            value={formData.grade}
                                            onChange={handleInputChange}
                                            required
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="">Select Grade</option>
                                            <option value="Below 6">Below 6th Grade</option>
                                            <option value="6">6th Grade</option>
                                            <option value="7">7th Grade</option>
                                            <option value="8">8th Grade</option>
                                            <option value="9">9th Grade</option>
                                            <option value="10">10th Grade</option>
                                            <option value="11">11th Grade</option>
                                            <option value="12">12th Grade</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="schoolName">School Name *</Label>
                                        <Input
                                            id="schoolName"
                                            name="schoolName"
                                            value={formData.schoolName}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button type="submit" disabled={dataLoading}>
                                    {editingId ? "Update" : "Add"} Dependent
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowAddForm(false)
                                        setEditingId(null)
                                        resetForm()
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Dependents List */}
            <Card>
                <CardHeader>
                    <CardTitle>My Dependents ({dependents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {dependents.length === 0 ? (
                        <p className="text-muted-foreground">No dependents added yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {dependents.map((dependent) => (
                                <div
                                    key={dependent.$id}
                                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-4 rounded-lg shadow-sm gap-4"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-lg">{dependent.firstName} {dependent.lastName}</p>
                                            {!dependent.isApproved && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 font-semibold">
                                                    PENDING APPROVAL
                                                </span>
                                            )}
                                            {dependent.isApproved && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-semibold">
                                                    APPROVED
                                                </span>
                                            )}
                                            {activeDependentIds.has(dependent.$id) && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold animate-pulse">
                                                    ● LIVE NOW
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground break-all">{dependent.phone || dependent.email}</p>
                                        {dependent.grade && (
                                            <p className="text-xs text-muted-foreground/80 mt-1">
                                                Grade {dependent.grade} • {dependent.schoolName}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <Button
                                            onClick={() => startEdit(dependent)}
                                            size="sm"
                                            variant="outline"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            onClick={() => handleRemoveDependent(dependent.$id)}
                                            size="sm"
                                            variant="destructive"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
