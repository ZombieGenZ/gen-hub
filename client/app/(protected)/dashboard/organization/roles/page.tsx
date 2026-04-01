"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { warehouseManagerService } from "@/services/warehouse-manager/warehouse-manager.service";
import { useToast } from "@/contexts/ToastContext";
import type {
    WarehouseManagerRole,
    WarehouseManagerPermission,
    CreateWarehouseManagerRolePayload,
} from "@/types/warehouse-manager/warehouse-manager.type";

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
    ScrollArea,
} from "@/components/ui/scroll-area";
import {
    Checkbox,
} from "@/components/ui/checkbox";

// ── Icons ──
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    ShieldCheckIcon,
    // CheckCircleIcon,
    // XCircleIcon,
    // InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

// ════════════════════════════════════════════════
// MAIN PAGE: Role Management
// ════════════════════════════════════════════════
export default function RoleManagementPage() {
    const { showToast } = useToast();

    // ── Data state ──
    const [roles, setRoles] = useState<WarehouseManagerRole[]>([]);
    const [permissions, setPermissions] = useState<WarehouseManagerPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ── Dialog state ──
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [selectedRole, setSelectedRole] = useState<WarehouseManagerRole | null>(null);

    // ── Form state ──
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        permission_ids: string[];
    }>({
        name: "",
        description: "",
        permission_ids: [],
    });

    // ── Delete dialog state ──
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<WarehouseManagerRole | null>(null);

    // ── Fetch data ──
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const [rolesRes, permsRes] = await Promise.all([
                warehouseManagerService.listRoles(token),
                warehouseManagerService.listPermissions(token)
            ]);

            // rolesRes is now { items, total, ... }
            if (rolesRes && rolesRes.items) {
                setRoles(rolesRes.items);
            }
            
            // permsRes is now WarehouseManagerPermission[]
            if (Array.isArray(permsRes)) {
                setPermissions(permsRes);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Không thể tải dữ liệu";
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Handlers ──
    const handleOpenCreate = () => {
        setDialogMode("create");
        setSelectedRole(null);
        setFormData({ name: "", description: "", permission_ids: [] });
        setDialogOpen(true);
    };

    const handleOpenEdit = (role: WarehouseManagerRole) => {
        setDialogMode("edit");
        setSelectedRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            permission_ids: role.permissions.map(p => p.permission_id),
        });
        setDialogOpen(true);
    };

    const handleTogglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permission_ids: prev.permission_ids.includes(permId)
                ? prev.permission_ids.filter(id => id !== permId)
                : [...prev.permission_ids, permId]
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast("Vui lòng nhập tên vai trò", "error");
            return;
        }

        setSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (dialogMode === "create") {
                await warehouseManagerService.createRole(token, formData);
                showToast("Tạo vai trò thành công", "success");
            } else if (selectedRole) {
                await warehouseManagerService.updateRole(token, selectedRole.id, formData);
                showToast("Cập nhật vai trò thành công", "success");
            }

            setDialogOpen(false);
            fetchData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Thao tác thất bại";
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;
        setSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await warehouseManagerService.deleteRole(token, roleToDelete.id);
            showToast("Xóa vai trò thành công", "success");
            setDeleteDialogOpen(false);
            fetchData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Không thể xóa vai trò";
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Group permissions by category
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, WarehouseManagerPermission[]> = {};
        permissions.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });
        return groups;
    }, [permissions]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Quản lý vai trò (Roles)</h1>
                    <p className="text-muted-foreground">
                        Quản lý các vai trò và quyền hạn cho nhân viên quản lý kho.
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
                    <CardDescription>
                        Các vai trò đã định nghĩa trong tổ chức của bạn.
                    </CardDescription>
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
                                    <TableHead>Số lượng quyền</TableHead>
                                    <TableHead>Mặc định</TableHead>
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
                                                        <Badge variant="secondary" className="text-[10px]">Mặc định</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-75 truncate text-muted-foreground">
                                                {role.description || "---"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {role.permissions?.length || 0} quyền
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {role.is_active ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                                        Đang hoạt động
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">Ngưng</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEdit(role)}
                                                        disabled={role.is_default}
                                                        title={role.is_default ? "Không thể sửa vai trò hệ thống" : "Sửa"}
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            setRoleToDelete(role);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        disabled={role.is_default}
                                                        title={role.is_default ? "Không thể xóa vai trò hệ thống" : "Xóa"}
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

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-150 max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "create" ? "Thêm vai trò mới" : "Chỉnh sửa vai trò"}
                        </DialogTitle>
                        <DialogDescription>
                            Định nghĩa tên và gán các quyền hạn cho vai trò này.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 overflow-hidden flex flex-col flex-1">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên vai trò <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả ngắn gọn về vai trò này"
                            />
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                            <Label>Quyền hạn</Label>
                            <ScrollArea className="flex-1 border rounded-md p-4">
                                {Object.entries(groupedPermissions).map(([category, perms]) => (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <h3 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                                            <ShieldCheckIcon className="w-4 h-4" />
                                            {category}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3 ml-2">
                                            {perms.map((perm) => (
                                                <div key={perm.id} className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id={perm.id}
                                                        checked={formData.permission_ids.includes(perm.id)}
                                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <label
                                                            htmlFor={perm.id}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {perm.name}
                                                        </label>
                                                        {perm.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {perm.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {permissions.length === 0 && (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                        Không tìm thấy danh sách quyền hạn.
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dialogMode === "create" ? "Tạo vai trò" : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <TrashIcon className="w-5 h-5" />
                            Xác nhận xóa
                        </DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa vai trò <strong>{roleToDelete?.name}</strong>? 
                            Hành động này không thể hoàn tác và có thể ảnh hưởng đến những người đang được gán vai trò này.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận xóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
