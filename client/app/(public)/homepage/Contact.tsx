"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export function PrimeNestContact() {
    return (
        <section className="py-24 bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-6">
                <div className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Content Side */}
                        <div className="p-12 lg:p-14 flex flex-col justify-center">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Sẵn Sàng Tìm <br />
                                <span className="text-primary">Kho Bãi Mới?</span>
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-md">
                                Khám phá danh sách kho bãi mới nhất và tốt nhất. Đội ngũ của chúng tôi sẵn sàng hỗ trợ bạn từng bước.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button type="button" className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg">
                                    Liên Hệ Ngay
                                </Button>
                                <Button type="button" variant="outline" className="px-8 py-3.5 bg-background border-border hover:border-primary text-foreground font-bold rounded-lg">
                                    Xem Kho Bãi
                                </Button>
                            </div>
                        </div>

                        {/* Image Side */}
                        <div className="relative h-90 lg:h-full bg-muted border-l border-border">
                            <div className="absolute inset-0 bg-muted" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
