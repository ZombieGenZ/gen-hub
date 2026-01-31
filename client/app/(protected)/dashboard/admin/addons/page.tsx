"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { AddonsService } from "@/services/addons/addons.service";
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
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { AddonResponse } from "@/types/addon/addon.type";

const addonsService = new AddonsService();

export default function AddonsPage() {
    const [addons, setAddons] = useState<AddonResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAddon, setSelectedAddon] = useState<AddonResponse | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        is_monthly_payment: false,
        is_active: true,
    });

    const fetchAddons = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data = await addonsService.getAllAddons(token);
            if (Array.isArray(data)) {
                setAddons(data);
            }
        } catch (error) {
            console.error("Failed to fetch addons", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddons();
    }, []);

    const filteredAddons = addons.filter((addon) => {
        const matchesSearch =
            addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            addon.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && addon.is_active) ||
            (statusFilter === "inactive" && !addon.is_active);
        const matchesPayment =
            paymentFilter === "all" ||
            (paymentFilter === "monthly" && addon.is_monthly_payment) ||
            (paymentFilter === "onetime" && !addon.is_monthly_payment);
        return matchesSearch && matchesStatus && matchesPayment;
    });

    const handleCreate = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await addonsService.createAddon(token, formData);
            setIsCreateDialogOpen(false);
            setFormData({ name: "", description: "", price: 0, is_monthly_payment: false, is_active: true });
            fetchAddons();
        } catch (error) {
            console.error("Failed to create addon", error);
        }
    };

    const handleEdit = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAddon) return;

            await addonsService.updateAddon(token, selectedAddon.id, formData);
            setIsEditDialogOpen(false);
            setSelectedAddon(null);
            setFormData({ name: "", description: "", price: 0, is_monthly_payment: false, is_active: true });
            fetchAddons();
        } catch (error) {
            console.error("Failed to update addon", error);
        }
    };

    const handleDelete = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedAddon) return;

            await addonsService.deleteAddon(token, selectedAddon.id);
            setIsDeleteDialogOpen(false);
            setSelectedAddon(null);
            fetchAddons();
        } catch (error) {
            console.error("Failed to delete addon", error);
        }
    };

    const openEditDialog = (addon: AddonResponse) => {
        setSelectedAddon(addon);
        setFormData({
            name: addon.name,
            description: addon.description,
            price: addon.price,
            is_monthly_payment: addon.is_monthly_payment,
            is_active: addon.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (addon: AddonResponse) => {
        setSelectedAddon(addon);
        setIsDeleteDialogOpen(true);
    };

    const formatCurrency = (amount: number | string) => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Tiện ích bổ sung
                    </h1>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý các tiện ích bổ sung cho kho
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm tiện ích
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
                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                            <SelectTrigger className="w-[180px]" style={{ borderRadius: "12px" }}>
                                <SelectValue placeholder="Loại thanh toán" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="monthly">Hàng tháng</SelectItem>
                                <SelectItem value="onetime">Một lần</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardHeader>
                    <CardTitle style={{ fontSize: "20px", lineHeight: "130%" }}>
                        Danh sách tiện ích ({filteredAddons.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                    ) : filteredAddons.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Không tìm thấy tiện ích nào
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
                                            Giá
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Thanh toán
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
                                    {filteredAddons.map((addon) => (
                                        <tr key={addon.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-medium" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {addon.name}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {addon.description}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {formatCurrency(addon.price)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant="secondary"
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    {addon.is_monthly_payment ? "Hàng tháng" : "Một lần"}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={addon.is_active ? "default" : "secondary"}
                                                    className="gap-1"
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    {addon.is_active ? (
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
                                                        onClick={() => openEditDialog(addon)}
                                                        style={{ borderRadius: "12px" }}
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDeleteDialog(addon)}
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
                        <DialogTitle>Thêm tiện ích mới</DialogTitle>
                        <DialogDescription>
                            Điền thông tin để tạo tiện ích bổ sung mới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên tiện ích</Label>
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
                        <div className="space-y-2">
                            <Label htmlFor="price">Giá (VND)</Label>
                            <Input
                                id="price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_monthly_payment">Thanh toán hàng tháng</Label>
                            <Switch
                                id="is_monthly_payment"
                                checked={formData.is_monthly_payment}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_monthly_payment: checked })}
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
                        <DialogTitle>Chỉnh sửa tiện ích</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin tiện ích bổ sung
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Tên tiện ích</Label>
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
                        <div className="space-y-2">
                            <Label htmlFor="edit-price">Giá (VND)</Label>
                            <Input
                                id="edit-price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-is_monthly_payment">Thanh toán hàng tháng</Label>
                            <Switch
                                id="edit-is_monthly_payment"
                                checked={formData.is_monthly_payment}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_monthly_payment: checked })}
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
                            Bạn có chắc chắn muốn xóa tiện ích "{selectedAddon?.name}" không? Hành động này không thể hoàn tác.
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
