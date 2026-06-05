"use client";

import React, { Suspense, useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedItem, LayoutJson } from "@/services/bin-packing/bin-packing.types";

// ── Color palette ──────────────────────────────────────────────────────────
const PRODUCT_COLORS = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
    "#06B6D4", "#E11D48", "#059669", "#D97706", "#7C3AED",
];

function getProductColor(productId: string, colorMap: Map<string, string>): string {
    if (!colorMap.has(productId)) {
        colorMap.set(productId, PRODUCT_COLORS[colorMap.size % PRODUCT_COLORS.length]);
    }
    return colorMap.get(productId)!;
}

// ── Packaging method visual config ─────────────────────────────────────────
const PACKAGING_EDGE_COLORS: Record<string, string> = {
    FRAGILE:       "#EF4444",
    LIQUID:        "#3B82F6",
    OVERSIZED:     "#F59E0B",
    NON_STACKABLE: "#8B5CF6",
    STACKABLE:     "#10B981",
    STANDARD:      "#1E293B",
};

const PACKAGING_LABELS: Record<string, string> = {
    FRAGILE:       "Dễ vỡ",
    LIQUID:        "Chất lỏng",
    OVERSIZED:     "Cồng kềnh",
    NON_STACKABLE: "Không xếp chồng",
    STACKABLE:     "Xếp chồng được",
    STANDARD:      "Tiêu chuẩn",
};

// ── Hover info types ───────────────────────────────────────────────────────
interface HoverInfo {
    kind: "item" | "container";
    productName?: string;
    productId?: string;
    color?: string;
    itemId?: string;
    dimL?: number; dimW?: number; dimH?: number;
    posX?: number; posY?: number; posZ?: number;
    rotation?: number;
    packagingMethod?: string;
    stackable?: boolean;
    exportCode?: string;
    exportId?: string;
    isCurrentExport?: boolean;
    cL?: number; cW?: number; cH?: number;
    screenX: number;
    screenY: number;
}

// ── CargoItem with hover ───────────────────────────────────────────────────
interface CargoItemProps {
    item: PlacedItem;
    color: string;
    containerScale: number;
    opacity: number;
    productName: string;
    packagingMethod: string;
    exportCode?: string;
    isCurrentExport?: boolean;
    onHover: (info: React.SetStateAction<HoverInfo | null>) => void;
}

function CargoItem({ item, color, containerScale, opacity, productName, packagingMethod, exportCode, isCurrentExport, onHover }: CargoItemProps) {
    const s = containerScale;
    const x = (item.x + item.placed_length / 2) * s;
    const y = (item.z + item.placed_height / 2) * s;
    const z = (item.y + item.placed_width / 2) * s;
    const w = item.placed_length * s;
    const h = item.placed_height * s;
    const d = item.placed_width * s;

    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const edgeColor = PACKAGING_EDGE_COLORS[packagingMethod] ?? PACKAGING_EDGE_COLORS.STANDARD;
    const isSpecial = packagingMethod !== "STANDARD";

    useFrame(() => {
        if (!meshRef.current) return;
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        const target = hovered ? 0.35 : 0;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.15);
    });

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
        onHover({
            kind: "item",
            productName,
            productId: item.product_id,
            color,
            itemId: item.item_id,
            dimL: item.placed_length,
            dimW: item.placed_width,
            dimH: item.placed_height,
            posX: Math.round(item.x),
            posY: Math.round(item.y),
            posZ: Math.round(item.z),
            rotation: item.rotation,
            packagingMethod,
            stackable: item.stackable,
            exportCode,
            exportId: item.export_id,
            isCurrentExport,
            screenX: e.nativeEvent.clientX,
            screenY: e.nativeEvent.clientY,
        });
    }, [item, productName, color, packagingMethod, exportCode, isCurrentExport, onHover]);

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        onHover((prev) => prev ? { ...prev, screenX: e.nativeEvent.clientX, screenY: e.nativeEvent.clientY } : null);
    }, [onHover]);

    const handlePointerOut = useCallback(() => {
        setHovered(false);
        document.body.style.cursor = "auto";
        onHover(null);
    }, [onHover]);

    return (
        <group position={[x, y, z]}>
            <mesh
                ref={meshRef}
                onPointerOver={handlePointerOver}
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0}
                    opacity={hovered ? Math.min(1, opacity + 0.1) : opacity}
                    transparent={opacity < 1}
                    roughness={0.5}
                    metalness={0.15}
                />
            </mesh>
            {/* Wireframe edges — colored by packaging method */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial
                    color={hovered ? "#ffffff" : edgeColor}
                    opacity={hovered ? 0.9 : (isSpecial ? 0.7 : 0.25)}
                    transparent
                />
            </lineSegments>
        </group>
    );
}

