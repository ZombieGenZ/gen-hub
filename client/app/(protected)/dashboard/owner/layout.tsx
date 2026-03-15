"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OwnerSidebar } from "@/components/layouts/OwnerSidebar";
import { OwnerHeader } from "@/components/layouts/OwnerHeader";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { OrganizationService } from "@/services/organization/organization.service";

interface OwnerLayoutProps {
    children: React.ReactNode;
}

function LayoutContent({ children }: OwnerLayoutProps) {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <OwnerSidebar />
            <main className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ml-0", isOpen ? "lg:ml-72" : "lg:ml-20")}>
                <OwnerHeader />
                <div className="pt-0 pb-4 px-4 max-w-full mx-auto w-full">{children}</div>
            </main>
        </div>
    );
}

export default function OwnerDashboardLayout({ children }: OwnerLayoutProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const guardOwnerRoute = async () => {
            try {
                const accessToken = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();

                if (!accessToken || !refreshToken) {
                    router.replace("/login?returnUrl=/dashboard/owner");
                    return;
                }

                const userService = new UserService();
                const organizationService = new OrganizationService();
                const userData = await userService.getUser(accessToken, refreshToken);
                const roles = userData.roles.map((r) => r.name);

                if (roles.includes("ADMIN")) {
                    router.replace("/dashboard/admin");
                    return;
                }

                if (roles.includes("STAFF")) {
                    router.replace("/dashboard/staff");
                    return;
                }

                const organizations = await organizationService.getOrganizations(accessToken, { limit: 1 });
                const firstOrg = organizations?.items?.[0];

                if (!firstOrg?.id) {
                    router.replace("/dashboard/customer");
                    return;
                }

                if (firstOrg.owner?.id === userData.user.id) {
                    setIsAuthorized(true);
                    return;
                }

                router.replace("/dashboard/member");
            } catch (error) {
                console.error("Owner route guard failed", error);
                router.replace("/dashboard");
            }
        };

        guardOwnerRoute();
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
