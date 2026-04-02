import React, { useState, useCallback, useEffect } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { PartnerService } from "@/services/partner/partner.service";
import { LocationService } from "@/services/location/location.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    PhoneIcon,
    IdentificationIcon,
    MapPinIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    PlusIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import type { Partner, PartnerType, CreatePartnerPayload, UpdatePartnerPayload } from "@/services/partner/partner.types";
import type { Province } from "@/types/location/provinces.type";
import type { Ward } from "@/types/location/wards.type";

const partnerService = new PartnerService();
const locationService = new LocationService();

interface PartnerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "create" | "edit";
    editTarget: Partner | null;
    onSuccess: () => void;
}

export function PartnerFormDialog({
    open,
    onOpenChange,
    mode,
    editTarget,
    onSuccess,
}: PartnerFormDialogProps) {
    const { showToast } = useToast();

    // Fields
    const [formType, setFormType] = useState<PartnerType>("CUSTOMER");
    const [formName, setFormName] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formTaxCode, setFormTaxCode] = useState("");
    const [formAddressDetail, setFormAddressDetail] = useState("");
    const [formWardId, setFormWardId] = useState("");
    const [formActive, setFormActive] = useState(true);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [codeChecking, setCodeChecking] = useState(false);

    // Locations
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState("");
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    // Setup state on open
    useEffect(() => {
        if (open) {
            setFormErrors({});
            if (mode === "edit" && editTarget) {
                setFormType(editTarget.type);
                setFormName(editTarget.name);
                setFormCode(editTarget.code);
                setFormPhone(editTarget.phone || "");
                setFormEmail(editTarget.email || "");
                setFormTaxCode(editTarget.tax_code || "");
                setFormAddressDetail(editTarget.address_detail || "");
                setFormActive(editTarget.is_active);

                if (editTarget.ward?.province?.id) {
                    setSelectedProvinceId(editTarget.ward.province.id);
                    setFormWardId(editTarget.ward_id || "");
                } else {
                    setSelectedProvinceId("");
                    setFormWardId("");
                }
            } else {
                setFormType("CUSTOMER");
                setFormName("");
                setFormCode("");
                setFormPhone("");
                setFormEmail("");
                setFormTaxCode("");
                setFormAddressDetail("");
                setFormWardId("");
                setSelectedProvinceId("");
                setFormActive(true);
            }
        }
    }, [open, mode, editTarget]);

    useEffect(() => {
        const loadProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const data = await locationService.getProvinces();
                setProvinces(data || []);
            } catch {
                // ignore
            } finally {
                setLoadingProvinces(false);
            }
        };
        loadProvinces();
    }, []);

    useEffect(() => {
        if (!selectedProvinceId) {
            setWards([]);
            setFormWardId("");
            return;
        }
        const loadWards = async () => {
            setLoadingWards(true);
            try {
                const data = await locationService.getWards({ province_id: selectedProvinceId });
                setWards(data || []);
            } catch {
                // ignore
            } finally {
                setLoadingWards(false);
            }
        };
        loadWards();
    }, [selectedProvinceId]);

    const generateCode = useCallback(() => {
        const prefix = formType === "CUSTOMER" ? "KH" : "NCC";
        const random = String(Math.floor(Math.random() * 9000) + 1000);
        setFormCode(`${prefix}${random}`);
        setFormErrors((prev) => ({ ...prev, code: "" }));
    }, [formType]);

    const debouncedCode = useDebounce(formCode, 600);

    useEffect(() => {
        if (!debouncedCode || debouncedCode.length < 2) return;
        if (mode === "edit" && editTarget?.code === debouncedCode) return;

        const checkCode = async () => {
            setCodeChecking(true);
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const result = await partnerService.list(token, {
                    keywords: debouncedCode,
                    limit: 1,
                });
                const exists = result?.data?.items?.some(
                    (p) => p.code === debouncedCode && p.id !== editTarget?.id
                );
                if (exists) {
                    setFormErrors((prev) => ({
                        ...prev,
                        code: "Mã này đã được sử dụng. Vui lòng chọn mã khác.",
                    }));
                } else {
                    setFormErrors((prev) => ({ ...prev, code: "" }));
                }
            } catch {
                // ignore
            } finally {
                setCodeChecking(false);
            }
        };
        checkCode();
    }, [debouncedCode, mode, editTarget]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formName.trim()) errs.name = "Tên đối tác là bắt buộc";
        if (formName.trim().length > 255) errs.name = "Tên đối tác tối đa 255 ký tự";
        if (!formCode.trim()) errs.code = "Mã đối tác là bắt buộc";
        if (formCode.trim().length > 50) errs.code = "Mã đối tác tối đa 50 ký tự";
        if (formEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
            errs.email = "Email không hợp lệ";
        }
        if (formPhone && formPhone.length > 20) errs.phone = "Số điện thoại tối đa 20 ký tự";
        if (formTaxCode && formTaxCode.length > 20) errs.tax_code = "Mã số thuế tối đa 20 ký tự";
        setFormErrors((prev) => ({ ...prev, ...errs }));
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        if (formErrors.code) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: any = {
                name: formName.trim(),
                code: formCode.trim(),
                type: formType,
                is_active: formActive,
            };
            if (formPhone.trim()) payload.phone = formPhone.trim();
            if (formEmail.trim()) payload.email = formEmail.trim();
            if (formTaxCode.trim()) payload.tax_code = formTaxCode.trim();
            if (formAddressDetail.trim()) payload.address_detail = formAddressDetail.trim();
            if (formWardId) payload.ward_id = formWardId;

            if (mode === "create") {
                await partnerService.create(token, payload as CreatePartnerPayload);
                showToast(`Đã tạo đối tác "${formName}" thành công!`, "success");
            } else if (editTarget) {
                await partnerService.update(token, editTarget.id, payload as UpdatePartnerPayload);
                showToast(`Đã cập nhật đối tác "${formName}" thành công!`, "success");
            }

            onSuccess();
            onOpenChange(false);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message?.includes("đã tồn tại") || error.message?.includes("code_exists")) {
                setFormErrors((prev) => ({
                    ...prev,
                    code: "Mã này đã được sử dụng. Vui lòng chọn mã khác.",
                }));
            } else {
                showToast(error.message || "Lưu thất bại", "error");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        {mode === "create" ? (
                            <>
                                <PlusIcon className="w-5 h-5 text-[#0F766E]" />
                                Thêm đối tác mới
                            </>
                        ) : (
                            <>
                                <PencilSquareIcon className="w-5 h-5 text-[#0F766E]" />
                                Chỉnh sửa đối tác
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Khai báo thông tin đối tác mới cho hệ thống kho"
                            : `Cập nhật thông tin "${editTarget?.name}"`}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="space-y-6 px-6 py-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <IdentificationIcon className="w-4 h-4" />
                                Thông tin định danh
                            </h3>
                            <div className="space-y-2">
                                <Label>Phân loại <span className="text-red-500">*</span></Label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormType("CUSTOMER")}
                                        className={`btn-raw flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium ${formType === "CUSTOMER"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        <UserGroupIcon className="w-4 h-4" /> Khách hàng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormType("SUPPLIER")}
                                        className={`btn-raw flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium ${formType === "SUPPLIER"
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        <BuildingOfficeIcon className="w-4 h-4" /> Nhà cung cấp
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-name">Tên đối tác <span className="text-red-500">*</span></Label>
                                <Input
                                    id="partner-name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className={`rounded-xl ${formErrors.name ? "border-red-400 focus:ring-red-400" : ""}`}
                                    autoFocus
                                    aria-invalid={!!formErrors.name}
                                    aria-describedby={formErrors.name ? "partner-name-error" : undefined}
                                />
                                {formErrors.name && <p id="partner-name-error" className="text-xs text-red-500" role="alert">{formErrors.name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-code">Mã đối tác <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="partner-code"
                                            value={formCode}
                                            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                            className={`rounded-xl ${formErrors.code ? "border-red-400 focus:ring-red-400" : ""}`}
                                            aria-invalid={!!formErrors.code}
                                            aria-describedby={formErrors.code ? "partner-code-error" : undefined}
                                        />
                                        {codeChecking && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                                <div className="w-4 h-4 border-2 border-slate-300 border-t-[#0F766E] rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={generateCode}>
                                        <Sparkles className="w-4 h-4 mr-1.5" /> Tự động
                                    </Button>
                                </div>
                                {formErrors.code && <p id="partner-code-error" className="text-xs text-red-500" role="alert">{formErrors.code}</p>}
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <PhoneIcon className="w-4 h-4" />
                                Thông tin liên hệ
                            </h3>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-phone">Số điện thoại</Label>
                                <Input
                                    id="partner-phone"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    className={`rounded-xl ${formErrors.phone ? "border-red-400" : ""}`}
                                    aria-invalid={!!formErrors.phone}
                                    aria-describedby={formErrors.phone ? "partner-phone-error" : undefined}
                                />
                                {formErrors.phone && <p id="partner-phone-error" className="text-xs text-red-500" role="alert">{formErrors.phone}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-email">Email</Label>
                                <Input
                                    id="partner-email"
                                    type="email"
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    className={`rounded-xl ${formErrors.email ? "border-red-400 focus:ring-red-400" : ""}`}
                                    aria-invalid={!!formErrors.email}
                                    aria-describedby={formErrors.email ? "partner-email-error" : undefined}
                                />
                                {formErrors.email && <p id="partner-email-error" className="text-xs text-red-500" role="alert">{formErrors.email}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-tax">Mã số thuế</Label>
                                <Input
                                    id="partner-tax"
                                    value={formTaxCode}
                                    onChange={(e) => setFormTaxCode(e.target.value)}
                                    className={`rounded-xl ${formErrors.tax_code ? "border-red-400" : ""}`}
                                    aria-invalid={!!formErrors.tax_code}
                                    aria-describedby={formErrors.tax_code ? "partner-tax-error" : undefined}
                                />
                                {formErrors.tax_code && <p id="partner-tax-error" className="text-xs text-red-500" role="alert">{formErrors.tax_code}</p>}
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4" />
                                Địa chỉ
                            </h3>
                            <div className="space-y-1.5">
                                <Label>Tỉnh / Thành phố</Label>
                                <Select
                                    value={selectedProvinceId}
                                    onValueChange={(v) => {
                                        setSelectedProvinceId(v);
                                        setFormWardId("");
                                    }}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder={loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành phố"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {provinces.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phường / Xã</Label>
                                <Select
                                    value={formWardId}
                                    onValueChange={setFormWardId}
                                    disabled={!selectedProvinceId}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder={!selectedProvinceId ? "Chọn tỉnh/thành trước" : loadingWards ? "Đang tải..." : "Chọn phường/xã"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {wards.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="partner-address">Số nhà, tên đường</Label>
                                <Input
                                    id="partner-address"
                                    value={formAddressDetail}
                                    onChange={(e) => setFormAddressDetail(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-sm font-medium text-slate-900">Đang giao dịch</p>
                                <p className="text-xs text-slate-500 mt-0.5">Đối tác có thể xuất hiện khi tạo phiếu PO/xuất</p>
                            </div>
                            <Switch checked={formActive} onCheckedChange={setFormActive} />
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0">
                    <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={handleSave}
                        disabled={isSubmitting || codeChecking}
                    >
                        {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo đối tác" : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

