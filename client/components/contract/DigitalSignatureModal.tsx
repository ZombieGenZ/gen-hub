"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ShieldCheckIcon,
    PencilSquareIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface DigitalSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureData: string) => void;
    isSigning: boolean;
    representativeName: string;
    representativePhone: string;
}

type SignatureStep = 'review' | 'signature' | 'success';
type SignatureMethod = 'draw' | 'type';

export function DigitalSignatureModal({
    isOpen,
    onClose,
    onSign,
    isSigning,
    representativeName,
    representativePhone
}: DigitalSignatureModalProps) {
    // Steps state
    const [step, setStep] = useState<SignatureStep>('review');
    const [agreed, setAgreed] = useState(false);

    // Signature state
    const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>('draw');
    const [typedSignature, setTypedSignature] = useState(representativeName);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('review');
            setAgreed(false);
            setSignatureMethod('draw');
            setTypedSignature(representativeName);
            setSignatureDataUrl('');
        }
    }, [isOpen, representativeName]);

    // Initialize canvas
    useEffect(() => {
        if (step === 'signature' && signatureMethod === 'draw') {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Set canvas size
                    const rect = canvas.getBoundingClientRect();
                    canvas.width = rect.width * 2;
                    canvas.height = rect.height * 2;
                    ctx.scale(2, 2);

                    // Set drawing styles
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Clear canvas with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
    }, [step, signatureMethod]);

    // Canvas drawing handlers
    const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }, []);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawingRef.current = true;
        const coords = getCanvasCoords(e);
        lastPosRef.current = coords;
    }, [getCanvasCoords]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawingRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const coords = getCanvasCoords(e);

        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        lastPosRef.current = coords;
    }, [getCanvasCoords]);

    const stopDrawing = useCallback(() => {
        isDrawingRef.current = false;
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setSignatureDataUrl('');
    }, []);

    const saveSignature = useCallback(() => {
        if (signatureMethod === 'draw') {
            const canvas = canvasRef.current;
            if (canvas) {
                const dataUrl = canvas.toDataURL('image/png');
                setSignatureDataUrl(dataUrl);
                return dataUrl;
            }
        } else {
            // For typed signature, generate canvas with text
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'italic 32px "Dancing Script", cursive, serif';
                ctx.fillStyle = '#1e293b';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
                const dataUrl = canvas.toDataURL('image/png');
                setSignatureDataUrl(dataUrl);
                return dataUrl;
            }
        }
        return '';
    }, [signatureMethod, typedSignature]);

    // Step handlers
    const handleProceedToSignature = () => {
        setStep('signature');
    };

    const handleProceedToSign = () => {
        const sigData = saveSignature();
        if (!sigData && signatureMethod === 'draw') {
            // Check if canvas has been drawn
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Simple check: see if there's non-white content
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const hasContent = imageData.data.some((val, idx) => {
                        // Check non-alpha channels for non-white pixels
                        if (idx % 4 === 3) return false;
                        return val !== 255;
                    });
                    if (!hasContent) {
                        alert('Vui lòng vẽ chữ ký trước khi tiếp tục.');
                        return;
                    }
                }
            }
        }
        
        // Skip OTP step and sign directly
        if (sigData) {
            onSign(sigData);
        }
    };

    const isSignatureValid = signatureMethod === 'type'
        ? typedSignature.trim().length >= 2
        : !!signatureDataUrl || isDrawingRef.current;

    const getStepTitle = () => {
        switch (step) {
            case 'review': return 'Xác nhận ký hợp đồng';
            case 'signature': return 'Tạo chữ ký điện tử';
            case 'success': return 'Ký hợp đồng thành công';
        }
    };

    const getStepDescription = () => {
        switch (step) {
            case 'review': return 'Vui lòng xác nhận bạn đã đọc và đồng ý với các điều khoản.';
            case 'signature': return 'Vẽ hoặc nhập chữ ký của bạn để xác nhận.';
            case 'success': return 'Hợp đồng đã được ký thành công!';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className={cn(
                        "mx-auto p-3 rounded-full mb-2 transition-colors",
                        step === 'success' ? "bg-green-100" : "bg-teal-100"
                    )}>
                        {step === 'success' ? (
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        ) : (
                            <ShieldCheckIcon className="w-8 h-8 text-[#0F766E]" />
                        )}
                    </div>
                    <DialogTitle className="text-center text-xl">
                        {getStepTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {getStepDescription()}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Review Terms */}
                {step === 'review' && (
                    <div className="space-y-6 pt-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 space-y-2 border border-slate-100">
                            <div className="flex justify-between">
                                <span>Người ký:</span>
                                <span className="font-bold">{representativeName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Phương thức:</span>
                                <span className="font-bold text-[#0F766E]">Ký điện tử GenHub</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Thời gian:</span>
                                <span>{new Date().toLocaleString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <Checkbox
                                id="terms"
                                checked={agreed}
                                onCheckedChange={(c) => setAgreed(c as boolean)}
                                className="mt-0.5"
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-relaxed cursor-pointer text-slate-700"
                            >
                                Tôi xác nhận đã đọc, hiểu rõ và đồng ý với toàn bộ các điều khoản trong hợp đồng thuê kho bãi này.
                            </Label>
                        </div>
                    </div>
                )}

                {/* Step 2: Signature */}
                {step === 'signature' && (
                    <div className="space-y-4 pt-4">
                        <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as SignatureMethod)}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="draw">Vẽ chữ ký</TabsTrigger>
                                <TabsTrigger value="type">Nhập chữ ký</TabsTrigger>
                            </TabsList>

                            <TabsContent value="draw" className="mt-4">
                                <div className="relative">
                                    <canvas
                                        ref={canvasRef}
                                        className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl bg-white cursor-crosshair touch-none"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 text-slate-500 hover:text-red-500"
                                        onClick={clearCanvas}
                                    >
                                        <TrashIcon className="w-4 h-4 mr-1" />
                                        Xóa
                                    </Button>
                                    <p className="text-xs text-slate-400 text-center mt-2">
                                        Sử dụng chuột hoặc ngón tay để vẽ chữ ký
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="type" className="mt-4">
                                <div className="space-y-3">
                                    <Input
                                        value={typedSignature}
                                        onChange={(e) => setTypedSignature(e.target.value)}
                                        placeholder="Nhập tên của bạn"
                                        className="text-center text-lg"
                                    />
                                    <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white flex items-center justify-center">
                                        <span
                                            className="text-3xl text-slate-700 italic"
                                            style={{ fontFamily: '"Dancing Script", cursive, serif' }}
                                        >
                                            {typedSignature || 'Chữ ký của bạn'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center">
                                        Chữ ký sẽ hiển thị với phông chữ đặc biệt
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="sm:justify-center pt-4">
                    {step === 'review' && (
                        <div className="flex gap-3 w-full">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>
                                Hủy bỏ
                            </Button>
                            <Button
                                className="flex-1 h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] font-bold"
                                disabled={!agreed}
                                onClick={handleProceedToSignature}
                            >
                                <PencilSquareIcon className="w-5 h-5 mr-2" />
                                Tiến hành ký
                            </Button>
                        </div>
                    )}

                    {step === 'signature' && (
                        <div className="flex gap-3 w-full">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl"
                                onClick={() => setStep('review')}
                                disabled={isSigning}
                            >
                                Quay lại
                            </Button>
                            <Button
                                className="flex-1 h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] font-bold"
                                onClick={handleProceedToSign}
                                disabled={isSigning}
                            >
                                {isSigning ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Đang xử lý...
                                    </span>
                                ) : "Xác nhận & Ký số"}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
