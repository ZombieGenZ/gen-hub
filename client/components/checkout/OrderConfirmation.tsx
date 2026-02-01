"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckout } from './CheckoutWizard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircleIcon,
    DocumentArrowDownIcon,
    QrCodeIcon,
    ClipboardDocumentIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { CreateOrderResponse } from '@/types/checkout/checkout.type';
import { cn } from '@/lib/utils';
import { contractTemplateService } from '@/services/contract/contract-template.service';
import { convertCheckoutToContract } from '@/lib/contract.utils';

interface OrderConfirmationProps {
    orderResponse?: CreateOrderResponse;
    onDownloadInvoice?: () => void;
    onViewOrder?: () => void;
    companyData?: {
        name: string;
        international_name?: string;
        tax_code: string;
        headquarters_address: string;
        invoice_address?: string;
    };
    representativeData?: {
        name: string;
        title: string;
        phone: string;
        email: string;
    };
}

/**
 * Step 4: Xác nhận đơn hàng và hiển thị thông tin thanh toán
 */
export function OrderConfirmation({
    orderResponse,
    onDownloadInvoice,
    onViewOrder,
    companyData,
    representativeData
}: OrderConfirmationProps) {
    const router = useRouter();
    const { session } = useCheckout();
    const [copied, setCopied] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'paid'>('pending');
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [isGeneratingContract, setIsGeneratingContract] = useState(false);

    // Simulate payment status polling for SePay
    useEffect(() => {
        if (session.payment_method === 'sepay-qr' && paymentStatus !== 'paid') {
            const interval = setInterval(() => {
                // TODO: Call API to check payment status
                // For demo, auto-complete after 5 seconds
                setPaymentStatus('paid');
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [session.payment_method, paymentStatus]);

    const handleCopyContent = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCheckPayment = async () => {
        setIsCheckingPayment(true);
        // TODO: Call API to check payment
        setTimeout(() => {
            setIsCheckingPayment(false);
            setPaymentStatus('paid'); // Demo purpose
        }, 2000);
    };

    const handleDownloadContract = async () => {
        if (!companyData || !representativeData) {
            alert('Thiếu thông tin công ty hoặc người đại diện');
            return;
        }

        setIsGeneratingContract(true);
        try {
            // Convert checkout data to contract format
            const contractData = convertCheckoutToContract({
                session,
                company: companyData,
                representative: representativeData,
                order_id: orderResponse?.order_code || mockOrderCode,
            });

            // Generate contract PDF
            const result = await contractTemplateService.generateContract(contractData);

            if (result.success && result.contract_blob) {
                // Download the contract
                const filename = `Hop-dong-${contractData.contract_code}.pdf`;
                contractTemplateService.downloadContract(result.contract_blob, filename);
            } else {
                throw new Error(result.error || 'Failed to generate contract');
            }
        } catch (error) {
            console.error('Contract generation error:', error);
            alert('Không thể tạo hợp đồng. Vui lòng thử lại sau.');
        } finally {
            setIsGeneratingContract(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `${Math.round(amount).toLocaleString('vi-VN')}₫`;
    };

    // Mock data for demo
    const mockOrderCode = orderResponse?.order_code || 'GH-2025-001234';
    const mockTransferContent = `GH2025001234 ${session.warehouse_name || 'THANH TOAN'}`;

    return (
        <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleSolidIcon className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Đã gửi yêu cầu giữ chỗ!
                </h2>
                <p className="text-slate-500 mt-2">
                    Mã đơn hàng: <span className="font-bold text-[#0F766E]">{mockOrderCode}</span>
                </p>
            </div>

            <Separator />

            {/* Payment Status */}
            <div className={cn(
                "rounded-xl p-4 border",
                paymentStatus === 'paid'
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
            )}>
                <div className="flex items-center gap-3">
                    {paymentStatus === 'paid' ? (
                        <>
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-800">Hợp đồng đã ký thành công!</p>
                                <p className="text-sm text-green-600">Đơn hàng đã được tạo và hợp đồng điện tử đã hoàn tất.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-semibold text-amber-800">Chờ thanh toán cọc</p>
                                <p className="text-sm text-amber-600">
                                    Vui lòng thanh toán khoản cọc giữ chỗ trong vòng 15 phút
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCheckPayment}
                                disabled={isCheckingPayment}
                                className="shrink-0"
                            >
                                {isCheckingPayment ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Kiểm tra"
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Instructions */}
            {paymentStatus !== 'paid' && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Hướng dẫn thanh toán</h3>

                    {/* SePay QR */}
                    {session.payment_method === 'sepay-qr' && (
                        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                            <h4 className="font-medium text-slate-700 mb-4">Quét mã QR để thanh toán</h4>
                            <div className="w-48 h-48 bg-slate-100 rounded-xl mx-auto flex items-center justify-center mb-4">
                                <QrCodeIcon className="w-24 h-24 text-slate-400" />
                                {/* TODO: Render actual QR code */}
                            </div>
                            <p className="text-sm text-slate-500">
                                Mở app ngân hàng hoặc ví điện tử và quét mã QR
                            </p>
                            <p className="text-lg font-bold text-[#0F766E] mt-2">
                                {formatCurrency(session.deposit_amount || 0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Mã QR có hiệu lực trong 15 phút
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Next Steps */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-slate-700">Các bước tiếp theo</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                    <li>Xem và lưu hợp đồng đã ký</li>
                    <li>Thanh toán phần còn lại khi nhận kho</li>
                    <li>Bàn giao kho theo lịch hẹn</li>
                </ol>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() => {
                        // Navigate to signed contract view
                        console.log('View signed contract');
                    }}
                >
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    Xem hợp đồng
                </Button>
                <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={handleDownloadContract}
                    disabled={isGeneratingContract || !companyData || !representativeData}
                >
                    {isGeneratingContract ? (
                        <>
                            <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                            Đang tạo...
                        </>
                    ) : (
                        <>
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                            Tải PDF
                        </>
                    )}
                </Button>
                <Button
                    className="h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D]"
                    onClick={() => {
                        if (onViewOrder) {
                            onViewOrder();
                        }
                    }}
                >
                    Xem đơn hàng
                </Button>
            </div>
        </div>
    );
}
