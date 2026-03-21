"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, CheckCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { DigitalSignatureModal } from '@/components/contract/DigitalSignatureModal';
import { CheckoutSession } from '@/types/checkout/checkout.type';

import { OrderService } from '@/services/order/order.service';
import { authStorage } from '@/services/auth/auth-storage.service';

export default function ContractSigningPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [contractSession, setContractSession] = useState<Partial<CheckoutSession> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                
                const orderService = new OrderService();
                const order = await orderService.getOrderById(token, orderId);
                
                const session: Partial<CheckoutSession> = {
                    warehouse_template_id: order.warehouse_template_id,
                    warehouse_name: order.warehouse_name,
                    rental_type: order.rental_type,
                    duration_tier_id: order.duration_tier_id,
                    duration_months: order.duration_months,
                    start_date: order.started_at,
                    organization_id: order.organization_id,
                    quotation: order.quotation,
                    deposit_amount: order.payment_info?.amount || Math.max(2000000, (order.quotation?.grandTotal || 0) * 0.1)
                };
                setContractSession(session);
            } catch (err) {
                console.error("Failed to load order:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [signatureSuccess, setSignatureSuccess] = useState(false);
    const [signatureData, setSignatureData] = useState<string>('');
    const [signedAt, setSignedAt] = useState<Date | null>(null);

    // Mock Representative Data (would come from order/org data)
    const representativeName = "Nguyễn Văn A";
    const representativePhone = "0901234567";
    const companyName = "CÔNG TY TNHH GENHUB TEST";

    const handleSignContract = async (sigData: string) => {
        setIsSigning(true);

        // Simulating API call for digital signature
        setTimeout(() => {
            setIsSigning(false);
            setIsSignatureModalOpen(false);
            setSignatureData(sigData);
            setSignedAt(new Date());
            setSignatureSuccess(true);
        }, 2000);
    };

    const handleBackToDashboard = () => {
        router.push('/dashboard/organization');
    };

    const handleDownloadPDF = () => {
        // TODO: Generate and download signed contract PDF
        // Downloading logic
        alert("PDF sẽ được tải xuống trong giây lát...");
    };

    if (isLoading || !contractSession) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">Đang tải hợp đồng...</div>;
    }

    if (signatureSuccess) {
        return (
            <div className="min-h-screen bg-slate-50">
                {/* Success Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={handleBackToDashboard}>
                                <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
                            </Button>
                            <div>
                                <h1 className="font-bold text-slate-900">Hợp đồng đã ký</h1>
                                <p className="text-xs text-slate-500">Đơn hàng #{orderId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={handleDownloadPDF}>
                                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                Tải hợp đồng PDF
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Success Banner */}
                <div className="bg-green-50 border-b border-green-200">
                    <div className="max-w-5xl mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-green-800">Ký hợp đồng thành công!</h2>
                                <p className="text-sm text-green-700">
                                    Hợp đồng số <span className="font-bold">HĐ-2025/{orderId}</span> đã được ký kết.
                                    Một bản sao đã gửi đến email của bạn.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signed Contract Preview */}
                <main className="max-w-5xl mx-auto py-8 px-4">
                    <ContractPreview
                        session={contractSession}
                        contractCode={`HĐ-2025/${orderId}`}
                        companyName={companyName}
                        representativeName={representativeName}
                        signatureData={signatureData}
                        signedAt={signedAt || undefined}
                    />

                    {/* Next Steps */}
                    <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4">Các bước tiếp theo</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Thanh toán phần còn lại</p>
                                <p className="font-bold text-slate-800">
                                    {((contractSession.quotation?.grandTotal || 0) - (contractSession.deposit_amount || 0)).toLocaleString('vi-VN')}₫
                                </p>
                                <Button
                                    className="mt-3 w-full bg-[#0F766E] hover:bg-[#0D655D]"
                                    onClick={() => router.push('/dashboard/organization/payments')}
                                >
                                    Thanh toán ngay
                                </Button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Xem tất cả đơn hàng</p>
                                <p className="font-bold text-slate-800">Quản lý đơn thuê kho</p>
                                <Button
                                    variant="outline"
                                    className="mt-3 w-full"
                                    onClick={handleBackToDashboard}
                                >
                                    Về trang quản lý
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
                        </Button>
                        <div>
                            <h1 className="font-bold text-slate-900">Ký Hợp đồng Dịch vụ</h1>
                            <p className="text-xs text-slate-500">Đơn hàng #{orderId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="hidden sm:flex">
                            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                            Tải bản nháp PDF
                        </Button>
                        <Button
                            className="bg-[#0F766E] hover:bg-[#0D655D]"
                            onClick={() => setIsSignatureModalOpen(true)}
                        >
                            Ký hợp đồng ngay
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto py-8 px-4">
                <div className="mb-6 flex items-center justify-between">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 max-w-3xl">
                        <div className="mt-0.5">⚠️</div>
                        <p>
                            Vui lòng xem lại kỹ các điều khoản trong hợp đồng trước khi ký.
                            Sau khi ký, hợp đồng sẽ có hiệu lực pháp lý và không thể thay đổi.
                        </p>
                    </div>
                </div>

                {/* Contract Viewer */}
                <ContractPreview
                    session={contractSession}
                    contractCode={`HĐ-2025/${orderId}`}
                    companyName={companyName}
                    representativeName={representativeName}
                />
            </main>

            {/* Signature Modal */}
            <DigitalSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSign={handleSignContract}
                isSigning={isSigning}
                representativeName={representativeName}
                representativePhone={representativePhone}
            />
        </div>
    );
}
