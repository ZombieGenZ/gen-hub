"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedItem, LayoutJson } from "@/services/bin-packing/bin-packing.types";

// ── Color palette for product items ──
const PRODUCT_COLORS = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
    "#06B6D4", "#E11D48", "#059669", "#D97706", "#7C3AED",
];

function getProductColor(productId: string, colorMap: Map<string, string>): string {
    if (!colorMap.has(productId)) {
        const idx = colorMap.size % PRODUCT_COLORS.length;
        colorMap.set(productId, PRODUCT_COLORS[idx]);
    }
    return colorMap.get(productId)!;
}

interface CargoItemProps {
    item: PlacedItem;
    color: string;
    containerScale: number;
    opacity: number;
}

function CargoItem({ item, color, containerScale, opacity }: CargoItemProps) {
    const s = containerScale;
    const x = (item.x + item.placed_length / 2) * s;
    const y = (item.z + item.placed_height / 2) * s; // Three.js Y = up = Z in our system
    const z = (item.y + item.placed_width / 2) * s;

    const w = item.placed_length * s;
    const h = item.placed_height * s;
    const d = item.placed_width * s;

    return (
        <group position={[x, y, z]}>
            <mesh>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial
                    color={color}
                    opacity={opacity}
                    transparent={opacity < 1}
                    roughness={0.6}
                    metalness={0.1}
                />
            </mesh>
            {/* Wireframe edges */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial color="#000000" opacity={0.3} transparent />
            </lineSegments>
        </group>
    );
}

interface ContainerBoxProps {
    length: number;
    width: number;
    height: number;
    containerScale: number;
}

function ContainerBox({ length, width, height, containerScale }: ContainerBoxProps) {
    const s = containerScale;
    const w = length * s;
    const h = height * s;
    const d = width * s;

    return (
        <group position={[w / 2, h / 2, d / 2]}>
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
                <lineBasicMaterial color="#64748B" opacity={0.8} transparent linewidth={2} />
            </lineSegments>
            {/* Translucent floor */}
            <mesh position={[0, -h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial color="#94A3B8" opacity={0.15} transparent side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}


export interface BinPackingViewerProps {
    layoutJson: LayoutJson;
    productNames?: Record<string, string>; // product_id -> name
    className?: string;
}

export function BinPackingViewer({ layoutJson, productNames = {}, className = "" }: BinPackingViewerProps) {
    const { container, placed } = layoutJson;

    // Scale everything so the largest dimension = 4 units in Three.js
    const maxDim = Math.max(container.length, container.width, container.height);
    const containerScale = 4 / maxDim;

    // Build color map
    const colorMap = new Map<string, string>();
    placed.forEach((item) => getProductColor(item.product_id, colorMap));

    // Build legend
    const legendEntries = Array.from(colorMap.entries()).map(([productId, color]) => ({
        productId,
        color,
        name: productNames[productId] || productId.slice(0, 8),
    }));

    // Camera position: slightly above and to the side
    const camDist = 4 * 2.5;

    return (
        <div className={`relative ${className}`}>
            <Canvas
                camera={{
                    position: [camDist, camDist * 0.8, camDist],
                    fov: 45,
                    near: 0.01,
                    far: 1000,
                }}
                style={{ background: "#F8FAFC" }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 10]} intensity={0.8} castShadow />
                <directionalLight position={[-5, 5, -5]} intensity={0.4} />

                <Suspense fallback={null}>
                    {/* Container wireframe */}
                    <ContainerBox
                        length={container.length}
                        width={container.width}
                        height={container.height}
                        containerScale={containerScale}
                    />

                    {/* Placed items */}
                    {placed.map((item, idx) => {
                        const color = colorMap.get(item.product_id) ?? "#94A3B8";
                        return (
                            <CargoItem
                                key={`${item.item_id}-${idx}`}
                                item={item}
                                color={color}
                                containerScale={containerScale}
                                opacity={0.85}
                            />
                        );
                    })}

                    {/* Grid helper at Y=0 */}
                    <gridHelper
                        args={[
                            Math.max(container.length, container.width) * containerScale * 1.5,
                            10,
                            "#CBD5E1",
                            "#E2E8F0",
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

            {/* Legend overlay */}
            {legendEntries.length > 0 && (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border rounded-xl p-3 max-w-[200px] max-h-[200px] overflow-y-auto shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sản phẩm</p>
                    <div className="space-y-1.5">
                        {legendEntries.map((entry) => (
                            <div key={entry.productId} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-slate-700 truncate">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Interaction hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                Kéo để xoay · Cuộn để zoom · Shift+Kéo để di chuyển
            </div>
        </div>
    );
}
