'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    ExternalLink,
    LayoutDashboard,
    ShieldCheck,
    Users,
    Settings,
    FileText,
    Building2,
    PieChart,
    Warehouse,
    User,
    LogOut,
    Mail,
    Lock,
    Home,
    Info,
    BookOpen,
    AlertTriangle,
    ChevronRight,
    Filter,
    Package,
    CreditCard,
    Briefcase
} from 'lucide-react'

interface RouteInfo {
    path: string;
    label: string;
    description: string;
}

interface RouteGroup {
    title: string;
    icon: React.ReactNode;
    color: string;
    routes: RouteInfo[];
}

const routeGroups: RouteGroup[] = [
    {
        title: "Authentication",
        icon: <Lock className="w-5 h-5" />,
        color: "text-blue-500",
        routes: [
            { path: "/login", label: "Login", description: "Sign in to your account" },
            { path: "/register", label: "Register", description: "Create a new account" },
            { path: "/forgot-password", label: "Forgot Password", description: "Reset your password via email" },
            { path: "/reset-password", label: "Reset Password", description: "Enter new password" },
            { path: "/verify-email", label: "Verify Email", description: "Email verification notice" },
        ]
    },
    {
        title: "Admin Dashboard",
        icon: <ShieldCheck className="w-5 h-5" />,
        color: "text-teal-600",
        routes: [
            { path: "/dashboard/admin", label: "Overview", description: "Main admin dashboard" },
            { path: "/dashboard/admin/revenue", label: "Revenue", description: "Financial reports" },
            { path: "/dashboard/admin/warehouses", label: "Warehouses", description: "Manage warehouse locations" },
            { path: "/dashboard/admin/products", label: "Products", description: "Product catalog management" },
            { path: "/dashboard/admin/contracts", label: "Contracts", description: "Manage all contracts" },
            { path: "/dashboard/admin/coupons", label: "Coupons", description: "Discount codes & offers" },
            { path: "/dashboard/admin/rental-duration-tiers", label: "Rental Tiers", description: "Rental package configuration" },
            { path: "/dashboard/admin/amenities", label: "Amenities", description: "Warehouse features & amenities" },
            { path: "/dashboard/admin/addons", label: "Addons", description: "Additional services" },
            { path: "/dashboard/admin/insurances", label: "Insurances", description: "Insurance products" },
            { path: "/dashboard/admin/customers", label: "Customers", description: "Customer management" },
            { path: "/dashboard/admin/organization", label: "Organization", description: "Partner organizations" },
            { path: "/dashboard/admin/organization/update-requests", label: "Update Requests", description: "Organization info change requests" },
            { path: "/dashboard/admin/organization/balance", label: "Organization Balance", description: "Manage organization account balances" },
            { path: "/dashboard/admin/users", label: "Users", description: "Staff management" },
            { path: "/dashboard/admin/notifications", label: "Notifications", description: "System notifications" },
            { path: "/dashboard/admin/contacts", label: "Support Contacts", description: "Customer support inquiries" },
            { path: "/dashboard/admin/settings", label: "Settings", description: "System configuration" },
            { path: "/dashboard/admin/warehouse-visits", label: "[Coming Soon] Warehouse Visits", description: "Warehouse visit bookings" },
            { path: "/dashboard/admin/refund-requests", label: "[Coming Soon] Refund Requests", description: "Customer refund requests" },
            { path: "/dashboard/admin/warnings", label: "[Coming Soon] Warnings", description: "Customer warnings & penalties" },
        ]
    },
    {
        title: "Customer Dashboard",
        icon: <LayoutDashboard className="w-5 h-5" />,
        color: "text-indigo-500",
        routes: [
            { path: "/dashboard/customer", label: "Overview", description: "Customer dashboard home" },
            { path: "/kho-bai", label: "Find & Book", description: "Search and book warehouses" },
            { path: "/dashboard/customer/bookings", label: "Bookings", description: "Booking requests status" },
            { path: "/dashboard/customer/contracts", label: "Contracts", description: "My contracts" },
            { path: "/dashboard/customer/payment", label: "Payment", description: "Billing and payments" },
            { path: "/dashboard/customer/warehouses", label: "[Coming Soon] My Warehouses", description: "Manage rented warehouse spaces" },
            { path: "/dashboard/customer/products", label: "[Coming Soon] Products", description: "Internal product management" },
            { path: "/dashboard/customer/inventory", label: "[Coming Soon] Inventory", description: "Stock intake & export" },
            { path: "/dashboard/customer/balance", label: "[Coming Soon] Account Balance", description: "Check account balance" },
            { path: "/dashboard/customer/refund-requests", label: "[Coming Soon] Refund Requests", description: "Request refunds" },
            { path: "/dashboard/customer/notifications", label: "Notifications", description: "Account notifications" },
            { path: "/dashboard/customer/warnings", label: "[Coming Soon] Warnings", description: "Account warnings & notices" },
            { path: "/dashboard/customer/settings", label: "[Coming Soon] Organization Settings", description: "Organization settings & profile" },
            { path: "/user/profile", label: "Profile", description: "Personal account settings" },
        ]
    },
    {
        title: "Public Pages",
        icon: <Home className="w-5 h-5" />,
        color: "text-emerald-500",
        routes: [
            { path: "/", label: "Landing Page", description: "Main entry point" },
            { path: "/about", label: "About", description: "Company information" },
            { path: "/kho-bai", label: "Warehouse Search", description: "Public warehouse listing" },
            { path: "/bookings", label: "Public Bookings", description: "Service reservations" },
        ]
    },
    {
        title: "Development & Utils",
        icon: <Settings className="w-5 h-5" />,
        color: "text-rose-500",
        routes: [
            { path: "/error", label: "Error 404", description: "Not found page" },
            { path: "/dev/routes", label: "Route Explorer", description: "You are here" },
            { path: "/warehouse-3d", label: "3D-Warehouse", description: "Interactive 3D warehouse visualization" },
        ]
    }
];

