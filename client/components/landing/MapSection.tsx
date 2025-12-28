import React from 'react';
import { Search, MapPin } from 'lucide-react';

export function MapSection() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B] mb-4">
                        Cơ sở hạ tầng hoàn tất đơn hàng, sẵn sàng triển khai
                    </h2>
                </div>

                <div className="bg-[#F8FAFC] rounded-[2.5rem] p-6 md:p-8 border border-[#E2E8F0] shadow-sm flex flex-col lg:flex-row gap-8 overflow-hidden">
                    {/* Map Area Mockup */}
                    <div className="lg:w-2/3 relative h-125 bg-[#E2E8F0] rounded-3xl overflow-hidden border border-[#CBD5E1]">
                        {/* Map Placeholder Image/Background */}
                        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/108.2772,14.0583,5,0/800x600?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja2xpMzI3ejIwNm4wMnF1Y2t6eG56eHo1In0.2jL5x0x7e_5y5z_6_8_9_0')] bg-cover opacity-30 grayscale" />

                        {/* Search Bar on Map */}
                        <div className="absolute top-6 left-6 right-6 md:w-96 bg-white p-2 rounded-full shadow-lg flex items-center gap-3 border border-[#E2E8F0]">
                            <div className="w-10 h-10 bg-[#F1F5F9] rounded-full flex items-center justify-center text-[#64748B]">
                                <Search className="w-5 h-5" />
                            </div>
                            <input type="text" placeholder="Tìm kiếm Trung tâm Xử lý..." className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[#334155]" />
                        </div>

                        {/* Map Pins Mockup */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="relative group cursor-pointer">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-xl p-1 animate-bounce border border-[#0F766E]">
                                    <img src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=100&auto=format&fit=crop" alt="Đà Nẵng hub" className="w-full h-full object-cover rounded-lg" />
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1E293B] px-3 py-1 rounded-lg shadow-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    Trung tâm Đà Nẵng
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-1/3 left-1/3">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-xl p-1 cursor-pointer hover:scale-110 transition-transform">
                                <img src="https://images.unsplash.com/photo-1590685295752-a119bd217ec2?q=80&w=100&auto=format&fit=crop" alt="Warehouse location" className="w-full h-full object-cover rounded-lg" />
                            </div>
                        </div>
                    </div>

                    {/* List Sidebar */}
                    <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto max-h-125 pr-2 custom-scrollbar">
                        <h3 className="font-bold text-[#1E293B] mb-2 px-2">Hub Đang Hoạt Động</h3>

                        <ClusterCard
                            image="https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=400&auto=format&fit=crop"
                            title="Miền Nam - TP.HCM"
                            price="Công suất lớn"
                            specs="Kho lạnh • Ngoại quan"
                        />
                        <ClusterCard
                            image="https://images.unsplash.com/photo-1628624747186-a94194361516?q=80&w=400&auto=format&fit=crop"
                            title="Miền Bắc - Hà Nội"
                            price="Sẵn sàng"
                            specs="eCommerce • Giao hàng chặng cuối"
                        />
                        <ClusterCard
                            image="https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=80&w=400&auto=format&fit=crop"
                            title="Miền Trung - Đà Nẵng"
                            price="Sắp kín"
                            specs="Cross-docking"
                        />
                        <ClusterCard
                            image="https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=400&auto=format&fit=crop"
                            title="Quốc tế - Singapore"
                            price="Hub Khu vực"
                            specs="Chuyển tải quốc tế"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ClusterCard({ image, title, price, specs }: { image: string, title: string, price: string, specs: string }) {
    return (
        <div className="flex gap-4 p-3 bg-white rounded-2xl border border-[#E2E8F0] hover:shadow-md transition-shadow cursor-pointer group">
            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="flex flex-col justify-center">
                <h4 className="font-bold text-[#1E293B] text-sm mb-1">{title}</h4>
                <p className="text-[#0F766E] font-extrabold text-sm mb-2">{price}</p>
                <div className="flex items-center gap-1 text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md w-fit">
                    <MapPin className="w-3 h-3" />
                    {specs}
                </div>
            </div>
        </div>
    )
}
