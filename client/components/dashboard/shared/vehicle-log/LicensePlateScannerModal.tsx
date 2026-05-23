"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { VehicleLogService } from "@/services/vehicle-log/vehicle-log.service";

const vehicleLogService = new VehicleLogService();

type ScanState = "idle" | "scanning" | "loading" | "result" | "error";

interface VehicleInfo {
    vehicle_type?: string;
    vehicle_color?: string;
    plate_format?: string;
    condition_flags?: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    onResult: (plate: string, imageUrl: string, vehicleInfo?: VehicleInfo) => void;
}

const CONDITION_FLAG_LABELS: Record<string, string> = {
    dirty_plate: "Biển số bẩn",
    low_light: "Ánh sáng yếu",
    partial_occlusion: "Biển số bị che khuất",
    blurry: "Ảnh mờ",
    damage_visible: "Có dấu hiệu hư hỏng",
    no_vehicle: "Không phát hiện xe",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
    TRUCK: "Xe tải",
    CAR: "Ô tô",
    MOTORCYCLE: "Xe máy",
    CONTAINER: "Xe container",
    VAN: "Xe van",
    OTHER: "Khác",
};

export function LicensePlateScannerModal({ open, onClose, onResult }: Props) {
    const [scanState, setScanState] = useState<ScanState>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [detectedPlate, setDetectedPlate] = useState("");
    const [confidence, setConfidence] = useState(0);
    const [previewSrc, setPreviewSrc] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({});

    // Auto-scan state
    const [autoScanMode, setAutoScanMode] = useState(false);
    const [liveResult, setLiveResult] = useState<{ plate: string; confidence: number } | null>(null);
    const [isAutoScanning, setIsAutoScanning] = useState(false);
    const consecutiveHitsRef = useRef(0);
    const autoScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopCamera();
            clearAutoScanTimer();
        };
    }, []);

    useEffect(() => {
        if (!open) {
            stopCamera();
            clearAutoScanTimer();
            setScanState("idle");
            setErrorMsg("");
            setDetectedPlate("");
            setPreviewSrc("");
            setImageUrl("");
            setVehicleInfo({});
            setLiveResult(null);
            setAutoScanMode(false);
            setIsAutoScanning(false);
            consecutiveHitsRef.current = 0;
        }
    }, [open]);

    // Run auto-scan loop when enabled and scanning
    useEffect(() => {
        if (autoScanMode && scanState === "scanning") {
            scheduleNextScan();
        } else {
            clearAutoScanTimer();
            setIsAutoScanning(false);
        }
        return () => clearAutoScanTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoScanMode, scanState]);

    const clearAutoScanTimer = () => {
        if (autoScanTimerRef.current) {
            clearTimeout(autoScanTimerRef.current);
            autoScanTimerRef.current = null;
        }
    };

    const scheduleNextScan = useCallback(() => {
        clearAutoScanTimer();
        autoScanTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                runQuickScan();
            }
        }, 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const captureBlob = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!videoRef.current || !canvasRef.current) return resolve(null);
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(video, 0, 0);
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
        });
    }, []);

    const runQuickScan = useCallback(async () => {
        if (!isMountedRef.current || scanState !== "scanning") return;
        setIsAutoScanning(true);
        try {
            const blob = await captureBlob();
            if (!blob || !isMountedRef.current) return;

            const token = authStorage.getAccessToken();
            if (!token) return;

            const formData = new FormData();
            formData.append("image", blob, "plate.jpg");
            const result = await vehicleLogService.ocrPlateQuick(token, formData);

            if (!isMountedRef.current) return;
            setLiveResult({ plate: result.license_plate, confidence: result.confidence });

            if (result.confidence >= 0.85 && result.license_plate) {
                consecutiveHitsRef.current += 1;
                if (consecutiveHitsRef.current >= 2) {
                    // Auto-confirm: take a full scan
                    clearAutoScanTimer();
                    setIsAutoScanning(false);
                    await captureAndOcr();
                    return;
                }
            } else {
                consecutiveHitsRef.current = 0;
            }
        } catch {
            // Ignore quick-scan errors silently
        } finally {
            if (isMountedRef.current && scanState === "scanning" && autoScanMode) {
                scheduleNextScan();
            }
            setIsAutoScanning(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [captureBlob, scanState, autoScanMode]);

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
            consecutiveHitsRef.current = 0;
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

        stopCamera();
        setScanState("loading");

        const blob = await captureBlob();
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
            setVehicleInfo({
                vehicle_type: result.vehicle_type,
                vehicle_color: result.vehicle_color,
                plate_format: result.plate_format,
                condition_flags: result.condition_flags,
            });
            setScanState("result");
        } catch {
            if (!isMountedRef.current) return;
            setErrorMsg("OCR thất bại. Vui lòng thử lại hoặc nhập thủ công.");
            setScanState("error");
        }
    }, [stopCamera, captureBlob]);

    const handleConfirm = useCallback(() => {
        onResult(detectedPlate, imageUrl, vehicleInfo);
        onClose();
    }, [detectedPlate, imageUrl, vehicleInfo, onResult, onClose]);

    const handleRetry = useCallback(() => {
        setPreviewSrc("");
        setDetectedPlate("");
        setImageUrl("");
        setVehicleInfo({});
        setLiveResult(null);
        consecutiveHitsRef.current = 0;
        setScanState("idle");
    }, []);

    if (!open) return null;

    const warningFlags = vehicleInfo.condition_flags?.filter(
        (f) => f !== "no_vehicle" && CONDITION_FLAG_LABELS[f]
    ) ?? [];

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

                            {/* Auto-scan toggle on idle */}
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <span className="text-muted-foreground">Tự động quét</span>
                                <button
                                    role="switch"
                                    aria-checked={autoScanMode}
                                    onClick={() => setAutoScanMode((v) => !v)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        autoScanMode ? "bg-primary" : "bg-muted"
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                        autoScanMode ? "translate-x-[18px]" : "translate-x-0.5"
                                    }`} />
                                </button>
                            </label>

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
                                {/* Targeting frame */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className={`border-2 rounded-md w-3/4 h-1/3 transition-colors ${
                                        liveResult && liveResult.confidence >= 0.85 ? "border-green-400" : "border-white/70"
                                    }`} />
                                </div>
                                {/* Auto-scan indicator */}
                                {autoScanMode && (
                                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isAutoScanning ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
                                        Auto
                                    </div>
                                )}
                            </div>

                            {/* Live result bar */}
                            {autoScanMode && liveResult && (
                                <div className="border rounded-lg px-3 py-2 bg-muted/30 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Nhận diện trực tiếp</span>
                                        <span>{Math.round(liveResult.confidence * 100)}%</span>
                                    </div>
                                    <p className="text-base font-bold tracking-widest text-center">
                                        {liveResult.plate || <span className="text-muted-foreground font-normal text-sm">Chưa phát hiện...</span>}
                                    </p>
                                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                liveResult.confidence >= 0.85 ? "bg-green-500" :
                                                liveResult.confidence >= 0.5 ? "bg-yellow-500" : "bg-red-400"
                                            }`}
                                            style={{ width: `${Math.round(liveResult.confidence * 100)}%` }}
                                        />
                                    </div>
                                    {liveResult.confidence >= 0.85 && (
                                        <p className="text-xs text-green-600 text-center">Chất lượng tốt — đang chờ xác nhận...</p>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                                {/* Auto-scan toggle in scanning mode */}
                                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                    <span className="text-muted-foreground">Tự động</span>
                                    <button
                                        role="switch"
                                        aria-checked={autoScanMode}
                                        onClick={() => {
                                            setAutoScanMode((v) => !v);
                                            consecutiveHitsRef.current = 0;
                                            setLiveResult(null);
                                        }}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            autoScanMode ? "bg-primary" : "bg-muted"
                                        }`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                            autoScanMode ? "translate-x-[18px]" : "translate-x-0.5"
                                        }`} />
                                    </button>
                                </label>

                                <button
                                    onClick={captureAndOcr}
                                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Chụp ngay
                                </button>
                            </div>

                            {autoScanMode && (
                                <p className="text-xs text-center text-muted-foreground">
                                    Tự động chụp khi độ tin cậy ≥ 85% trong 2 lần liên tiếp
                                </p>
                            )}
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
                                <span className="text-sm text-muted-foreground">Đang phân tích hình ảnh...</span>
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

                            {/* Condition warnings */}
                            {warningFlags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {warningFlags.map((f) => (
                                        <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                            ⚠ {CONDITION_FLAG_LABELS[f]}
                                        </span>
                                    ))}
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
                                            confidence >= 0.8 ? "bg-green-500" :
                                            confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                                        }`}
                                        style={{ width: `${Math.round(confidence * 100)}%` }}
                                    />
                                </div>

                                {/* Vehicle intelligence badges */}
                                {(vehicleInfo.vehicle_type || vehicleInfo.vehicle_color) && (
                                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                                        {vehicleInfo.vehicle_type && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                {VEHICLE_TYPE_LABELS[vehicleInfo.vehicle_type] ?? vehicleInfo.vehicle_type}
                                            </span>
                                        )}
                                        {vehicleInfo.vehicle_color && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                                                {vehicleInfo.vehicle_color}
                                            </span>
                                        )}
                                    </div>
                                )}
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
