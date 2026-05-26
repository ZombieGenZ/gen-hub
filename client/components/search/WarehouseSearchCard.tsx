"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Property } from '@/data/mockProperties';
import { Heart, Star } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { cn, calculateDistance, HCM_CENTER } from "@/lib/utils";
import { TrustBadge } from "@/components/marketplace/TrustBadge";

interface WarehouseSearchCardProps {
    property: Property;
    onHover?: (id: number | string | null) => void;
    isHighlighted?: boolean;
}

export default function WarehouseSearchCard({ property, onHover, isHighlighted }: WarehouseSearchCardProps) {
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(false);

    const PLACEHOLDER_IMAGE = "/placeholder-warehouse.svg";
    const apiImages = (property.images || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(img => img.url);
    const images = apiImages.length > 0 ? apiImages : [
        property.image || PLACEHOLDER_IMAGE,
    ];


    return (
        <div
            className={cn(
                "group flex flex-col gap-3 cursor-pointer relative rounded-xl p-2 transition-colors",
                isHighlighted ? "bg-accent" : "hover:bg-transparent"
            )}
            onMouseEnter={() => onHover?.(property.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => router.push(`/kho-bai/${property.id}`)}
        >
            {/* Image Carousel */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                <Carousel className="w-full h-full group/carousel">
                    <CarouselContent className="-ml-0 h-full">
                        {images.map((img, index) => (
                            <CarouselItem key={index} className="pl-0 h-full">
                                <img
                                    src={img}
                                    alt={`Warehouse ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading={index === 0 ? "eager" : "lazy"}
                                    decoding="async"
                                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>

                    {/* Arrows - Only visible on hover */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <CarouselPrevious className="left-2 bg-background/80 hover:bg-background text-foreground border-none shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0" />
                        <CarouselNext className="right-2 bg-background/80 hover:bg-background text-foreground border-none shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0" />
                    </div>

                    {/* Dots indicator (simplified visual only) */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                        {images.slice(0, 5).map((_, i) => (
                            <div key={i} className={cn("w-1.5 h-1.5 rounded-full shadow-sm", i === 0 ? "bg-white" : "bg-white/50")} />
                        ))}
                    </div>

                    {/* Guest Favorite Badge - Conditional */}
                    <div className="absolute top-3 left-3 z-20 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-md shadow-sm">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">{property.type}</span>
                    </div>

                </Carousel>

                {/* Favorite Heart - Absolute on top right */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsFavorite(!isFavorite);
                    }}
                    className="absolute top-3 right-3 z-20 hover:scale-110 transition-transform active:scale-95"
                >
                    <Heart
                        className={cn("w-6 h-6 drop-shadow-md transition-colors", isFavorite ? "fill-[#FF385C] text-[#FF385C]" : "fill-transparent text-white stroke-2 stroke-white")}
                    />
                </button>
            </div>

            {/* Content info */}
            <div className="flex flex-col gap-1 px-0.5">
                {/* Trust badge */}
                {property.trust_profile && property.trust_profile.badge_level !== "NONE" && (
                    <div>
                        <TrustBadge level={property.trust_profile.badge_level} size="sm" />
                    </div>
                )}
                {/* Primary: Property Name */}
                <h3 className="text-base font-semibold text-foreground line-clamp-1 leading-snug">
                    {property.name}
                </h3>
                {/* Secondary: Address */}
                <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                    {property.address}
                </p>
                {/* Tertiary: Distance */}
                <p className="text-xs text-muted-foreground/80 line-clamp-1">
                    Cách trung tâm {
                        property.lat && property.lng 
                        ? calculateDistance(property.lat, property.lng, HCM_CENTER.lat, HCM_CENTER.lng).toFixed(1)
                        : (typeof property.id === 'number' ? property.id + 2 : 5)
                    } km
                </p>
            </div>

            <div className="mt-0 flex items-baseline gap-1">
                <span className="font-semibold text-foreground text-[16px]">
                    {new Intl.NumberFormat('vi-VN').format(property.price)} đ
                </span>
                <span className="text-foreground text-[16px]">/tháng</span>
            </div>
        </div>
    );
}
