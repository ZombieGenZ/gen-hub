"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Plus,
    MoreVertical,
    Shield,
    Pencil,
    Trash2,
    Loader2,
    Users,
    Lock,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import { OrganizationRole, OrganizationPermission } from "@/types/organization/organization_role.type";

interface OrgRolesTabProps {
    orgId: string;
    roles: OrganizationRole[];
    permissions: OrganizationPermission[];
    loading?: boolean;
    onCreateRole: (data: { name: string; description: string; permission_ids: string[] }) => Promise<void>;
    onUpdateRole: (roleId: string, data: { name?: string; description?: string; permission_ids?: string[] }) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onRefresh: () => void;
    /** true = System Admin view (read-only), false = Organization Owner view (full control) */
    isAdminView?: boolean;
}

export function OrgRolesTab({
    orgId,
    roles,
    permissions,
    loading = false,
    onCreateRole,
    onUpdateRole,
    onDeleteRole,
    onRefresh,
    isAdminView = false,
}: OrgRolesTabProps) {
    const [search, setSearch] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);
    const [deletingRole, setDeletingRole] = useState<OrganizationRole | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const filteredRoles = roles.filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            r.name.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
    const paginatedRoles = filteredRoles.slice((page - 1) * pageSize, page * pageSize);

    // Group permissions by module for display
    const permissionsByModule = permissions.reduce<Record<string, OrganizationPermission[]>>((acc, perm) => {
        const mod = perm.module || "Khác";
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(perm);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Vai trò</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Quản lý vai trò và phân quyền trong tổ chức
                            </p>
                        </div>
                        {!isAdminView && (
                            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Tạo vai trò
                            </Button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-border/30 bg-muted/20">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm vai trò..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Roles List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : paginatedRoles.length === 0 ? (
                    <div className="py-16 text-center">
                        <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {search ? "Không tìm thấy vai trò nào." : "Chưa có vai trò nào được tạo."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {paginatedRoles.map((role) => (
                            <div
                                key={role.id}
                                className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors group"
                            >
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-semibold text-foreground truncate">
                                                {role.name}
                                            </h4>
                                            {role.is_system && (
                                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                                    <Lock className="w-2.5 h-2.5 mr-1" />
                                                    Hệ thống
                                                </Badge>
                                            )}
                                        </div>
                                        {role.description && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {role.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                {role._count?.members ?? 0} thành viên
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <Shield className="w-3 h-3" />
                                                {role.permissions?.length ?? 0} quyền
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {!isAdminView && !role.is_system && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                            <DropdownMenuItem
                                                onClick={() => setEditingRole(role)}
                                                className="cursor-pointer"
                                            >
                                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                                Chỉnh sửa
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setDeletingRole(role)}
                                                className="cursor-pointer text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                Xóa vai trò
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

                                {/* View only for admin or system roles */}
                                {(isAdminView || role.is_system) && (
                                    <button
                                        onClick={() => setEditingRole(role)}
                                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border/30 flex items-center justify-end gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Trước
                            </button>
                            <span className="font-medium text-foreground">{page}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Role Dialog */}
            <RoleFormDialog
                open={createDialogOpen || !!editingRole}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateDialogOpen(false);
                        setEditingRole(null);
                    }
                }}
                role={editingRole}
                permissionsByModule={permissionsByModule}
                readOnly={isAdminView || (editingRole?.is_system ?? false)}
                onSave={async (data) => {
                    if (editingRole) {
                        await onUpdateRole(editingRole.id, data);
                    } else {
                        await onCreateRole({
                            name: data.name!,
                            description: data.description || "",
                            permission_ids: data.permission_ids || [],
                        });
                    }
                    setCreateDialogOpen(false);
                    setEditingRole(null);
                    onRefresh();
                }}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteRoleDialog
                open={!!deletingRole}
                onOpenChange={(open) => {
                    if (!open) setDeletingRole(null);
                }}
                roleName={deletingRole?.name || ""}
                onConfirm={async () => {
                    if (deletingRole) {
                        await onDeleteRole(deletingRole.id);
                        setDeletingRole(null);
                        onRefresh();
                    }
                }}
            />
        </div>
    );
}

// ──────────────────────────────────────────
// Role Form Dialog (Create / Edit)
// ──────────────────────────────────────────
interface RoleFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: OrganizationRole | null;
    permissionsByModule: Record<string, OrganizationPermission[]>;
    readOnly?: boolean;
    onSave: (data: { name?: string; description?: string; permission_ids?: string[] }) => Promise<void>;
}

function RoleFormDialog({
    open,
    onOpenChange,
    role,
    permissionsByModule,
    readOnly = false,
    onSave,
}: RoleFormDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (role) {
            setName(role.name);
            setDescription(role.description || "");
            setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
        } else {
            setName("");
            setDescription("");
            setSelectedPermissions([]);
        }
    }, [role, open]);

    const togglePermission = (permId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
        );
    };

    const toggleModuleAll = (modulePerms: OrganizationPermission[]) => {
        const modulePermIds = modulePerms.map((p) => p.id);
        const allSelected = modulePermIds.every((id) => selectedPermissions.includes(id));
        if (allSelected) {
            setSelectedPermissions((prev) => prev.filter((id) => !modulePermIds.includes(id)));
        } else {
            setSelectedPermissions((prev) => [...new Set([...prev, ...modulePermIds])]);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave({ name, description, permission_ids: selectedPermissions });
        } finally {
            setSaving(false);
        }
    };

    const isEdit = !!role;
    const title = readOnly
        ? `Chi tiết vai trò: ${role?.name}`
        : isEdit
            ? "Chỉnh sửa vai trò"
            : "Tạo vai trò mới";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {readOnly
                            ? "Xem thông tin vai trò và quyền"
                            : isEdit
                                ? "Cập nhật tên, mô tả và quyền của vai trò"
                                : "Định nghĩa vai trò mới với các quyền cụ thể"}
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Tên vai trò</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ví dụ: Marketing Lead"
                            disabled={readOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Mô tả</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả về vai trò này..."
                            disabled={readOnly}
                        />
                    </div>

                    {/* Permissions grouped by module */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Quyền</Label>
                        {Object.keys(permissionsByModule).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Chưa có quyền nào được định nghĩa trong hệ thống.
                            </p>
                        ) : (
                            Object.entries(permissionsByModule).map(([module, perms]) => {
                                const modulePermIds = perms.map((p) => p.id);
                                const selectedCount = modulePermIds.filter((id) =>
                                    selectedPermissions.includes(id)
                                ).length;
                                const allSelected = selectedCount === perms.length;

                                return (
                                    <div key={module} className="border border-border rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground capitalize">
                                                    {module}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {selectedCount}/{perms.length}
                                                </Badge>
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    onClick={() => toggleModuleAll(perms)}
                                                    className="text-xs text-primary hover:underline cursor-pointer"
                                                >
                                                    {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {perms.map((perm) => (
                                                <label
                                                    key={perm.id}
                                                    className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${readOnly ? "" : "cursor-pointer hover:bg-muted/30"
                                                        }`}
                                                >
                                                    <Switch
                                                        checked={selectedPermissions.includes(perm.id)}
                                                        onCheckedChange={() => togglePermission(perm.id)}
                                                        disabled={readOnly}
                                                        className="scale-75"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-foreground font-medium">
                                                            {perm.name}
                                                        </p>
                                                        {perm.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {perm.description}
                                                            </p>
                                                        )}
                                                        <code className="text-[10px] text-muted-foreground/60 font-mono">
                                                            {perm.key}
                                                        </code>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogBody>
                {!readOnly && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                            Hủy
                        </Button>
                        <Button onClick={handleSave} disabled={!name.trim() || saving}>
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Lưu thay đổi" : "Tạo vai trò"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ──────────────────────────────────────────
// Delete Role Confirmation Dialog
// ──────────────────────────────────────────
interface DeleteRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roleName: string;
    onConfirm: () => Promise<void>;
}

function DeleteRoleDialog({ open, onOpenChange, roleName, onConfirm }: DeleteRoleDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to delete role:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-destructive">Xóa vai trò</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn xóa vai trò <strong>{roleName}</strong>?
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                        <p className="text-sm text-foreground">
                            Vai trò này sẽ bị xóa khỏi tổ chức. Các thành viên đang có vai trò này sẽ mất quyền tương ứng.
                        </p>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Xóa vai trò
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
