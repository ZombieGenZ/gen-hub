"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { VehicleLogService } from "@/services/vehicle-log/vehicle-log.service";

const vehicleLogService = new VehicleLogService();

type ScanState = "idle" | "scanning" | "loading" | "result" | "error";

interface Props {
    open: boolean;
    onClose: () => void;
    onResult: (plate: string, imageUrl: string) => void;
}

export function LicensePlateScannerModal({ open, onClose, onResult }: Props) {
    const [scanState, setScanState] = useState<ScanState>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [detectedPlate, setDetectedPlate] = useState("");
    const [confidence, setConfidence] = useState(0);
    const [previewSrc, setPreviewSrc] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (!open) {
            stopCamera();
            setScanState("idle");
            setErrorMsg("");
            setDetectedPlate("");
            setPreviewSrc("");
            setImageUrl("");
        }
    }, [open]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setErrorMsg("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
            });

            if (!isMountedRef.current) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScanState("scanning");
        } catch (err: unknown) {
            if (!isMountedRef.current) return;
            const name = (err as { name?: string }).name;
            if (name === "NotAllowedError") {
                setErrorMsg("Quyền camera bị từ chối. Vui lòng cho phép truy cập camera.");
            } else if (name === "NotFoundError") {
                setErrorMsg("Không tìm thấy camera. Vui lòng kiểm tra thiết bị.");
            } else {
                setErrorMsg("Không thể mở camera. Vui lòng thử lại.");
            }
            setScanState("error");
        }
    }, []);

    const captureAndOcr = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        stopCamera();
        setScanState("loading");

        canvas.toBlob(async (blob) => {
            if (!blob || !isMountedRef.current) return;

            const objectUrl = URL.createObjectURL(blob);
            setPreviewSrc(objectUrl);

            try {
                const token = authStorage.getAccessToken();
                if (!token) throw new Error("Chưa đăng nhập");

                const formData = new FormData();
                formData.append("image", blob, "plate.jpg");

                const result = await vehicleLogService.ocrPlate(token, formData);

                if (!isMountedRef.current) return;
                setDetectedPlate(result.license_plate);
                setConfidence(result.confidence);
                setImageUrl(result.image_url);
                setScanState("result");
            } catch {
                if (!isMountedRef.current) return;
                setErrorMsg("OCR thất bại. Vui lòng thử lại hoặc nhập thủ công.");
                setScanState("error");
            }
        }, "image/jpeg", 0.9);
    }, [stopCamera]);

    const handleConfirm = useCallback(() => {
        onResult(detectedPlate, imageUrl);
        onClose();
    }, [detectedPlate, imageUrl, onResult, onClose]);

    const handleRetry = useCallback(() => {
        setPreviewSrc("");
        setDetectedPlate("");
        setImageUrl("");
        setScanState("idle");
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">Quét biển số xe</h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground text-xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* idle */}
                    {scanState === "idle" && (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                                Mở camera để chụp ảnh biển số xe
                            </p>
                            <button
                                onClick={startCamera}
                                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Mở camera
                            </button>
                        </div>
                    )}

                    {/* scanning */}
                    {scanState === "scanning" && (
                        <div className="space-y-3">
                            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    playsInline
                                    muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="border-2 border-white/70 rounded-md w-3/4 h-1/3" />
                                </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Đặt biển số vào khung trắng và nhấn Chụp
                            </p>
                            <button
                                onClick={captureAndOcr}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Chụp ảnh
                            </button>
                        </div>
                    )}

                    {/* loading */}
                    {scanState === "loading" && (
                        <div className="space-y-3">
                            {previewSrc && (
                                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                                    <img src={previewSrc} alt="preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-2 py-2">
                                <svg className="animate-spin w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm text-muted-foreground">Đang nhận diện biển số...</span>
                            </div>
                        </div>
                    )}

                    {/* result */}
                    {scanState === "result" && (
                        <div className="space-y-3">
                            {previewSrc && (
                                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                                    <img src={previewSrc} alt="preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Biển số phát hiện</span>
                                    <span className="text-xs text-muted-foreground">
                                        Độ tin cậy: {Math.round(confidence * 100)}%
                                    </span>
                                </div>
                                <p className="text-xl font-bold tracking-widest text-center">
                                    {detectedPlate || <span className="text-muted-foreground text-sm font-normal">Không phát hiện được</span>}
                                </p>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            confidence >= 0.8
                                                ? "bg-green-500"
                                                : confidence >= 0.5
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                        }`}
                                        style={{ width: `${Math.round(confidence * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 py-2 border border-input rounded-lg text-sm hover:bg-muted/50 transition-colors"
                                >
                                    Chụp lại
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!detectedPlate}
                                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    )}

                    {/* error */}
                    {scanState === "error" && (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-center text-red-600">{errorMsg}</p>
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
