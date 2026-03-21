"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerSidebar } from "@/components/layouts/CustomerSidebar";
import { OrganizationHeader } from "@/components/layouts/OrganizationHeader"; // We can reuse this header for now or create CustomerHeader if needed
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";

interface CustomerLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: CustomerLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <CustomerSidebar />
            <main className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0", isOpen ? "lg:ml-72" : "lg:ml-20")}>
                {/* We reuse OrganizationHeader since it just has a User dropdown and notification bell */}
                <OrganizationHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">{children}</div>
            </main>
        </div>
    );
}

export default function CustomerDashboardLayout({ children }: CustomerLayoutProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const guardCustomerRoute = async () => {
            try {
                const accessToken = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();

                if (!accessToken || !refreshToken) {
                    router.replace("/login?returnUrl=/dashboard/customer");
                    return;
                }

                // If needed, check if user is staff/admin to redirect them out
                const userService = new UserService();
                const userData = await userService.getUser(accessToken, refreshToken);
                const roles = userData.roles.map((r) => r.name);

                if (roles.includes("ADMIN") || roles.includes("STAFF")) {
                    router.replace("/dashboard");
                    return;
                }

                setIsAuthorized(true);
            } catch (error) {
                console.error("Customer route guard failed", error);
                router.replace("/login");
            }
        };

        guardCustomerRoute();
    }, [router]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
