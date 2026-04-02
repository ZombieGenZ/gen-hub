"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { authStorage } from "@/services/auth/auth-storage.service";
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
import { RentalDurationTierService } from "@/services/rental-duration-tier/rental-duration-tier.service";
import { AddonsService } from "@/services/addons/addons.service";
import { IsuranceService } from "@/services/Insurance/Insurance.service";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { AddonResponse } from "@/types/addon/addon.type";
import { Insurance } from "@/types/insurance/Insurance.types";
import { RentalDurationTier } from "@/types/rental-duration-tier/rental-duration-tier.type";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { CreateRentalContractRequest, RentalContractPaymentType, RentalContractPaymentMethod } from "@/types/rental-contracts/rental-contracts.type";
import { Organization } from "@/types/organization/organization.type";

// Initialize services
const rentalContractService = new RentalContractService();
const rentalDurationTierService = new RentalDurationTierService();
const addonsService = new AddonsService();
const insuranceService = new IsuranceService();
const warehouseTemplateService = new WarehouseTemplateService();

const toList = (resp: any) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.items)) return resp.items;
    if (resp.data?.items && Array.isArray(resp.data.items)) return resp.data.items;
    return [];
};

interface CreateContractModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    organizations: Organization[];
}

export function CreateContractModal({ open, onOpenChange, onSuccess, organizations }: CreateContractModalProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Data lists
    const [durationTiers, setDurationTiers] = useState<RentalDurationTier[]>([]);
    const [addons, setAddons] = useState<AddonResponse[]>([]);
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [warehouseTemplates, setWarehouseTemplates] = useState<Warehouse[]>([]);

    // Form state
    const [formData, setFormData] = useState<Partial<CreateRentalContractRequest>>({
        type: 'TRANSFER',
        payment_method: 'TRANSFER',
        templates: [],
        addon_ids: [],
        insurance_ids: [],
        coupon_codes: [],
        auto_renew: false,
    });

    // Local state for single warehouse selection
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [selectedWarehouseName, setSelectedWarehouseName] = useState<string>("");

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const [tiersData, addonsData, insuranceData, templatesData] = await Promise.all([
                rentalDurationTierService.getAllRentalDuratuion(token),
                addonsService.getAllAddons(token),
                insuranceService.getActiveInsurance(token),
                warehouseTemplateService.getWarehouseTemplates(token, { limit: 100, is_active: true })
            ]);

            const tiers = toList(tiersData);
            const addonsList = toList(addonsData);
            const insList = toList(insuranceData);
            const templatesList = toList(templatesData);

            setDurationTiers(tiers as RentalDurationTier[]);
            setAddons(addonsList as AddonResponse[]);
            setInsurances(insList as Insurance[]);
            setWarehouseTemplates(templatesList as Warehouse[]);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Không thể tải dữ liệu danh mục");
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (templateId: string) => {
        const template = warehouseTemplates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplateId(templateId);
            setSelectedWarehouseName(template.name);
            // Update formData templates array
            setFormData(prev => ({
                ...prev,
                templates: [{
                    template_id: templateId,
                    warehouse_name: template.name,
                    warehouse_description: template.description || "",
                    contents_description: "", // Can add input for this
                    row_template_ids: []
                }]
            }));
        }
    };

    const handleCheckboxChange = (id: string, field: 'addon_ids' | 'insurance_ids', checked: boolean) => {
        setFormData(prev => {
            const currentList = prev[field] || [];
            if (checked) {
                return { ...prev, [field]: [...currentList, id] };
            } else {
                return { ...prev, [field]: currentList.filter(item => item !== id) };
            }
        });
    };

    const handleSubmit = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                toast.error("Vui lòng đăng nhập lại");
                return;
            }

            // Validation
            if (!formData.organization_id) {
                toast.error("Vui lòng chọn tổ chức");
                return;
            }
            if (!formData.duration_tier_id) {
                toast.error("Vui lòng chọn gói thời gian");
                return;
            }
            if (!selectedTemplateId) {
                toast.error("Vui lòng chọn kho");
                return;
            }

            setSubmitting(true);

            // Prepare final payload
            const payload: CreateRentalContractRequest = {
                organization_id: formData.organization_id!,
                duration_tier_id: formData.duration_tier_id!,
                type: formData.type || 'TRANSFER',
                payment_method: formData.payment_method || 'TRANSFER',
                templates: formData.templates || [],
                addon_ids: formData.addon_ids,
                insurance_ids: formData.insurance_ids,
                notes: formData.notes,
                scheduled_start_at: formData.scheduled_start_at,
                // auto_renew: formData.auto_renew, // Optional
            };

            await rentalContractService.createRentalContract(token, payload);
            
            toast.success("Tạo hợp đồng thành công");
            onSuccess();
            onOpenChange(false);
            
            // Reset form
            setFormData({
                type: 'TRANSFER',
                payment_method: 'TRANSFER',
                templates: [],
                addon_ids: [],
                insurance_ids: [],
                coupon_codes: [],
                auto_renew: false,
            });
            setSelectedTemplateId("");
            setSelectedWarehouseName("");

        } catch (error: any) {
            console.error("Create contract error:", error);
            toast.error(error.message || "Tạo hợp đồng thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo hợp đồng mới</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Organization & Warehouse */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="organization">Tổ chức thuê <span className="text-red-500">*</span></Label>
                            <Select 
                                value={formData.organization_id} 
                                onValueChange={(value) => setFormData({...formData, organization_id: value})}
                            >
                                <SelectTrigger aria-label="Chọn tổ chức">
                                    <SelectValue placeholder="Chọn tổ chức" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizations.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="warehouse">Kho thuê <span className="text-red-500">*</span></Label>
                            <Select 
                                value={selectedTemplateId} 
                                onValueChange={handleTemplateChange}
                            >
                                <SelectTrigger aria-label="Chọn kho">
                                    <SelectValue placeholder="Chọn kho" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(warehouseTemplates || []).map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.name} - {Number(template.price_per_month || 0).toLocaleString()}đ
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Duration & Start Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Gói thời gian <span className="text-red-500">*</span></Label>
                            <Select 
                                value={formData.duration_tier_id} 
                                onValueChange={(value) => setFormData({...formData, duration_tier_id: value})}
                            >
                                <SelectTrigger aria-label="Chọn thời hạn">
                                    <SelectValue placeholder="Chọn thời hạn" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(durationTiers || []).map((tier) => (
                                        <SelectItem key={tier.id} value={tier.id}>
                                            {tier.name} {tier.duration_value ? `(${tier.duration_value} ${tier.duration_unit || ''})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="start_date">Ngày bắt đầu</Label>
                            <Input 
                                type="date" 
                                id="start_date"
                                value={formData.scheduled_start_at ? formData.scheduled_start_at.split('T')[0] : ''}
                                onChange={(e) => setFormData({...formData, scheduled_start_at: new Date(e.target.value).toISOString()})}
                            />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Hình thức thanh toán</Label>
                            <Select 
                                value={formData.payment_method} 
                                onValueChange={(value: RentalContractPaymentMethod) => setFormData({...formData, payment_method: value})}
                            >
                                <SelectTrigger aria-label="Hình thức thanh toán">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRANSFER">Chuyển khoản</SelectItem>
                                    <SelectItem value="BALANCE">Số dư ví</SelectItem>
                                    <SelectItem value="HYBRID">Kết hợp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Loại hợp đồng</Label>
                            <Select 
                                value={formData.type} 
                                onValueChange={(value: RentalContractPaymentType) => setFormData({...formData, type: value})}
                            >
                                <SelectTrigger aria-label="Loại hợp đồng">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRANSFER">Trả trước</SelectItem>
                                    <SelectItem value="CASH">Tiền mặt</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Addons */}
                    {addons.length > 0 && (
                        <div className="space-y-2">
                            <Label>Dịch vụ đi kèm</Label>
                            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                {addons.map((addon) => (
                                    <div key={addon.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`addon-${addon.id}`} 
                                            checked={formData.addon_ids?.includes(addon.id)}
                                            onCheckedChange={(checked) => handleCheckboxChange(addon.id, 'addon_ids', checked as boolean)}
                                        />
                                        <label htmlFor={`addon-${addon.id}`} className="text-sm cursor-pointer">
                                            {addon.name} ({addon.price?.toLocaleString()}đ)
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Insurance */}
                    {insurances.length > 0 && (
                        <div className="space-y-2">
                            <Label>Bảo hiểm</Label>
                            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                {insurances.map((ins) => (
                                    <div key={ins.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`ins-${ins.id}`} 
                                            checked={formData.insurance_ids?.includes(ins.id)}
                                            onCheckedChange={(checked) => handleCheckboxChange(ins.id, 'insurance_ids', checked as boolean)}
                                        />
                                        <label htmlFor={`ins-${ins.id}`} className="text-sm cursor-pointer">
                                            {ins.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea 
                            id="notes" 
                            placeholder="Ghi chú thêm về hợp đồng..."
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || loading}>
                        {submitting ? "Đang tạo..." : "Tạo hợp đồng"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
