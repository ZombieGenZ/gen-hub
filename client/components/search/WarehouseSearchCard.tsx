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
import { cn } from "@/lib/utils";

interface WarehouseSearchCardProps {
    property: Property;
    onHover?: (id: number | null) => void;
    isHighlighted?: boolean;
}

export default function WarehouseSearchCard({ property, onHover, isHighlighted }: WarehouseSearchCardProps) {
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(false);

    // Create a mock gallery if only one image exists, just for the UI feel
    const images = [
        property.image,
        "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1629814249584-bd4d53cf0e7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
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
            <div className="flex flex-col gap-0.5 px-0.5">
                <div className="text-muted-foreground text-[15px] leading-snug">
                    <p className="line-clamp-1">Cách trung tâm {property.id + 2} km</p>
                </div>

                <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-semibold text-foreground text-[16px]">
                        {property.price >= 1000000000
                            ? `${(property.price / 1000000000).toFixed(1)} Tỷ`
                            : `${(property.price / 1000000).toFixed(0)} Tr`}
                    </span>
                    <span className="text-foreground text-[16px]">/tháng</span>
                </div>
            </div>
        </div>
    );
}
