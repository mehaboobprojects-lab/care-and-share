"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { account, databases, APPWRITE_CONFIG } from "@/lib/appwrite"
import { ID } from "appwrite"
import Link from "next/link"
import { useRouter } from "next/navigation"

const registerSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().min(10, "Phone number is required"),
    age: z.coerce.number().min(1, "Age must be a valid number"),
    relationshipType: z.enum(["son", "daughter", "friend", "self"]),
    schoolGrade: z.string().min(1, "School grade is required"),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema) as any,
        defaultValues: {
            relationshipType: "self",
        }
    })

    async function onSubmit(data: RegisterFormValues) {
        setIsLoading(true)
        setError(null)

        try {
            // 1. Create Appwrite Account
            const user = await account.create(
                ID.unique(),
                data.email,
                data.password,
                `${data.firstName} ${data.lastName}`
            )

            // 2. Create Session (Optional, but good for immediate login)
            await account.createEmailPasswordSession(data.email, data.password)

            // 3. Create Volunteer Document
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId, // Database ID
                APPWRITE_CONFIG.volunteersCollectionId,    // Collection ID
                ID.unique(),
                {
                    userId: user.$id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    age: data.age,
                    relationshipType: data.relationshipType,
                    schoolGrade: data.schoolGrade,
                    role: 'volunteer',
                    isApproved: false, // Default to false
                }
            )

            // 4. Send Verification Email (Optional but requested)
            // await account.createVerification('http://localhost:3000/verify');

            router.push("/dashboard") // Redirect to dashboard or pending approval page

        } catch (err: any) {
            console.error("Registration failed:", err)
            setError(err.message || "Registration failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Volunteer Registration</CardTitle>
                    <CardDescription>
                        Join Care and Share to track your service hours.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" {...register("firstName")} />
                                {errors.firstName && (
                                    <p className="text-xs text-red-500">{errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" {...register("lastName")} />
                                {errors.lastName && (
                                    <p className="text-xs text-red-500">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} />
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" {...register("password")} />
                            {errors.password && (
                                <p className="text-xs text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" {...register("phone")} />
                            {errors.phone && (
                                <p className="text-xs text-red-500">{errors.phone.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="age">Age</Label>
                                <Input id="age" type="number" {...register("age")} />
                                {errors.age && (
                                    <p className="text-xs text-red-500">{errors.age.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="schoolGrade">School Grade</Label>
                                <Input id="schoolGrade" {...register("schoolGrade")} />
                                {errors.schoolGrade && (
                                    <p className="text-xs text-red-500">{errors.schoolGrade.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="relationshipType">Relationship</Label>
                            <select
                                id="relationshipType"
                                {...register("relationshipType")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="self">Self</option>
                                <option value="son">Son</option>
                                <option value="daughter">Daughter</option>
                                <option value="friend">Friend</option>
                            </select>
                            {errors.relationshipType && (
                                <p className="text-xs text-red-500">{errors.relationshipType.message}</p>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Registering..." : "Register"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500">
                        Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
