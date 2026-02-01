"use client";

import React, { useState } from 'react';
import { useCheckout } from './CheckoutWizard';
import { Button } from '@/components/ui/button';
import { DigitalSignatureModal } from '@/components/contract/DigitalSignatureModal';
import { ContractPreview } from '@/components/contract/ContractPreview';
import { PencilSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { convertCheckoutToContract } from '@/lib/contract.utils';

interface ContractSignatureStepProps {
    companyData: {
        name: string;
        international_name?: string;
        tax_code: string;
        headquarters_address: string;
        invoice_address?: string;
    };
    representativeData: {
        representative_name: string;
        representative_title: string;
        representative_phone: string;
        representative_email: string;
    };
    onSignatureComplete: (signatureData: string) => void;
}

export function ContractSignatureStep({
    companyData,
    representativeData,
    onSignatureComplete
}: ContractSignatureStepProps) {
    const { session } = useCheckout();
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    // Generate contract code
    const contractCode = `HĐ-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    // Handle signature completion
    const handleSignContract = async (signatureData: string) => {
        setIsSigning(true);

        // Simulate signature processing
        setTimeout(() => {
            setIsSigning(false);
            setIsSignatureModalOpen(false);

            // Store signature in session
            onSignatureComplete(signatureData);
        }, 1500);
    };

    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold mb-1">Vui lòng xem kỹ nội dung hợp đồng trước khi ký</p>
                    <p>Sau khi ký, hợp đồng sẽ có hiệu lực pháp lý và không thể thay đổi.</p>
                </div>
            </div>

            {/* Contract Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h2 className="font-bold text-slate-900">Xem trước hợp đồng</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Hợp đồng dịch vụ thuê kho bãi • {contractCode}
                    </p>
                </div>

                <div className="p-6">
                    <ContractPreview
                        session={session}
                        contractCode={contractCode}
                        companyName={companyData.name}
                        representativeName={representativeData.representative_name}
                    />
                </div>
            </div>

            {/* Sign Button */}
            <div className="flex justify-end gap-3 pt-4">
                <Button
                    size="lg"
                    className="bg-[#0F766E] hover:bg-[#0D655D] h-12 px-8 rounded-xl font-bold"
                    onClick={() => setIsSignatureModalOpen(true)}
                >
                    <PencilSquareIcon className="w-5 h-5 mr-2" />
                    Ký hợp đồng ngay
                </Button>
            </div>

            {/* Signature Modal */}
            <DigitalSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSign={handleSignContract}
                isSigning={isSigning}
                representativeName={representativeData.representative_name}
                representativePhone={representativeData.representative_phone}
            />
        </div>
    );
}
