"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { ID, Query } from "appwrite"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { sendPendingEmail } from "@/lib/email-actions"
import { checkEmailUnique } from "@/actions/check-email"

// Child/Dependent Schema
const dependentSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    schoolName: z.string().min(2, "School name is required"),
    grade: z.string().min(1, "Grade is required"),
    age: z.string().min(1, "Age is required"),
})

const registrationSchema = z.object({
    volunteerCategory: z.enum(["student", "parent"]), // 'parent' now covers 'adult' too in UI

    // Step 2: Parent/Adult Personal Info + Security
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    contactEmail: z.string().email("Invalid email address"),
    contactPhone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    address: z.string().optional(),

    // Role Toggle for Parent/Adult
    // If true -> Parent (has dependents), If false -> Adult Volunteer
    isRegisteringDependents: z.boolean(),

    // Step 3: Dependents (if isRegisteringDependents === true)
    dependents: z.array(dependentSchema).optional(),

    // Legacy/Student Specific (Step 2/3 for Students)
    // We keep these top-level for the 'Student' category flow which remains mostly same
    // but Student flow is: Cat -> Profile(FN,LN,Email,Phone,School,Grade,Age) -> Security(Pass,Addr,StudentId) -> Consent
    // So we reuse the top level fields.
    grade: z.string().optional(),
    schoolName: z.string().optional(),
    schoolAddress: z.string().optional(),
    age: z.string().optional(),
    studentId: z.string().optional(),

    parentName: z.string().optional(),
    parentPhone: z.string().optional(),

    // Consent
    termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
    parentConsent: z.boolean().optional(),
}).superRefine((data, ctx) => {
    // 1. Student Logic
    if (data.volunteerCategory === "student") {
        if (!data.grade) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Grade is required", path: ["grade"] });
        if (!data.schoolName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "School name is required", path: ["schoolName"] });
        if (!data.age) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Age is required", path: ["age"] });
    }

    // 2. Parent Logic (isRegisteringDependents === true)
    if (data.volunteerCategory === "parent" && data.isRegisteringDependents) {
        if (!data.dependents || data.dependents.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please add at least one dependent",
                path: ["dependents"]
            });
        }
    }
});

type RegistrationFormValues = z.infer<typeof registrationSchema>

