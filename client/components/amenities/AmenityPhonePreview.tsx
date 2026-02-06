'use client';

import * as React from 'react';
import { getIconComponent } from './IconPicker';
import { ExclamationTriangleIcon, CubeIcon } from '@heroicons/react/24/outline';

interface AmenityPhonePreviewProps {
    icon?: string;
    name?: string;
}

export function AmenityPhonePreview({ icon, name }: AmenityPhonePreviewProps) {
    const IconComponent = icon ? getIconComponent(icon) : null;
    const displayName = name || 'Tiện ích';
    const isTruncated = displayName.length > 16;

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Phone Frame */}
            <div
                className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[28px] p-2 shadow-xl"
                style={{ width: '140px', height: '280px' }}
            >
                {/* Screen */}
                <div className="bg-white dark:bg-gray-950 rounded-[20px] h-full w-full overflow-hidden flex flex-col">
                    {/* Status Bar */}
                    <div className="h-6 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
                        {/* Icon Preview */}
                        <div
                            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20"
                        >
                            {IconComponent ? (
                                <IconComponent className="w-8 h-8 text-primary stroke-2" />
                            ) : (
                                <CubeIcon className="w-8 h-8 text-primary/50 stroke-2" />
                            )}
                        </div>

                        {/* Name Preview */}
                        <div className="text-center w-full">
                            <p
                                className="text-xs font-medium truncate px-1"
                                title={displayName}
                            >
                                {displayName}
                            </p>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="h-5 flex items-center justify-center">
                        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Truncation Warning */}
            {isTruncated && (
                <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    <span>Tên có thể bị cắt trên mobile</span>
                </div>
            )}
        </div>
    );
}
