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
import { Badge } from "@/components/ui/badge";
import { OrgProfileTab } from "@/components/organization/OrgProfileTab";
import { OrgMembersTab } from "@/components/organization/OrgMembersTab";
import { OrgRolesTab } from "@/components/organization/OrgRolesTab";
import { OrgDangerTab } from "@/components/organization/OrgDangerTab";
import {
    ChevronRight, Loader2, Users, KeyRound, Shield,
    CheckCircle2, XCircle, Mail, Phone, User,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";

const organizationService = new OrganizationService();
const memberService = new OrganizationMemberService();
const roleService = new OrganizationRoleService();

const ORG_SETTINGS_EVENTS = [
    "organization:updated",
    "organization:memberInvited",
    "organization:memberRemoved",
    "organization:memberAccepted",
    "organization:memberRejected",
    "organization:memberLeft",
    "organization:memberRolesUpdated",
    "organization:memberPermissionsUpdated",
    "orgRole:created",
    "orgRole:updated",
    "orgRole:deleted",
    "orgRole:deletedMany",
];

export default function AdminOrganizationSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const { showToast } = useToast();

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => {
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return null; }
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
        } catch {
            setMembers([]);
        }
    }, [orgId]);

    const fetchRoles = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await roleService.getRoles(token, orgId, { limit: 100 });
            setRoles(data.items || []);
        } catch {
            setRoles([]);
        }
    }, [orgId]);

    const fetchPermissions = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const data = await organizationService.getPermissions(token, orgId);
            setPermissions(data || []);
        } catch {
            setPermissions([]);
        }
    }, [orgId]);

    useEffect(() => {
        if (!orgId) return;
        const fetchAll = async () => {
            setLoading(true);
            await Promise.all([fetchOrganization(), fetchMembers(), fetchRoles(), fetchPermissions()]);
            setLoading(false);
        };
        fetchAll();
    }, [orgId, fetchOrganization, fetchMembers, fetchRoles, fetchPermissions]);

    useOrganizationRealtime({
        orgId,
        events: ORG_SETTINGS_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName) => {
            if (eventName.startsWith("orgRole:")) {
                void fetchRoles();
                showToast("Vai trò đã được cập nhật realtime", "success");
                return;
            }
            if (eventName.startsWith("organization:member")) {
                void fetchMembers();
                showToast("Danh sách thành viên đã được cập nhật", "success");
                return;
            }
            if (eventName === "organization:updated") {
                void fetchOrganization();
            }
        },
    });

    const handleUpdateOrg = async (data: Partial<Organization>) => {
        const token = getToken();
        if (!token) return;
        try {
            await organizationService.updateOrganization(token, orgId, data as any);
            showToast("Cập nhật thông tin tổ chức thành công", "success");
            await fetchOrganization();
        } catch (error: any) {
            showToast(error.message || "Không thể cập nhật tổ chức", "error");
        }
    };

    const handleDeleteOrg = async () => {
        router.push("/dashboard/admin/organization");
    };

    const handleInviteMembers = async (emails: string[]) => {
        const token = getToken();
        if (!token) return;
        try {
            await memberService.inviteMembers(token, orgId, emails);
            showToast(`Đã gửi lời mời tới ${emails.length} email`, "success");
            await fetchMembers();
        } catch (error: any) {
            showToast(error.message || "Không thể gửi lời mời", "error");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            await memberService.removeMember(token, orgId, memberId);
            showToast("Đã xóa thành viên khỏi tổ chức", "success");
            await fetchMembers();
        } catch (error: any) {
            showToast(error.message || "Không thể xóa thành viên", "error");
        }
    };

    const handleAssignRoles = async (memberId: string, roleIds: string[]) => {
        const token = getToken();
        if (!token) return;
        try {
            await memberService.assignRoles(token, orgId, memberId, roleIds);
            showToast("Đã cập nhật vai trò thành viên", "success");
            await fetchMembers();
        } catch (error: any) {
            showToast(error.message || "Không thể cập nhật vai trò", "error");
        }
    };

    const handleCancelInvite = async (memberId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            await memberService.cancelInvite(token, orgId, memberId);
            showToast("Đã hủy lời mời", "success");
            await fetchMembers();
        } catch (error: any) {
            showToast(error.message || "Không thể hủy lời mời", "error");
        }
    };

    const handleCreateRole = async (data: { name: string; description: string; permission_ids: string[] }) => {
        const token = getToken();
        if (!token) return;
        try {
            await roleService.createRole(token, orgId, data);
            showToast(`Đã tạo vai trò "${data.name}" thành công`, "success");
            await fetchRoles();
        } catch (error: any) {
            showToast(error.message || "Không thể tạo vai trò", "error");
        }
    };

    const handleUpdateRole = async (roleId: string, data: { name?: string; description?: string; permission_ids?: string[] }) => {
        const token = getToken();
        if (!token) return;
        try {
            await roleService.updateRole(token, orgId, roleId, data);
            showToast("Cập nhật vai trò thành công", "success");
            await fetchRoles();
        } catch (error: any) {
            showToast(error.message || "Không thể cập nhật vai trò", "error");
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        const token = getToken();
        if (!token) return;
        try {
            await roleService.deleteRole(token, orgId, roleId);
            showToast("Đã xóa vai trò", "success");
            await fetchRoles();
        } catch (error: any) {
            showToast(error.message || "Không thể xóa vai trò", "error");
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Đang tải thông tin tổ chức...</span>
                </div>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
                <p className="text-red-500 font-medium">{error || "Không tìm thấy tổ chức"}</p>
                <Link href="/dashboard/admin/organization" className="text-sm text-indigo-600 hover:underline">
                    ← Quay lại danh sách
                </Link>
            </div>
        );
    }

    const stats = [
        {
            icon: Users,
            label: "Thành viên",
            value: organization._count?.members ?? members.length,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            icon: Shield,
            label: "Vai trò",
            value: organization._count?.roles ?? roles.length,
            color: "text-violet-600",
            bg: "bg-violet-50",
        },
        {
            icon: KeyRound,
            label: "API Keys",
            value: organization._count?.api_keys ?? 0,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
    ];

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Link href="/dashboard/admin/organization" className="hover:text-slate-700 transition-colors">
                        Tổ chức
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-slate-700 font-medium">{organization.name}</span>
                </nav>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-bold shrink-0">
                            {organization.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-bold text-slate-900">{organization.name}</h1>
                                {organization.is_active ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
                                        <CheckCircle2 className="w-3 h-3" />Hoạt động
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs gap-1">
                                        <XCircle className="w-3 h-3" />Ngừng hoạt động
                                    </Badge>
                                )}
                            </div>
                            {organization.international_name && (
                                <p className="text-sm text-slate-400 mt-0.5">{organization.international_name}</p>
                            )}

                            {/* Key info row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                                {organization.tax_code && (
                                    <span className="text-xs text-slate-500">
                                        MST: <span className="font-medium text-slate-700">{organization.tax_code}</span>
                                    </span>
                                )}
                                {organization.owner && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <User className="w-3.5 h-3.5" />
                                        <span>Chủ sở hữu:</span>
                                        <span className="font-medium text-slate-700">{organization.owner.name}</span>
                                        <span className="text-slate-400">({organization.owner.email})</span>
                                    </div>
                                )}
                                {organization.representative_name && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <User className="w-3.5 h-3.5" />
                                        <span>Đại diện:</span>
                                        <span className="font-medium text-slate-700">{organization.representative_name}</span>
                                        {organization.representative_title && (
                                            <span className="text-slate-400">({organization.representative_title})</span>
                                        )}
                                    </div>
                                )}
                                {organization.representative_phone && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span className="font-medium text-slate-700">{organization.representative_phone}</span>
                                    </div>
                                )}
                                {organization.representative_email && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="font-medium text-slate-700">{organization.representative_email}</span>
                                    </div>
                                )}
                                <span className="text-xs text-slate-400">
                                    Tạo ngày {new Date(organization.created_at).toLocaleDateString("vi-VN", {
                                        year: "numeric", month: "long", day: "numeric",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
                        {stats.map((s) => (
                            <div key={s.label} className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                    <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-900 leading-none">{s.value}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="bg-transparent border-b border-slate-200 rounded-none p-0 h-auto w-full justify-start gap-0">
                        {[
                            { value: "profile", label: "Hồ sơ" },
                            { value: "members", label: `Thành viên (${members.length})` },
                            { value: "roles", label: `Vai trò (${roles.length})` },
                            { value: "danger", label: "Nguy hiểm" },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:text-slate-900"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="profile" className="mt-6">
                        <OrgProfileTab organization={organization} onUpdate={handleUpdateOrg} enableLegalApprovalFlow={false} />
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
                        <OrgDangerTab organizationName={organization.name} onDelete={handleDeleteOrg} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
