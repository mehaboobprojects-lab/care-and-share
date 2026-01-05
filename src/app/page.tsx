"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white selection:bg-teal-500 selection:text-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-4 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 text-2xl font-bold tracking-tight text-teal-400 flex items-center gap-2 whitespace-nowrap">
              <span>🍞</span>
              <span>Care & Share</span>
            </Link>
          </div>
          <div className="flex gap-x-4 lg:gap-x-12">
            <Link href="/login" className="text-sm font-semibold leading-6 text-white hover:text-teal-300 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="text-sm font-semibold leading-6 bg-teal-500 px-4 py-2 rounded-full hover:bg-teal-400 transition-colors text-slate-900">
              Join Volunteers
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="mx-auto max-w-2xl text-center relative z-10 p-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-teal-500"
          >
            Serving the Community, <br /> One Sandwich at a Time.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-gray-300"
          >
            Join a growing community of volunteers who prepare 800 fresh sandwiches at every event and deliver them to families in need across New Jersey. Track your service hours, support distribution, and make a real difference.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10 flex items-center justify-center gap-x-6"
          >
            <Button asChild size="lg" className="bg-teal-500 text-slate-900 hover:bg-teal-400 text-lg h-12 px-8 rounded-full">
              <Link href="/register">Get Started</Link>
            </Button>
            <Link href="/login" className="text-sm font-semibold leading-6 text-white flex items-center gap-1 group">
              Volunteer Login <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Care and Share. All rights reserved.
      </footer>
    </div>
  )
}
