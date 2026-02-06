'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, CubeIcon } from '@heroicons/react/24/outline';
import { AmenityResponse } from '@/types/amenities/amenities.type';
import { getIconComponent } from './IconPicker';

interface AmenityGridViewProps {
    amenities: AmenityResponse[];
    selectedIds: string[];
    onSelect: (id: string, checked: boolean) => void;
    onEdit: (amenity: AmenityResponse) => void;
    onDelete: (amenity: AmenityResponse) => void;
    loading?: boolean;
}

export function AmenityGridView({
    amenities,
    selectedIds,
    onSelect,
    onEdit,
    onDelete,
    loading,
}: AmenityGridViewProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {amenities.map((amenity) => {
                const IconComponent = amenity.icon ? getIconComponent(amenity.icon) : null;
                const isSelected = selectedIds.includes(amenity.id);

                return (
                    <div
                        key={amenity.id}
                        className={`
                            relative group bg-card border rounded-2xl p-4 
                            transition-all hover:shadow-md hover:border-primary/30
                            ${isSelected ? 'ring-2 ring-primary border-primary' : ''}
                        `}
                    >
                        {/* Checkbox */}
                        <div className="absolute top-3 left-3">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => onSelect(amenity.id, !!checked)}
                            />
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                            {amenity.is_active ? (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-500">
                                    <CheckCircleIcon className="w-3 h-3 mr-0.5" />
                                    Active
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                    <XCircleIcon className="w-3 h-3 mr-0.5" />
                                    Inactive
                                </Badge>
                            )}
                        </div>

                        {/* Icon */}

                        <div className="flex justify-center mt-6 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                {IconComponent ? (
                                    <IconComponent className="w-8 h-8 text-primary stroke-2" />
                                ) : (
                                    <CubeIcon className="w-8 h-8 text-primary/50 stroke-2" />
                                )}
                            </div>
                        </div>

                        {/* Name */}
                        <h3 className="text-sm font-semibold text-center truncate mb-1">
                            {amenity.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground text-center line-clamp-2 min-h-[32px]">
                            {amenity.description || '—'}
                        </p>

                        {/* Actions */}
                        <div className="flex justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(amenity)}
                                style={{ borderRadius: '8px' }}
                            >
                                <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDelete(amenity)}
                                style={{ borderRadius: '8px' }}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
