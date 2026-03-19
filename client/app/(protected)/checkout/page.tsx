"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    CheckoutProvider,
    CheckoutProgress,
    CheckoutNavigation,
    CheckoutStepContainer,
    useCheckout
} from '@/components/checkout/CheckoutWizard';
import { RentalInfoStep } from '@/components/checkout/RentalInfoStep';
import { CompanyInfoStep } from '@/components/checkout/CompanyInfoStep';
import { RepresentativeInfoStep } from '@/components/checkout/RepresentativeInfoStep';
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector';
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation';
import { ContractSignatureStep } from '@/components/checkout/ContractSignatureStep';
import { QuotationSummary } from '@/components/warehouse/QuotationSummary';
import { CouponDrawer } from '@/components/checkout/CouponDrawer';
import { CheckoutSession, PaymentMethod } from '@/types/checkout/checkout.type';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

import { useSearchParams } from 'next/navigation';
import { publicWarehouseService } from '@/services/public-warehouse/public-warehouse.service';
import { MOCK_ADDONS, MOCK_INSURANCES, MOCK_DURATION_TIERS } from '@/types/booking/booking.type';
import { publicQuotationService, QuotationApiResponse } from '@/services/public-quotation/public-quotation.service';

// Default empty session
import { authStorage } from '@/services/auth/auth-storage.service';
import { organizationService } from '@/services/organization/organization.service';
import { rentalContractService } from '@/services/rental-contract/rental-contract.service';
import { CreateRentalContractRequest, RentalContractPaymentMethod } from '@/types/rental-contracts/rental-contracts.type';

import { Warehouse } from '@/types/warehoue_template/warehouse_template.type';
import { AddonResponse } from '@/types/addon/addon.type';
import { Organization } from '@/types/organization/organization.type';

interface CompanyData {
    name: string;
    international_name: string;
    tax_code: string;
    headquarters_address: string;
    invoice_address: string;
}

interface RepresentativeData {
    representative_name: string;
    representative_title: string;
    representative_phone: string;
    representative_email: string;
}

const isSameCompanyData = (a: CompanyData, b: CompanyData) => (
    a.name === b.name &&
    a.international_name === b.international_name &&
    a.tax_code === b.tax_code &&
    a.headquarters_address === b.headquarters_address &&
    a.invoice_address === b.invoice_address
);

const isSameRepresentativeData = (a: RepresentativeData, b: RepresentativeData) => (
    a.representative_name === b.representative_name &&
    a.representative_title === b.representative_title &&
    a.representative_phone === b.representative_phone &&
    a.representative_email === b.representative_email
);

const REPRESENTATIVE_TITLE_LABELS: Record<string, string> = {
    'giam-doc': 'Giám đốc',
    'tong-giam-doc': 'Tổng Giám đốc',
    'chu-tich-hdqt': 'Chủ tịch HĐQT',
    'pho-giam-doc': 'Phó Giám đốc',
    'giam-doc-tai-chinh': 'Giám đốc Tài chính (CFO)',
    'giam-doc-dieu-hanh': 'Giám đốc Điều hành (COO)',
    'truong-phong': 'Trưởng phòng',
    'ke-toan-truong': 'Kế toán trưởng',
    'nguoi-dai-dien-phap-luat': 'Người đại diện pháp luật',
    'chu-doanh-nghiep': 'Chủ doanh nghiệp',
};

const normalizeRepresentativeTitle = (rawTitle?: string) => {
    if (!rawTitle) {
        return 'Người đại diện pháp luật';
    }
    return REPRESENTATIVE_TITLE_LABELS[rawTitle] || rawTitle;
};

const mapApiQuotationToBreakdown = (quotation: QuotationApiResponse) => ({
    basePrice: quotation.base_price_per_month,
    durationMonths: quotation.duration_months,
    durationDiscountPercent: quotation.duration_discount_percent,
    durationDiscountAmount: quotation.duration_discount_amount ?? ((quotation.base_price_per_month * quotation.duration_months) * (quotation.duration_discount_percent / 100)),
    addonsCost: quotation.addons_cost ?? 0,
    insuranceCost: quotation.insurance_cost ?? 0,
    managementFee: quotation.management_fee ?? 0,
    subtotal: quotation.subtotal,
    serviceFee: quotation.service_fee,
    couponDiscount: quotation.coupon_discount,
    grandTotal: quotation.grand_total,
});

