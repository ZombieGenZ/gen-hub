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
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { NotificationService } from "@/services/notification/notification.service";
import type { Notification } from "@/types/notification/notification.type";
import { useToast } from "@/contexts/ToastContext";

interface UserInfo {
    name?: string;
    email?: string;
    avatar?: string;
    roles?: string[];
}

interface SectionProps {
    children: React.ReactNode;
    index: number;
    activeSection: number;
    mousePos: { x: number; y: number };
}

const Section = ({ children, index, activeSection, mousePos }: SectionProps) => {
    const [particles] = useState(() => 
        [...Array(20)].map(() => ({
            left: Math.random() * 100,
            top: Math.random() * 100,
            duration: 5 + Math.random() * 10,
            delay: Math.random() * 5,
        }))
    );
    
    const isActive = index === activeSection;
    const isPast = index < activeSection;
    const isFuture = index > activeSection;

    const scale = isPast ? 0.88 - (activeSection - index) * 0.03 : isActive ? 1 : 0.92;
    const rotateX = isPast ? (activeSection - index) * 5 : isFuture ? -5 : 0;
    const translateZ = isPast ? -50 * (activeSection - index) : isFuture ? -30 : 0;
    const opacity = isPast ? Math.max(0.2, 1 - (activeSection - index) * 0.2) : 1;

    // Additional translation for stacking effect
    const translateY = isPast ? -30 * (activeSection - index) : 0;

    return (
        <section
            className={`sticky top-0 h-screen flex items-center justify-center overflow-hidden transition-all duration-700 ease-out ${index > 0 ? "rounded-t-[50px] shadow-2xl" : ""
                }`}
            style={{
                zIndex: 10 + index, 
                transform: `scale(${scale}) translateZ(${translateZ}px) rotateX(${rotateX}deg) translateY(${translateY}px)`,
                opacity: opacity,
                transformStyle: 'preserve-3d',
                perspective: '1000px',
                filter: isPast ? `blur(${(activeSection - index) * 2}px) brightness(0.7)` : 'blur(0) brightness(1)',
                backgroundColor: index === 0 ? 'transparent' : 'white' // Ensure background for cards, Hero can be transparent
            }}
        >
            {/* Background Effects */}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    background: `
              radial-gradient(at ${mousePos.x / (typeof window !== 'undefined' ? window.innerWidth : 1) * 100}% ${mousePos.y / (typeof window !== 'undefined' ? window.innerHeight : 1) * 100}%, rgba(168, 85, 247, 0.3) 0%, transparent 50%),
              radial-gradient(at ${100 - mousePos.x / (typeof window !== 'undefined' ? window.innerWidth : 1) * 100}% ${100 - mousePos.y / (typeof window !== 'undefined' ? window.innerHeight : 1) * 100}%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)
            `
                }}
            />

            {/* Floating Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {particles.map((particle, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-slate-400/20 rounded-full"
                        style={{
                            left: `${particle.left}%`,
                            top: `${particle.top}%`,
                            animation: `float ${particle.duration}s ease-in-out infinite`,
                            animationDelay: `${particle.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Animated Grid */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `
              linear-gradient(rgba(15, 118, 110, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(15, 118, 110, 0.1) 1px, transparent 1px)
            `,
                    backgroundSize: '60px 60px',
                    animation: 'gridMove 20s linear infinite'
                }}
            />

            {/* Content Wrapper */}
            <div className={`relative z-10 w-full h-full flex flex-col justify-center transition-all duration-1000 ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95'
                }`}
                style={{ transitionDelay: isActive ? '300ms' : '0ms' }}
            >
                {children}
            </div>
        </section>
    );
};

export default function Home() {
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserInfo | undefined>(undefined);
    const { showToast } = useToast()
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Scroll Tracking State
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
            // Calculate active section based on scroll position - simplified for sticky stacking
            // In a sticky stack, the "active" visual section is the one currently at the top or mostly visible.
            // With h-screen sections, we can estimate:
            const sectionIndex = Math.min(Math.floor((scrollTop + window.innerHeight * 0.5) / window.innerHeight), 6);
            setActiveSection(sectionIndex);
        };

        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
            {/* Cursor Glow Effect */}
            <div
                className="fixed w-96 h-96 pointer-events-none z-50 transition-all duration-300 ease-out mix-blend-multiply opacity-50"
                style={{
                    left: mousePos.x - 192,
                    top: mousePos.y - 192,
                    background: `radial-gradient(circle, rgba(15, 118, 110, 0.4) 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                }}
            />

            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-50">
                <div
                    className="h-full bg-linear-to-r from-teal-500 via-emerald-500 to-green-500"
                    style={{ width: `${scrollProgress * 100}%` }}
                />
            </div>

            {/* Navbar */}
            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-all duration-700 ${activeSection > 0
                        ? '-translate-y-full opacity-0 scale-95'
                        : 'translate-y-0 opacity-100 scale-100'
                    }`}
                style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
                <PrimeNestHeader isLogin={isLogin} user={user} />
            </div>

            {/* Section Counter */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
                {[...Array(7)].map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all duration-500 shadow-sm ${idx === activeSection ? 'bg-teal-600 h-8' : idx < activeSection ? 'bg-teal-300' : 'bg-slate-300'
                            }`}
                    />
                ))}
            </div>

            <main className="relative z-10 w-full">
                {/* 1. Hero */}
                <Section index={0} activeSection={activeSection} mousePos={mousePos}>
                    <PrimeNestHero />
                </Section>

                {/* 2. About */}
                <Section index={1} activeSection={activeSection} mousePos={mousePos}>
                     <PrimeNestAbout />
                </Section>

                {/* 3. Search */}
                <Section index={2} activeSection={activeSection} mousePos={mousePos}>
                    <PrimeNestSearch />
                </Section>

                {/* 4. Featured */}
                <Section index={3} activeSection={activeSection} mousePos={mousePos}>
                    <PrimeNestFeatured />
                </Section>

                {/* 5. Testimonials */}
                <Section index={4} activeSection={activeSection} mousePos={mousePos}>
                    <PrimeNestTestimonials />
                </Section>

                {/* 6. FAQ */}
                <Section index={5} activeSection={activeSection} mousePos={mousePos}>
                    <PrimeNestFAQ />
                </Section>

                {/* 7. Contact & Footer */}
                <Section index={6} activeSection={activeSection} mousePos={mousePos}>
                     <div className="h-full flex flex-col justify-between">
                         <div className="bg-white flex-1 flex flex-col justify-center">
                            <PrimeNestContact />
                         </div>
                         <PrimeNestFooter />
                     </div>
                </Section>
            </main>
        </div>
    );
}

