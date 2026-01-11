"use client";

import { useEffect, useState } from "react";
import {
    Carousel,
    CarouselApi,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function Testimonials() {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!api) {
            return;
        }

        setTimeout(() => {
            if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
                setCurrent(0);
                api.scrollTo(0);
            } else {
                api.scrollNext();
                setCurrent(current + 1);
            }
        }, 4000);
    }, [api, current]);

    return (
        <div className="w-full max-w-[1440px] mx-auto py-12 lg:py-20">
            <div className="container mx-auto">
                <div className="flex flex-col gap-8">
                    <h2 className="text-2xl md:text-4xl tracking-tighter lg:max-w-xl font-bold text-left text-[#0F766E]">
                        Được tin cậy bởi hàng ngàn doanh nghiệp
                    </h2>
                    <Carousel setApi={setApi} className="w-full">
                        <CarouselContent className="py-6">
                            {Array.from({ length: 15 }).map((_, index) => (
                                <CarouselItem className="md:basis-1/2 lg:basis-1/3" key={index}>
                                    <div className="bg-white rounded-3xl h-full p-6 flex justify-between flex-col shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-[#0F766E]">
                                        <User className="w-8 h-8 stroke-1 text-[#0F766E] mb-4" />
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                                                    Quyết định đúng đắn
                                                </h3>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    Mục tiêu của chúng tôi là hợp lý hóa thương mại SMB, giúp mọi thứ dễ dàng
                                                    và nhanh chóng hơn bao giờ hết.
                                                </p>
                                            </div>
                                            <div className="flex flex-row gap-3 text-sm items-center border-t border-slate-100 pt-4 mt-2">
                                                <Avatar className="h-8 w-8 ring-2 ring-[#0F766E]/20">
                                                    <AvatarImage src={`https://avatar.vercel.sh/${index}`} />
                                                    <AvatarFallback>CN</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm">Nguyễn Văn A</span>
                                                    <span className="text-xs text-slate-500">Giám Đốc, Công Ty ABC</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </div>
            </div>
        </div>
    );
}

export { Testimonials };
