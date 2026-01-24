"use client";

import React, { useEffect, useState } from "react";
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
import { UserService } from "@/services/user/user.service";
import { NotificationService } from "@/services/notification/notification.service";
import type { Notification } from "@/types/notification/notification.type";
import { useToast } from "@/contexts/ToastContext";
import { ScrollReveal } from "@/components/ScrollReveal";

interface UserInfo {
    name?: string;
    email?: string;
    avatar?: string;
    roles?: string[];
}

export default function Home() {
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserInfo | undefined>(undefined);
    const { showToast } = useToast()
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Scroll Tracking State
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const accessToken = authStorage.getAccessToken();
            const refreshToken = authStorage.getRefreshToken();
            if (accessToken && refreshToken) {
                setIsLogin(true);
                try {
                    const userService = new UserService();
                    const notificationService = new NotificationService();
                    const userData = await userService.getUser(accessToken, refreshToken);
                    setUser({
                        name: userData.user.name,
                        email: userData.user.email,
                        avatar: undefined, // Will use default avatar
                        roles: userData.roles.map(r => r.name),
                    });

                    const getUserNotifications = await notificationService.getNotifications(accessToken);
                    const getGlobalNotifications = await notificationService.globalNotification(accessToken);
                    setNotifications([...getGlobalNotifications, ...getUserNotifications]);
                    showToast("You have new notifications!", "info");
                    showToast(`You have ${getUserNotifications.length} new personal notifications and ${getGlobalNotifications.length} global notifications.`, "info");
                } catch (error) {
                    console.error("Failed to fetch user data:", error);
                }
            }
        };
        checkAuth();
    }, [showToast]);

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

    return (
        <div className="relatisve min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
            {/* Navbar - Always visible with scroll effect */}
            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
                    isScrolled
                        ? 'bg-white/95 backdrop-blur-md shadow-lg'
                        : 'bg-transparent'
                }`}
            >
                <PrimeNestHeader isLogin={isLogin} user={user} />
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

