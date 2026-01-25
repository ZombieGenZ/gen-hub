"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckoutSession } from '@/types/checkout/checkout.type';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

interface ContractPreviewProps {
    session: Partial<CheckoutSession>;
    contractCode?: string;
    companyName?: string;
    representativeName?: string;
    signatureData?: string;
    signedAt?: Date;
}

export function ContractPreview({
    session,
    contractCode = "HĐ-2025/GH-001",
    companyName = "CÔNG TY TNHH KHÁCH HÀNG",
    representativeName = "NGUYỄN VĂN A",
    signatureData,
    signedAt
}: ContractPreviewProps) {
    const currentDate = new Date();
    const startDate = session.start_date ? new Date(session.start_date) : new Date();
    const endDate = new Date(startDate);
    if (session.duration_months) {
        endDate.setMonth(endDate.getMonth() + session.duration_months);
    }

    const formatCurrency = (amount: number) => {
        return `${Math.round(amount).toLocaleString('vi-VN')}₫`;
    };

    const isSigned = !!signatureData;

    return (
        <div className="bg-white p-8 shadow-sm border border-slate-200 rounded-none mx-auto max-w-4xl min-h-[800px] text-slate-800 font-serif leading-relaxed relative">
            {/* Signed Badge */}
            {isSigned && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                    <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Đã ký điện tử</span>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
                <h3 className="uppercase font-bold text-sm text-slate-500 mb-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
                <h4 className="font-bold text-sm text-slate-500 underline underline-offset-4 mb-6">Độc lập - Tự do - Hạnh phúc</h4>

                <h1 className="text-2xl font-bold uppercase mb-2">HỢP ĐỒNG THUÊ KHO BÃI</h1>
                <p className="text-sm italic">Số: {contractCode}</p>
            </div>

            <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6 text-sm text-justify">
                    <p>
                        Hôm nay, ngày {format(currentDate, "dd", { locale: vi })} tháng {format(currentDate, "MM", { locale: vi })} năm {format(currentDate, "yyyy", { locale: vi })}, tại văn phòng Công ty TNHH GenHub Logistics, chúng tôi gồm:
                    </p>

                    {/* BEN A */}
                    <div className="space-y-2">
                        <h4 className="font-bold uppercase">BÊN A (BÊN CHO THUÊ): CÔNG TY TNHH GENHUB LOGISTICS</h4>
                        <ul className="pl-6 space-y-1 list-none">
                            <li>- Mã số thuế: 0312345678</li>
                            <li>- Địa chỉ: KCN Long Hậu, Cần Giuộc, Long An</li>
                            <li>- Đại diện: Ông Trần Văn B - Chức vụ: Giám đốc Kinh doanh</li>
                        </ul>
                    </div>

                    {/* BEN B */}
                    <div className="space-y-2">
                        <h4 className="font-bold uppercase">BÊN B (BÊN THUÊ): {companyName.toUpperCase()}</h4>
                        <ul className="pl-6 space-y-1 list-none">
                            <li>- Mã số thuế: {session.organization_id || "...................."}</li>
                            <li>- Địa chỉ: ............................................................</li>
                            <li>- Đại diện: Ông/Bà {representativeName.toUpperCase()}</li>
                        </ul>
                    </div>

                    <p>Hai bên thỏa thuận ký kết hợp đồng thuê kho với các điều khoản sau:</p>

                    {/* DIEU 1 */}
                    <div>
                        <h4 className="font-bold mb-1">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                        <p>
                            Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê diện tích kho bãi tại:
                            <strong> {session.warehouse_name}</strong>.
                        </p>
                        <ul className="list-disc pl-8 mt-2 space-y-1">
                            <li>Loại hình thuê: {session.rental_type === 'whole' ? 'Nguyên kho' : 'Theo dãy/kệ (Shared)'}</li>
                            <li>Thời hạn thuê: <strong>{session.duration_months} tháng</strong></li>
                            <li>Thời gian bắt đầu: {format(startDate, "dd/MM/yyyy")}</li>
                            <li>Thời gian kết thúc (dự kiến): {format(endDate, "dd/MM/yyyy")}</li>
                        </ul>
                    </div>

                    {/* DIEU 2 */}
                    <div>
                        <h4 className="font-bold mb-1">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG & THANH TOÁN</h4>
                        <p>Tổng giá trị hợp đồng (đã bao gồm VAT và phí dịch vụ):</p>
                        <p className="text-xl font-bold text-center py-2">{formatCurrency(session.quotation?.grandTotal || 0)}</p>

                        <p className="font-bold mt-2 underline">Phương thức thanh toán:</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>
                                <strong>Đặt cọc (Deposit):</strong> {formatCurrency(session.deposit_amount || 0)} (Đã thanh toán)
                                <br />
                                <em>Khoản cọc này nhằm đảm bảo việc thực hiện hợp đồng và sẽ được hoàn trả hoặc khấu trừ vào tháng cuối cùng.</em>
                            </li>
                            <li>
                                <strong>Thanh toán đợt 1:</strong> {formatCurrency((session.quotation?.grandTotal || 0) - (session.deposit_amount || 0))}
                                <br />
                                <em>Thanh toán trong vòng 05 ngày làm việc sau khi ký hợp đồng này.</em>
                            </li>
                        </ul>
                    </div>

                    {/* DIEU 3 */}
                    <div>
                        <h4 className="font-bold mb-1">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ</h4>
                        <p>
                            <strong>3.1. Quyền và nghĩa vụ của Bên A:</strong>
                            <br />
                            - Bàn giao kho đúng thời hạn và đảm bảo điều kiện kỹ thuật như cam kết.
                            <br />
                            - Chịu trách nhiệm bảo vệ an ninh vòng ngoài (CCTV, Bảo vệ 24/7).
                        </p>
                        <p className="mt-2">
                            <strong>3.2. Quyền và nghĩa vụ của Bên B:</strong>
                            <br />
                            - Sử dụng kho đúng mục đích, không chứa hàng cấm, cháy nổ.
                            <br />
                            - Thanh toán đầy đủ và đúng hạn.
                        </p>
                    </div>

                    {/* DIEU 4 */}
                    <div>
                        <h4 className="font-bold mb-1">ĐIỀU 4: ĐIỀU KHOẢN CHUNG</h4>
                        <p>
                            - Hai bên cam kết thực hiện đúng các điều khoản đã ghi.
                            <br />
                            - Hợp đồng này được lập thành 02 bản, có giá trị pháp lý như nhau.
                            <br />
                            - Hợp đồng có hiệu lực kể từ ngày ký.
                        </p>
                    </div>

                    {/* Signature Section */}
                    <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-200">
                        {/* Party A Signature */}
                        <div className="text-center">
                            <h4 className="font-bold uppercase mb-4">ĐẠI DIỆN BÊN A</h4>
                            <div className="h-20 flex items-center justify-center">
                                {/* GenHub signature placeholder */}
                                <img
                                    src="/assets/genhub-signature.png"
                                    alt="GenHub Signature"
                                    className="h-16 object-contain opacity-80"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                            <p className="font-bold mt-2">Trần Văn B</p>
                            <p className="text-xs text-slate-500">Giám đốc Kinh doanh</p>
                        </div>

                        {/* Party B Signature */}
                        <div className="text-center">
                            <h4 className="font-bold uppercase mb-4">ĐẠI DIỆN BÊN B</h4>
                            <div className="h-20 flex items-center justify-center">
                                {isSigned ? (
                                    <div className="relative">
                                        <img
                                            src={signatureData}
                                            alt="Customer Signature"
                                            className="h-16 object-contain"
                                        />
                                        <CheckBadgeIcon className="w-5 h-5 text-green-600 absolute -top-1 -right-3" />
                                    </div>
                                ) : (
                                    <span className="text-slate-400 text-xs italic">(Chưa ký)</span>
                                )}
                            </div>
                            <p className="font-bold mt-2">{representativeName}</p>
                            {isSigned && signedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                    Đã ký lúc {format(signedAt, "HH:mm, dd/MM/yyyy", { locale: vi })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Digital Signature Verification */}
                    {isSigned && (
                        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-start gap-3">
                                <CheckBadgeIcon className="w-6 h-6 text-green-600 shrink-0" />
                                <div className="text-xs text-green-800">
                                    <p className="font-bold mb-1">Chữ ký điện tử hợp lệ</p>
                                    <p>Hợp đồng này đã được ký điện tử bằng phương thức xác thực OTP và có giá trị pháp lý tương đương chữ ký tay theo Luật Giao dịch điện tử 2023.</p>
                                    <p className="mt-1 text-green-600">
                                        Mã xác thực: GH-SIG-{Date.now().toString(36).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