export function RegistrationMultiStep() {
    const router = useRouter()
    const { refreshAuth, user, logout } = useAuth()
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        control,
        formState: { errors },
        trigger,
        setValue,
    } = useForm<RegistrationFormValues>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            volunteerCategory: "parent",
            isRegisteringDependents: false,
            termsAccepted: false,
            parentConsent: false,
        },
        mode: "onChange",
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "dependents",
    });

    const volunteerCategory = watch("volunteerCategory")
    const isRegisteringDependents = watch("isRegisteringDependents")

    // student=4 steps
    // parent (adult) = 4 steps (Step 3 skipped if no dependents)
    const totalSteps = 4

    const nextStep = async () => {
        let fieldsToValidate: (keyof RegistrationFormValues)[] = []

        if (currentStep === 1) {
            fieldsToValidate = ["volunteerCategory"]
        } else if (currentStep === 2) {
            if (volunteerCategory === 'student') {
                // Student Step 2: Profile + School
                fieldsToValidate = [
                    "firstName", "lastName",
                    "contactEmail", "contactPhone",
                    "schoolName", "grade", "age"
                ]
            } else {
                // Parent/Adult Step 2: Personal Info + Security
                fieldsToValidate = [
                    "firstName", "lastName",
                    "contactEmail", "contactPhone",
                    "password", "address",
                    "isRegisteringDependents"
                ]
            }
        } else if (currentStep === 3) {
            if (volunteerCategory === 'student') {
                // Student Step 3: Security
                fieldsToValidate = ["password", "address", "studentId"]
            } else {
                // Parent Step 3: Dependents
                if (isRegisteringDependents) {
                    fieldsToValidate = ["dependents"]
                }
            }
        }

        const isValid = await trigger(fieldsToValidate)
        setError(null)

        if (isValid) {
            // Check email uniqueness if on Step 2
            if (currentStep === 2) {
                const emailToCheck = watch("contactEmail");
                if (emailToCheck) {
                    try {
                        setIsLoading(true);
                        // Use Server Action to bypass Guest permissions
                        const isUnique = await checkEmailUnique(emailToCheck);
                        setIsLoading(false);

                        if (!isUnique) {
                            setError("User with this Login ID exists. Please enter different Email ID.");
                            return;
                        }
                    } catch (err) {
                        console.error(err);
                        setIsLoading(false);
                    }
                }
            }

            // Flow Control - Only proceeds if valid
            if (currentStep === 2 && volunteerCategory === 'parent' && !isRegisteringDependents) {
                // Adult Volunteer -> Skip Step 3 (Dependents) -> Go to Step 4
                setCurrentStep(4)
            } else {
                setCurrentStep(prev => Math.min(prev + 1, totalSteps))
            }
        }
    }


    const prevStep = () => {
        if (currentStep === 4 && volunteerCategory === 'parent' && !isRegisteringDependents) {
            // If coming back from Step 4 as Adult, go back to Step 2
            setCurrentStep(2)
        } else {
            setCurrentStep(prev => Math.max(prev - 1, 1))
        }
    }

    async function onSubmit(data: RegistrationFormValues) {
        setIsLoading(true)
        setError(null)

        try {
            // Check if email already exists in Volunteers collection
            const existingVolunteers = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [Query.equal('email', data.contactEmail)]
            );

            if (existingVolunteers.documents.length > 0) {
                throw new Error("An account with this email already exists. Please login instead.");
            }

            // 1. Handle Account & Session
            let currentUserId = "";

            try {
                // A. Check if user is ALREADY logged in
                const sessionUser = await account.get();
                if (sessionUser.email === data.contactEmail) {
                    currentUserId = sessionUser.$id;
                    console.log("Already logged in correctly.");
                } else {
                    console.log("Logged in as different user. Clearing session.");
                    await account.deleteSession('current');
                }
            } catch (err) {
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

                // 3. Establish Session
                try {
                    await account.createEmailPasswordSession(data.contactEmail, data.password);
                    const finalUser = await account.get();
                    currentUserId = finalUser.$id;
                } catch (loginErr: any) {
                    if (loginErr.message?.includes("session is active")) {
                        const finalUser = await account.get();
                        currentUserId = finalUser.$id;
                    } else {
                        throw new Error("Activation failed. Please check your password or use a different email.");
                    }
                }
            }

            if (!currentUserId) throw new Error("Failed to establish user identity.");

            let finalCategory = data.volunteerCategory;
            // Refine category: 'parent' means they selected Parent/Adult, but 'adult' implies no dependents
            if (finalCategory === 'parent' && !data.isRegisteringDependents) {
                finalCategory = 'adult';
            }

            // 2. Create PARENT/MAIN Volunteer Document
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
                    volunteerCategory: finalCategory, // Use refined category
                    contactRelationship: 'self',
                    contactName: `${data.firstName} ${data.lastName}`,
                    contactEmail: data.contactEmail,
                    contactPhone: data.contactPhone,
                    address: data.address || "",
                    schoolName: data.schoolName || "",
                    schoolAddress: data.schoolAddress || "",
                    grade: data.grade || "",
                    age: data.age ? parseInt(data.age) : null,
                    studentId: data.studentId || "",
                    parentName: data.parentName || "",
                    parentPhone: data.parentPhone || "",
                    termsAccepted: data.termsAccepted,
                    parentConsent: data.parentConsent || false,
                    role: (data.volunteerCategory === 'parent' && data.isRegisteringDependents) ? 'parent' : 'volunteer',
                    isApproved: false,
                }
            )

            // 3. Create DEPENDENT Volunteer Documents (if applicable)
            if (data.volunteerCategory === 'parent' && data.isRegisteringDependents && data.dependents) {
                for (const child of data.dependents) {
                    await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.volunteersCollectionId,
                        ID.unique(),
                        {
                            userId: currentUserId, // Linked to SAME parent account logic? 
                            // Verify dashboard keys: using ID.unique() for doc ID, so keys should be fine if listing by doc ID.
                            // But usually dependent listing queries by 'parent_email' or similar. 
                            // Here we link by userId? No, linking by parent's userId might be tricky if we want them to show up.
                            // Let's stick to the plan: create them as documents.
                            firstName: child.firstName,
                            lastName: child.lastName,
                            email: data.contactEmail,
                            phone: data.contactPhone,
                            volunteerCategory: 'student',
                            contactRelationship: 'parent',
                            contactName: `${data.firstName} ${data.lastName}`,
                            contactEmail: data.contactEmail,
                            contactPhone: data.contactPhone,
                            address: data.address || "",
                            schoolName: child.schoolName,
                            grade: child.grade,
                            age: child.age ? parseInt(child.age) : null,
                            schoolAddress: "",
                            studentId: "",
                            termsAccepted: data.termsAccepted,
                            parentConsent: true,
                            role: 'volunteer',
                            isApproved: false,
                        }
                    )
                }
            }

            await sendPendingEmail(data.contactEmail, data.firstName)
            await refreshAuth()
        } catch (err: any) {
            console.error("Registration failed:", err)
            if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
                setError(`Connection Error: Please ensure you've whitelisted 'localhost' in the Appwrite Console.`)
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
                    {currentStep === 2 && volunteerCategory !== 'student' && "Your personal information"}
                    {currentStep === 3 && volunteerCategory === 'student' && "Security & Address"}
                    {currentStep === 3 && volunteerCategory !== 'student' && "Add your children/dependents"}
                    {currentStep === 4 && "Review and accept terms"}
                </CardDescription>
                {user && (
                    <div className="mt-2 text-xs flex items-center gap-2 text-gray-500">
                        <span>Logged in as <b>{user.email}</b></span>
                        <button type="button" onClick={logout} className="text-blue-600 hover:underline font-medium">
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
                                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition ${watch("volunteerCategory") === "student" ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}>
                                    <input type="radio" value="student" {...register("volunteerCategory")} className="sr-only" />
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">🎓</div>
                                        <div className="font-semibold">Student</div>
                                        <div className="text-sm text-gray-500">Grades 6-12</div>
                                    </div>
                                </label>
                                <label className={`flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition ${watch("volunteerCategory") === "parent" ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}>
                                    <input type="radio" value="parent" {...register("volunteerCategory")} className="sr-only" />
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                                        <div className="font-semibold">Parent / Adult</div>
                                        <div className="text-sm text-gray-500">Adults or Parents registering children</div>
                                    </div>
                                </label>
                            </div>
                            {errors.volunteerCategory && <p className="text-xs text-red-500">{errors.volunteerCategory.message}</p>}
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {volunteerCategory === 'student' ? (
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="schoolName">School Name *</Label>
                                            <Input id="schoolName" {...register("schoolName")} />
                                            {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="grade">Grade *</Label>
                                            <select id="grade" {...register("grade")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                <option value="">Select Grade</option>
                                                <option value="Below 6">Below 6th Grade</option>
                                                <option value="6">6th Grade</option>
                                                <option value="7">7th Grade</option>
                                                <option value="8">8th Grade ({'<'} Middle School)</option>
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
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                                        <div className="flex items-start space-x-3">
                                            <input type="checkbox" id="isRegisteringDependents" className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...register("isRegisteringDependents")} />
                                            <div>
                                                <Label htmlFor="isRegisteringDependents" className="font-semibold text-blue-900 cursor-pointer">
                                                    I am registering my children/dependents
                                                </Label>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Check this if you are a parent signing up your kids. Uncheck if you are volunteering yourself.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="firstName">First Name (Adult/Main) *</Label>
                                            <Input id="firstName" {...register("firstName")} />
                                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="lastName">Last Name (Adult/Main) *</Label>
                                            <Input id="lastName" {...register("lastName")} />
                                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="contactEmail">Generic Email for Login *</Label>
                                        <Input id="contactEmail" type="email" {...register("contactEmail")} placeholder="you@example.com" />
                                        {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="contactPhone">Phone Number *</Label>
                                        <Input id="contactPhone" {...register("contactPhone")} placeholder="(123) 456-7890" />
                                        {errors.contactPhone && <p className="text-xs text-red-500">{errors.contactPhone.message}</p>}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="password">Create Password *</Label>
                                            <Input id="password" type="password" {...register("password")} />
                                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="address">Home Address</Label>
                                            <Input id="address" {...register("address")} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Render explicit form errors (like duplicate email) inside Step 2 view */}
                            {error && <p className="text-sm text-red-500 font-medium p-2 bg-red-50 rounded border border-red-100">{error}</p>}
                        </div>
                    )}

                    {/* Step 3: Security/Dependents */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {volunteerCategory === 'student' ? (
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
                                <div className="space-y-4">
                                    {isRegisteringDependents ? (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-medium">Children / Dependents</h3>
                                                <Button type="button" variant="outline" size="sm" onClick={() => append({ firstName: "", lastName: "", schoolName: "", grade: "", age: "" })}>
                                                    <Plus className="mr-2 h-4 w-4" /> Add Child
                                                </Button>
                                            </div>
                                            {fields.map((field, index) => (
                                                <Card key={field.id} className="p-4 border-l-4 border-l-blue-500 relative">
                                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <Label>Child First Name *</Label>
                                                            <Input {...register(`dependents.${index}.firstName`)} placeholder="First Name" />
                                                            {errors.dependents?.[index]?.firstName && <p className="text-xs text-red-500">{errors.dependents[index]?.firstName?.message}</p>}
                                                        </div>
                                                        <div>
                                                            <Label>Child Last Name *</Label>
                                                            <Input {...register(`dependents.${index}.lastName`)} placeholder="Last Name" />
                                                            {errors.dependents?.[index]?.lastName && <p className="text-xs text-red-500">{errors.dependents[index]?.lastName?.message}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div className="sm:col-span-1">
                                                            <Label>Age *</Label>
                                                            <Input type="number" {...register(`dependents.${index}.age`)} className="w-24" />
                                                            {errors.dependents?.[index]?.age && <p className="text-xs text-red-500">{errors.dependents[index]?.age?.message}</p>}
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <Label>Grade *</Label>
                                                            <select {...register(`dependents.${index}.grade`)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                                <option value="">Select</option>
                                                                <option value="Below 6">Below 6</option>
                                                                <option value="6">6th</option>
                                                                <option value="7">7th</option>
                                                                <option value="8">8th</option>
                                                                <option value="9">9th</option>
                                                                <option value="10">10th</option>
                                                                <option value="11">11th</option>
                                                                <option value="12">12th</option>
                                                            </select>
                                                            {errors.dependents?.[index]?.grade && <p className="text-xs text-red-500">{errors.dependents[index]?.grade?.message}</p>}
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <Label>School Name *</Label>
                                                            <Input {...register(`dependents.${index}.schoolName`)} />
                                                            {errors.dependents?.[index]?.schoolName && <p className="text-xs text-red-500">{errors.dependents[index]?.schoolName?.message}</p>}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                            {fields.length === 0 && (
                                                <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                                                    Please add at least one child/dependent.
                                                </div>
                                            )}
                                            {errors.dependents && !Array.isArray(errors.dependents) && (
                                                <p className="text-sm text-red-500 text-center">{(errors.dependents as any)?.message}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center p-4">
                                            <p>No dependents to register. You can proceed to the next step.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Consent */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-start space-x-2">
                                <input type="checkbox" id="termsAccepted" {...register("termsAccepted")} className="mt-1" />
                                <Label htmlFor="termsAccepted" className="text-sm">
                                    I agree to the terms and conditions *
                                </Label>
                            </div>
                            {errors.termsAccepted && <p className="text-xs text-red-500">{errors.termsAccepted.message}</p>}

                            {volunteerCategory === "student" && (
                                <div className="flex items-start space-x-2">
                                    <input type="checkbox" id="parentConsent" {...register("parentConsent")} className="mt-1" />
                                    <Label htmlFor="parentConsent" className="text-sm">
                                        Parent/Guardian consent provided
                                    </Label>
                                </div>
                            )}
                            {error && <p className="text-sm text-red-500 font-medium p-2 bg-red-50 rounded border border-red-100">{error}</p>}
                        </div>
                    )}

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
