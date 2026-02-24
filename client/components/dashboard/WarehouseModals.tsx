"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogBody
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";

// Define a type for the form data, looser than the strict entity
type WarehouseFormData = {
    name: string;
    description: string;
    length: number;
    width: number;
    price_per_month: number;
    block_length: number;
    block_width: number;
    ceiling_height: number;
    address_detail: string;
    manager_name: string;
    manager_phone: string;
    manager_email: string;
    is_active: boolean;
    is_cold_storage: boolean;
    min_temperature?: number;
    max_temperature?: number;
    min_humidity?: number;
    max_humidity?: number;
};

const initialFormData: WarehouseFormData = {
    name: "",
    description: "",
    length: 100,
    width: 50,
    price_per_month: 0,
    block_length: 1,
    block_width: 1,
    ceiling_height: 5,
    address_detail: "",
    manager_name: "",
    manager_phone: "",
    manager_email: "",
    is_active: true,
    is_cold_storage: false,
    min_temperature: 0,
    max_temperature: 10,
    min_humidity: 0,
    max_humidity: 100,
};

interface CreateWarehouseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateWarehouseModal({ open, onOpenChange, onSuccess }: CreateWarehouseModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Unauthorized");

            await warehouseTemplateService.createWarehouseTemplate(token, formData);
            toast.success("Tạo kho thành công");
            setFormData(initialFormData);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Tạo kho thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Thêm kho mới</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin chi tiết để tạo kho mới.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <DialogBody className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Tên kho *</Label>
                                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="price_per_month">Giá thuê/tháng (VND) *</Label>
                                <Input id="price_per_month" name="price_per_month" type="number" value={formData.price_per_month} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="length">Dài (m) *</Label>
                                <Input id="length" name="length" type="number" value={formData.length} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="width">Rộng (m) *</Label>
                                <Input id="width" name="width" type="number" value={formData.width} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="block_length">Dài ô (m) *</Label>
                                <Input id="block_length" name="block_length" type="number" value={formData.block_length} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="block_width">Rộng ô (m) *</Label>
                                <Input id="block_width" name="block_width" type="number" value={formData.block_width} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ceiling_height">Chiều cao trần (m)</Label>
                                <Input id="ceiling_height" name="ceiling_height" type="number" value={formData.ceiling_height} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address_detail">Địa chỉ chi tiết</Label>
                                <Input id="address_detail" name="address_detail" value={formData.address_detail} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="manager_name">Tên quản lý</Label>
                                <Input id="manager_name" name="manager_name" value={formData.manager_name} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manager_phone">SĐT quản lý</Label>
                                <Input id="manager_phone" name="manager_phone" value={formData.manager_phone} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manager_email">Email quản lý</Label>
                                <Input id="manager_email" name="manager_email" type="email" value={formData.manager_email} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleSwitchChange('is_active', checked)} />
                                <Label htmlFor="is_active">Hoạt động</Label>
                            </div>

                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Đang tạo..." : "Tạo kho"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface UpdateWarehouseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: Warehouse | null;
    onSuccess: () => void;
}

export function UpdateWarehouseModal({ open, onOpenChange, warehouse, onSuccess }: UpdateWarehouseModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

    useEffect(() => {
        if (warehouse) {
            setFormData({
                name: warehouse.name || "",
                description: warehouse.description || "",
                length: warehouse.length || 0,
                width: warehouse.width || 0,
                price_per_month: Number(warehouse.price_per_month) || 0,
                block_length: Number(warehouse.block_length) || 0,
                block_width: Number(warehouse.block_width) || 0,
                ceiling_height: Number(warehouse.ceiling_height) || 0,
                address_detail: warehouse.address_detail || "",
                manager_name: warehouse.manager_name || "",
                manager_phone: warehouse.manager_phone || "",
                manager_email: warehouse.manager_email || "",
                is_active: warehouse.is_active || false,
                is_cold_storage: warehouse.is_cold_storage || false,
                min_temperature: Number(warehouse.min_temperature) || 0,
                max_temperature: Number(warehouse.max_temperature) || 0,
                min_humidity: Number(warehouse.min_humidity) || 0,
                max_humidity: Number(warehouse.max_humidity) || 0,
            });
        }
    }, [warehouse]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouse) return;
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Unauthorized");

            await warehouseTemplateService.updateWarehouseTemplate(token, warehouse.id, formData);
            toast.success("Cập nhật kho thành công");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Cập nhật kho thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cập nhật kho</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin kho hàng.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <DialogBody className="grid gap-4 py-4">
                        {/* Same fields as Create, could refactor to a separate component but keeping inline for now */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Tên kho *</Label>
                                <Input id="edit-name" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-price_per_month">Giá thuê/tháng (VND) *</Label>
                                <Input id="edit-price_per_month" name="price_per_month" type="number" value={formData.price_per_month} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Mô tả</Label>
                            <Textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-length">Dài (m) *</Label>
                                <Input id="edit-length" name="length" type="number" value={formData.length} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-width">Rộng (m) *</Label>
                                <Input id="edit-width" name="width" type="number" value={formData.width} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-block_length">Dài ô (m) *</Label>
                                <Input id="edit-block_length" name="block_length" type="number" value={formData.block_length} onChange={handleChange} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-block_width">Rộng ô (m) *</Label>
                                <Input id="edit-block_width" name="block_width" type="number" value={formData.block_width} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-ceiling_height">Chiều cao trần (m)</Label>
                                <Input id="edit-ceiling_height" name="ceiling_height" type="number" value={formData.ceiling_height} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-address_detail">Địa chỉ chi tiết</Label>
                                <Input id="edit-address_detail" name="address_detail" value={formData.address_detail} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-manager_name">Tên quản lý</Label>
                                <Input id="edit-manager_name" name="manager_name" value={formData.manager_name} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-manager_phone">SĐT quản lý</Label>
                                <Input id="edit-manager_phone" name="manager_phone" value={formData.manager_phone} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-manager_email">Email quản lý</Label>
                                <Input id="edit-manager_email" name="manager_email" type="email" value={formData.manager_email} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id="edit-is_active" checked={formData.is_active} onCheckedChange={(checked) => handleSwitchChange('is_active', checked)} />
                                <Label htmlFor="edit-is_active">Hoạt động</Label>
                            </div>

                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu thay đổi"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteWarehouseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: Warehouse | null;
    onSuccess: () => void;
}

export function DeleteWarehouseDialog({ open, onOpenChange, warehouse, onSuccess }: DeleteWarehouseDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!warehouse) return;
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Unauthorized");

            await warehouseTemplateService.deleteWarehouseTemplate(token, warehouse.id);
            toast.success("Xóa kho thành công");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Xóa kho thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Xóa kho</DialogTitle>
                    <DialogDescription>
                        Bạn có chắc chắn muốn xóa kho "{warehouse?.name}" không? Hành động này không thể hoàn tác.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Đang xóa..." : "Xóa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
