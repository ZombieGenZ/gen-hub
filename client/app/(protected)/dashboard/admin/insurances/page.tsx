"use client";

import { useState, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
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
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Insurance, CreateInsuranceRequest, UpdateInsuranceRequest } from "@/types/insurance/Insurance.types";

const insuranceService = new IsuranceService();

export default function InsurancesPage() {
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
    const [formData, setFormData] = useState<CreateInsuranceRequest>({
        name: "",
        description: "",
        price: "0",
        use_management_fee: false,
        management_fee_type: "PERCENT",
        management_fee_value: "0",
        is_active: true,
    });

    const fetchInsurances = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data = await insuranceService.getAllInsurance(token);
            if (Array.isArray(data)) {
                setInsurances(data);
            }
        } catch (error) {
            console.error("Failed to fetch insurances", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsurances();
    }, []);

    const filteredInsurances = insurances.filter((insurance) => {
        const matchesSearch =
            insurance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            insurance.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && insurance.is_active) ||
            (statusFilter === "inactive" && !insurance.is_active);
        return matchesSearch && matchesStatus;
    });

    const handleCreate = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await insuranceService.createInsurance(token, formData);
            setIsCreateDialogOpen(false);
            setFormData({
                name: "",
                description: "",
                price: "0",
                use_management_fee: false,
                management_fee_type: "PERCENT",
                management_fee_value: "0",
                is_active: true,
            });
            fetchInsurances();
        } catch (error) {
            console.error("Failed to create insurance", error);
        }
    };

    const handleEdit = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedInsurance) return;

            await insuranceService.updateInsurance(token, selectedInsurance.id, formData);
            setIsEditDialogOpen(false);
            setSelectedInsurance(null);
            setFormData({
                name: "",
                description: "",
                price: "0",
                use_management_fee: false,
                management_fee_type: "PERCENT",
                management_fee_value: "0",
                is_active: true,
            });
            fetchInsurances();
        } catch (error) {
            console.error("Failed to update insurance", error);
        }
    };

    const handleDelete = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !selectedInsurance) return;

            await insuranceService.deleteInsurance(token, selectedInsurance.id);
            setIsDeleteDialogOpen(false);
            setSelectedInsurance(null);
            fetchInsurances();
        } catch (error) {
            console.error("Failed to delete insurance", error);
        }
    };

    const openEditDialog = (insurance: Insurance) => {
        setSelectedInsurance(insurance);
        setFormData({
            name: insurance.name,
            description: insurance.description,
            price: insurance.price,
            use_management_fee: insurance.use_management_fee,
            management_fee_type: insurance.management_fee_type,
            management_fee_value: insurance.management_fee_value,
            is_active: insurance.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (insurance: Insurance) => {
        setSelectedInsurance(insurance);
        setIsDeleteDialogOpen(true);
    };

    const formatCurrency = (amount: string) => {
        const numericAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Bảo hiểm hàng hóa
                    </h1>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý các gói bảo hiểm hàng hóa
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2"
                    style={{ borderRadius: "12px" }}
                >
                    <PlusIcon className="w-4 h-4" />
                    Thêm bảo hiểm
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
                        Danh sách gói bảo hiểm ({filteredInsurances.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                    ) : filteredInsurances.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Không tìm thấy gói bảo hiểm nào
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
                                            Giá trị / Phí
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-muted-foreground" style={{ fontSize: "12px", lineHeight: "150%" }}>
                                            Phí quản lý
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
                                    {filteredInsurances.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 font-medium" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {item.name}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {item.description}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-foreground" style={{ fontSize: "16px", lineHeight: "150%" }}>
                                                {formatCurrency(item.price)}
                                            </td>
                                            <td className="py-3 px-4">
                                                {item.use_management_fee ? (
                                                    <Badge variant="outline" className="text-xs" style={{ borderRadius: "12px" }}>
                                                        {item.management_fee_type === 'PERCENT'
                                                            ? `${item.management_fee_value}%`
                                                            : formatCurrency(item.management_fee_value)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge
                                                    variant={item.is_active ? "default" : "secondary"}
                                                    className="gap-1"
                                                    style={{ borderRadius: "12px" }}
                                                >
                                                    {item.is_active ? (
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
                                                        onClick={() => openEditDialog(item)}
                                                        style={{ borderRadius: "12px" }}
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDeleteDialog(item)}
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
                <DialogContent className="max-w-2xl" style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Thêm gói bảo hiểm mới</DialogTitle>
                        <DialogDescription>
                            Điền thông tin để tạo gói bảo hiểm mới
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="name">Tên gói bảo hiểm</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Giá trị / Phí cơ bản (VND)</Label>
                            <Input
                                id="price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        <div className="col-span-2 space-y-4 border rounded-xl p-4 mt-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="use_management_fee">Áp dụng phí quản lý</Label>
                                <Switch
                                    id="use_management_fee"
                                    checked={formData.use_management_fee}
                                    onCheckedChange={(checked) => setFormData({ ...formData, use_management_fee: checked })}
                                />
                            </div>

                            {formData.use_management_fee && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Loại phí</Label>
                                        <Select
                                            value={formData.management_fee_type}
                                            onValueChange={(val) => setFormData({ ...formData, management_fee_type: val })}
                                        >
                                            <SelectTrigger style={{ borderRadius: "12px" }}>
                                                <SelectValue placeholder="Chọn loại phí" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENT">Theo phần trăm (%)</SelectItem>
                                                <SelectItem value="FIXED">Cố định (VND)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="management_fee_value">Giá trị phí</Label>
                                        <Input
                                            id="management_fee_value"
                                            type="number"
                                            value={formData.management_fee_value}
                                            onChange={(e) => setFormData({ ...formData, management_fee_value: e.target.value })}
                                            style={{ borderRadius: "12px" }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-2 flex items-center justify-between">
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
                <DialogContent className="max-w-2xl" style={{ borderRadius: "16px" }}>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa gói bảo hiểm</DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin gói bảo hiểm
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="edit-name">Tên gói bảo hiểm</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="edit-description">Mô tả</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-price">Giá trị / Phí cơ bản (VND)</Label>
                            <Input
                                id="edit-price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                style={{ borderRadius: "12px" }}
                            />
                        </div>

                        <div className="col-span-2 space-y-4 border rounded-xl p-4 mt-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="edit-use_management_fee">Áp dụng phí quản lý</Label>
                                <Switch
                                    id="edit-use_management_fee"
                                    checked={formData.use_management_fee}
                                    onCheckedChange={(checked) => setFormData({ ...formData, use_management_fee: checked })}
                                />
                            </div>

                            {formData.use_management_fee && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Loại phí</Label>
                                        <Select
                                            value={formData.management_fee_type}
                                            onValueChange={(val) => setFormData({ ...formData, management_fee_type: val })}
                                        >
                                            <SelectTrigger style={{ borderRadius: "12px" }}>
                                                <SelectValue placeholder="Chọn loại phí" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENT">Theo phần trăm (%)</SelectItem>
                                                <SelectItem value="FIXED">Cố định (VND)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-management_fee_value">Giá trị phí</Label>
                                        <Input
                                            id="edit-management_fee_value"
                                            type="number"
                                            value={formData.management_fee_value}
                                            onChange={(e) => setFormData({ ...formData, management_fee_value: e.target.value })}
                                            style={{ borderRadius: "12px" }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-2 flex items-center justify-between">
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
                            Bạn có chắc chắn muốn xóa gói bảo hiểm "{selectedInsurance?.name}" không? Hành động này không thể hoàn tác.
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
