"use client"

import { useEffect, useState } from "react"
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
import { Query } from "appwrite"
import Link from "next/link"
import { useRouter } from "next/navigation"

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

import { useAuth } from "@/context/AuthContext"

export default function LoginPage() {
    const router = useRouter()
    const { refreshAuth, isLoading: authLoading } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    })

    async function onSubmit(data: LoginFormValues) {
        setIsLoading(true)
        setError(null)

        try {
            // Proactively clear any existing session to prevent "session prohibited" error
            try {
                await account.deleteSession('current')
            } catch (e) {
                // Ignore if no session exists
            }

            await account.createEmailPasswordSession(data.email, data.password)

            // Check if volunteer profile exists
            const currentUser = await account.get();
            const volunteerRes = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.volunteersCollectionId,
                [Query.equal('userId', currentUser.$id)]
            );

            if (volunteerRes.documents.length === 0) {
                await account.deleteSession('current');
                throw new Error("Access denied. No volunteer account found for this email.");
            }

            // Refresh authentication state in context
            await refreshAuth()
            // Redirection is handled by AuthProvider's useEffect
        } catch (err: any) {
            console.error("Login failed:", err)
            if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
                setError(`Connection Error: Please ensure you've whitelisted 'localhost' in the Appwrite Console (Settings > Platforms). Raw error: ${err.message}`)
            } else {
                setError(err.message || "Invalid email or password.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white selection:bg-teal-500 selection:text-white relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 w-full max-w-md">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Welcome back to Care and Share.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

                            {error && <p className="text-sm text-red-500 font-medium p-2 bg-red-50 rounded border border-red-100">{error}</p>}

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Logging in..." : "Login"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account? <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
