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
                            <li>- Mã số thuế: 036xxxxxxx</li>
                            <li>- Địa chỉ: 36 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Thành phố Hồ Chí Minh</li>
                            <li>- Đại diện: Đặng Phạm Thành Thái - Chức vụ: Chủ Doanh Nghiệp</li>
                        </ul>
                    </div>

                    {/* BEN B */}
                    <div className="space-y-2">
                        <h4 className="font-bold uppercase">BÊN B (BÊN THUÊ): {companyName.toUpperCase()}</h4>
                        <ul className="pl-6 space-y-1 list-none">
                            <li>- Mã số thuế: {session.organization_id || "...................."}</li>
                            <li>- Địa chỉ: {session.company_address || "...................................................."}</li>
                            <li>- Đại diện: Ông/Bà {(representativeName || "").toUpperCase()}</li>
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

                        <p className="font-bold mt-2 underline">Chi tiết giá:</p>
                        <div className="pl-4 space-y-1 text-sm">
                            {/* Base Rental */}
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span>• Giá thuê kho ({session.duration_months} tháng)</span>
                                <span className="font-semibold">{formatCurrency(session.quotation?.basePrice || 0)}</span>
                            </div>

                            {/* Duration Discount */}
                            {!!(session.quotation?.durationDiscountAmount && session.quotation.durationDiscountAmount > 0) && (
                                <div className="flex justify-between border-b border-slate-100 pb-1 text-green-700">
                                    <span>• Giảm giá kỳ hạn ({session.quotation.durationDiscountPercent}%)</span>
                                    <span className="font-semibold">-{formatCurrency(session.quotation.durationDiscountAmount)}</span>
                                </div>
                            )}

                            {/* Add-ons */}
                            {!!(session.addon_details && session.addon_details.length > 0) && (
                                <>
                                    <p className="font-semibold mt-2 text-slate-700">Dịch vụ cộng thêm:</p>
                                    {session.addon_details.map((addon, idx) => (
                                        <div key={idx} className="flex justify-between border-b border-slate-100 pb-1 pl-2">
                                            <span>• {addon.name} {addon.is_monthly_payment ? `(${session.duration_months} tháng)` : '(1 lần)'}</span>
                                            <span className="font-semibold">{formatCurrency(addon.price)}</span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Insurance */}
                            {!!session.insurance_details && (
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span>• Bảo hiểm: {session.insurance_details.name}</span>
                                    <span className="font-semibold">{formatCurrency(session.insurance_details.price)}</span>
                                </div>
                            )}

                            {/* Service Fee */}
                            {!!(session.quotation?.serviceFee && session.quotation.serviceFee > 0) && (
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                    <span>• Phí dịch vụ (10%)</span>
                                    <span className="font-semibold">{formatCurrency(session.quotation.serviceFee)}</span>
                                </div>
                            )}

                            {/* Coupon Discount */}
                            {!!(session.quotation?.couponDiscount && session.quotation.couponDiscount > 0) && (
                                <div className="flex justify-between border-b border-slate-100 pb-1 text-green-700">
                                    <span>• Giảm giá mã khuyến mãi</span>
                                    <span className="font-semibold">-{formatCurrency(session.quotation.couponDiscount)}</span>
                                </div>
                            )}

                            {/* Grand Total */}
                            <div className="flex justify-between pt-2 border-t-2 border-slate-300 mt-2">
                                <span className="font-bold">TỔNG GIÁ TRỊ HỢP ĐỒNG (đã bao gồm VAT):</span>
                                <span className="font-bold text-lg">{formatCurrency(session.quotation?.grandTotal || 0)}</span>
                            </div>
                        </div>

                        <p className="font-bold mt-4 underline">Phương thức thanh toán:</p>
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
                        <h4 className="font-bold mb-2">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</h4>

                        <p className="font-semibold mt-3">3.1. Quyền và nghĩa vụ của Bên A (Bên cho thuê):</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Bàn giao kho đúng thời hạn và đảm bảo điều kiện kỹ thuật như cam kết.</li>
                            <li>Chịu trách nhiệm bảo vệ an ninh vòng ngoài (CCTV, Bảo vệ 24/7).</li>
                            <li>Duy trì hệ thống điện, nước, PCCC đạt tiêu chuẩn an toàn.</li>
                            <li>Hỗ trợ Bên B trong quá trình sử dụng kho theo quy định.</li>
                            <li>Có quyền kiểm tra kho định kỳ với thông báo trước 24 giờ.</li>
                        </ul>

                        <p className="font-semibold mt-3">3.2. Quyền và nghĩa vụ của Bên B (Bên thuê):</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Sử dụng kho đúng mục đích, không chứa hàng cấm, hàng dễ cháy nổ.</li>
                            <li>Thanh toán đầy đủ và đúng hạn theo thỏa thuận.</li>
                            <li>Bảo quản, sử dụng kho cẩn thận, không gây hư hỏng tài sản.</li>
                            <li>Tuân thủ quy định về PCCC, ATVSLĐ của Bên A và pháp luật.</li>
                            <li>Mua bảo hiểm cho hàng hóa nếu có yêu cầu.</li>
                            <li>Có quyền sử dụng đầy đủ các dịch vụ đi kèm đã thanh toán.</li>
                        </ul>
                    </div>

                    {/* DIEU 4 */}
                    <div>
                        <h4 className="font-bold mb-2">ĐIỀU 4: THANH TOÁN VÀ PHẠT TRỄ HẠN</h4>

                        <p className="font-semibold">4.1. Hình thức thanh toán:</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Chuyển khoản ngân hàng hoặc thanh toán điện tử (SePay QR).</li>
                            <li>Bên B phải cung cấp chứng từ thanh toán sau mỗi lần chuyển tiền.</li>
                        </ul>

                        <p className="font-semibold mt-3">4.2. Phạt chậm thanh toán:</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Chậm 1-7 ngày: Phạt 0.1%/ngày trên số tiền nợ.</li>
                            <li>Chậm 8-15 ngày: Phạt 0.2%/ngày trên số tiền nợ.</li>
                            <li>Chậm trên 15 ngày: Bên A có quyền đơn phương chấm dứt hợp đồng và tịch thu tiền cọc.</li>
                        </ul>
                    </div>

                    {/* DIEU 5 */}
                    <div>
                        <h4 className="font-bold mb-2">ĐIỀU 5: CHẤM DỨT HỢP ĐỒNG</h4>

                        <p className="font-semibold">5.1. Chấm dứt theo thỏa thuận:</p>
                        <p className="pl-4">Hai bên có thể thỏa thuận chấm dứt hợp đồng trước hạn với thông báo trước 30 ngày.</p>

                        <p className="font-semibold mt-3">5.2. Chấm dứt đơn phương:</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li><strong>Bên A được chấm dứt</strong> nếu Bên B vi phạm nghiêm trọng (chứa hàng cấm, nợ quá hạn trên 15 ngày, gây hư hỏng tài sản...).</li>
                            <li><strong>Bên B được chấm dứt</strong> nếu Bên A không bàn giao kho đúng hạn hoặc kho không đảm bảo điều kiện cam kết.</li>
                        </ul>

                        <p className="font-semibold mt-3">5.3. Xử lý khi chấm dứt:</p>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Bên B phải bàn giao lại kho trong vòng 7 ngày.</li>
                            <li>Tiền cọc được hoàn trả sau khi kiểm tra kho nguyên vẹn (trừ trường hợp vi phạm).</li>
                            <li>Các khoản phí phát sinh (nếu có) được thanh toán trong vòng 5 ngày.</li>
                        </ul>
                    </div>

                    {/* DIEU 6 */}
                    <div>
                        <h4 className="font-bold mb-2">ĐIỀU 6: TRÁCH NHIỆM BỒI THƯỜNG</h4>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Bên A không chịu trách nhiệm về mất mát, hư hỏng hàng hóa do lỗi của Bên B hoặc bất khả kháng.</li>
                            <li>Bên B phải bồi thường 100% thiệt hại nếu gây hư hỏng tài sản, cơ sở vật chất của Bên A.</li>
                            <li>Trong trường hợp tranh chấp, hai bên ưu tiên giải quyết thông qua thương lượng.</li>
                        </ul>
                    </div>

                    {/* DIEU 7 */}
                    <div>
                        <h4 className="font-bold mb-2">ĐIỀU 7: ĐIỀU KHOẢN CHUNG</h4>
                        <ul className="list-disc pl-8 mt-1 space-y-1">
                            <li>Hai bên cam kết thực hiện đúng các điều khoản đã ghi trong hợp đồng này.</li>
                            <li>Mọi tranh chấp phát sinh sẽ được giải quyết trên tinh thần thiện chí. Nếu không thỏa thuận được, sẽ đưa ra Tòa án có thẩm quyền.</li>
                            <li>Hợp đồng này được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.</li>
                            <li>Hợp đồng có hiệu lực kể từ ngày ký và kết thúc vào {format(endDate, "dd/MM/yyyy")} (hoặc đến khi hai bên thỏa thuận chấm dứt).</li>
                        </ul>
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
                            <p className="font-bold mt-2">Đặng Phạm Thành Thái</p>
                            <p className="text-xs text-slate-500">Chủ Doanh Nghiệp</p>
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
