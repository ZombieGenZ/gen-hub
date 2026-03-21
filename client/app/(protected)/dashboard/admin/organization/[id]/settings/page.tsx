"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrganizationService } from "@/services/organization/organization.service";
import { OrganizationMemberService } from "@/services/organization/organization_member.service";
import { OrganizationRoleService } from "@/services/organization/organization_role.service";
import { Organization } from "@/types/organization/organization.type";
import { OrganizationMember } from "@/types/organization/organization_member.type";
import { OrganizationRole, OrganizationPermission } from "@/types/organization/organization_role.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgProfileTab } from "@/components/organization/OrgProfileTab";
import { OrgMembersTab } from "@/components/organization/OrgMembersTab";
import { OrgRolesTab } from "@/components/organization/OrgRolesTab";
import { OrgDangerTab } from "@/components/organization/OrgDangerTab";
import { ChevronRight, Loader2 } from "lucide-react";

const organizationService = new OrganizationService();
const memberService = new OrganizationMemberService();
const roleService = new OrganizationRoleService();

export default function AdminOrganizationSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return null;
        }
        return token;
    };

    const fetchOrganization = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await organizationService.getOrganizationById(token, orgId);
            setOrganization(data);
        } catch (err: any) {
            setError(err.message);
        }
    }, [orgId]);

    const fetchMembers = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await memberService.getMembers(token, orgId, { limit: 100 });
            setMembers(data.items || []);
        } catch (err: any) {
            console.error("Failed to fetch members:", err);
            setMembers([]);
        }
    }, [orgId]);

    const fetchRoles = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await roleService.getRoles(token, orgId, { limit: 100 });
            setRoles(data.items || []);
        } catch (err: any) {
            console.error("Failed to fetch roles:", err);
            setRoles([]);
        }
    }, [orgId]);

    useEffect(() => {
        if (!orgId) return;
        const fetchAll = async () => {
            setLoading(true);
            await Promise.all([fetchOrganization(), fetchMembers(), fetchRoles()]);
            setLoading(false);
        };
        fetchAll();
    }, [orgId, fetchOrganization, fetchMembers, fetchRoles]);

    // --- Admin actions (System Admin has limited write access) ---
    const handleUpdateOrg = async (data: Partial<Organization>) => {
        const token = getToken();
        if (!token) return;
        await organizationService.updateOrganization(token, orgId, data as any);
        await fetchOrganization();
    };

    const handleDeleteOrg = async () => {
        // System Admin can delete organizations
        // Deleting org
        router.push("/dashboard/admin/organization");
    };

    // Members - read-only for Admin, but keep handlers for potential admin override
    const handleInviteMembers = async (emails: string[]) => {
        const token = getToken();
        if (!token) return;
        await memberService.inviteMembers(token, orgId, emails);
        await fetchMembers();
    };

    const handleRemoveMember = async (memberId: string) => {
        const token = getToken();
        if (!token) return;
        await memberService.removeMember(token, orgId, memberId);
        await fetchMembers();
    };

    const handleAssignRoles = async (memberId: string, roleIds: string[]) => {
        const token = getToken();
        if (!token) return;
        await memberService.assignRoles(token, orgId, memberId, roleIds);
        await fetchMembers();
    };

    const handleCancelInvite = async (memberId: string) => {
        const token = getToken();
        if (!token) return;
        await memberService.cancelInvite(token, orgId, memberId);
        await fetchMembers();
    };

    // Roles - read-only for System Admin
    const handleCreateRole = async (data: { name: string; description: string; permission_ids: string[] }) => {
        const token = getToken();
        if (!token) return;
        await roleService.createRole(token, orgId, data);
        await fetchRoles();
    };

    const handleUpdateRole = async (roleId: string, data: { name?: string; description?: string; permission_ids?: string[] }) => {
        const token = getToken();
        if (!token) return;
        await roleService.updateRole(token, orgId, roleId, data);
        await fetchRoles();
    };

    const handleDeleteRole = async (roleId: string) => {
        const token = getToken();
        if (!token) return;
        await roleService.deleteRole(token, orgId, roleId);
        await fetchRoles();
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
                <p className="text-destructive font-medium">
                    {error || "Không tìm thấy tổ chức"}
                </p>
                <Link
                    href="/dashboard/admin/organization"
                    className="text-sm text-primary hover:underline"
                >
                    ← Quay lại danh sách
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link
                        href="/dashboard/admin/organization"
                        className="hover:text-foreground transition-colors"
                    >
                        Tổ chức
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-foreground font-medium">{organization.name}</span>
                </nav>

                {/* Organization Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                        {organization.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {organization.name}
                        </h1>
                        {organization.international_name && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {organization.international_name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Tabs - System Admin sees 4 tabs */}
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-0">
                        <TabsTrigger
                            value="profile"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
                        >
                            Hồ sơ
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
                        >
                            Thành viên ({members.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="roles"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
                        >
                            Vai trò ({roles.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="danger"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
                        >
                            Nguy hiểm
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-6">
                        <OrgProfileTab
                            organization={organization}
                            onUpdate={handleUpdateOrg}
                            enableLegalApprovalFlow={false}
                        />
                    </TabsContent>

                    <TabsContent value="members" className="mt-6">
                        <OrgMembersTab
                            members={members}
                            orgRoles={roles}
                            onInviteMembers={handleInviteMembers}
                            onRemoveMember={handleRemoveMember}
                            onAssignRoles={handleAssignRoles}
                            onCancelInvite={handleCancelInvite}
                            isAdminView={true}
                        />
                    </TabsContent>

                    <TabsContent value="roles" className="mt-6">
                        <OrgRolesTab
                            orgId={orgId}
                            roles={roles}
                            permissions={permissions}
                            onCreateRole={handleCreateRole}
                            onUpdateRole={handleUpdateRole}
                            onDeleteRole={handleDeleteRole}
                            onRefresh={fetchRoles}
                            isAdminView={true}
                        />
                    </TabsContent>

                    <TabsContent value="danger" className="mt-6">
                        <OrgDangerTab
                            organizationName={organization.name}
                            onDelete={handleDeleteOrg}
                        />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
