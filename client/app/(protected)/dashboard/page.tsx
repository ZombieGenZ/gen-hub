"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { Loader2 } from "lucide-react";

export default function DashboardEntry() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const redirectUser = async () => {
            try {
                const accessToken = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();

                if (!accessToken || !refreshToken) {
                    router.push("/login?returnUrl=/dashboard");
                    return;
                }

                const userService = new UserService();
                const userData = await userService.getUser(accessToken, refreshToken);

                // Simplified Role Check
                const roles = userData.roles.map(r => r.name);

                if (roles.includes("ADMIN") || roles.includes("STAFF")) {
                    router.push("/dashboard/admin");
                } else {
                    router.push("/dashboard/customer");
                }
            } catch (error) {
                console.error("Error identifying user role", error);
                // Fallback to customer or login if error
                router.push("/dashboard/customer");
            } finally {
                setLoading(false);
            }
        };

        redirectUser();
    }, [router]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-brand" />
                <p className="text-muted-foreground">Đang chuyển hướng...</p>
            </div>
        </div>
    );
}