export default function DevRoutesPage() {
    const [search, setSearch] = useState('')

    const filteredGroups = routeGroups.map(group => ({
        ...group,
        routes: group.routes.filter(route =>
            route.label.toLowerCase().includes(search.toLowerCase()) ||
            route.path.toLowerCase().includes(search.toLowerCase()) ||
            route.description.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(group => group.routes.length > 0)

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 mb-4"
                        >
                            <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold rounded-full uppercase tracking-wider">
                                Developer Tools
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                            <span className="text-[var(--muted-foreground)] text-xs font-medium">v1.2.0</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl font-extrabold tracking-tight mb-4 flex items-center gap-4 text-[var(--foreground)]"
                        >
                            Route Explorer
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[var(--muted-foreground)] text-xl max-w-2xl leading-relaxed"
                        >
                            A centralized directory for all application endpoints.
                            Search, filter, and navigate through the project structure effortlessly.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative w-full md:w-96"
                    >
                        <div className="absolute inset-0 bg-[var(--primary)]/5 blur-2xl rounded-full -z-10" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                        <input
                            type="text"
                            placeholder="Search routes by name or path..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] outline-none transition-all shadow-sm text-lg"
                        />
                    </motion.div>
                </header>

                <div className="space-y-16">
                    <AnimatePresence mode="popLayout">
                        {filteredGroups.map((group, groupIdx) => (
                            <motion.section
                                key={group.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, delay: groupIdx * 0.05 }}
                                layout
                            >
                                <div className="flex items-center gap-4 mb-8">
                                    <div className={`p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm ${group.color}`}>
                                        {group.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-[var(--foreground)]">{group.title}</h2>
                                        <p className="text-sm text-[var(--muted-foreground)]"> {group.routes.length} active endpoints</p>
                                    </div>
                                    <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent ml-4" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {group.routes.map((route) => (
                                        <Link key={route.path} href={route.path}>
                                            <motion.div
                                                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                                className="group relative h-full flex flex-col p-6 bg-[var(--card)] border border-[var(--border)] rounded-3xl hover:border-[var(--primary)] transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-[var(--primary)]/10"
                                            >
                                                <div className="absolute top-4 right-4 p-2 rounded-xl bg-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100">
                                                    <ExternalLink className="w-4 h-4 text-[var(--primary)]" />
                                                </div>

                                                <h3 className="font-bold text-xl mb-2 group-hover:text-[var(--primary)] transition-colors pr-8">
                                                    {route.label}
                                                </h3>

                                                <p className="text-sm text-[var(--muted-foreground)] mb-6 flex-grow leading-relaxed">
                                                    {route.description}
                                                </p>

                                                <div className="flex items-center gap-2 mt-auto">
                                                    <div className="flex items-center text-[11px] font-mono font-medium text-[var(--muted-foreground)] bg-[var(--secondary)] px-3 py-2 rounded-xl border border-[var(--border)] group-hover:bg-[var(--primary)]/5 group-hover:text-[var(--primary)] group-hover:border-[var(--primary)]/20 transition-all truncate">
                                                        {route.path}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </motion.section>
                        ))}
                    </AnimatePresence>

                    {filteredGroups.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-24 px-6 bg-[var(--card)] rounded-[3rem] border-2 border-dashed border-[var(--border)] text-center"
                        >
                            <div className="w-20 h-20 bg-[var(--secondary)] rounded-full flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-[var(--muted-foreground)]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">No matching routes</h3>
                            <p className="text-[var(--muted-foreground)] max-w-sm">
                                We couldn't find any routes matching "{search}". Try searching for something else or browse the categories.
                            </p>
                            <button
                                onClick={() => setSearch('')}
                                className="mt-8 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/20"
                            >
                                Clear Search
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
