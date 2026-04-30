"use client";

import React, { useEffect, useRef, useState } from "react";
import { PublicHeader } from "@/components/layouts/PublicHeader";
import { PrimeNestHero } from "@/app/(public)/homepage/Hero";
import { PrimeNestSearch } from "@/app/(public)/homepage/Search";
import { PrimeNestAbout } from "@/app/(public)/homepage/About";
import { PrimeNestFeatured } from "@/app/(public)/homepage/Featured";
import { PrimeNestTestimonials } from "@/app/(public)/homepage/Testimonials";
import { PrimeNestFAQ } from "@/app/(public)/homepage/FAQ";
import { PrimeNestContact } from "@/app/(public)/homepage/Contact";
import { PrimeNestFooter } from "@/app/(public)/homepage/Footer";
import { PrimeNestChatbot } from "@/app/(public)/homepage/Chatbot";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AuthService } from "@/services/auth/auth.service";
import { UserService } from "@/services/user/user.service";
import { NotificationService } from "@/services/notification/notification.service";
import type { UserNotification as Notification } from "@/types/notification/notification.type";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { ScrollReveal } from "@/components/ScrollReveal";

interface UserInfo {
    name?: string;
    email?: string;
    avatar?: string;
    roles?: string[];
}

const userService = new UserService();
const notificationService = new NotificationService();
const authService = new AuthService();

export default function Home() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserInfo | undefined>(undefined);
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const hasShownNotificationRef = useRef(false);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        const fetchAll = async () => {
            try {
                // Nếu không có refresh token thì coi như chưa đăng nhập
                const refreshToken = authStorage.getRefreshToken();
                if (!refreshToken) {
                    if (isMounted) {
                        setIsLogin(false);
                        setUser(undefined);
                        setNotifications([]);
                    }
                    return;
                }

                // getValidAccessToken tự xử lý cả 2 trường hợp: token hết hạn và không có token
                const accessToken = await authService.getValidAccessToken();
                if (!accessToken) {
                    if (isMounted) {
                        setIsLogin(false);
                        setUser(undefined);
                        setNotifications([]);
                        router.push("/login");
                    }
                    return;
                }

                if (isMounted) setIsLogin(true);

                const latestRefreshToken = authStorage.getRefreshToken()!;

                // Fetch user data + notifications song song, không chờ lần lượt
                const [userData] = await Promise.all([
                    userService.getUser(accessToken, latestRefreshToken),
                    (async () => {
                        try {
                            const [userNotifsRes, globalNotifsRes] = await Promise.all([
                                notificationService.getNotifications(accessToken),
                                notificationService.getGlobalNotifications(accessToken),
                            ]);
                            if (!isMounted) return;
                            const userNotifs = userNotifsRes?.items || [];
                            const globalNotifs = globalNotifsRes?.items || [];
                            setNotifications([...(globalNotifs as any[]), ...userNotifs]);
                            const total = userNotifs.length + globalNotifs.length;
                            if (total > 0 && !hasShownNotificationRef.current) {
                                hasShownNotificationRef.current = true;
                                showToast(
                                    `Bạn có ${total} thông báo mới (${userNotifs.length} cá nhân, ${globalNotifs.length} toàn hệ thống).`,
                                    "info"
                                );
                            }
                        } catch {
                            // notifications không ảnh hưởng đến hiển thị trang chính
                        }
                    })(),
                ]);

                if (!isMounted) return;
                setUser({
                    name: userData.user.name,
                    email: userData.user.email,
                    avatar: userData.user.avatar,
                    roles: userData.roles.map((r: any) => typeof r === "string" ? r : r.name),
                });
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchAll();
        return () => { isMounted = false; };
    }, [router, showToast]);

    const handleLogout = () => {
        setIsLogin(false);
        setUser(undefined);
    };

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
            <PublicHeader isLogin={isLogin} user={user} onLogout={handleLogout} />

            <main className="z-10 h-full w-full">
                <section className="flex items-center justify-center">
                    <ScrollReveal animation="fade-up" duration={800}>
                        <PrimeNestHero />
                    </ScrollReveal>
                </section>

                <section className="bg-white">
                    <ScrollReveal animation="fade-up" duration={700}>
                        <PrimeNestAbout />
                    </ScrollReveal>
                </section>

                <section className="bg-white">
                    <ScrollReveal animation="zoom-in" duration={700}>
                        <PrimeNestFeatured />
                    </ScrollReveal>
                </section>

                <section className="bg-slate-50">
                    <ScrollReveal animation="fade-left" duration={700}>
                        <PrimeNestTestimonials />
                    </ScrollReveal>
                </section>

                <section className="bg-white">
                    <ScrollReveal animation="fade-up" duration={700}>
                        <PrimeNestFAQ />
                    </ScrollReveal>
                </section>
                <ScrollReveal animation="fade-up" duration={600}>
                    <PrimeNestFooter />
                </ScrollReveal>
            </main>

            <PrimeNestChatbot />
        </div>
    );
}
