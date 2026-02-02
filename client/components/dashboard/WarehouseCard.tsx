// components/warehouse/WarehouseCard.tsx
'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Warehouse } from '@/types/warehoue_template/warehouse_template.type' // Make sure to import the correct type

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash } from "lucide-react"

interface WarehouseCardProps {
    warehouse: Warehouse
    onEdit?: (warehouse: Warehouse) => void
    onDelete?: (warehouse: Warehouse) => void
}

export function WarehouseCard({ warehouse, onEdit, onDelete }: WarehouseCardProps) {
    const router = useRouter()
    const PLACEHOLDER = 'https://pos.nvncdn.com/8bbc53-108873/art/artCT/20230720_DHTlXEUa.jpg';
    const hasImages = warehouse.images && warehouse.images.length > 0;
    const [imageUrl, setImageUrl] = useState<string>(hasImages ? (warehouse.images?.[0]?.url ?? PLACEHOLDER) : PLACEHOLDER);
    const [isLoading, setIsLoading] = useState(hasImages);

    useEffect(() => {
        if (!hasImages) {
            setIsLoading(false);
            setImageUrl(PLACEHOLDER);
            return;
        }
        const url = warehouse.images![0].url;
        setImageUrl(url);
        setIsLoading(true);
        fetch(url, { method: 'HEAD' })
            .then((res) => {
                if (res.ok) setImageUrl(url);
                else setImageUrl(PLACEHOLDER);
            })
            .catch(() => setImageUrl(PLACEHOLDER))
            .finally(() => setIsLoading(false));
    }, [warehouse.id, hasImages, warehouse.images?.[0]?.url]);

    return (
        <div
            className="bg-white rounded-lg shadow-premium border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group flex flex-col h-full cursor-pointer"
            onClick={() => router.push(`/dashboard/admin/warehouses/${warehouse.id}`)}
        >
            <div className="relative h-64 overflow-hidden rounded-t-lg bg-slate-100">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 animate-pulse" />
                ) : (
                    <Image
                        src={imageUrl || PLACEHOLDER}
                        alt={warehouse.name || 'Warehouse image'}
                        fill
                        className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={() => setImageUrl(PLACEHOLDER)}
                    />
                )}
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${warehouse.is_active ? 'bg-success/90 text-white' : 'bg-warning/90 text-white'
                            }`}
                    >
                        {warehouse.is_active ? 'Hoạt động' : 'Bảo trì'}
                    </span>
                    {(onEdit || onDelete) && (
                         <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm backdrop-blur-sm transition-all">
                                  <MoreVertical className="h-3 w-3 text-slate-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(warehouse)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                )}
                                {onDelete && (
                                  <DropdownMenuItem onClick={() => onDelete(warehouse)} className="text-red-600 focus:text-red-600">
                                    <Trash className="mr-2 h-4 w-4" />
                                    Xóa
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-3">
                    <h3
                        className="font-bold text-slate-900 text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1"
                        title={warehouse.name}
                    >
                        {warehouse.name}
                    </h3>
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">
                        #{warehouse.id.substring(0, 8).toUpperCase()}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <i className="fas fa-map-marker-alt text-brand"></i>
                    <span
                        className="text-sm font-medium truncate"
                        title={`${warehouse.ward?.name}, ${warehouse.ward?.province?.name}`}
                    >
                        {warehouse.ward?.name}, {warehouse.ward?.province?.name}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                            <i className="fas fa-ruler-combined text-slate-400"></i> Diện tích
                        </div>
                        <div className="font-bold text-slate-900 text-base">
                            {new Intl.NumberFormat('vi-VN').format(warehouse.length * warehouse.width)} m²
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                            <i className="fas fa-boxes text-slate-400"></i> Sức chứa (Est)
                        </div>
                        <div className="font-bold text-slate-900 text-base">
                            {Math.floor(warehouse.length * warehouse.width * 1.5)} pallets
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold ring-2 ring-white shadow-sm">
                            {warehouse.created_by ? warehouse.created_by.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Quản lý kho</span>
                    </div>
                </div>
            </div>
        </div>
    )
}