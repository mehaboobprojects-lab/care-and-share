"use client"

import { useState, useEffect } from "react" // Added useEffect
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { ID, Query } from "appwrite" // Added Query
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext" // Added useAuth

const registrationSchema = z.object({
    volunteerCategory: z.enum(["student", "adult", "parent"]),
    age: z.string().optional(),

    // Step 2: Contact Owner / Profile
    contactRelationship: z.enum(["self", "parent", "guardian", "other"]),
    contactName: z.string().optional(),
    contactEmail: z.string().email("Invalid email address"),
    contactPhone: z.string().optional(),

    // Step 3: Volunteer Info
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    address: z.string().optional(),

    // Step 4: Student Info (conditional)
    grade: z.string().optional(),
    schoolName: z.string().optional(),
    schoolAddress: z.string().optional(),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    studentId: z.string().optional(),

    // Step 5: Consent
    termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
    parentConsent: z.boolean().optional(),
}).refine((data) => {
    // 1. If student, require student fields including age
    if (data.volunteerCategory === "student") {
        if (!data.grade || !data.schoolName || !data.age) return false;
    }
    // 2. If relationship is not self, require contact name
    if (data.contactRelationship !== "self" && (!data.contactName || data.contactName.length < 2)) {
        return false;
    }
    return true;
}, {
    message: "Mandatory fields missing (check Age/Grade/School for students or Contact Name for others)",
    path: ["contactName"],
});

type RegistrationFormValues = z.infer<typeof registrationSchema>

