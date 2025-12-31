import React from 'react';
import { Property } from '@/data/mockProperties';

interface PropertyListProps {
    properties: Property[];
    onHover: (id: number | null) => void;
    highlightedPropertyId: number | null;
}

export default function PropertyList({ properties, onHover, highlightedPropertyId }: PropertyListProps) {
    return (
        <div className="h-full overflow-y-auto pr-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4 sticky top-0 bg-white py-2 z-10">
                {properties.length} Bất động sản
            </h3>

            {properties.map((property) => (
                <div
                    key={property.id}
                    id={`property-card-${property.id}`}
                    className={`group rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${highlightedPropertyId === property.id
                        ? 'border-[#0F766E] ring-1 ring-[#0F766E] shadow-lg transform -translate-y-1'
                        : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                        } bg-white`}
                    onMouseEnter={() => onHover(property.id)}
                    onMouseLeave={() => onHover(null)}
                >
                    {/* Image Section */}
                    <div className="h-48 relative bg-slate-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={property.image}
                            alt={property.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                        {/* Badges on Image */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                            <div className="bg-[#0F766E]/90 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                                {property.type}
                            </div>
                        </div>

                        {/* Price Badge (Moved to image bottom-left similar to some designs, OR keep in text? Reference had it in text. Let's keep in text) */}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="font-semibold text-slate-800 text-lg leading-tight line-clamp-1 group-hover:text-[#0F766E] transition-colors">
                                    {property.title}
                                </h4>
                                {/* Heart/Save Icon Placeholder - optional */}
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.27-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.006.004.003.001a.75.75 0 01-.01-.367.75.75 0 01.02.032zM10 6a3 3 0 110 6 3 3 0 010-6z" clipRule="evenodd" />
                                </svg>
                                {property.address}
                            </p>
                        </div>

                        {/* Specs Pills */}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                                <svg width="14" height="14" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                                    <path d="M11.7809 18.2193C11.4884 17.9268 11.0129 17.9268 10.7204 18.2193L5.99988 22.9398V18.7503C5.99988 18.3363 5.66388 18.0003 5.24988 18.0003C4.83588 18.0003 4.49988 18.3363 4.49988 18.7503V24.7503C4.49988 24.8478 4.51938 24.9453 4.55838 25.0368C4.63338 25.2198 4.78038 25.3668 4.96488 25.4433C5.05488 25.4793 5.15238 25.5003 5.24988 25.5003H11.2499C11.6639 25.5003 11.9999 25.1643 11.9999 24.7503C11.9999 24.3363 11.6639 24.0003 11.2499 24.0003H7.06038L11.7794 19.2813C12.0734 18.9873 12.0734 18.5133 11.7809 18.2193Z" fill="#475569" />
                                    <path d="M25.0364 4.557C24.9449 4.521 24.8474 4.5 24.7499 4.5H18.7499C18.3359 4.5 17.9999 4.836 17.9999 5.25C17.9999 5.664 18.3359 6 18.7499 6H22.9394L18.2204 10.719C17.9279 11.0115 17.9279 11.487 18.2204 11.7795C18.3659 11.9265 18.5579 12 18.7499 12C18.9419 12 19.1339 11.9265 19.2809 11.781L23.9999 7.0605V11.25C23.9999 11.664 24.3359 12 24.7499 12C25.1639 12 25.4999 11.664 25.4999 11.25V5.25C25.4999 5.1525 25.4804 5.055 25.4414 4.9635C25.3664 4.7805 25.2194 4.6335 25.0364 4.557Z" fill="#475569" />
                                    <path d="M26.2499 0H3.74988C1.68288 0 -0.00012207 1.68141 -0.00012207 3.74991V26.2499C-0.00012207 28.3184 1.68288 29.9999 3.74988 29.9999H26.2499C28.3169 29.9999 29.9999 28.3184 29.9999 26.2499V3.74991C29.9999 1.68141 28.3169 0 26.2499 0ZM28.4999 26.2499C28.4999 27.4904 27.4904 28.4999 26.2499 28.4999H3.74988C2.50938 28.4999 1.49988 27.4904 1.49988 26.2499V3.74991C1.49988 2.50941 2.50938 1.49991 3.74988 1.49991H26.2499C27.4904 1.49991 28.4999 2.50941 28.4999 3.74991V26.2499Z" fill="#475569" />
                                </svg>
                                {property.area} m²
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full border border-slate-100">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 opacity-70">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {property.currency}
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                            <div className="text-orange-500 font-bold text-xl">
                                {property.price >= 1000000000
                                    ? `${(property.price / 1000000000).toFixed(1)} Tỷ`
                                    : `${(property.price / 1000000).toFixed(0)} Triệu`}
                                <span className="text-xs font-normal text-slate-400 ml-1">/tháng</span>
                            </div>
                            <button className="text-xs font-medium text-[#0F766E] hover:underline">
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {properties.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    Không tìm thấy bất động sản nào trong khu vực này.
                </div>
            )}
        </div>
    );
}
