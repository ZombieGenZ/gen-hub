"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { OrganizationRoleService } from "@/services/organization/organization_role.service";
import { orgHelper } from "@/lib/organization.utils";
import { useToast } from "@/contexts/ToastContext";
import type {
    CreateOrganizationRoleDto,
    OrganizationPermission,
    OrganizationRole,
    UpdateOrganizationRoleDto,
} from "@/types/organization/organization_role.type";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, PencilSquareIcon, ShieldCheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

const organizationRoleService = new OrganizationRoleService();

export default function RoleManagementPage() {
    const { showToast } = useToast();
    const [orgId, setOrgId] = useState<string | null>(null);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [selectedRole, setSelectedRole] = useState<OrganizationRole | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<OrganizationRole | null>(null);
    const [formData, setFormData] = useState<CreateOrganizationRoleDto & { is_active: boolean }>({
        name: "",
        description: "",
        is_active: true,
        permission_ids: [],
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const currentOrgId = await orgHelper.getOrgId(token);
            setOrgId(currentOrgId);

            const [roleList, permissionList] = await Promise.all([
                organizationRoleService.getRoles(token, currentOrgId, { limit: 100 }),
                organizationRoleService.getPermissions(token, currentOrgId),
            ]);

            setRoles(roleList.items || []);
            setPermissions(permissionList || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u vai trÃ²";
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const groupedPermissions = useMemo(() => {
        return permissions.reduce<Record<string, OrganizationPermission[]>>((acc, permission) => {
            const key = permission.module || "Khác";
            if (!acc[key]) acc[key] = [];
            acc[key].push(permission);
            return acc;
        }, {});
    }, [permissions]);

    const resetForm = () => {
        setSelectedRole(null);
        setFormData({
            name: "",
            description: "",
            is_active: true,
            permission_ids: [],
        });
    };

    const handleOpenCreate = () => {
        setDialogMode("create");
        resetForm();
        setDialogOpen(true);
    };

    const handleOpenEdit = (role: OrganizationRole) => {
        setDialogMode("edit");
        setSelectedRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            is_active: role.is_active,
            permission_ids: role.permissions.map((permission) => permission.id),
        });
        setDialogOpen(true);
    };

    const handleTogglePermission = (permissionId: string) => {
        setFormData((prev) => ({
            ...prev,
            permission_ids: prev.permission_ids.includes(permissionId)
                ? prev.permission_ids.filter((id) => id !== permissionId)
                : [...prev.permission_ids, permissionId],
        }));
    };

    const handleToggleModule = (modulePermissions: OrganizationPermission[]) => {
        const moduleIds = modulePermissions.map((p) => p.id);
        const allSelected = moduleIds.every((id) => formData.permission_ids.includes(id));
        setFormData((prev) => ({
            ...prev,
            permission_ids: allSelected
                ? prev.permission_ids.filter((id) => !moduleIds.includes(id))
                : [...new Set([...prev.permission_ids, ...moduleIds])],
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast("Vui lòng nhập tên vai trò", "error");
            return;
        }

        const token = authStorage.getAccessToken();
        if (!token || !orgId) return;

        setSubmitting(true);
        try {
            if (dialogMode === "create") {
                await organizationRoleService.createRole(token, orgId, formData);
                showToast("Tạo vai trò thành công", "success");
            } else if (selectedRole) {
                const payload: UpdateOrganizationRoleDto = {
                    name: formData.name,
                    description: formData.description,
                    is_active: formData.is_active,
                    permission_ids: formData.permission_ids,
                };
                await organizationRoleService.updateRole(token, orgId, selectedRole.id, payload);
                showToast("Cập nhật vai trò thành công", "success");
            }

            setDialogOpen(false);
            resetForm();
            await fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Thao tác thất bại";
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (role: OrganizationRole, checked: boolean) => {
        const token = authStorage.getAccessToken();
        if (!token || !orgId) return;

        try {
            await organizationRoleService.updateRole(token, orgId, role.id, { is_active: checked });
            showToast(checked ? "Đã mở khóa vai trò" : "Đã khóa vai trò", "success");
            await fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái vai trò";
            showToast(message, "error");
        }
    };

    const handleDelete = async () => {
        if (!roleToDelete || !orgId) return;

        const token = authStorage.getAccessToken();
        if (!token) return;

        setSubmitting(true);
        try {
            await organizationRoleService.deleteRole(token, orgId, roleToDelete.id);
            showToast("Xóa vai trò thành công", "success");
            setDeleteDialogOpen(false);
            setRoleToDelete(null);
            await fetchData();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể xóa vai trò";
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Quản lý vai trò</h1>
                    <p className="text-muted-foreground">
                        Quản lý vai trò, quyền hạn và trạng thái khóa/mở khóa cho nhân sự trong tổ chức.
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Thêm vai trò
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách vai trò</CardTitle>
                    <CardDescription>Các vai trò đang được sử dụng trong tổ chức của bạn.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên vai trò</TableHead>
                                    <TableHead>Mô tả</TableHead>
                                    <TableHead>Số quyền</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            Chưa có vai trò nào được tạo.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    roles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {role.name}
                                                    {role.is_default && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            Mặc định
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-80 truncate text-muted-foreground">
                                                {role.description || "---"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{role.permissions?.length || 0} quyền</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-between gap-3">
                                                    {role.is_active ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                                            Đang hoạt động
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">Đã khóa</Badge>
                                                    )}
                                                    <Switch
                                                        checked={role.is_active}
                                                        disabled={role.is_default}
                                                        onCheckedChange={(checked) => void handleToggleActive(role, checked)}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(role)}>
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        disabled={role.is_default}
                                                        onClick={() => {
                                                            setRoleToDelete(role);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{dialogMode === "create" ? "Thêm vai trò mới" : "Chỉnh sửa vai trò"}</DialogTitle>
                        <DialogDescription>Định nghĩa tên, trạng thái và các quyền được gán cho vai trò.</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col flex-1 min-h-0 space-y-4 px-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="role-name">Tên vai trò</Label>
                            <Input
                                id="role-name"
                                value={formData.name}
                                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role-description">Mô tả</Label>
                            <Input
                                id="role-description"
                                value={formData.description}
                                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                placeholder="Mô tả ngắn gọn về vai trò này"
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div>
                                <Label>Trạng thái vai trò</Label>
                                <p className="text-sm text-muted-foreground">Cho phép khóa hoặc mở khóa vai trò ngay khi chỉnh sửa.</p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                            />
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Quyền hạn</Label>
                                <span className="text-xs text-muted-foreground">
                                    Đã chọn {formData.permission_ids.length}/{permissions.length}
                                </span>
                            </div>
                            <ScrollArea className="flex-1 min-h-0 border rounded-md">
                                <div className="p-4 space-y-4">
                                {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                                    const moduleIds = modulePermissions.map((p) => p.id);
                                    const selectedCount = moduleIds.filter((id) => formData.permission_ids.includes(id)).length;
                                    const allSelected = selectedCount === modulePermissions.length;
                                    return (
                                    <div key={moduleName} className="border border-border rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/50">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-semibold capitalize">{moduleName}</span>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {selectedCount}/{modulePermissions.length}
                                                </Badge>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleModule(modulePermissions)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                            </button>
                                        </div>
                                        <div className="p-3 space-y-1.5">
                                            {modulePermissions.map((permission) => (
                                                <label
                                                    key={permission.id}
                                                    htmlFor={permission.id}
                                                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                                >
                                                    <Checkbox
                                                        id={permission.id}
                                                        checked={formData.permission_ids.includes(permission.id)}
                                                        onCheckedChange={() => handleTogglePermission(permission.id)}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium leading-none">{permission.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{permission.key}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button onClick={() => void handleSubmit()} disabled={submitting}>
                            {submitting ? "Đang lưu..." : dialogMode === "create" ? "Tạo vai trò" : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xóa vai trò</DialogTitle>
                        <DialogDescription>
                            {roleToDelete ? `Bạn có chắc muốn xóa vai trò "${roleToDelete.name}" không?` : "Bạn có chắc muốn xóa vai trò này không?"}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
                            {submitting ? "Đang xóa..." : "Xóa vai trò"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
