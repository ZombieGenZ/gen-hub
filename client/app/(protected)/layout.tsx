"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthService } from "@/services/auth/auth.service";
import { Loader2 } from "lucide-react";
import { ProfileModalProvider } from "@/contexts/ProfileModalContext";
import { ProfileModalWrapper } from "@/components/profile/profile-modal-wrapper";
import { QueryProvider } from "@/components/providers/query-provider";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

const authService = new AuthService();

export default function ProtectedLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useTokenRefresh();

    useEffect(() => {
        const checkAuth = async () => {
            // Lấy access token hợp lệ: nếu hết hạn thì thử refresh bằng refresh token
            const validToken = await authService.getValidAccessToken();
            if (validToken) {
                setIsAuthorized(true);
            } else {
                router.push('/login');
            }
        };
        checkAuth();
    }, [pathname, router]);

    return (
        <QueryProvider>
            <ProfileModalProvider>
                {!isAuthorized ? (
                    <div className="h-screen w-full flex items-center justify-center bg-background">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {children}
                        {modal}
                        <ProfileModalWrapper />
                    </>
                )}
            </ProfileModalProvider>
        </QueryProvider>
    );
}
