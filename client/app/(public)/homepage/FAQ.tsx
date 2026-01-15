"use client";

import React, { useState } from "react";

const faqs = [
    {
        question: "Làm thế nào để bắt đầu thuê kho trên GenHub?",
        answer: "Rất đơn giản! Bạn chỉ cần tìm kiếm kho phù hợp trên hệ thống, sau đó liên hệ trực tiếp hoặc đặt lịch tham quan. Đội ngũ GenHub sẽ hỗ trợ bạn ký hợp đồng nhanh chóng.",
    },
    {
        question: "Chi phí thuê kho bao gồm những khoản nào?",
        answer: "Chi phí thường bao gồm tiền thuê theo m2/tháng, phí quản lý, phí điện nước và các dịch vụ đi kèm nếu có. Chúng tôi luôn công khai bảng giá rõ ràng.",
    },
    {
        question: "Tôi có thể thay đổi diện tích thuê sau này không?",
        answer: "Có, GenHub linh hoạt cho phép bạn mở rộng hoặc thu hẹp diện tích thuê tùy theo nhu cầu kinh doanh thực tế, giúp tối ưu chi phí.",
    },
    {
        question: "GenHub có cung cấp dịch vụ vận chuyển và fulfillment không?",
        answer: "Có, chúng tôi cung cấp giải pháp fulfillment toàn diện bao gồm đóng gói, dán nhãn, và vận chuyển đến tay khách hàng cuối cùng.",
    },
    {
        question: "Thời gian hợp đồng tối thiểu là bao lâu?",
        answer: "Chúng tôi có các gói thuê linh hoạt từ ngắn hạn (1 tháng) đến dài hạn (trên 1 năm) để phù hợp với mọi mô hình kinh doanh.",
    },
];

export function PrimeNestFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-24 bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Câu Hỏi <br />
                        <span className="text-primary">Thường Gặp</span>
                    </h2>
                    <p className="text-muted-foreground">
                        Giải đáp các thắc mắc về quy trình thuê kho, chi phí và vận hành trên GenHub.
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`bg-card rounded-xl overflow-hidden border transition-all duration-300 ${openIndex === index ? "border-primary shadow-sm" : "border-border hover:border-primary/50"
                                }`}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className={`font-semibold text-lg ${openIndex === index ? "text-primary" : "text-foreground"}`}>
                                    {faq.question}
                                </span>
                                <span className={`transform transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}>
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={`px-6 transition-all duration-300 ease-in-out overflow-hidden ${openIndex === index ? "max-h-48 pb-6 opacity-100" : "max-h-0 opacity-0"
                                    }`}
                            >
                                <p className="text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
