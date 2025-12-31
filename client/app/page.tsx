"use client";

import React, { useEffect, useState } from "react";
import { PrimeNestHeader } from "@/components/landing/homepage/Header";
import { PrimeNestHero } from "@/components/landing/homepage/Hero";
import { PrimeNestSearch } from "@/components/landing/homepage/Search";
import { PrimeNestFeatures } from "@/components/landing/homepage/Features";
import { PrimeNestAbout } from "@/components/landing/homepage/About";
import { PrimeNestFeatured } from "@/components/landing/homepage/Featured";
import { PrimeNestTestimonials } from "@/components/landing/homepage/Testimonials";
import { PrimeNestFAQ } from "@/components/landing/homepage/FAQ";
import { PrimeNestContact } from "@/components/landing/homepage/Contact";
import { PrimeNestFooter } from "@/components/landing/homepage/Footer";
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
                <PrimeNestSearch />
                <PrimeNestFeatures />
                <PrimeNestAbout />
                <PrimeNestFeatured />
                <PrimeNestTestimonials />
                <PrimeNestFAQ />
                <PrimeNestContact />
            </main>
            <PrimeNestFooter />
        </div>
    );
}
