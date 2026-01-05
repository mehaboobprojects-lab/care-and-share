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
import { account } from "@/lib/appwrite"
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
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

                        {error && <p className="text-sm text-red-500">{error}</p>}

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
    )
}
