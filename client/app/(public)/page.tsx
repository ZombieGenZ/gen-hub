'use client'

import { useEffect } from "react";
import { HeroSection } from "@/components/ui/hero-section-1";
import { UserService } from "@/services/user/user.service";
import { usePathname } from 'next/navigation'
import { authStorage } from "@/services/auth/auth-storage.service";

const userService = new UserService()

export default function Home() {
    const pathname = usePathname()
    useEffect(() => {
        const token = authStorage.getAccessToken()
        const refresh_token = authStorage.getRefreshToken()
        if (token && refresh_token) {
            const res = userService.getUser(token, refresh_token)
            console.log(res)
        }
    }, [pathname])
    return <HeroSection />;
}