export function RegistrationMultiStep() {
    const router = useRouter()
    const { refreshAuth, user, logout } = useAuth() // Use user and logout from context
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        trigger,
    } = useForm<RegistrationFormValues>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            volunteerCategory: "adult",
            contactRelationship: "self",
            termsAccepted: false,
            parentConsent: false,
        },
        mode: "onChange",
    })

    const volunteerCategory = watch("volunteerCategory")
    // student=4 steps (optimized), parent/adult=4 steps
    const totalSteps = 4

    const nextStep = async () => {
        let fieldsToValidate: (keyof RegistrationFormValues)[] = []

        if (currentStep === 1) {
            fieldsToValidate = ["volunteerCategory"]
        } else if (currentStep === 2) {
            if (volunteerCategory === 'student') {
                // New Student Step 2: Profile + School
                fieldsToValidate = [
                    "firstName", "lastName",
                    "contactEmail", "contactPhone",
                    "schoolName", "grade", "age"
                ]
            } else {
                // Standard Step 2: Contact Owner
                fieldsToValidate = ["contactRelationship", "contactName", "contactEmail", "contactPhone"]
            }
        } else if (currentStep === 3) {
            if (volunteerCategory === 'student') {
                // New Student Step 3: Security + Extras
                fieldsToValidate = ["password", "address", "studentId"]
            } else {
                // Standard Step 3: Personal Info
                fieldsToValidate = ["firstName", "lastName", "password"]
            }
        } else if (currentStep === 4 && volunteerCategory === "student") {
            // Student Consent is Step 4 now, handled by submit usually, but if we had more steps...
            // Actually submit button is shown at step 4, so no "next" action validation needed usually unless strict.
        }

        const isValid = await trigger(fieldsToValidate)
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps))
        }
    }

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    async function onSubmit(data: RegistrationFormValues) {
        setIsLoading(true)
        setError(null)

        try {
            // 1. Handle Account & Session (Clean Slate Approach)
            let currentUserId = "";

            try {
                // A. Check if user is ALREADY logged in
                const sessionUser = await account.get();
                if (sessionUser.email === data.contactEmail) {
                    currentUserId = sessionUser.$id;
                    console.log("Already logged in correctly.");
                } else {
                    // Logged in as WRONG user, sign out
                    console.log("Logged in as different user. Clearing session.");
                    await account.deleteSession('current');
                }
            } catch (err) {
                // Not logged in or session invalid. 
                // CRITICAL: Try a blind delete just in case of ghost/prohibited sessions
                try { await account.deleteSession('current'); } catch (e) { }
            }

            if (!currentUserId) {
                try {
                    // 2. Try to create new account
                    const newAccount = await account.create(
                        ID.unique(),
                        data.contactEmail,
                        data.password,
                        `${data.firstName} ${data.lastName}`
                    );
                    currentUserId = newAccount.$id;
                } catch (createErr: any) {
                    if (createErr.code === 409) {
                        console.log("Account already exists, proceeding to session creation.");
                    } else {
                        throw createErr;
                    }
                }

                // 3. Establish Session (Should be clean by now)
                try {
                    await account.createEmailPasswordSession(data.contactEmail, data.password);
                    const finalUser = await account.get();
                    currentUserId = finalUser.$id;
                } catch (loginErr: any) {
                    // Final fail-safe: if still prohibited, adopt whatever session is active
                    if (loginErr.message?.includes("session is active")) {
                        const finalUser = await account.get();
                        currentUserId = finalUser.$id;
                    } else {
                        throw new Error("Activation failed. Please check your password or use a different email.");
                    }
                }
            }

            if (!currentUserId) throw new Error("Failed to establish user identity.");

            // 2. Create Volunteer Document
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                ID.unique(),
                {
                    userId: currentUserId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.contactEmail,
                    phone: data.contactPhone,
                    volunteerCategory: data.volunteerCategory,
                    contactRelationship: data.contactRelationship,
                    contactName: data.contactRelationship === 'self'
                        ? `${data.firstName} ${data.lastName}`
                        : (data.contactName || `${data.firstName} ${data.lastName}`),
                    contactEmail: data.contactEmail,
                    contactPhone: data.contactPhone,
                    address: data.address || "",
                    schoolName: data.schoolName || "",
                    schoolAddress: data.schoolAddress || "",
                    grade: data.grade || "",
                    age: data.age ? parseInt(data.age) : null,
                    parentName: data.parentName || "",
                    parentPhone: data.parentPhone || "",
                    studentId: data.studentId || "",
                    termsAccepted: data.termsAccepted,
                    parentConsent: data.parentConsent || false,
                    role: data.volunteerCategory === 'parent' ? 'parent' : 'volunteer',
                    isApproved: false,
                }
            )

            // Refresh authentication state in context
            await refreshAuth()
            // Redirection is handled by AuthProvider's useEffect
        } catch (err: any) {
            console.error("Registration failed:", err)
            if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
                setError(`Connection Error: Please ensure you've whitelisted 'localhost' in the Appwrite Console (Settings > Platforms). Raw error: ${err.message}`)
            } else {
                setError(err.message || "Registration failed. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Volunteer Registration - Step {currentStep} of {totalSteps}</CardTitle>
                <CardDescription>
                    {currentStep === 1 && "Select your volunteer category"}
                    {currentStep === 2 && volunteerCategory === 'student' && "Student profile & school details"}
                    {currentStep === 2 && volunteerCategory !== 'student' && "Contact owner information"}
                    {currentStep === 3 && volunteerCategory === 'student' && "Security & Address"}
                    {currentStep === 3 && volunteerCategory !== 'student' && (volunteerCategory === 'parent' ? "Parent/Guardian personal information" : "Volunteer personal information")}
                    {currentStep === 4 && "Review and accept terms"}
                </CardDescription>
                {user && (
                    <div className="mt-2 text-xs flex items-center gap-2 text-gray-500">
                        <span>Logged in as <b>{user.email}</b></span>
                        <button
                            type="button"
                            onClick={logout}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            Log Out
                        </button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Step 1: Category */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <Label htmlFor="volunteerCategory">I am a...</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition ${watch("volunteerCategory") === "student" ? "border-blue-600 bg-blue-50" : "border-gray-300"
                                    }`}>
                                    <input
                                        type="radio"
                                        value="student"
                                        {...register("volunteerCategory")}
                                        className="sr-only"
                                    />
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">🎓</div>
                                        <div className="font-semibold">Student</div>
                                        <div className="text-sm text-gray-500">Grades 6-12</div>
                                    </div>
                                </label>
                                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition ${watch("volunteerCategory") === "parent" ? "border-blue-600 bg-blue-50" : "border-gray-300"
                                    }`}>
                                    <input
                                        type="radio"
                                        value="parent"
                                        {...register("volunteerCategory")}
                                        className="sr-only"
                                    />
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                                        <div className="font-semibold">Parent/Guardian</div>
                                        <div className="text-sm text-gray-500">Manage dependents</div>
                                    </div>
                                </label>
                            </div>
                            {errors.volunteerCategory && (
                                <p className="text-xs text-red-500">{errors.volunteerCategory.message}</p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Contact Details / Student Profile */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {volunteerCategory === 'student' ? (
                                // Student View: Profile + School
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName">First Name *</Label>
                                            <Input id="firstName" {...register("firstName")} />
                                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="lastName">Last Name *</Label>
                                            <Input id="lastName" {...register("lastName")} />
                                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="contactEmail">Email *</Label>
                                            <Input id="contactEmail" type="email" {...register("contactEmail")} />
                                            {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="contactPhone">Phone (Optional)</Label>
                                            <Input id="contactPhone" {...register("contactPhone")} />
                                            {errors.contactPhone && <p className="text-xs text-red-500">{errors.contactPhone.message}</p>}
                                        </div>
                                    </div>

                                    {/* School Details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="schoolName">School Name *</Label>
                                            <Input id="schoolName" {...register("schoolName")} />
                                            {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="grade">Grade *</Label>
                                            <select
                                                id="grade"
                                                {...register("grade")}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="">Select Grade</option>
                                                <option value="Below 6">Below 6th Grade</option>
                                                <option value="6">6th Grade</option>
                                                <option value="7">7th Grade</option>
                                                <option value="8">8th Grade (Middle School)</option>
                                                <option value="9">9th Grade</option>
                                                <option value="10">10th Grade</option>
                                                <option value="11">11th Grade</option>
                                                <option value="12">12th Grade (High School)</option>
                                            </select>
                                            {errors.grade && <p className="text-xs text-red-500">{errors.grade.message}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="age">Age *</Label>
                                        <Input id="age" type="number" {...register("age")} placeholder="e.g. 14" className="w-24" />
                                        {errors.age && <p className="text-xs text-red-500">{errors.age.message}</p>}
                                    </div>
                                </div>
                            ) : (
                                // Non-Student View (Standard)
                                <>
                                    <div>
                                        <Label htmlFor="contactRelationship">I am registering for...</Label>
                                        <select
                                            id="contactRelationship"
                                            {...register("contactRelationship")}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <option value="self">Myself</option>
                                            <option value="parent">My Child (Parent)</option>
                                            <option value="guardian">My Ward (Guardian)</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    {watch("contactRelationship") !== "self" && (
                                        <div>
                                            <Label htmlFor="contactName">Primary Contact Name (e.g. Parent Name)</Label>
                                            <Input id="contactName" {...register("contactName")} placeholder="Full Name" />
                                            {errors.contactName && (
                                                <p className="text-xs text-red-500">{errors.contactName.message}</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <Label htmlFor="contactEmail">Contact Email *</Label>
                                        <Input id="contactEmail" type="email" {...register("contactEmail")} placeholder="Email for login & updates" />
                                        {errors.contactEmail && (
                                            <p className="text-xs text-red-500">{errors.contactEmail.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
                                        <Input id="contactPhone" {...register("contactPhone")} placeholder="(123) 456-7890" />
                                        {errors.contactPhone && (
                                            <p className="text-xs text-red-500">{errors.contactPhone.message}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 3: Security & Personal Info (Continued) */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {volunteerCategory === 'student' ? (
                                // Student View: Password, Address, StudentID
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" {...register("password")} />
                                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="studentId">Student ID (Optional)</Label>
                                            <Input id="studentId" {...register("studentId")} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="address">Address (Optional)</Label>
                                        <Input id="address" {...register("address")} />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="parentName">Parent Name (Optional)</Label>
                                            <Input id="parentName" {...register("parentName")} />
                                        </div>
                                        <div>
                                            <Label htmlFor="parentPhone">Parent Phone (Optional)</Label>
                                            <Input id="parentPhone" {...register("parentPhone")} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Non-Student View: Name, Password, Address
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName">First Name *</Label>
                                            <Input id="firstName" {...register("firstName")} />
                                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="lastName">Last Name *</Label>
                                            <Input id="lastName" {...register("lastName")} />
                                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="password">Password</Label>
                                        <Input id="password" type="password" {...register("password")} />
                                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="address">Address (Optional)</Label>
                                        <Input id="address" {...register("address")} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Consent (was mixed 4/5) */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-start space-x-2">
                                <input
                                    type="checkbox"
                                    id="termsAccepted"
                                    {...register("termsAccepted")}
                                    className="mt-1"
                                />
                                <Label htmlFor="termsAccepted" className="text-sm">
                                    I agree to the terms and conditions *
                                </Label>
                            </div>
                            {errors.termsAccepted && (
                                <p className="text-xs text-red-500">{errors.termsAccepted.message}</p>
                            )}

                            {volunteerCategory === "student" && (
                                <div className="flex items-start space-x-2">
                                    <input
                                        type="checkbox"
                                        id="parentConsent"
                                        {...register("parentConsent")}
                                        className="mt-1"
                                    />
                                    <Label htmlFor="parentConsent" className="text-sm">
                                        Parent/Guardian consent provided
                                    </Label>
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4">
                        {currentStep > 1 && (
                            <Button type="button" variant="outline" onClick={prevStep}>
                                Previous
                            </Button>
                        )}
                        {currentStep < totalSteps && (
                            <Button type="button" onClick={nextStep} className="ml-auto">
                                Next
                            </Button>
                        )}
                        {currentStep === totalSteps && (
                            <Button type="submit" disabled={isLoading} className="ml-auto">
                                {isLoading ? "Submitting..." : "Complete Registration"}
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