// ── ContainerBox with hover ────────────────────────────────────────────────
interface ContainerBoxProps {
    length: number; width: number; height: number;
    containerScale: number;
    onHover: (info: React.SetStateAction<HoverInfo | null>) => void;
}

function ContainerBox({ length, width, height, containerScale, onHover }: ContainerBoxProps) {
    const s = containerScale;
    const w = length * s;
    const h = height * s;
    const d = width * s;
    const [hovered, setHovered] = useState(false);

    return (
        <group position={[w / 2, h / 2, d / 2]}>
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial color={hovered ? "#0ea5e9" : "#64748B"} opacity={hovered ? 1 : 0.8} transparent linewidth={2} />
            </lineSegments>
            <mesh
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = "pointer";
                    onHover({
                        kind: "container",
                        cL: length, cW: width, cH: height,
                        screenX: e.nativeEvent.clientX,
                        screenY: e.nativeEvent.clientY,
                    });
                }}
                onPointerMove={(e) => {
                    onHover((prev) => prev ? { ...prev, screenX: e.nativeEvent.clientX, screenY: e.nativeEvent.clientY } : null);
                }}
                onPointerOut={() => {
                    setHovered(false);
                    document.body.style.cursor = "auto";
                    onHover(null);
                }}
            >
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial transparent opacity={0} />
            </mesh>
            {/* Translucent floor */}
            <mesh position={[0, -h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial color="#94A3B8" opacity={0.12} transparent side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ── Hover Tooltip (DOM overlay) ────────────────────────────────────────────
const TOOLTIP_W_ITEM = 272;
const TOOLTIP_H_ITEM = 280;
const TOOLTIP_W_CTR  = 208;
const TOOLTIP_H_CTR  = 148;
const CURSOR_OFFSET   = 14;

function useTooltipPos(
    screenX: number,
    screenY: number,
    tooltipW: number,
    tooltipH: number,
    containerRef: React.RefObject<HTMLDivElement | null>,
) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { left: screenX + CURSOR_OFFSET, top: screenY + CURSOR_OFFSET };

    const cx = screenX - rect.left;
    const cy = screenY - rect.top;

    const canRight = cx + CURSOR_OFFSET + tooltipW <= rect.width - 4;
    const left = canRight
        ? cx + CURSOR_OFFSET
        : Math.max(4, cx - CURSOR_OFFSET - tooltipW);

    const canDown = cy + CURSOR_OFFSET + tooltipH <= rect.height - 4;
    const top = canDown
        ? cy + CURSOR_OFFSET
        : Math.max(4, cy - CURSOR_OFFSET - tooltipH);

    return { left, top };
}

function HoverTooltip({ info, containerRef }: { info: HoverInfo; containerRef: React.RefObject<HTMLDivElement | null> }) {
    const ROTATION_LABELS = ["Ngang (L×W×H)", "Xoay 90° trục Z", "Xoay ngang (L×H×W)"];
    const isItem = info.kind === "item";
    const { left, top } = useTooltipPos(
        info.screenX, info.screenY,
        isItem ? TOOLTIP_W_ITEM : TOOLTIP_W_CTR,
        isItem ? TOOLTIP_H_ITEM : TOOLTIP_H_CTR,
        containerRef,
    );

    const baseClass = "absolute pointer-events-none bg-slate-900/97 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 select-none";

    if (info.kind === "container") {
        const vol = ((info.cL! * info.cW! * info.cH!) / 1_000_000).toFixed(3);
        return (
            <div className={`${baseClass} z-50 p-4`} style={{ left, top, width: TOOLTIP_W_CTR }}>
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-700">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wider leading-none">Khoang xe</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Thùng chứa hàng</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <DimBox label="Dài" value={info.cL!} />
                    <DimBox label="Rộng" value={info.cW!} />
                    <DimBox label="Cao" value={info.cH!} />
                </div>
                <div className="flex justify-between items-center bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] text-slate-400">Tổng thể tích</span>
                    <span className="text-[12px] font-bold font-mono text-emerald-400">{vol} m³</span>
                </div>
            </div>
        );
    }

    const vol = ((info.dimL! * info.dimW! * info.dimH!) / 1_000_000).toFixed(4);
    const volLiters = ((info.dimL! * info.dimW! * info.dimH!) / 1000).toFixed(1);
    const rotLabel = ROTATION_LABELS[info.rotation ?? 0] ?? "—";
    const pkgMethod = info.packagingMethod ?? "STANDARD";
    const pkgLabel = PACKAGING_LABELS[pkgMethod] ?? pkgMethod;
    const pkgEdgeColor = PACKAGING_EDGE_COLORS[pkgMethod] ?? PACKAGING_EDGE_COLORS.STANDARD;
    const isOther = info.isCurrentExport === false;

    return (
        <div className={`${baseClass} z-50 overflow-hidden`} style={{ left, top, width: TOOLTIP_W_ITEM }}>
            {/* Export order badge (only in multi-order mode) */}
            {info.exportCode && (
                <div className={`px-3 pt-2.5 pb-2 flex items-center gap-2 border-b border-slate-700/60 ${
                    isOther ? "bg-slate-700/40" : "bg-violet-600/20"
                }`}>
                    <svg className="w-3 h-3 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className={`text-[11px] font-mono font-bold ${isOther ? "text-slate-400" : "text-violet-300"}`}>
                        {info.exportCode}
                    </span>
                    {!isOther && (
                        <span className="ml-auto text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-medium">
                            Đơn này
                        </span>
                    )}
                    {isOther && (
                        <span className="ml-auto text-[9px] bg-slate-500/30 text-slate-400 px-1.5 py-0.5 rounded-full">
                            Đơn khác
                        </span>
                    )}
                </div>
            )}

            <div className="p-3.5 space-y-3">
                {/* Product header */}
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-lg shrink-0 shadow-inner ring-1 ring-white/10"
                        style={{ backgroundColor: info.color, opacity: isOther ? 0.5 : 0.9 }}
                    />
                    <div className="min-w-0">
                        <p className={`text-[12px] font-bold truncate leading-tight ${isOther ? "text-slate-400" : "text-white"}`}>
                            {info.productName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{info.itemId?.slice(0, 16)}…</p>
                    </div>
                </div>

                {/* Packaging method row */}
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: pkgEdgeColor }} />
                    <span className="text-[11px] font-semibold flex-1" style={{ color: pkgEdgeColor }}>{pkgLabel}</span>
                    {info.stackable === false && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                            Không xếp chồng
                        </span>
                    )}
                    {info.stackable === true && pkgMethod !== "STANDARD" && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">
                            Xếp được
                        </span>
                    )}
                </div>

                {/* Dimensions */}
                <div>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Kích thước đặt (cm)</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        <DimBox label="Dài" value={info.dimL!} />
                        <DimBox label="Rộng" value={info.dimW!} />
                        <DimBox label="Cao" value={info.dimH!} />
                    </div>
                </div>

                {/* Position in container */}
                <div>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Vị trí trong xe (cm)</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        <DimBox label="X" value={info.posX!} unit="" accent="blue" />
                        <DimBox label="Y" value={info.posY!} unit="" accent="blue" />
                        <DimBox label="Z ↑" value={info.posZ!} unit="" accent="blue" />
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-800/60 rounded-xl px-2.5 py-2">
                    <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">Thể tích</p>
                        <p className="text-[11px] font-mono font-bold text-emerald-400">
                            {volLiters} <span className="text-[9px] font-normal text-slate-500">lít</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-500 mb-0.5">Hướng xếp</p>
                        <p className="text-[10px] text-amber-300 font-medium leading-tight">{rotLabel}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-400">{label}</span>
            <span className={`font-mono font-medium ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</span>
        </div>
    );
}

function DimBox({ label, value, unit = " cm", accent }: { label: string; value: number; unit?: string; accent?: "blue" }) {
    const valColor = accent === "blue" ? "text-sky-300" : "text-white";
    return (
        <div className="bg-slate-800/80 rounded-lg px-1.5 py-2 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider leading-none mb-1">{label}</p>
            <p className={`font-mono font-bold text-[12px] leading-none ${valColor}`}>{value}<span className="text-[9px] font-normal text-slate-500 ml-0.5">{unit}</span></p>
        </div>
    );
}

// ── Main Viewer ────────────────────────────────────────────────────────────
export interface BinPackingViewerProps {
    layoutJson: LayoutJson;
    productNames?: Record<string, string>;
    algorithmUsed?: string;
    /** Khi xem chế độ xe tổng hợp: highlight đơn này, các đơn khác xám */
    currentExportId?: string;
    className?: string;
}

const EXPORT_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#06B6D4",
];

export function BinPackingViewer({ layoutJson, productNames = {}, algorithmUsed, currentExportId, className = "" }: BinPackingViewerProps) {
    const { container, placed } = layoutJson;
    const isAiOptimized = algorithmUsed?.includes("+ai") ?? false;
    const isMultiOrder = placed.some((p) => p.export_id);
    const containerRef = useRef<HTMLDivElement>(null);

    const maxDim = Math.max(container.length, container.width, container.height);
    const containerScale = 4 / maxDim;

    // Export color map — scoped to current placed[]
    const exportColorMap = useMemo(() => {
        const map = new Map<string, string>();
        placed.forEach((item) => {
            if (item.export_id && !map.has(item.export_id)) {
                map.set(item.export_id, EXPORT_COLORS[map.size % EXPORT_COLORS.length]);
            }
        });
        return map;
    }, [placed]);

    // Color by product (single-order mode)
    const colorMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!isMultiOrder) {
            placed.forEach((item) => getProductColor(item.product_id, map));
        }
        return map;
    }, [placed, isMultiOrder]);

    // Collect packaging methods present (exclude STANDARD for legend brevity)
    const packagingMethodsPresent = useMemo(() => {
        const set = new Set<string>();
        placed.forEach((item) => {
            const m = item.packaging_method ?? "STANDARD";
            set.add(m);
        });
        return set;
    }, [placed]);

    const maxZ = placed.length > 0 ? Math.max(...placed.map((p) => p.z)) : 1;

    const legendEntries = isMultiOrder
        ? Array.from(exportColorMap.entries()).map(([exportId, color]) => {
            const summary = layoutJson.export_summary?.find((s) => s.export_id === exportId);
            return {
                key: exportId,
                color,
                name: summary?.export_code ?? exportId.slice(0, 8),
                isCurrent: exportId === currentExportId,
            };
          })
        : Array.from(colorMap.entries()).map(([productId, color]) => ({
            key: productId,
            color,
            name: productNames[productId] || productId.slice(0, 8),
            isCurrent: true,
          }));

    const camDist = 4 * 2.5;
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

    const handleHover = useCallback((info: React.SetStateAction<HoverInfo | null>) => {
        setHoverInfo(info);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <Canvas
                camera={{ position: [camDist, camDist * 0.8, camDist], fov: 45, near: 0.01, far: 1000 }}
                style={{ background: "#F8FAFC" }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 10]} intensity={0.8} castShadow />
                <directionalLight position={[-5, 5, -5]} intensity={0.4} />

                <Suspense fallback={null}>
                    <ContainerBox
                        length={container.length}
                        width={container.width}
                        height={container.height}
                        containerScale={containerScale}
                        onHover={handleHover}
                    />

                    {placed.map((item, idx) => {
                        const baseColor = isMultiOrder && item.export_id
                            ? (exportColorMap.get(item.export_id) ?? "#94A3B8")
                            : (colorMap.get(item.product_id) ?? "#94A3B8");

                        // When currentExportId is set: highlight that export, gray out all others
                        const isOtherExport = isMultiOrder && !!currentExportId && item.export_id !== currentExportId;
                        const isCurrentExp = !isOtherExport;

                        const color = isOtherExport ? "#94A3B8" : baseColor;

                        const layerRatio = maxZ > 0 ? item.z / maxZ : 0;
                        const baseOpacity = isAiOptimized
                            ? Math.max(0.60, 0.92 - layerRatio * 0.25)
                            : 0.85;
                        const opacity = isOtherExport ? 0.22 : baseOpacity;

                        // productName in tooltip — only product name, export code separate
                        const label = productNames[item.product_id] || item.product_id.slice(0, 8);

                        const packagingMethod = item.packaging_method ?? "STANDARD";

                        return (
                            <CargoItem
                                key={`${item.item_id}-${idx}`}
                                item={item}
                                color={color}
                                containerScale={containerScale}
                                opacity={opacity}
                                productName={label}
                                packagingMethod={packagingMethod}
                                exportCode={item.export_code}
                                isCurrentExport={isCurrentExp}
                                onHover={handleHover}
                            />
                        );
                    })}

                    <gridHelper
                        args={[
                            Math.max(container.length, container.width) * containerScale * 1.5,
                            10, "#CBD5E1", "#E2E8F0",
                        ]}
                        position={[
                            (container.length * containerScale) / 2,
                            -0.002,
                            (container.width * containerScale) / 2,
                        ]}
                    />
                </Suspense>

                <OrbitControls
                    makeDefault
                    minDistance={1}
                    maxDistance={50}
                    enablePan={true}
                    target={[
                        (container.length * containerScale) / 2,
                        (container.height * containerScale) / 2,
                        (container.width * containerScale) / 2,
                    ]}
                />
            </Canvas>

            {/* Hover tooltip */}
            {hoverInfo && <HoverTooltip info={hoverInfo} containerRef={containerRef} />}

            {/* AI badge */}
            {isAiOptimized && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-violet-600/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-full shadow-md">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Optimized
                </div>
            )}

            {/* Legend panel */}
            {(legendEntries.length > 0 || packagingMethodsPresent.size > 0) && (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border rounded-xl p-3 max-w-[220px] max-h-[320px] overflow-y-auto shadow-sm">
                    {/* Product / Export legend */}
                    {legendEntries.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                {isMultiOrder ? "Phiếu xuất" : "Sản phẩm"}
                            </p>
                            <div className="space-y-1.5">
                                {legendEntries.map((entry) => (
                                    <div
                                        key={entry.key}
                                        className={`flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
                                            entry.isCurrent && isMultiOrder
                                                ? "bg-primary/8 ring-1 ring-primary/30"
                                                : ""
                                        }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-sm shrink-0"
                                            style={{
                                                backgroundColor: entry.color,
                                                opacity: (!isMultiOrder || entry.isCurrent) ? 1 : 0.35,
                                            }}
                                        />
                                        <span className={`text-xs truncate ${
                                            entry.isCurrent && isMultiOrder
                                                ? "text-slate-900 font-semibold"
                                                : "text-slate-500"
                                        }`}>
                                            {entry.name}
                                            {entry.isCurrent && isMultiOrder && (
                                                <span className="ml-1 text-[9px] text-primary font-medium">(đang xem)</span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Packaging method legend */}
                    {packagingMethodsPresent.size > 0 && (
                        <div className={legendEntries.length > 0 ? "mt-2.5 pt-2.5 border-t" : ""}>
                            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Cách đóng gói</p>
                            <div className="space-y-1.5">
                                {Array.from(packagingMethodsPresent).map((method) => (
                                    <div key={method} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-sm shrink-0 border"
                                            style={{
                                                borderColor: PACKAGING_EDGE_COLORS[method] ?? "#1E293B",
                                                backgroundColor: `${PACKAGING_EDGE_COLORS[method] ?? "#1E293B"}22`,
                                            }}
                                        />
                                        <span className="text-[11px] text-slate-600">
                                            {PACKAGING_LABELS[method] ?? method}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI layer hint */}
                    {isAiOptimized && (
                        <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <div className="flex gap-0.5">
                                    <div className="w-3 h-3 rounded-sm bg-slate-400 opacity-95" />
                                    <div className="w-3 h-3 rounded-sm bg-slate-400 opacity-70" />
                                    <div className="w-3 h-3 rounded-sm bg-slate-400 opacity-50" />
                                </div>
                                Tầng dưới → trên
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Layer info */}
            {isAiOptimized && placed.length > 0 && (
                <div className="absolute bottom-10 left-3 bg-white/85 backdrop-blur-sm border rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 shadow-sm">
                    <span className="font-semibold text-violet-600">AI</span>
                    {" "}sắp xếp {placed.length} kiện · độ trong giảm = tầng cao hơn
                </div>
            )}

            {/* Interaction hint */}
            {!hoverInfo && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Hover để xem chi tiết · Kéo để xoay · Cuộn để zoom
                </div>
            )}
        </div>
    );
}
