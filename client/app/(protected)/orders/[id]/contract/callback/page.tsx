"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';

export default function DocusignCallbackPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = params.id as string;
    const event = searchParams.get('event');

    const [status, setStatus] = useState<'loading' | 'success' | 'cancel' | 'error'>('loading');

    useEffect(() => {
        if (event === 'signing_complete') {
            setStatus('success');
        } else if (event === 'cancel') {
            setStatus('cancel');
        } else {
            setStatus('error');
        }
    }, [event]);

    const handleContinue = () => {
        router.push(`/orders/${orderId}/contract`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                        <p className="text-slate-600">Đang xử lý kết quả từ DocuSign...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircleIcon className="w-12 h-12 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Ký kết thành công!</h1>
                            <p className="text-slate-600">Hợp đồng của bạn đã được DocuSign xác nhận hoàn tất.</p>
                        </div>
                        <Button className="w-full bg-teal-700 hover:bg-teal-800" onClick={handleContinue}>
                            Tiếp tục
                        </Button>
                    </div>
                )}

                {status === 'cancel' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                            <XCircleIcon className="w-12 h-12 text-yellow-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Đã hủy ký</h1>
                            <p className="text-slate-600">Bạn đã hủy quá trình ký hợp đồng trên DocuSign.</p>
                        </div>
                        <Button className="w-full" variant="outline" onClick={handleContinue}>
                            Quay lại hợp đồng
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <XCircleIcon className="w-12 h-12 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Có lỗi xảy ra</h1>
                            <p className="text-slate-600">Chúng tôi không thể xác nhận trạng thái ký từ DocuSign.</p>
                        </div>
                        <Button className="w-full" variant="outline" onClick={handleContinue}>
                            Quay lại thử lại
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
