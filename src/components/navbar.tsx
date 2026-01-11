"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

export function Navbar() {
    const { user, volunteer, logout } = useAuth()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const pathname = usePathname()

    const publicPaths = ["/", "/login", "/register"]
    const isPublicPath = publicPaths.includes(pathname)

    if (pathname === "/") return null
    if (isPublicPath && !user) return null

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="font-bold text-xl text-primary flex items-center gap-2 whitespace-nowrap">
                    <span className="text-2xl">🍞</span>
                    <span>Care & Share</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <>
                            {/* Desktop Menu */}
                            <div className="hidden lg:flex items-center gap-4 mr-2 border-r pr-4 border-border">
                                <Link
                                    href="/"
                                    className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                    Home
                                </Link>
                                {pathname !== '/dashboard' && (
                                    <Link
                                        href="/dashboard"
                                        className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                                    >
                                        My Dashboard
                                    </Link>
                                )}

                                {volunteer?.role === 'super_admin' && (
                                    <Link
                                        href="/super-admin"
                                        className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/super-admin' ? 'text-primary' : 'text-muted-foreground'}`}
                                    >
                                        Super Admin
                                    </Link>
                                )}

                                {(volunteer?.role === 'admin' || volunteer?.role === 'super_admin') && (
                                    <>
                                        <Link
                                            href="/admin"
                                            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
                                        >
                                            Admin Panel
                                        </Link>
                                        <Link
                                            href="/admin/reports"
                                            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/admin/reports' ? 'text-primary' : 'text-muted-foreground'}`}
                                        >
                                            View Reports
                                        </Link>
                                    </>
                                )}

                                {(volunteer?.role === 'parent' || volunteer?.role === 'super_admin') && (
                                    <Link
                                        href="/parent"
                                        className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/parent' ? 'text-primary' : 'text-muted-foreground'}`}
                                    >
                                        Family Management
                                    </Link>
                                )}
                            </div>

                            <div className="hidden md:flex flex-col items-end text-sm">
                                <span className="font-medium text-foreground leading-tight">{volunteer?.firstName || user.email}</span>
                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                                    {volunteer?.role?.replace('_', ' ') || 'User'}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={logout} className="hidden md:inline-flex text-muted-foreground hover:text-destructive h-8 px-2">
                                Log Out
                            </Button>

                            {/* Mobile Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && user && (
                <div className="lg:hidden border-t bg-background px-4 py-4 shadow-lg">
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-col text-sm pb-4 border-b">
                            <span className="font-medium text-foreground">{volunteer?.firstName || user.email}</span>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">
                                {volunteer?.role?.replace('_', ' ') || 'User'}
                            </span>
                        </div>

                        {pathname !== '/dashboard' && (
                            <>
                                <Link
                                    href="/"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-sm font-medium transition-colors hover:text-primary text-muted-foreground py-2 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                    Home
                                </Link>
                                <Link
                                    href="/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground py-2"
                                >
                                    My Dashboard
                                </Link>
                            </>
                        )}

                        {volunteer?.role === 'super_admin' && (
                            <Link
                                href="/super-admin"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`text-sm font-medium transition-colors hover:text-primary py-2 ${pathname === '/super-admin' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Super Admin
                            </Link>
                        )}

                        {(volunteer?.role === 'admin' || volunteer?.role === 'super_admin') && (
                            <>
                                <Link
                                    href="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-sm font-medium transition-colors hover:text-primary py-2 ${pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                    Admin Panel
                                </Link>
                                <Link
                                    href="/admin/reports"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-sm font-medium transition-colors hover:text-primary py-2 ${pathname === '/admin/reports' ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                    View Reports
                                </Link>
                            </>
                        )}

                        {(volunteer?.role === 'parent' || volunteer?.role === 'super_admin') && (
                            <Link
                                href="/parent"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`text-sm font-medium transition-colors hover:text-primary py-2 ${pathname === '/parent' ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                                Family Management
                            </Link>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                logout();
                            }}
                            className="text-muted-foreground hover:text-destructive justify-start px-0 h-auto py-2"
                        >
                            Log Out
                        </Button>
                    </div>
                </div>
            )}
        </nav>
    )
}
