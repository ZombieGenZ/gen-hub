import React from 'react';
import { Property } from '@/data/mockProperties';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import WarehouseSearchCard from '@/components/search/WarehouseSearchCard';

interface PropertyListProps {
    properties: Property[];
    onHover: (id: number | null) => void;
    highlightedPropertyId: number | null;
    variant?: 'vertical' | 'horizontal' | 'grid';
    className?: string;
}

export default function PropertyList({ properties, onHover, highlightedPropertyId, variant = 'grid', className }: PropertyListProps) {
    // Layout classes based on variant
    let containerClasses = "grid grid-cols-1 gap-6";
    if (variant === 'grid') {
        // Airbnb style responsive grid
        containerClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 content-start";
    }
    else if (variant === 'horizontal') {
        containerClasses = "flex flex-col gap-6";
    }

    return (
        <div className={`${containerClasses} ${className || ''}`}>
            {properties.map((property) => (
                <div key={property.id} id={`property-card-${property.id}`}>
                    <WarehouseSearchCard
                        property={property}
                        onHover={onHover}
                        isHighlighted={highlightedPropertyId === property.id}
                    />
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
