"use client";

import React from 'react';
import { Property } from '@/data/mockProperties';
import Link from 'next/link';

interface SearchListProps {
    properties: Property[];
    onHover: (id: string | number | null) => void;
    highlightedPropertyId: string | number | null;
}

export default function SearchList({ properties, onHover, highlightedPropertyId }: SearchListProps) {
    if (properties.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <p className="text-lg font-medium">Không tìm thấy kho nào trong khu vực này</p>
                <p className="text-sm mt-2">Hãy thử thay đổi bộ lọc hoặc thu nhỏ bản đồ để xem vùng rộng hơn.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 pb-20 md:pb-4">
            {properties.map((property) => (
                <Link
                    href={`/properties/${property.id}`} // Assuming route
                    key={property.id}
                    className="block"
                    onClick={(e) => {
                        // e.preventDefault(); // Uncomment if we want to handle click for preview instead of navigation
                    }}
                >
                    <div
                        className={`group rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden bg-white h-full flex flex-col ${highlightedPropertyId === property.id
                            ? 'border-[#0F766E] ring-1 ring-[#0F766E] shadow-lg transform -translate-y-1'
                            : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                            }`}
                        onMouseEnter={() => onHover(property.id)}
                        onMouseLeave={() => onHover(null)}
                    >
                        {/* Image Section */}
                        <div className="h-48 relative bg-slate-100 overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={property.image}
                                alt={property.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                            <div className="absolute top-3 left-3">
                                <span className="bg-[#0F766E]/90 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                                    {property.type}
                                </span>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 flex flex-col flex-1">
                            <h4 className="font-semibold text-slate-800 text-lg leading-tight line-clamp-2 group-hover:text-[#0F766E] transition-colors mb-2">
                                {property.title}
                            </h4>

                            <div className="text-sm text-slate-500 line-clamp-1 flex items-center gap-1 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.27-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.006.004.003.001a.75.75 0 01-.01-.367.75.75 0 01.02.032zM10 6a3 3 0 110 6 3 3 0 010-6z" clipRule="evenodd" />
                                </svg>
                                <span className="truncate">{property.address}</span>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="text-orange-500 font-bold text-lg">
                                    {property.price >= 1000000000
                                        ? `${(property.price / 1000000000).toFixed(1)} Tỷ`
                                        : `${(property.price / 1000000).toFixed(0)} Triệu`}
                                    <span className="text-xs font-normal text-slate-400 ml-1">/tháng</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                                    {property.area} m²
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
