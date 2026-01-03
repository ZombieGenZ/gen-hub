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

interface UserInfo {
    name?: string;
    email?: string;
    avatar?: string;
}

export default function Home() {
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState<UserInfo | undefined>(undefined);

    useEffect(() => {
        const checkAuth = async () => {
            const accessToken = authStorage.getAccessToken();
            const refreshToken = authStorage.getRefreshToken();

            if (accessToken && refreshToken) {
                setIsLogin(true);
                try {
                    const userService = new UserService();
                    const userData = await userService.getUser(accessToken, refreshToken);
                    setUser({
                        name: userData.user.name,
                        email: userData.user.email,
                        avatar: undefined, // Will use default avatar
                    });
                } catch (error) {
                    console.error("Failed to fetch user data:", error);
                }
            }
        };

        checkAuth();
    }, []);

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <PrimeNestHeader isLogin={isLogin} user={user} />
            <main>
                <PrimeNestHero />
                <PrimeNestAbout />
                <PrimeNestSearch />
                <PrimeNestFeatured />
                <PrimeNestTestimonials />
                <PrimeNestFAQ />
                <PrimeNestContact />
            </main>
            <PrimeNestFooter />
        </div>
    );
}
