"use client";

import React, { useState, useMemo } from "react";
import { useContacts } from "@/hooks/contacts/use-contacts";
import { Contact } from "@/types/contact/contact.type";
import { StatCard } from "@/components/dashboard/StatCard";
import {
    TicketIcon,
    ClockIcon,
    ShieldExclamationIcon,
    TagIcon,
    StarIcon,
    InboxIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";



// Colors for pie chart
const CHANNEL_COLORS = ["#3b82f6", "#10b981", "#8b5cf6"];

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

export default function ContactsDashboardPage() {
    const { data, isLoading: loading } = useContacts();
    const contacts = data?.items ?? [];
    const [timeRange, setTimeRange] = useState<"hourly" | "daily">("daily");

    // KPI calculations
    const stats = useMemo(() => {
        const openCount = contacts.filter(c => c.status === "OPEN").length;
        const skippedCount = contacts.filter(c => (c as any).is_skipped).length;

        // Avg Response Time (from created_at to first_response_at)
        const contactsWithResponse = contacts.filter(c => (c as any).first_response_at);
        let avgResponseMinutes = 0;
        if (contactsWithResponse.length > 0) {
            const totalMinutes = contactsWithResponse.reduce((sum, c) => {
                const created = new Date(c.created_at).getTime();
                const responded = new Date((c as any).first_response_at).getTime();
                return sum + (responded - created) / 60000;
            }, 0);
            avgResponseMinutes = Math.round(totalMinutes / contactsWithResponse.length);
        }

        // Satisfaction
        const rated = contacts.filter(c => (c as any).satisfaction_rating != null);
        const avgSatisfaction = rated.length > 0
            ? (rated.reduce((sum, c) => sum + ((c as any).satisfaction_rating || 0), 0) / rated.length).toFixed(1)
            : "N/A";

        // Format response time
        let responseTimeStr = "N/A";
        if (avgResponseMinutes > 0) {
            if (avgResponseMinutes < 60) {
                responseTimeStr = `${avgResponseMinutes}m`;
            } else {
                const hrs = Math.floor(avgResponseMinutes / 60);
                const mins = avgResponseMinutes % 60;
                responseTimeStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
            }
        }

        return { openCount, skippedCount, responseTimeStr, avgSatisfaction };
    }, [contacts]);

    // Line chart data
    const lineChartData = useMemo(() => {
        if (contacts.length === 0) return [];

        const grouped: Record<string, number> = {};

        contacts.forEach(c => {
            const d = new Date(c.created_at);
            let key: string;
            if (timeRange === "hourly") {
                key = `${d.getHours().toString().padStart(2, "0")}:00`;
            } else {
                key = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
            }
            grouped[key] = (grouped[key] || 0) + 1;
        });

        return Object.entries(grouped)
            .map(([name, tickets]) => ({ name, tickets }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, timeRange]);

    // Pie chart data
    const pieChartData = useMemo(() => {
        const channels: Record<string, number> = {};
        contacts.forEach(c => {
            const ch = c.channel || "FORM";
            channels[ch] = (channels[ch] || 0) + 1;
        });
        const labelMap: Record<string, string> = {
            EMAIL: "Email",
            LIVE_CHAT: "Live Chat",
            FORM: "Form",
        };
        return Object.entries(channels).map(([name, value]) => ({
            name: labelMap[name] || name,
            value,
        }));
    }, [contacts]);

    // Recent tickets
    const recentTickets = useMemo(() => {
        return [...contacts]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);
    }, [contacts]);

    // Skeleton
    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
                    <div className="h-4 w-72 bg-slate-100 animate-pulse mt-2 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-3xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[360px] bg-slate-100 animate-pulse rounded-3xl" />
                    <div className="h-[360px] bg-slate-100 animate-pulse rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-bold text-slate-900 text-[32px] leading-[130%]">
                        Hỗ trợ khách hàng
                    </h1>
                    <p className="text-slate-500 mt-1 text-base">
                        Tổng quan các chỉ số hỗ trợ và tình trạng ticket
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/admin/contacts/filtering"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all border border-slate-200 shadow-sm rounded-xl"
                    >
                        <ShieldExclamationIcon className="w-4 h-4" />
                        Bộ lọc
                    </Link>
                    <Link
                        href="/dashboard/admin/contacts/tags"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all border border-slate-200 shadow-sm rounded-xl"
                    >
                        <TagIcon className="w-4 h-4" />
                        Nhãn dán
                    </Link>
                    <Link
                        href="/dashboard/admin/contacts/inbox"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-teal-700 transition-all shadow-md shadow-primary/20 rounded-xl"
                    >
                        <InboxIcon className="w-4 h-4" />
                        Inbox
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Ticket mở"
                    value={stats.openCount}
                    icon={TicketIcon as any}
                    variant="brand"
                    description="Ticket đang chờ xử lý"
                />
                <StatCard
                    title="Thời gian phản hồi TB"
                    value={stats.responseTimeStr}
                    icon={ClockIcon as any}
                    variant="blue"
                    description="Thời gian phản hồi TB"
                />
                <StatCard
                    title="Spam phát hiện"
                    value={stats.skippedCount}
                    icon={ShieldExclamationIcon as any}
                    variant="default"
                    description="Ticket bị đánh dấu spam"
                />
                <StatCard
                    title="Điểm hài lòng"
                    value={stats.avgSatisfaction}
                    icon={StarIcon as any}
                    variant="emerald"
                    description="Điểm đánh giá trung bình"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-white p-6 shadow-premium rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-[20px] leading-[130%]">
                            <TicketIcon className="w-5 h-5 text-primary" />
                            Ticket theo thời gian
                        </h2>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as "hourly" | "daily")}
                            className="text-sm bg-slate-50 border border-slate-200 px-3 py-1.5 outline-none rounded-xl"
                        >
                            <option value="hourly">Theo giờ</option>
                            <option value="daily">Theo ngày</option>
                        </select>
                    </div>
                    {lineChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                        fontSize: "12px",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="tickets"
                                    stroke="#0F766E"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: "#0F766E" }}
                                    activeDot={{ r: 6 }}
                                    name="Số ticket"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <p className="text-slate-400 text-sm">Chưa có dữ liệu ticket</p>
                        </div>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 shadow-premium rounded-3xl">
                    <h2 className="font-bold text-slate-900 mb-6 text-[20px] leading-[130%]">
                        Kênh liên hệ
                    </h2>
                    {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieChartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                        fontSize: "12px"
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "12px" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <p className="text-slate-400 text-sm">Chưa có dữ liệu</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white shadow-premium overflow-hidden rounded-3xl">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2 text-[20px] leading-[130%]">
                        <InboxIcon className="w-5 h-5 text-primary" />
                        Ticket gần đây
                    </h2>
                    <Link
                        href="/dashboard/admin/contacts/inbox"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                        Xem tất cả <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentTickets.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Chưa có ticket nào
                        </div>
                    ) : (
                        recentTickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/admin/contacts/inbox/${ticket.id}`}
                                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-all"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                        {ticket.customer_name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{ticket.subject}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {ticket.customer_name} • {ticket.customer_email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-xl ${ticket.status === "OPEN"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : ticket.status === "PENDING"
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}>
                                        {ticket.status}
                                    </span>
                                    <span className="text-xs text-slate-400">{getRelativeTime(ticket.created_at)}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
