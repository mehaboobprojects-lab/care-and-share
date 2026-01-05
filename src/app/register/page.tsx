"use client"

import { RegistrationMultiStep } from "@/components/registration-multi-step"
import { useEffect } from "react"
import { account } from "@/lib/appwrite"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/context/AuthContext"

export default function RegisterPage() {
    const { isLoading: authLoading } = useAuth()

    if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white selection:bg-teal-500 selection:text-white relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 w-full max-w-2xl space-y-4">
                <RegistrationMultiStep />
                <p className="text-center text-sm text-gray-500">
                    Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    )
}
