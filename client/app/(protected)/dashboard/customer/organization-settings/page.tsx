"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OrganizationService } from "@/services/organization/organization.service";
import { OrganizationMemberService } from "@/services/organization/organization_member.service";
import { OrganizationRoleService } from "@/services/organization/organization_role.service";
import { Organization } from "@/types/organization/organization.type";
import { OrganizationMember } from "@/types/organization/organization_member.type";
import { OrganizationRole, OrganizationPermission } from "@/types/organization/organization_role.type";
import { OrganizationCreateRequest } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgProfileTab } from "@/components/organization/OrgProfileTab";
import { OrgMembersTab } from "@/components/organization/OrgMembersTab";
import { OrgRolesTab } from "@/components/organization/OrgRolesTab";
import { OrgDangerTab } from "@/components/organization/OrgDangerTab";
import { Loader2, Building2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const organizationService = new OrganizationService();
const memberService = new OrganizationMemberService();
const roleService = new OrganizationRoleService();

export default function CustomerOrganizationSettingsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getErrorMessage = (err: unknown, fallback: string) => {
        if (err instanceof Error && err.message) return err.message;
        return fallback;
    };

    const getToken = useCallback(() => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return null;
        }
        return token;
    }, [router]);

    const fetchOrganization = useCallback(async () => {
        const token = getToken();
        if (!token) return null;
        try {
            // Fetch user's organizations and use the first one (customer is typically in 1 org)
            const response = await organizationService.getOrganizations(token, { limit: 1 });
            if (response.items?.length > 0) {
                setOrganization(response.items[0]);
                return response.items[0];
            }
            return null;
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Không thể tải thông tin tổ chức"));
            return null;
        }
    }, [getToken]);

    const fetchMembers = useCallback(async (orgId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await memberService.getMembers(token, orgId, { limit: 100 });
            setMembers(data.items || []);
        } catch (err: unknown) {
            console.error("Failed to fetch members:", err);
            setMembers([]);
        }
    }, [getToken]);

    const fetchRoles = useCallback(async (orgId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await roleService.getRoles(token, orgId, { limit: 100 });
            setRoles(data.items || []);
        } catch (err: unknown) {
            console.error("Failed to fetch roles:", err);
            setRoles([]);
        }
    }, [getToken]);

    const fetchPermissions = useCallback(async (orgId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await organizationService.getPermissions(token, orgId);
            setPermissions(data || []);
        } catch (err: unknown) {
            console.error("Failed to fetch permissions:", err);
            setPermissions([]);
        }
    }, [getToken]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const org = await fetchOrganization();
            if (org) {
                await Promise.all([fetchMembers(org.id), fetchRoles(org.id), fetchPermissions(org.id)]);
            }
            setLoading(false);
        };
        init();
    }, [fetchOrganization, fetchMembers, fetchPermissions, fetchRoles]);

    // --- Organization Owner has FULL control ---

    const handleUpdateOrg = async (data: Partial<OrganizationCreateRequest>) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await organizationService.updateOrganization(token, organization.id, data);
            await fetchOrganization();
            showToast("Đã gửi yêu cầu cập nhật tổ chức", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Cập nhật tổ chức thất bại"), "error");
            throw err;
        }
    };

    const handleDeleteOrg = async () => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await organizationService.deleteOrganization(token, organization.id);
            showToast("Đã xóa tổ chức thành công", "success");
            router.push("/dashboard/customer");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Xóa tổ chức thất bại"), "error");
            throw err;
        }
    };

    // --- Members (Owner can invite, remove, assign roles) ---
    const handleInviteMembers = async (emails: string[]) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await memberService.inviteMembers(token, organization.id, emails);
            await fetchMembers(organization.id);
            showToast("Đã gửi lời mời thành viên", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Mời thành viên thất bại"), "error");
            throw err;
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await memberService.removeMember(token, organization.id, memberId);
            await fetchMembers(organization.id);
            showToast("Đã xóa thành viên khỏi tổ chức", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Xóa thành viên thất bại"), "error");
            throw err;
        }
    };

    const handleAssignRoles = async (memberId: string, roleIds: string[]) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await memberService.assignRoles(token, organization.id, memberId, roleIds);
            await fetchMembers(organization.id);
            showToast("Đã cập nhật vai trò thành viên", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Cập nhật vai trò thất bại"), "error");
            throw err;
        }
    };

    const handleCancelInvite = async (memberId: string) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await memberService.cancelInvite(token, organization.id, memberId);
            await fetchMembers(organization.id);
            showToast("Đã hủy lời mời", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Hủy lời mời thất bại"), "error");
            throw err;
        }
    };

    // --- Roles (Owner can create, edit, delete custom roles) ---
    const handleCreateRole = async (data: { name: string; description: string; permission_ids: string[] }) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await roleService.createRole(token, organization.id, data);
            await fetchRoles(organization.id);
            showToast("Đã tạo vai trò mới", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Tạo vai trò thất bại"), "error");
            throw err;
        }
    };

    const handleUpdateRole = async (roleId: string, data: { name?: string; description?: string; permission_ids?: string[] }) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await roleService.updateRole(token, organization.id, roleId, data);
            await fetchRoles(organization.id);
            showToast("Đã cập nhật vai trò", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Cập nhật vai trò thất bại"), "error");
            throw err;
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!organization) return;
        const token = getToken();
        if (!token) return;
        try {
            await roleService.deleteRole(token, organization.id, roleId);
            await fetchRoles(organization.id);
            showToast("Đã xóa vai trò", "success");
        } catch (err: unknown) {
            showToast(getErrorMessage(err, "Xóa vai trò thất bại"), "error");
            throw err;
        }
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
                <Building2 className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">
                    {error || "Bạn chưa thuộc tổ chức nào"}
                </p>
                <p className="text-sm text-muted-foreground">
                    Liên hệ quản trị viên để được thêm vào tổ chức
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1">
            <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
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

                {/* Tabs - Organization Owner has full control */}
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
                            enableLegalApprovalFlow={true}
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
                            isAdminView={false}
                        />
                    </TabsContent>

                    <TabsContent value="roles" className="mt-6">
                        <OrgRolesTab
                            orgId={organization.id}
                            roles={roles}
                            permissions={permissions}
                            onCreateRole={handleCreateRole}
                            onUpdateRole={handleUpdateRole}
                            onDeleteRole={handleDeleteRole}
                            onRefresh={() => fetchRoles(organization.id)}
                            isAdminView={false}
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
