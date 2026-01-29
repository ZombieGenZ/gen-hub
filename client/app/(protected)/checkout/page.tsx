"use client";

import React, { useState, useEffect, Suspense } from 'react';
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
import { QuotationSummary } from '@/components/warehouse/QuotationSummary';
import { CheckoutSession, PaymentMethod } from '@/types/checkout/checkout.type';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

import { useSearchParams } from 'next/navigation';
import { mockProperties } from '@/data/mockProperties';
import { MOCK_ADDONS, MOCK_INSURANCES, MOCK_DURATION_TIERS } from '@/types/booking/booking.type';

// Default empty session
import { authStorage } from '@/services/auth/auth-storage.service';
import { organizationService } from '@/services/organization/organization.service';
import { rentalContractService } from '@/services/rental-contract/rental-contract.service';
import { CreateOrderRequest } from '@/types/checkout/checkout.type';

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

    // Initial Data Fetch (Organization)
    useEffect(() => {
        const fetchOrgInfo = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;

                const user = authStorage.getUser();
                if (user?.organization_id) {
                    const org = await organizationService.getOrganizationById(token, user.organization_id);
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
                        setSession({ organization_id: user.organization_id });
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
    const handleCompanyChange = (data: CompanyData) => {
        setCompanyData(data);
    };

    // Handle representative info change
    const handleRepresentativeChange = (data: RepresentativeData) => {
        setRepresentativeData(data);
    };

    // Handle payment method change
    const handlePaymentMethodChange = (method: PaymentMethod) => {
        setSession({ payment_method: method });
    };

    // Handle order submission
    const handleSubmitOrder = async () => {
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Authentication required");

            let orgId = session.organization_id;

            // 1. Create Organization if needed
            if (!hasExistingOrg && !orgId) {
                const newOrg = await organizationService.createOrganization(token, {
                    ...companyData,
                    ...representativeData
                });
                orgId = newOrg.id;
            }

            if (!orgId) throw new Error("Missing organization ID");

            // 2. Prepare Order Data
            const payload: CreateOrderRequest = {
                organization_id: orgId,
                warehouse_template_id: session.warehouse_template_id || '',
                rental_type: session.rental_type || 'whole',
                row_template_ids: session.row_template_ids,
                duration_tier_id: session.duration_tier_id || '',
                started_at: session.start_date || new Date().toISOString(),
                addon_ids: session.addon_ids || [],
                insurance_id: session.insurance_id,
                coupon_code: session.coupon_code,
                payment_method: session.payment_method || 'sepay-qr',
            };

            // 3. Submit Order
            const result = await rentalContractService.createRentalContract(token, payload);

            // 4. Redirect to dashboard
            router.push(`/dashboard/customer/bookings/${result.id}`);

        } catch (error) {
            console.error('Failed to create order:', error);
            alert("Lỗi khi tạo đơn hàng. Vui lòng thử lại.");
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
                            <img src="/assets/GenHubv2.svg" alt="GenHub" className="h-8" />
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

                            {/* Step 5: Confirmation */}
                            <CheckoutStepContainer step="confirmation">
                                <OrderConfirmation
                                    onViewOrder={() => router.push('/dashboard/orders')}
                                    onDownloadInvoice={() => console.log('Download invoice')}
                                />
                            </CheckoutStepContainer>

                            {/* Navigation Buttons */}
                            {currentStep !== 'confirmation' && (
                                <CheckoutNavigation
                                    onSubmit={currentStep === 'payment' ? handleSubmitOrder : undefined}
                                    submitLabel="Xác nhận & Tạo đơn"
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
                let property: any = mockProperties[0]; // Fallback
                let warehouseAvailable = true;
                try {
                    // Try to fetch from public API
                    const res = await fetch(`${API}/public/warehouse-templates/${warehouseId}`);
                    if (res.ok) {
                        const data = await res.json();
                        property = data.data || data; // Adjust based on API response structure

                        // Check warehouse availability
                        if (property.is_rented === true || property.rental_status === 'RENTED' || property.rental_status === 'LOCKED') {
                            warehouseAvailable = false;
                        }
                    } else {
                        // Fallback to searching in mock if API fails (dev mode)
                        const mock = mockProperties.find(p => p.id === Number(warehouseId));
                        if (mock) property = mock;
                    }
                } catch (e) {
                    console.error("Error fetching warehouse", e);
                    const mock = mockProperties.find(p => p.id === Number(warehouseId));
                    if (mock) property = mock;
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
                        const res = await fetch(`${API}/public/rental-duration-tiers/${durationId}`);
                        if (res.ok) {
                            const data = await res.json();
                            durationTier = data.data || data;
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

                let addons: any[] = [];
                try {
                    const res = await fetch(`${API}/public/addons/active`);
                    if (res.ok) {
                        const data = await res.json();
                        const allAddons = data.data || data;
                        addons = allAddons.filter((a: any) => addonIds.includes(String(a.id)));
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
                    addons = [...addons, ...newMocks];
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
                const basePrice = Number(property.price) || 0;
                const durationMonths = durationTier?.duration_value || 1;

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
                let subtotal = totalBaseRental - durationDiscountAmount + addonsCost + insuranceCost + managementFee;

                const serviceFee = subtotal * 0.1; // 10%
                let couponDiscount = 0;
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
                    warehouse_name: property.name || property.title,
                    warehouse_details: {
                        address: property.address || property.location,
                        image: property.images?.[0] || property.image
                    },
                    rental_type: rentalType,
                    row_template_ids: rowIds,
                    row_details: rowIds.map(id => ({
                        id,
                        name: getFriendlyName(id)
                    })),
                    duration_tier_id: durationId || '',
                    duration_tier_name: durationTier?.name || `${durationMonths} Tháng`,
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
