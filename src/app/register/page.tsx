"use client"

import { RegistrationMultiStep } from "@/components/registration-multi-step"
import { useEffect } from "react"
import { account } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await account.get()
                router.push("/dashboard")
            } catch (err) {
                // Not logged in, stay on register page
            }
        }
        checkAuth()
    }, [router])
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl space-y-4">
                <RegistrationMultiStep />
                <p className="text-center text-sm text-gray-500">
                    Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    )
}
