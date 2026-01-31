"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsTypeService } from "@/services/addons/addonsType.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { AddonType } from "@/types/addon/addonType.type";

const addonsTypeService = new AddonsTypeService();

export default function AddonTypesPage() {
    const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAddonType, setSelectedAddonType] = useState<AddonType | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_active: true,
    });

    const fetchAddonTypes = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data = await addonsTypeService.getAllAddonsType(token);
            if (Array.isArray(data)) {
                setAddonTypes(data);
            }
        } catch (error) {
            console.error("Failed to fetch addon types", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddonTypes();
    }, []);

    const filteredAddonTypes = addonTypes.filter((addonType) => {
        const matchesSearch =
            addonType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            addonType.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && addonType.is_active) ||
            (statusFilter === "inactive" && !addonType.is_active);
        return matchesSearch && matchesStatus;
    });

    const handleCreate = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await addonsTypeService.createAddonType(token, formData);
            setIsCreateDialogOpen(false);
            setFormData({ name: "", description: "", is_active: true });
            fetchAddonTypes();
        } catch (error) {
            console.error("Failed to create addon type", error);
        }
    };

    const handleEdit = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAddonType) return;

            await addonsTypeService.updateAddonType(token, selectedAddonType.id, formData);
            setIsEditDialogOpen(false);
            setSelectedAddonType(null);
            setFormData({ name: "", description: "", is_active: true });
            fetchAddonTypes();
        } catch (error) {
            console.error("Failed to update addon type", error);
        }
    };

    const handleDelete = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAddonType) return;

            await addonsTypeService.deleteAddonType(token, selectedAddonType.id);
            setIsDeleteDialogOpen(false);
            setSelectedAddonType(null);
            fetchAddonTypes();
        } catch (error) {
            console.error("Failed to delete addon type", error);
        }
    };

    const openEditDialog = (addonType: AddonType) => {
        setSelectedAddonType(addonType);
        setFormData({
            name: addonType.name,
            description: addonType.description,
            is_active: addonType.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (addonType: AddonType) => {
        setSelectedAddonType(addonType);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Loại tiện ích bổ sung
                    </h1>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý các loại tiện ích bổ sung cho kho
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm loại
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]" style={{ borderRadius: "12px" }}>
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Không hoạt động</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle style={{ fontSize: "20px", lineHeight: "130%" }}>
                        Danh sách loại tiện ích ({filteredAddonTypes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                    ) : filteredAddonTypes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Không tìm thấy loại tiện ích nào
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-border">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Tên
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Mô tả
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Số lượng addons
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Trạng thái
                                        </th>
                                        <th className="text-right py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredAddonTypes.map((addonType) => (
                                        <tr key={addonType.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-medium" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {addonType.name}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {addonType.description}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {addonType.addons?.length || 0}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={addonType.is_active ? "default" : "secondary"}
                                                    className="gap-1"
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    {addonType.is_active ? (
                                                        <>
                                                            <CheckCircleIcon className="w-3 h-3" />
                                                            Hoạt động
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircleIcon className="w-3 h-3" />
                                                            Không hoạt động
                                                        </>
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(addonType)}
                                                        style={{ borderRadius: "12px" }}
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDeleteDialog(addonType)}
                                                        className="text-destructive"
                                                        style={{ borderRadius: "12px" }}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Thêm loại tiện ích mới</DialogTitle>
                        <DialogDescription>
                            Điền thông tin để tạo loại tiện ích mới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên loại</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">Trạng thái hoạt động</Label>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreate} style={{ borderRadius: "12px" }}>Tạo mới</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa loại tiện ích</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin loại tiện ích
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Tên loại</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Mô tả</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-is_active">Trạng thái hoạt động</Label>
                            <Switch
                                id="edit-is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button onClick={handleEdit} style={{ borderRadius: "12px" }}>Cập nhật</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa loại "{selectedAddonType?.name}" không? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} style={{ borderRadius: "12px" }}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} style={{ borderRadius: "12px" }}>
                            Xóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
