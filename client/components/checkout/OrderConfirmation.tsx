"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCheckout } from './CheckoutWizard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircleIcon,
    DocumentArrowDownIcon,
    QrCodeIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    ClipboardDocumentIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { CreateOrderResponse } from '@/types/checkout/checkout.type';
import { cn } from '@/lib/utils';
import { contractTemplateService } from '@/services/contract/contract-template.service';
import { convertCheckoutToContract } from '@/lib/contract.utils';
import { paymentService } from '@/services/payment/payment.service';
import { formatCurrencyFull } from '@/lib/format-currency';

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
    const [qrExpired, setQrExpired] = useState(false);

    const contractCode = session.contract_code || orderResponse?.order_code || '—';
    // Ưu tiên số tiền thực tế từ SePay (lưu sau khi tạo hợp đồng), fallback về ước tính từ quotation
    const depositAmount =
        session.deposit_amount
        ?? session.quotation?.depositAmount
        ?? Math.round((session.quotation?.grandTotal ?? 0) * 0.1)
        ?? 0;
    const qrUrl = session.payment_qr_url;
    const paymentCode = session.payment_code;

    // Poll real payment status
    const checkPaymentStatus = useCallback(async () => {
        if (!paymentCode) return;
        try {
            const data = await paymentService.getPaymentByCode(paymentCode);
            if (data.status === 'PAID') {
                setPaymentStatus('paid');
            } else if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
                setQrExpired(true);
            }
        } catch {
            // Silently ignore — will retry on next poll
        }
    }, [paymentCode]);

    // Auto poll every 10 seconds while payment is pending
    useEffect(() => {
        if (paymentStatus === 'paid' || qrExpired || !paymentCode) return;

        // Immediate first check
        checkPaymentStatus();

        const interval = setInterval(checkPaymentStatus, 10_000);
        return () => clearInterval(interval);
    }, [paymentStatus, qrExpired, paymentCode, checkPaymentStatus]);

    // QR expiry countdown (from session.payment_expired_at)
    useEffect(() => {
        if (!session.payment_expired_at || paymentStatus === 'paid') return;
        const expiry = new Date(session.payment_expired_at).getTime();

        const tick = () => {
            if (Date.now() >= expiry) setQrExpired(true);
        };
        tick();
        const t = setInterval(tick, 5_000);
        return () => clearInterval(t);
    }, [session.payment_expired_at, paymentStatus]);

    const handleCopyPaymentCode = () => {
        if (!paymentCode) return;
        navigator.clipboard.writeText(paymentCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCheckPayment = async () => {
        setIsCheckingPayment(true);
        try {
            await checkPaymentStatus();
        } finally {
            setIsCheckingPayment(false);
        }
    };

    const handleDownloadContract = async () => {
        if (!companyData || !representativeData) {
            alert('Thiếu thông tin công ty hoặc người đại diện');
            return;
        }

        setIsGeneratingContract(true);
        try {
            const contractData = convertCheckoutToContract({
                session,
                company: companyData,
                representative: representativeData,
                order_id: contractCode,
            });

            const result = await contractTemplateService.generateContract(contractData);
            if (result.success && result.contract_blob) {
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

    return (
        <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleSolidIcon className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Đã gửi yêu cầu giữ chỗ!</h2>
                <p className="text-slate-500 mt-2">
                    Mã hợp đồng:{' '}
                    <span className="font-bold text-[#0F766E]">{contractCode}</span>
                </p>
            </div>

            <Separator />

            {/* Payment Status Banner */}
            <div
                className={cn(
                    'rounded-xl p-4 border',
                    paymentStatus === 'paid'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                )}
            >
                <div className="flex items-center gap-3">
                    {paymentStatus === 'paid' ? (
                        <>
                            <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
                            <div>
                                <p className="font-semibold text-green-800">Hợp đồng đã ký thành công!</p>
                                <p className="text-sm text-green-600">
                                    Hợp đồng điện tử đã được tạo và gửi qua email của bạn.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold text-amber-800">Chờ thanh toán cọc</p>
                                <p className="text-sm text-amber-600">
                                    Vui lòng thanh toán khoản cọc để xác nhận hợp đồng
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
                                    'Kiểm tra'
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

                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                        <h4 className="font-medium text-slate-700 mb-4">Quét mã QR để thanh toán</h4>

                        {/* QR Code */}
                        <div className="relative w-52 h-52 rounded-xl mx-auto flex items-center justify-center mb-4 overflow-hidden border border-slate-200">
                            {qrExpired ? (
                                <div className="flex flex-col items-center gap-2 text-slate-400 p-4">
                                    <ExclamationTriangleIcon className="w-10 h-10 text-amber-400" />
                                    <p className="text-sm font-medium text-amber-600">Mã QR đã hết hạn</p>
                                </div>
                            ) : qrUrl ? (
                                <Image
                                    src={qrUrl}
                                    alt="SePay QR Code"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                    <QrCodeIcon className="w-24 h-24" />
                                    <p className="text-xs text-slate-400">Đang tải mã QR...</p>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-slate-500">
                            Mở app ngân hàng hoặc ví điện tử và quét mã QR
                        </p>
                        <p className="text-xl font-bold text-[#0F766E] mt-2">
                            {formatCurrencyFull(depositAmount)}
                        </p>

                        {/* Payment code copy */}
                        {paymentCode && (
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className="text-sm text-slate-500">Mã thanh toán:</span>
                                <code className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {paymentCode}
                                </code>
                                <button
                                    onClick={handleCopyPaymentCode}
                                    className="p-1 rounded hover:bg-slate-100 transition-colors"
                                    title="Sao chép"
                                >
                                    {copied ? (
                                        <CheckIcon className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <ClipboardDocumentIcon className="w-4 h-4 text-slate-400" />
                                    )}
                                </button>
                            </div>
                        )}

                        {session.payment_expired_at && !qrExpired && (
                            <p className="text-xs text-slate-400 mt-2">
                                Mã QR có hiệu lực đến{' '}
                                {new Date(session.payment_expired_at).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Next Steps */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-slate-700">Các bước tiếp theo</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                    <li>Hoàn tất thanh toán đặt cọc qua mã QR bên trên</li>
                    <li>Nhận xác nhận hợp đồng qua email</li>
                    <li>Thanh toán phần còn lại khi nhận bàn giao kho</li>
                </ol>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() =>
                        session.contract_id
                            ? router.push(`/dashboard/organization/contracts/${session.contract_id}`)
                            : router.push('/dashboard')
                    }
                    disabled={!session.contract_id}
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
                    onClick={() => onViewOrder ? onViewOrder() : router.push('/dashboard')}
                >
                    Về Dashboard
                </Button>
            </div>
        </div>
    );
}

