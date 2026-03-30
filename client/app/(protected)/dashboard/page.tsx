"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { OrganizationService } from "@/services/organization/organization.service";

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

                if (roles.includes("ADMIN")) {
                    router.push("/dashboard/admin");
                } else if (roles.includes("STAFF")) {
                    router.push("/dashboard/staff");
                } else {
                    // Check if user has an organization ID in their profile
                    let orgId = userData.organization_id;

                    // Fallback: If no organization_id in profile, check if they belong to any organizations
                    if (!orgId) {
                        try {
                            const orgService = new OrganizationService();
                            const orgsResponse = await orgService.getOrganizations(accessToken, { limit: 1 });
                            if (orgsResponse.items && orgsResponse.items.length > 0) {
                                orgId = orgsResponse.items[0].id;
                            }
                        } catch (err) {
                            console.error("Failed to fetch organizations for redirect fallback", err);
                        }
                    }

                    if (orgId) {
                        router.push("/dashboard/organization");
                    } else {
                        router.push("/dashboard/customer");
                    }
                }
            } catch (error) {
                console.error("Error identifying user role", error);
                // Fallback to customer or login if error
                router.push("/dashboard/organization");
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
