import React from 'react';
import { Property } from '@/data/mockProperties';
import { CameraIcon, MapPinIcon } from '@heroicons/react/20/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface PropertyListProps {
    properties: Property[];
    onHover: (id: number | null) => void;
    highlightedPropertyId: number | null;
    variant?: 'vertical' | 'horizontal' | 'grid';
}

export default function PropertyList({ properties, onHover, highlightedPropertyId, variant = 'grid' }: PropertyListProps) {
    // Layout classes based on variant
    let containerClasses = "grid grid-cols-1 gap-6";
    if (variant === 'grid') containerClasses = "grid grid-cols-1 sm:grid-cols-2 gap-6";
    else if (variant === 'horizontal') containerClasses = "flex flex-col gap-6";

    const cardClasses = variant === 'horizontal'
        ? "flex flex-col sm:flex-row"
        : "flex flex-col";

    const imageContainerClasses = variant === 'horizontal'
        ? "h-56 sm:h-auto sm:w-72"
        : "h-56 w-full";

    return (
        <div className={containerClasses}>
            {properties.map((property) => (
                <div
                    key={property.id}
                    id={`property-card-${property.id}`}
                    className={`group rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden bg-white z-0 ${cardClasses}
                        ${highlightedPropertyId === property.id
                            ? 'border-[#0F766E] ring-1 ring-[#0F766E] shadow-lg transform -translate-y-1 z-10'
                            : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                        }`}
                    onMouseEnter={() => onHover(property.id)}
                    onMouseLeave={() => onHover(null)}
                >
                    {/* Image Section */}
                    <div className={`${imageContainerClasses} relative bg-slate-100 overflow-hidden shrink-0`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={property.image}
                            alt={property.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            <div className="bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-slate-100">
                                {property.type}
                            </div>
                        </div>

                        <div className="absolute bottom-3 right-3">
                            <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                                <CameraIcon className="w-3 h-3 text-white/90" />
                                6 Ảnh
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className="font-bold text-slate-800 text-lg leading-snug group-hover:text-[#0F766E] transition-colors">
                                {property.title}
                            </h4>
                        </div>

                        <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                            <MapPinIcon className="w-4 h-4 shrink-0 text-slate-400" />
                            {property.address}
                        </p>

                        <div className="mt-auto border-t border-slate-50 pt-4 flex items-end justify-between">
                            <div>
                                <div className="text-[#0F766E] font-bold text-xl leading-none">
                                    {property.price >= 1000000000
                                        ? `${(property.price / 1000000000).toFixed(1)} Tỷ`
                                        : `${(property.price / 1000000).toFixed(0)} Tr`}
                                    <span className="text-sm font-normal text-slate-400 ml-1">/tháng</span>
                                </div>
                            </div>
                            <div className="text-slate-600 font-semibold text-sm bg-slate-100 px-3 py-1.5 rounded-lg">
                                {property.area} m²
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {properties.length === 0 && (
                <div className="col-span-full text-center py-20">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MagnifyingGlassIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Không tìm thấy kết quả</h3>
                    <p className="text-slate-500 mt-1">Vui lòng thử lại với các bộ lọc khác.</p>
                </div>
            )}
        </div>
    );
}
