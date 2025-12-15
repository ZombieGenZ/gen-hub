'use client'

import { useEffect } from "react";
import { HeroSection } from "@/components/ui/hero-section-1";
import { UserService } from "@/services/user/user.service";
import { usePathname } from 'next/navigation'

const userService = new UserService()

export default function Home() {
    const pathname = usePathname()
    useEffect(() => {
        const token = localStorage.getItem('access_token')
        const refresh_token = localStorage.getItem('refresh_token')
        if (token && refresh_token) {
            const res = userService.getUser(token, refresh_token)
            console.log(res)
        }
    }, [pathname])
    return <HeroSection />;
}