function CheckoutContent() {
    const router = useRouter();
    const { session, setSession, currentStep, nextStep, setIsSubmitting } = useCheckout();

    // Form data states
    const [companyData, setCompanyData] = useState<CompanyData>({
        name: '',
        international_name: '',
        tax_code: '',
        headquarters_address: '',
        invoice_address: '',
    });

    const [representativeData, setRepresentativeData] = useState<RepresentativeData>({
        representative_name: '',
        representative_title: '',
        representative_phone: '',
        representative_email: '',
    });

    const [hasExistingOrg, setHasExistingOrg] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Coupon state
    const [couponDrawerOpen, setCouponDrawerOpen] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
    const hasSyncedQuotationRef = useRef(false);

    const recalculateQuotation = useCallback(async (couponCode?: string) => {
        if (!session.warehouse_template_id || !session.duration_tier_id || !session.rental_type) {
            return;
        }

        try {
            const quotation = await publicQuotationService.calculateQuotation({
                warehouse_template_id: session.warehouse_template_id,
                rental_type: session.rental_type,
                duration_tier_id: session.duration_tier_id,
                row_template_ids: session.rental_type === 'row' ? session.row_template_ids : undefined,
                addon_ids: session.addon_ids,
                insurance_id: session.insurance_id,
                coupon_code: couponCode || undefined,
                start_date: session.start_date ? new Date(session.start_date).toISOString().split('T')[0] : undefined,
            });

            setSession({
                coupon_code: couponCode || undefined,
                quotation: mapApiQuotationToBreakdown(quotation),
                deposit_amount: quotation.deposit_amount,
            });

            if (couponCode && quotation.coupon_discount > 0) {
                setAppliedCoupon({ code: couponCode, discount: quotation.coupon_discount });
            } else {
                setAppliedCoupon(null);
            }
        } catch (error) {
            console.error('Failed to recalculate quotation:', error);
        }
    }, [session.warehouse_template_id, session.duration_tier_id, session.rental_type, session.row_template_ids, session.addon_ids, session.insurance_id, session.start_date, setSession]);

    useEffect(() => {
        if (hasSyncedQuotationRef.current) return;
        if (!session.warehouse_template_id || !session.duration_tier_id || !session.rental_type) return;

        hasSyncedQuotationRef.current = true;
        void recalculateQuotation(session.coupon_code);
    }, [session.warehouse_template_id, session.duration_tier_id, session.rental_type, session.coupon_code, recalculateQuotation]);

    // Initial Data Fetch (Organization)
    useEffect(() => {
        const fetchOrgInfo = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;

                const userID = await authStorage.getUserID();
                const listOrganization = await organizationService.getOrganizations(token);
                console.log(listOrganization.items);

                const organization = listOrganization.items.find((o: Organization) => o.owner.id == userID);
                if (organization) {
                    const org = await organizationService.getOrganizationById(token, organization.id);
                    if (org) {
                        setCompanyData({
                            name: org.name,
                            international_name: org.international_name || '',
                            tax_code: org.tax_code,
                            headquarters_address: org.headquarters_address,
                            invoice_address: org.invoice_address || org.headquarters_address,
                        });
                        // Also pre-fill representative if available in organization
                        setRepresentativeData({
                            representative_name: org.representative_name || '',
                            representative_title: org.representative_title || '',
                            representative_phone: org.representative_phone || '',
                            representative_email: org.representative_email || ''
                        });
                        setHasExistingOrg(true);
                        setSession({ organization_id: organization.id });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch organization info", error);
            } finally {
                setInitializing(false);
            }
        };

        fetchOrgInfo();
    }, [setSession]);

    // Handle company info change
    const handleCompanyChange = useCallback((data: CompanyData) => {
        setCompanyData(prev => (isSameCompanyData(prev, data) ? prev : data));

        if (session.company_address !== data.headquarters_address) {
            setSession({ company_address: data.headquarters_address });
        }
    }, [session.company_address, setSession]);

    // Handle representative info change
    const handleRepresentativeChange = useCallback((data: RepresentativeData) => {
        setRepresentativeData(prev => (isSameRepresentativeData(prev, data) ? prev : data));
    }, []);

    // Handle payment method change
    const handlePaymentMethodChange = (method: PaymentMethod) => {
        setSession({ ...session, payment_method: method });
    };

    const handleSignatureComplete = async (signatureData: string) => {
        // Store signature in session
        setSession({
            ...session,
            signature_data: signatureData,
            signature_date: new Date().toISOString()
        });

        try {
            await handleSubmitOrder(signatureData);
            nextStep();
        } catch {
        }
    };

    // Handle coupon applied
    const handleCouponApplied = (coupon: { code: string; discount: number } | null) => {
        void recalculateQuotation(coupon?.code);
    };


    // Handle order submission
    const handleSubmitOrder = async (signatureData?: string) => {
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Authentication required");

            let orgId = session.organization_id;

            // 1. Create Organization if needed
            if (!hasExistingOrg && !orgId) {
                const newOrg = await organizationService.createOrganization(token, {
                    ...companyData,
                    ...representativeData,
                    representative_title: normalizeRepresentativeTitle(representativeData.representative_title),
                });
                orgId = newOrg.data?.id || newOrg.id;
                setSession({ ...session, organization_id: orgId });
            }

            if (!orgId) throw new Error("Missing organization ID");

            let signatureBlob: Blob | null = null;
            const rawSig = signatureData || session.signature_data;
            if (rawSig) {
                try {
                    const base64Data = rawSig.replace(/^data:image\/\w+;base64,/, '');
                    const binary = atob(base64Data);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    signatureBlob = new Blob([bytes], { type: 'image/png' });
                } catch (e) {
                    console.warn('Could not convert signature to blob:', e);
                }
            }

            // 3. Prepare Order Data
            if (!session.duration_tier_id) throw new Error('Missing duration tier');
            if (!session.warehouse_template_id) throw new Error('Missing warehouse template');

            // Ensure start date is not in the past
            const providedDate = new Date(session.start_date || Date.now());
            const validStartDate = providedDate.getTime() <= Date.now()
                ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
                : providedDate.toISOString();

            const payload: CreateRentalContractRequest = {
                organization_id: orgId,
                duration_tier_id: session.duration_tier_id,
                templates: [{
                    template_id: session.warehouse_template_id,
                    warehouse_name: session.warehouse_name || '',
                    warehouse_description: session.warehouse_details?.address,
                    row_template_ids: session.rental_type === 'row' ? session.row_template_ids : undefined,
                }],
                addon_ids: (session.addon_ids || []).filter(Boolean),
                insurance_ids: session.insurance_id ? [session.insurance_id] : undefined,
                coupon_codes: session.coupon_code ? [session.coupon_code] : undefined,
                payment_method: 'TRANSFER' as RentalContractPaymentMethod,
                scheduled_start_at: validStartDate,
            };

            // 4. Submit Order using customer endpoint (multipart/form-data with optional signature)
            const response = await rentalContractService.createOrgRentalContract(token, orgId, payload, signatureBlob);
            const result = response?.data;

            console.log('Order created successfully:', result);

            // 5. Save contract + payment info to session for confirmation page
            const contract = result?.contract;
            const payment = result?.payment;
            setSession({
                contract_id: contract?.id,
                contract_code: contract?.code || contract?.contract_number,
                payment_id: payment?.paymentId,
                payment_code: payment?.paymentCode,
                payment_qr_url: payment?.qrCode,
                payment_expired_at: payment?.expiredAt ? new Date(payment.expiredAt).toISOString() : undefined,
            });

        } catch (error) {
            console.error('Failed to create order:', error);
            alert("Lỗi khi tạo đơn hàng. Vui lòng thử lại.");
            throw error; // Re-throw so signature step doesn't advance
        } finally {
            setIsSubmitting(false);
        }
    };

    if (initializing) {
        return <div className="p-12 text-center text-slate-500">Đang tải thông tin...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/assets/Genhubv2.svg" alt="GenHub" className="h-8" />
                        </Link>
                        <div className="ml-4 pl-4 border-l border-slate-200">
                            <h1 className="text-lg font-semibold text-slate-800">Thanh toán</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 text-slate-600 hover:text-slate-900"
                    onClick={() => router.back()}
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Quay lại trang kho
                </Button>

                {/* Progress Bar */}
                <CheckoutProgress className="mb-8" />

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            {/* Step 1: Rental Info */}
                            <CheckoutStepContainer step="rental-info">
                                <RentalInfoStep />
                            </CheckoutStepContainer>

                            {/* Step 2: Company Info */}
                            <CheckoutStepContainer step="business-info">
                                <CompanyInfoStep
                                    initialData={companyData}
                                    onChange={handleCompanyChange}
                                    allowEdit={!hasExistingOrg}
                                />
                            </CheckoutStepContainer>

                            {/* Step 3: Representative Info */}
                            <CheckoutStepContainer step="representative-info">
                                <RepresentativeInfoStep
                                    initialData={representativeData}
                                    onChange={handleRepresentativeChange}
                                />
                            </CheckoutStepContainer>

                            {/* Step 4: Payment */}
                            <CheckoutStepContainer step="payment">
                                <PaymentMethodSelector
                                    value={session.payment_method}
                                    onChange={handlePaymentMethodChange}
                                />
                            </CheckoutStepContainer>

                            {/* Step 5: Signature */}
                            <CheckoutStepContainer step="signature">
                                <ContractSignatureStep
                                    companyData={companyData}
                                    representativeData={{
                                        ...representativeData,
                                        representative_title: normalizeRepresentativeTitle(representativeData.representative_title),
                                    }}
                                    onSignatureComplete={handleSignatureComplete}
                                />
                            </CheckoutStepContainer>

                            {/* Step 6: Confirmation */}
                            <CheckoutStepContainer step="confirmation">
                                <OrderConfirmation
                                    onViewOrder={() => router.push('/dashboard/orders')}
                                    onDownloadInvoice={() => console.log('Download invoice')}
                                    companyData={companyData}
                                    representativeData={{
                                        name: representativeData.representative_name,
                                        title: normalizeRepresentativeTitle(representativeData.representative_title),
                                        phone: representativeData.representative_phone,
                                        email: representativeData.representative_email,
                                    }}
                                />
                            </CheckoutStepContainer>

                            {/* Navigation Buttons */}
                            {currentStep !== 'confirmation' && currentStep !== 'signature' && (
                                <CheckoutNavigation
                                    onSubmit={undefined}
                                    submitLabel="Tiếp tục"
                                    className="mt-8"
                                />
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Quotation Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            {session.quotation && (
                                <QuotationSummary
                                    breakdown={session.quotation}
                                    rentalType={session.rental_type}
                                    warehouseName={session.warehouse_name}
                                    selectedAddons={session.addon_details as any}
                                    selectedInsurance={session.insurance_details as any}
                                    appliedCoupon={appliedCoupon}
                                    onCouponClick={() => setCouponDrawerOpen(true)}
                                />
                            )}

                            {/* Help Section */}
                            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                                <h4 className="font-medium text-slate-800 mb-2">Cần hỗ trợ?</h4>
                                <p className="text-sm text-slate-500 mb-3">
                                    Liên hệ với chúng tôi qua:
                                </p>
                                <div className="space-y-2 text-sm">
                                    <p className="text-[#0F766E] font-medium">
                                        📞 Hotline: 1900 1234
                                    </p>
                                    <p className="text-[#0F766E] font-medium">
                                        ✉️ Email: support@genhub.vn
                                    </p>
                                </div>
                            </div>



                            {/* Coupon Drawer */}
                            <CouponDrawer
                                open={couponDrawerOpen}
                                onOpenChange={setCouponDrawerOpen}
                                onCouponApplied={handleCouponApplied}
                                appliedCoupon={appliedCoupon}
                                warehouseId={session.warehouse_template_id}
                                rentalType={session.rental_type}
                                rowIds={session.row_template_ids}
                                addonIds={session.addon_ids}
                                durationTierId={session.duration_tier_id}
                                orderAmount={session.quotation?.grandTotal || 0}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function CheckoutContainer() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [session, setSession] = useState<Partial<CheckoutSession> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSession = async () => {
            try {
                // 1. Get IDs from URL
                const warehouseId = searchParams.get('warehouseId');

                // If warehouseId is missing, wait for a bit
                if (!warehouseId) {
                    // Optional: Handling logic here
                }

                const rentalType = (searchParams.get('rentalType') as 'whole' | 'row') || 'whole';
                const durationId = searchParams.get('durationId');
                const startDateStr = searchParams.get('startDate') || new Date().toISOString();
                const addonIds = searchParams.getAll('addonIds');
                const insuranceId = searchParams.get('insuranceId');
                const couponCode = searchParams.get('couponCode');
                const rowIds = searchParams.getAll('rowIds');

                // 2. Fetch/Find Data
                const API = process.env.NEXT_PUBLIC_API_URL;

                // Fetch Warehouse (API)
                let property: Warehouse | null = null;
                let warehouseAvailable = true;
                try {
                    const data = await publicWarehouseService.getPublicWarehouseById(warehouseId || '');
                    property = data;

                    // Check warehouse availability
                    if (property!.is_rented === true || property!.rental_status === 'RENTED' || property!.rental_status === 'LOCKED') {
                        warehouseAvailable = false;
                    }
                } catch (e) {
                    console.error("Error fetching warehouse", e);
                }

                if (!property) {
                    alert('Không tìm thấy thông tin kho. Vui lòng thử lại.');
                    router.push('/kho-bai');
                    return;
                }

                // If warehouse is not available, alert and redirect
                if (!warehouseAvailable) {
                    alert('Kho này đã được thuê hoặc đang bị khóa. Vui lòng chọn kho khác.');
                    router.push('/kho-bai');
                    return;
                }

                // Fetch Duration Tier (API)
                let durationTier: any = null;
                if (durationId) {
                    try {
                        const res = await fetch(`${API}/public/rental-duration-tiers/active`);
                        if (res.ok) {
                            const data = await res.json();
                            const allTiers = data.data || data;
                            durationTier = allTiers.find((t: any) => String(t.id) === durationId);
                        }
                    } catch (e) {
                        console.warn("Error fetching tier, falling back to mock", e);
                    }

                    if (!durationTier) {
                        // Fallback to mock
                        const mockTier = MOCK_DURATION_TIERS.find(t => t.id === durationId);
                        if (mockTier) durationTier = mockTier;
                    }
                }

                let addons: AddonResponse[] = [];
                try {
                    const res = await fetch(`${API}/public/addons/active`);
                    if (res.ok) {
                        const data = await res.json();
                        const allAddons = data.data || data;
                        addons = allAddons.filter((a: AddonResponse) => addonIds.includes(String(a.id)));
                    }
                } catch (e) {
                    console.warn("Error fetching addons, falling back to mock", e);
                }

                // If API returned nothing or failed, check mocks to fill missing details
                if (addons.length < addonIds.length) {
                    const mockAddons = MOCK_ADDONS.filter(a => addonIds.includes(a.id));
                    // Combine found API addons with fallback mocks (avoid duplicates)
                    const existingIds = addons.map(a => String(a.id));
                    const newMocks = mockAddons.filter(m => !existingIds.includes(m.id));
                    addons = [...addons, ...(newMocks as unknown as AddonResponse[])];
                }

                // Fetch Insurance (API with Mock Fallback)
                let insurance: any = null;
                if (insuranceId) {
                    try {
                        const res = await fetch(`${API}/public/insurances/active`);
                        if (res.ok) {
                            const data = await res.json();
                            const insurances = data.data || data;
                            insurance = insurances.find((i: any) => String(i.id) === insuranceId);
                        }
                    } catch (e) {
                        console.warn("Error fetching insurance, falling back to mock", e);
                    }

                    // Fallback to mock if API failed
                    if (!insurance) {
                        const mockIns = MOCK_INSURANCES.find(i => i.id === insuranceId);
                        if (mockIns) insurance = mockIns;
                    }
                }

                // 3. Calculate Quotation 
                const basePrice = Number(property.price_per_month) || 0;
                const durationUnit = durationTier?.duration_unit;
                const durationValue = Number(durationTier?.duration_value || 1);
                const durationMonths = durationUnit === 'YEAR'
                    ? durationValue * 12
                    : durationValue;

                const durationTierLabel = durationUnit === 'YEAR'
                    ? `${durationValue} năm`
                    : `${durationValue} tháng`;

                const durationDiscountPercent = durationTier?.discount_percent || 0;

                let addonsCost = 0;
                addons.forEach(a => {
                    addonsCost += Number(a.price);
                });

                let insuranceCost = 0;
                let managementFee = 0;
                if (insurance) {
                    const insurancePrice = Number(insurance.price);
                    // Mock logic for insurance cost
                    if (insurancePrice > 1000) {
                        insuranceCost = insurancePrice * durationMonths;
                        managementFee = 0;
                    }
                }

                const totalBaseRental = basePrice * durationMonths;
                const durationDiscountAmount = totalBaseRental * (durationDiscountPercent / 100);

                // Subtotal
                const subtotal = totalBaseRental - durationDiscountAmount + addonsCost + insuranceCost + managementFee;

                const serviceFee = subtotal * 0.1; // 10%
                const couponDiscount = 0;
                const grandTotal = subtotal + serviceFee - couponDiscount;

                const deposit_amount = Math.max(2000000, grandTotal * 0.1);

                // Friendly Names Mapping
                const FRIENDLY_NAMES: Record<string, string> = {
                    'ins-basic': 'Bảo hiểm Cơ bản',
                    'ins-standard': 'Bảo hiểm Tiêu chuẩn',
                    'ins-premium': 'Bảo hiểm Cao cấp',
                    'addon-security': 'Bảo vệ 24/7',
                    'addon-forklift': 'Xe nâng',
                    'addon-cleaning': 'Vệ sinh định kỳ',
                    'addon-lighting': 'Chiếu sáng đặc biệt',
                    'addon-loading': 'Bốc xếp hàng hóa',
                    'addon-inventory': 'Kiểm kê định kỳ',
                    'row-a': 'Dãy A (Khu vực gần cửa)',
                    'row-b': 'Dãy B (Khu vực trung tâm)',
                    'row-c': 'Dãy C (Khu vực độ ẩm thấp)',
                };

                const getFriendlyName = (id: string, originalName?: string) => {
                    return FRIENDLY_NAMES[id] || originalName || id;
                };

                // Helper to ensure we have details for all IDs, even if API fetch failed
                const finalAddonDetails = addonIds.map(id => {
                    const found = addons.find(a => String(a.id) === id);
                    return {
                        id,
                        name: getFriendlyName(id, found?.name),
                        price: found ? Number(found.price) : 0,
                        unit: found?.unit || (found?.is_monthly_payment ? 'tháng' : 'lần'),
                        is_monthly_payment: found?.is_monthly_payment || found?.unit === 'tháng' || found?.unit === 'month'
                    };
                });

                const finalInsuranceDetails = insuranceId ? {
                    id: insuranceId,
                    name: getFriendlyName(insuranceId, insurance?.name),
                    price: insurance ? Number(insurance.price) : 0
                } : undefined;

                // 4. Construct Session
                const newSession: Partial<CheckoutSession> = {
                    warehouse_template_id: warehouseId || property.id.toString(),
                    warehouse_name: property.name,
                    warehouse_details: {
                        address: property.address_detail,
                        image: property.images?.[0]?.url
                    },
                    rental_type: rentalType,
                    row_template_ids: rowIds,
                    row_details: rowIds.map(id => ({
                        id,
                        name: getFriendlyName(id)
                    })),
                    duration_tier_id: durationId || '',
                    duration_tier_name: durationTierLabel,
                    duration_months: durationMonths,
                    start_date: startDateStr,
                    addon_ids: addonIds,
                    addon_details: finalAddonDetails,
                    insurance_id: insuranceId || undefined,
                    insurance_details: finalInsuranceDetails,
                    coupon_code: couponCode || undefined,
                    quotation: {
                        basePrice,
                        durationMonths,
                        durationDiscountPercent,
                        durationDiscountAmount,
                        addonsCost,
                        insuranceCost,
                        managementFee,
                        subtotal,
                        serviceFee,
                        couponDiscount,
                        grandTotal
                    },
                    deposit_amount
                };

                setSession(newSession);
            } catch (error) {
                console.error("Failed to init session", error);
            } finally {
                setLoading(false);
            }
        };

        initSession();
    }, [searchParams, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F766E]"></div>
                    <p className="text-slate-500 font-medium">Đang khởi tạo đơn hàng...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <div className="text-center p-8">Lỗi khởi tạo đơn hàng. Vui lòng thử lại.</div>;
    }

    return (
        <CheckoutProvider initialSession={session}>
            <CheckoutContent />
        </CheckoutProvider>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CheckoutContainer />
        </Suspense>
    );
}
