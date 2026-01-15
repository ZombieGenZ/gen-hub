"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const isAuthenticated = authStorage.isAuthenticated();
            const token = authStorage.getAccessToken();

            if (!isAuthenticated || !token) {
                // Save return url if needed, e.g. router.push(`/login?returnUrl=${pathname}`)
                router.push('/login');
            } else {
                setIsAuthorized(true);
            }
        };
        checkAuth();
    }, [pathname, router]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
