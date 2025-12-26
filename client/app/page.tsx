'use client'

import { useEffect } from "react";
import { HeroSection } from "@/components/ui/hero-section-1";
import { UserService } from "@/services/user/user.service";
import { usePathname } from 'next/navigation'
import { authStorage } from "@/services/auth/auth-storage.service";
import { AuthService } from "@/services/auth/auth.service";
import { useRouter } from "next/navigation";

const userService = new UserService()
const authService = new AuthService()

export default function Home() {
    const pathname = usePathname()
    const router = useRouter()
    useEffect(() => {
        const checkToken = async () => {
            const token = authStorage.getAccessToken()
            const refresh_token = authStorage.getRefreshToken()
            
            if (token && refresh_token) {
                try {
                    // Try to get user with current token
                    await userService.getUser(token, refresh_token)
                } catch (error: any) {
                    console.error('Token validation failed:', error)
                    // If token is expired, try to refresh it
                    if (error.message.includes('401') || error.message.includes('expired')) {
                        try {
                            const newTokenData = await authService.getNewToken(refresh_token)
                            
                            if (newTokenData?.authorization?.access_token) {
                                // Retry with new token
                                await userService.getUser(
                                    newTokenData.authorization.access_token, 
                                    newTokenData.authorization.refresh_token
                                )
                                return
                            }
                        } catch (refreshError) {
                            console.error('Token refresh failed:', refreshError)
                            authStorage.clearTokens()
                            //router.push('/login')
                            return
                        }
                    }
                    // If we get here, authentication failed
                    authStorage.clearTokens()
                    //router.push('/login')
                }
            } else {
                authStorage.clearTokens()
                //router.push('/login')
            }
        }

        // Initial check
        checkToken()
        
        // Set up interval for checking token every 5 seconds
        const intervalId = setInterval(checkToken, 5000)
        
        // Clean up interval on component unmount
        return () => clearInterval(intervalId)
    }, [pathname, router])
    return <HeroSection />;
}
