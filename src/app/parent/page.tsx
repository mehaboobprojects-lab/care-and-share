"use client"

import { useEffect, useState } from "react"
import { databases, account, APPWRITE_CONFIG } from "@/lib/appwrite"
import { Query, ID } from "appwrite"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

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
    const [dependents, setDependents] = useState<Dependent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [parentEmail, setParentEmail] = useState("")
    const [currentUserId, setCurrentUserId] = useState("")

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        grade: "",
        schoolName: "",
        schoolAddress: "",
        password: "",
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await account.get()
                setCurrentUserId(user.$id)
                setParentEmail(user.email)

                // Fetch dependents where managedBy = current user ID OR contactEmail = current user email
                const dependentsRes = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.volunteersCollectionId,
                    [
                        Query.or([
                            Query.equal('managedBy', user.$id),
                            Query.equal('contactEmail', user.email)
                        ]),
                        Query.limit(100)
                    ]
                )
                setDependents(dependentsRes.documents as unknown as Dependent[])
            } catch (error: any) {
                // Silently redirect to login if not authenticated
                router.push("/login")
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [router])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleAddDependent = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Create dependent's volunteer document
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                ID.unique(),
                {
                    userId: "", // No auth account for dependent initially
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email || parentEmail, // Use parent email if not provided
                    phone: formData.phone,
                    volunteerCategory: "student",
                    contactRelationship: "parent",
                    contactName: parentEmail.split('@')[0], // Simplified
                    contactEmail: parentEmail,
                    contactPhone: formData.phone,
                    grade: formData.grade,
                    schoolName: formData.schoolName,
                    schoolAddress: formData.schoolAddress || "",
                    role: 'volunteer',
                    isApproved: false,
                    managedBy: currentUserId,
                    termsAccepted: true,
                    parentConsent: true,
                }
            )

            // Refresh list
            const dependentsRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [
                    Query.or([
                        Query.equal('managedBy', currentUserId),
                        Query.equal('contactEmail', parentEmail)
                    ]),
                    Query.limit(100)
                ]
            )
            setDependents(dependentsRes.documents as unknown as Dependent[])
            setShowAddForm(false)
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                grade: "",
                schoolName: "",
                schoolAddress: "",
                password: "",
            })
        } catch (error: any) {
            console.error("Error adding dependent:", error)
            alert("Failed to add dependent: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEditDependent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId) return
        setIsLoading(true)

        try {
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                editingId,
                {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    grade: formData.grade,
                    schoolName: formData.schoolName,
                    schoolAddress: formData.schoolAddress,
                }
            )

            // Refresh list
            const dependentsRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [
                    Query.or([
                        Query.equal('managedBy', currentUserId),
                        Query.equal('contactEmail', parentEmail)
                    ]),
                    Query.limit(100)
                ]
            )
            setDependents(dependentsRes.documents as unknown as Dependent[])
            setEditingId(null)
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                grade: "",
                schoolName: "",
                schoolAddress: "",
                password: "",
            })
        } catch (error: any) {
            console.error("Error updating dependent:", error)
            alert("Failed to update dependent: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const startEdit = (dependent: Dependent) => {
        setEditingId(dependent.$id)
        setFormData({
            firstName: dependent.firstName,
            lastName: dependent.lastName,
            email: dependent.email,
            phone: dependent.phone,
            grade: dependent.grade || "",
            schoolName: dependent.schoolName || "",
            schoolAddress: "",
            password: "",
        })
        setShowAddForm(false)
    }

    const handleRemoveDependent = async (id: string) => {
        if (!confirm("Are you sure you want to remove this dependent?")) return
        setIsLoading(true)

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
            setIsLoading(false)
        }
    }

    if (isLoading && dependents.length === 0) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>
    }

    return (
        <div className="flex min-h-screen flex-col bg-background p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Parent Dashboard</h1>
                <Button onClick={() => router.push('/dashboard')} variant="outline">My Dashboard</Button>
            </div>

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
                        <form onSubmit={editingId ? handleEditDependent : handleAddDependent} className="space-y-4">
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

                            <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="flex gap-2">
                                <Button type="submit" disabled={isLoading}>
                                    {editingId ? "Update" : "Add"} Dependent
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowAddForm(false)
                                        setEditingId(null)
                                        setFormData({
                                            firstName: "",
                                            lastName: "",
                                            email: "",
                                            phone: "",
                                            grade: "",
                                            schoolName: "",
                                            schoolAddress: "",
                                            password: "",
                                        })
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
                                        </div>
                                        <p className="text-sm text-muted-foreground">{dependent.phone}</p>
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
        </div>
    )
}
