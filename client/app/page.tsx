"use client";

import React, { useEffect, useRef, useState } from "react";
import { PrimeNestHeader } from "@/app/(public)/homepage/Header";
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

const FIVE_MINUTES_MS = 1 * 60 * 1000;

export default function Home() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserInfo | undefined>(undefined);
    const { showToast } = useToast()
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const hasShownNotificationRef = useRef(false);
    const isFetchingRef = useRef(false);

    // Scroll Tracking State
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let intervalId: number | undefined;

        const fetchUserData = async () => {
            if (isFetchingRef.current) return;
            isFetchingRef.current = true;
            try {
                // Nếu không có refresh token thì coi như chưa đăng nhập
                const refreshToken = authStorage.getRefreshToken();
                if (!refreshToken) {
                    if (!isMounted) return;
                    setIsLogin(false);
                    setUser(undefined);
                    setNotifications([]);
                    return;
                }

                // Nếu thiếu access token nhưng còn refresh token -> refresh ngay để lấy token mới
                let accessToken = authStorage.getAccessToken();
                if (!accessToken) {
                    try {
                        await authService.getNewToken(refreshToken);
                        showToast("Token đã được cập nhật", "success");
                        console.log("Token đã được cập nhật");
                        accessToken = authStorage.getAccessToken();
                    } catch {
                        accessToken = null;
                    }
                }

                // Nếu access token có nhưng hết hạn -> lấy token hợp lệ (tự refresh nếu cần)
                if (accessToken && !authStorage.isAuthenticated()) {
                    accessToken = await authService.getValidAccessToken();
                }

                if (!accessToken) {
                    if (!isMounted) return;
                    setIsLogin(false);
                    setUser(undefined);
                    setNotifications([]);
                    router.push("/login");
                    return;
                }

                if (!isMounted) return;
                setIsLogin(true);

                // Sau refresh token rotation, refresh token trong cookie có thể đã đổi
                const latestRefreshToken = authStorage.getRefreshToken() || refreshToken;

                const userData = await userService.getUser(accessToken, latestRefreshToken);
                if (!isMounted) return;
                setUser({
                    name: userData.user.name,
                    email: userData.user.email,
                    avatar: undefined,
                    roles: userData.roles.map((r) => r.name),
                });
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                isFetchingRef.current = false;
            }
        };

        // gọi ngay khi mount
        fetchUserData();
        // gọi lại mỗi 1 phút
        intervalId = window.setInterval(fetchUserData, FIVE_MINUTES_MS);

        return () => {
            isMounted = false;
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [router, showToast]);

    useEffect(() => {
        let isMounted = true;

        const fetchNotifications = async () => {
            try {
                const accessToken = authStorage.getAccessToken();
                if (!accessToken || !isLogin) return;

                const [userNotifsResponse, globalNotifsResponse] = await Promise.all([
                    notificationService.getNotifications(accessToken),
                    notificationService.getGlobalNotifications(accessToken),
                ]);

                if (!isMounted) return;
                const userNotifs = userNotifsResponse?.items || [];
                const globalNotifs = globalNotifsResponse?.items || [];
                // Cast global notifications to any to merge with user notifications for now
                setNotifications([...(globalNotifs as any[]), ...userNotifs]);

                const total = (userNotifs?.length || 0) + (globalNotifs?.length || 0);
                if (total > 0 && !hasShownNotificationRef.current) {
                    hasShownNotificationRef.current = true;
                    showToast(
                        `Bạn có ${total} thông báo mới (${userNotifs.length} cá nhân, ${globalNotifs.length} toàn hệ thống).`,
                        "info"
                    );
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        // Chỉ fetch notifications khi user đã đăng nhập
        if (isLogin) {
            fetchNotifications();
        }
    }, [isLogin, showToast]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? scrollTop / docHeight : 0;
            setScrollProgress(progress);
            setIsScrolled(scrollTop > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleLogout = () => {
        setIsLogin(false);
        setUser(undefined);
    };

    return (
        <div className="relatisve min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
            {/* Navbar - Always visible with scroll effect */}
            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${isScrolled
                    ? 'bg-white/95 backdrop-blur-md shadow-lg'
                    : 'bg-transparent'
                    }`}
            >
                <PrimeNestHeader isLogin={isLogin} user={user} onLogout={handleLogout} />
            </div>

            <main className="z-10 h-full w-full">
                {/* 1. Hero */}
                <section className="mt-20 flex items-center justify-center">
                    <ScrollReveal animation="fade-up" duration={800}>
                        <PrimeNestHero />
                    </ScrollReveal>
                </section>

                {/* 2. About */}
                <section className="bg-white">
                    <ScrollReveal animation="fade-up" duration={700}>
                        <PrimeNestAbout />
                    </ScrollReveal>
                </section>

                {/* 3. Featured */}
                <section className="bg-white">
                    <ScrollReveal animation="zoom-in" duration={700}>
                        <PrimeNestFeatured />
                    </ScrollReveal>
                </section>

                {/* 5. Testimonials */}
                <section className="bg-slate-50">
                    <ScrollReveal animation="fade-left" duration={700}>
                        <PrimeNestTestimonials />
                    </ScrollReveal>
                </section>

                {/* 6. FAQ */}
                <section className="bg-white">
                    <ScrollReveal animation="fade-up" duration={700}>
                        <PrimeNestFAQ />
                    </ScrollReveal>
                </section>

                {/* 7. Contact */}
                <section className="bg-slate-50">
                    <ScrollReveal animation="fade-up" duration={700}>
                        <PrimeNestContact />
                    </ScrollReveal>
                </section>

                {/* Footer */}
                <ScrollReveal animation="fade-up" duration={600}>
                    <PrimeNestFooter />
                </ScrollReveal>
            </main>

            {/* Chatbot Widget */}
            <PrimeNestChatbot />
        </div>
    );
}

