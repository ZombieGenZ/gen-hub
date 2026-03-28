"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { InstancedMesh, Object3D, InstancedBufferAttribute } from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { io } from "socket.io-client";

export interface BinData {
  uid: string;
  position_xyz: { x: number; y: number; z: number };
  status: "Available" | "Reserved" | "Occupied" | "Maintenance" | string;
}

interface WarehouseInstancedBinsProps {
  data: BinData[];
}

const statusColors: Record<string, THREE.Color> = {
  Available: new THREE.Color("#4ade80"), // Xanh lá
  Reserved: new THREE.Color("#facc15"),  // Vàng
  Occupied: new THREE.Color("#f87171"),  // Đỏ
  Maintenance: new THREE.Color("#9ca3af"), // Xám
};

export const WarehouseInstancedBins: React.FC<WarehouseInstancedBinsProps> = ({ data }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummyObj = useMemo(() => new Object3D(), []);
  
  // Custom Shader Uniforms
  const uniforms = useRef({ time: { value: 0 } });

  // Pop-up State (Dùng cho HTML Overlay)
  const [popupInfo, setPopupInfo] = useState<{ x: number, y: number, z: number, uid: string, details: any } | null>(null);

  // Khởi tạo Ma trận, Màu sắc cơ bản và Cờ Nhấp Nháy (Glow Attribute)
  useEffect(() => {
    if (!meshRef.current || data.length === 0) return;

    // 1. Khởi tạo thuộc tính GLSL (isGlowing) riêng cho từng instance
    const glowArray = new Float32Array(data.length);
    glowArray.fill(0.0);
    meshRef.current.geometry.setAttribute('isGlowing', new InstancedBufferAttribute(glowArray, 1));

    // 2. Map dữ liệu vào Mesh
    data.forEach((bin, index) => {
      dummyObj.position.set(bin.position_xyz.x, bin.position_xyz.y, bin.position_xyz.z);
      dummyObj.updateMatrix();
      meshRef.current!.setMatrixAt(index, dummyObj.matrix);

      const color = statusColors[bin.status] || statusColors.Available;
      meshRef.current!.setColorAt(index, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [data, dummyObj]);

  // SOCKET.IO REAL-TIME SYNC
  useEffect(() => {
    // Thay cổng bằng NEXT_PUBLIC_SOCKET_URL thực tế của dự án
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000");

    socket.on("INVENTORY_UPDATED", (update: { bin_uid: string, status: string, is_new_inbound?: boolean }) => {
      const idx = data.findIndex(b => b.uid === update.bin_uid);
      if (idx !== -1 && meshRef.current) {
         // Cập nhật đổi màu mượt mà theo realtime không cần Re-render lại React Node
         const newColor = statusColors[update.status] || statusColors.Available;
         meshRef.current.setColorAt(idx, newColor);
         if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
         
         // Nếu là hàng mới cất vào, kích hoạt chớp sáng (Glow) trong 10 giây
         if (update.is_new_inbound) {
            const glowAttr = meshRef.current.geometry.getAttribute('isGlowing') as InstancedBufferAttribute;
            if (glowAttr) {
               glowAttr.setX(idx, 1.0); // Bật hiệu ứng Shader
               glowAttr.needsUpdate = true;
               
               setTimeout(() => {
                  glowAttr.setX(idx, 0.0); // Tắt Shader
                  glowAttr.needsUpdate = true;
               }, 10000);
            }
         }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [data]);

  // Đẩy thời gian trôi của 3D Engine xuống GPU Shader
  useFrame((state) => {
    uniforms.current.time.value = state.clock.elapsedTime;
  });

  // Ghi đè Shader Tùy biến (Custom Shader Chunk) để làm hiệu ứng nhấp nháy 
  const handleBeforeCompile = (shader: THREE.Shader) => {
    shader.uniforms.time = uniforms.current.time;
    // Đọc attribute 'isGlowing' từ Geometry
    shader.vertexShader = `
      attribute float isGlowing;
      varying float vGlowing;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
      vGlowing = isGlowing;`
    );
    
    // Pha trộn màu gốc với màu vàng phát sáng dựa theo dao động đồ thị Sin
    shader.fragmentShader = `
      uniform float time;
      varying float vGlowing;
      ${shader.fragmentShader}
    `.replace(
      `#include <dithering_fragment>`,
      `#include <dithering_fragment>
      if (vGlowing > 0.5) {
         float glowIntensity = (sin(time * 6.0) + 1.0) * 0.5; // Dao động từ 0 đến 1
         gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.8, 0.2), glowIntensity * 0.75); // Trộn màu vàng phát quang
      }`
    );
  };

  // Tương tác Click (Interactive)
  const handlePointerDown = async (e: any) => {
    e.stopPropagation(); // Cản xuyên thấu các Mesh xếp chồng sau lưng
    const instanceId = e.instanceId;
    if (instanceId === undefined) return;
    
    const bin = data[instanceId];
    if (bin) {
       // Trong thực tế, gọi Fetch API (vd: fetch('/api/bins/' + bin.uid))
       // Giả lập trả về DATA Mock
       const mockDetails = { 
           sku: "SKU-HÀNGXUẤT-01", 
           qty: 150, 
           timestamp: new Date().toLocaleTimeString() 
       };
       
       setPopupInfo({
           x: bin.position_xyz.x,
           y: bin.position_xyz.y + 1.5, // Nâng vị trí Pop-up cao lên một chút so với ngọn kệ
           z: bin.position_xyz.z,
           uid: bin.uid,
           details: mockDetails
       });
    }
  };

  if (!data || data.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, data.length]}
        onPointerDown={handlePointerDown}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1.2]} />
        <meshStandardMaterial onBeforeCompile={handleBeforeCompile} />
      </instancedMesh>

      {/* HTML OVERLAY TẠI TỌA ĐỘ 2D */}
      {popupInfo && (
        <Html 
          position={[popupInfo.x, popupInfo.y, popupInfo.z]} 
          center 
          distanceFactor={15} // Scale text khi zoom mượt mà
          zIndexRange={[100, 0]}
        >
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 w-56 transform -translate-y-full transition-all">
            <div className="flex justify-between items-center mb-2">
               <h3 className="font-bold text-slate-800 text-sm">{popupInfo.uid}</h3>
               <button 
                 onClick={() => setPopupInfo(null)}
                 className="text-slate-400 hover:text-red-500 rounded-full"
               >
                 ✕
               </button>
            </div>
            <div className="flex flex-col gap-1 text-xs text-slate-600">
               <div className="flex justify-between">
                 <span className="font-semibold">SKU:</span>
                 <span className="text-teal-600 font-bold">{popupInfo.details.sku}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-semibold">S.Lượng:</span>
                 <span>{popupInfo.details.qty}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-semibold">Cập nhật lúc:</span>
                 <span>{popupInfo.details.timestamp}</span>
               </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
