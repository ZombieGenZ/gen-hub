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
function HoverTooltip({ info, containerRef }: { info: HoverInfo; containerRef: React.RefObject<HTMLDivElement | null> }) {
    const ROTATION_LABELS = ["Ngang (L×W×H)", "Xoay 90° trục Z", "Xoay ngang (L×H×W)"];

    const rect = containerRef.current?.getBoundingClientRect();
    const rawX = info.screenX - (rect?.left ?? 0);
    const rawY = info.screenY - (rect?.top ?? 0);
    const containerW = rect?.width ?? 600;
    const containerH = rect?.height ?? 400;

    // Flip tooltip to stay within canvas bounds
    const flipX = rawX > containerW * 0.6;
    const flipY = rawY > containerH * 0.6;
    const left = flipX ? rawX - 220 : rawX + 16;
    const top  = flipY ? rawY - (info.kind === "item" ? 200 : 130) : rawY + 16;

    if (info.kind === "container") {
        const vol = ((info.cL! * info.cW! * info.cH!) / 1_000_000).toFixed(3);
        return (
            <div
                className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl p-3.5 w-52 border border-slate-700"
                style={{ left, top }}
            >
                <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Khoang xe
                </p>
                <div className="space-y-1.5 text-[11px]">
                    <Row label="Dài" value={`${info.cL} cm`} />
                    <Row label="Rộng" value={`${info.cW} cm`} />
                    <Row label="Cao" value={`${info.cH} cm`} />
                    <div className="border-t border-slate-700 my-1.5" />
                    <Row label="Thể tích" value={`${vol} m³`} highlight />
                </div>
            </div>
        );
    }

    const vol = ((info.dimL! * info.dimW! * info.dimH!) / 1_000_000).toFixed(4);
    return (
        <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl p-3.5 w-60 border border-slate-700"
            style={{ left, top }}
        >
            {/* Product name header */}
            <div className="flex items-center gap-2 mb-2.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: info.color }} />
                <p className="text-[12px] font-bold truncate text-white">{info.productName}</p>
            </div>

            <div className="space-y-1.5 text-[11px]">
                {/* Dimensions */}
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kích thước</p>
                <div className="grid grid-cols-3 gap-1">
                    <DimBox label="Dài" value={info.dimL!} />
                    <DimBox label="Rộng" value={info.dimW!} />
                    <DimBox label="Cao" value={info.dimH!} />
                </div>

                <div className="border-t border-slate-700 my-1.5" />

                {/* Position */}
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vị trí trong xe</p>
                <div className="grid grid-cols-3 gap-1">
                    <DimBox label="X" value={info.posX!} unit="" />
                    <DimBox label="Y" value={info.posY!} unit="" />
                    <DimBox label="Z" value={info.posZ!} unit="" />
                </div>

                <div className="border-t border-slate-700 my-1.5" />

                <Row label="Thể tích" value={`${vol} m³`} highlight />
                <Row label="Hướng xếp" value={ROTATION_LABELS[info.rotation ?? 0] ?? "—"} />
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

function DimBox({ label, value, unit = " cm" }: { label: string; value: number; unit?: string }) {
    return (
        <div className="bg-slate-800 rounded-lg px-2 py-1.5 text-center">
            <p className="text-[9px] text-slate-500 uppercase">{label}</p>
            <p className="font-mono font-bold text-white text-[11px]">{value}{unit}</p>
        </div>
    );
}

// ── Main Viewer ────────────────────────────────────────────────────────────
export interface BinPackingViewerProps {
    layoutJson: LayoutJson;
    productNames?: Record<string, string>;
    algorithmUsed?: string;
    className?: string;
}

export function BinPackingViewer({ layoutJson, productNames = {}, algorithmUsed, className = "" }: BinPackingViewerProps) {
    const { container, placed } = layoutJson;
    const isAiOptimized = algorithmUsed?.includes("+ai") ?? false;
    const containerRef = useRef<HTMLDivElement>(null);

    const maxDim = Math.max(container.length, container.width, container.height);
    const containerScale = 4 / maxDim;

    const colorMap = new Map<string, string>();
    placed.forEach((item) => getProductColor(item.product_id, colorMap));

    const maxZ = placed.length > 0 ? Math.max(...placed.map((p) => p.z)) : 1;

    const legendEntries = Array.from(colorMap.entries()).map(([productId, color]) => ({
        productId, color,
        name: productNames[productId] || productId.slice(0, 8),
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
                        const color = colorMap.get(item.product_id) ?? "#94A3B8";
                        const layerRatio = maxZ > 0 ? item.z / maxZ : 0;
                        const opacity = isAiOptimized
                            ? Math.max(0.60, 0.92 - layerRatio * 0.25)
                            : 0.85;
                        return (
                            <CargoItem
                                key={`${item.item_id}-${idx}`}
                                item={item}
                                color={color}
                                containerScale={containerScale}
                                opacity={opacity}
                                productName={productNames[item.product_id] || item.product_id.slice(0, 8)}
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
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border rounded-xl p-3 max-w-[200px] max-h-[220px] overflow-y-auto shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sản phẩm</p>
                    <div className="space-y-1.5">
                        {legendEntries.map((entry) => (
                            <div key={entry.productId} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs text-slate-700 truncate">{entry.name}</span>
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

            {/* Interaction hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                Hover để xem chi tiết · Kéo để xoay · Cuộn để zoom
            </div>
        </div>
    );
}
