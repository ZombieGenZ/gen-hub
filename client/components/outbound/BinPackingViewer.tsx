"use client";

import React, { Suspense, useRef, useState, useCallback } from "react";
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

// ── Hover info types ───────────────────────────────────────────────────────
interface HoverInfo {
    kind: "item" | "container";
    // item fields
    productName?: string;
    productId?: string;
    color?: string;
    itemId?: string;
    dimL?: number; dimW?: number; dimH?: number;
    posX?: number; posY?: number; posZ?: number;
    rotation?: number;
    // container fields
    cL?: number; cW?: number; cH?: number;
    // screen position
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
    onHover: (info: HoverInfo | null) => void;
}

function CargoItem({ item, color, containerScale, opacity, productName, onHover }: CargoItemProps) {
    const s = containerScale;
    const x = (item.x + item.placed_length / 2) * s;
    const y = (item.z + item.placed_height / 2) * s;
    const z = (item.y + item.placed_width / 2) * s;
    const w = item.placed_length * s;
    const h = item.placed_height * s;
    const d = item.placed_width * s;

    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Smooth emissive glow on hover
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
            screenX: e.nativeEvent.clientX,
            screenY: e.nativeEvent.clientY,
        });
    }, [item, productName, color, onHover]);

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
            {/* Wireframe edges — brighter when hovered */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial color={hovered ? "#ffffff" : "#000000"} opacity={hovered ? 0.8 : 0.25} transparent />
            </lineSegments>
        </group>
    );
}

// ── ContainerBox with hover ────────────────────────────────────────────────
interface ContainerBoxProps {
    length: number; width: number; height: number;
    containerScale: number;
    onHover: (info: HoverInfo | null) => void;
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
            {/* Invisible mesh for hover detection */}
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
const TOOLTIP_W_ITEM = 248;
const TOOLTIP_H_ITEM = 210;
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

    // cursor relative to canvas
    const cx = screenX - rect.left;
    const cy = screenY - rect.top;

    // Choose horizontal side: prefer right, flip left if not enough room
    const canRight = cx + CURSOR_OFFSET + tooltipW <= rect.width - 4;
    const left = canRight
        ? cx + CURSOR_OFFSET
        : Math.max(4, cx - CURSOR_OFFSET - tooltipW);

    // Choose vertical: prefer below cursor, flip above if not enough room
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
            <div
                className={`${baseClass} z-50 p-4`}
                style={{ left, top, width: TOOLTIP_W_CTR }}
            >
                {/* Header */}
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
                {/* Dims */}
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

    // Item tooltip
    const vol = ((info.dimL! * info.dimW! * info.dimH!) / 1_000_000).toFixed(4);
    const rotLabel = ROTATION_LABELS[info.rotation ?? 0] ?? "—";

    return (
        <div
            className={`${baseClass} z-50 p-4`}
            style={{ left, top, width: TOOLTIP_W_ITEM }}
        >
            {/* Header: color swatch + product name */}
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-slate-700">
                <div
                    className="w-8 h-8 rounded-lg shrink-0 shadow-inner"
                    style={{ backgroundColor: info.color, opacity: 0.9 }}
                />
                <div className="min-w-0">
                    <p className="text-[12px] font-bold text-white truncate leading-tight">{info.productName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{info.itemId?.slice(0, 12)}…</p>
                </div>
            </div>

            {/* Dimensions row */}
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Kích thước đặt</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
                <DimBox label="Dài" value={info.dimL!} />
                <DimBox label="Rộng" value={info.dimW!} />
                <DimBox label="Cao" value={info.dimH!} />
            </div>

            {/* Position row */}
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Góc đặt trong xe</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
                <DimBox label="X" value={info.posX!} unit="" accent="blue" />
                <DimBox label="Y" value={info.posY!} unit="" accent="blue" />
                <DimBox label="Z (tầng)" value={info.posZ!} unit="" accent="blue" />
            </div>

            {/* Stats */}
            <div className="space-y-1.5 bg-slate-800/60 rounded-xl px-2.5 py-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Thể tích</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">{vol} m³</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Hướng xếp</span>
                    <span className="text-[10px] text-amber-300 font-medium">{rotLabel}</span>
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

// Export-level color palette (khi multi-order mode)
const EXPORT_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#06B6D4",
];
const exportColorMap = new Map<string, string>();
function getExportColor(exportId: string): string {
    if (!exportColorMap.has(exportId)) {
        exportColorMap.set(exportId, EXPORT_COLORS[exportColorMap.size % EXPORT_COLORS.length]);
    }
    return exportColorMap.get(exportId)!;
}

export function BinPackingViewer({ layoutJson, productNames = {}, algorithmUsed, currentExportId, className = "" }: BinPackingViewerProps) {
    const { container, placed } = layoutJson;
    const isAiOptimized = algorithmUsed?.includes("+ai") ?? false;
    // Multi-order mode: khi các items có export_id
    const isMultiOrder = placed.some((p) => p.export_id);
    const containerRef = useRef<HTMLDivElement>(null);

    const maxDim = Math.max(container.length, container.width, container.height);
    const containerScale = 4 / maxDim;

    // Color logic: multi-order → color by export, single → color by product
    const colorMap = new Map<string, string>();
    placed.forEach((item) => {
        if (isMultiOrder && item.export_id) {
            getExportColor(item.export_id);
        } else {
            getProductColor(item.product_id, colorMap);
        }
    });

    const maxZ = placed.length > 0 ? Math.max(...placed.map((p) => p.z)) : 1;

    // Legend: multi-order → per export, single → per product
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

    // Shared hover state — lifted out of Canvas so DOM overlay can read it
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

    // Stable callback so child components don't re-render on every mouse move
    const handleHover = useCallback((info: HoverInfo | null | ((prev: HoverInfo | null) => HoverInfo | null)) => {
        setHoverInfo(typeof info === "function" ? info : info);
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
                        // Multi-order: màu theo đơn hàng; single: màu theo sản phẩm
                        const baseColor = isMultiOrder && item.export_id
                            ? getExportColor(item.export_id)
                            : (colorMap.get(item.product_id) ?? "#94A3B8");

                        // Highlight logic
                        const isOtherExport = isMultiOrder && currentExportId && item.export_id !== currentExportId;
                        const color = isOtherExport ? "#94A3B8" : baseColor;

                        const layerRatio = maxZ > 0 ? item.z / maxZ : 0;
                        const baseOpacity = isAiOptimized
                            ? Math.max(0.60, 0.92 - layerRatio * 0.25)
                            : 0.85;
                        const opacity = isOtherExport ? 0.25 : baseOpacity;

                        const label = isMultiOrder && item.export_code
                            ? `${item.export_code} — ${productNames[item.product_id] || item.product_id.slice(0, 8)}`
                            : (productNames[item.product_id] || item.product_id.slice(0, 8));

                        return (
                            <CargoItem
                                key={`${item.item_id}-${idx}`}
                                item={item}
                                color={color}
                                containerScale={containerScale}
                                opacity={opacity}
                                productName={label}
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

            {/* Legend */}
            {legendEntries.length > 0 && (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border rounded-xl p-3 max-w-[210px] max-h-[240px] overflow-y-auto shadow-sm">
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

            {/* Interaction hint — ẩn khi đang hover để không che tooltip */}
            {!hoverInfo && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Hover để xem chi tiết · Kéo để xoay · Cuộn để zoom
                </div>
            )}
        </div>
    );
}
