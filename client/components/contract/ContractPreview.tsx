"use client";

import React from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckoutSession } from '@/types/checkout/checkout.type';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { formatCurrencyFull } from '@/lib/format-currency';

interface ContractPreviewProps {
    session: Partial<CheckoutSession>;
    contractCode?: string;
    companyName?: string;
    companyTaxCode?: string;
    companyAddress?: string;
    representativeName?: string;
    representativeTitle?: string;
    signatureData?: string;
    signedAt?: Date;
}

export function ContractPreview({
    session,
    contractCode = "HĐ-2025/GH-001",
    companyName = "CÔNG TY TNHH KHÁCH HÀNG",
    companyTaxCode,
    companyAddress,
    representativeName = "NGUYỄN VĂN A",
    representativeTitle,
    signatureData,
    signedAt
}: ContractPreviewProps) {
    const currentDate = new Date();
    const startDate = session.start_date ? new Date(session.start_date) : new Date();
    const endDate = new Date(startDate);
    if (session.duration_months) {
        endDate.setMonth(endDate.getMonth() + session.duration_months);
    }

    const isSigned = !!signatureData;

    return (
        <div className="bg-white p-12 shadow-sm border border-slate-200 rounded-none mx-auto max-w-4xl min-h-[1000px] text-slate-900 font-serif leading-relaxed relative">
            {/* Signed Badge */}
            {isSigned && (
                <div className="absolute top-8 right-8 flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200 z-10">
                    <CheckBadgeIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-bold uppercase tracking-wider">Đã ký điện tử</span>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-12">
                <h3 className="uppercase font-bold text-base mb-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
                <h4 className="font-bold text-base mb-8 underline decoration-1 underline-offset-8">Độc lập - Tự do - Hạnh phúc</h4>

                <h1 className="text-2xl font-bold uppercase mb-4 tracking-tight">HỢP ĐỒNG DỊCH VỤ KHO BÃI VÀ QUẢN LÝ HÀNG HÓA</h1>
                <p className="text-base">Số: <span className="font-mono">{contractCode}</span></p>
            </div>

            <ScrollArea className="h-[800px] pr-6 -mr-6">
                <div className="space-y-8 text-base text-justify">
                    {/* Introduction */}
                    <div className="space-y-2 italic text-slate-600">
                        <p>● Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
                        <p>● Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;</p>
                        <p>● Căn cứ vào nhu cầu và khả năng của hai bên.</p>
                    </div>

                    <p>
                        Hôm nay, ngày {format(currentDate, "dd", { locale: vi })} tháng {format(currentDate, "MM", { locale: vi })} năm {format(currentDate, "yyyy", { locale: vi })}, tại văn phòng Công ty TNHH GenHub Logistics, chúng tôi gồm:
                    </p>

                    {/* BEN A */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg border-b border-slate-100 pb-1">BÊN A (Bên cung cấp dịch vụ - GENHUB)</h4>
                        <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1 pl-4">
                            <span className="font-semibold italic">Địa chỉ trụ sở:</span>
                            <span>36 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Thành phố Hồ Chí Minh</span>

                            <span className="font-semibold italic">Mã số thuế:</span>
                            <span>036xxxxxxx</span>

                            <span className="font-semibold italic">Đại diện bởi:</span>
                            <span>Ông Đặng Phạm Thành Thái — <span className="italic">Chức vụ:</span> Chủ Doanh Nghiệp</span>

                            <span className="font-semibold italic">Tài khoản số:</span>
                            <span>1234567890 (VND)</span>

                            <span className="font-semibold italic">Tại Ngân hàng:</span>
                            <span>Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam (Vietcombank)</span>
                        </div>
                    </div>

                    {/* BEN B */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg border-b border-slate-100 pb-1 uppercase">BÊN B (Bên sử dụng dịch vụ)</h4>
                        <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1 pl-4">
                            <span className="font-semibold italic">Tên công ty:</span>
                            <span className="font-bold">{companyName.toUpperCase()}</span>

                            <span className="font-semibold italic">Địa chỉ trụ sở:</span>
                            <span>{companyAddress || session.company_address || "...................................................."}</span>

                            <span className="font-semibold italic">Mã số thuế:</span>
                            <span>{companyTaxCode || session.organization_id || "...................."}</span>

                            <span className="font-semibold italic">Đại diện bởi:</span>
                            <span>Ông/Bà {(representativeName || "").toUpperCase()} — <span className="italic">Chức vụ:</span> {representativeTitle || "...................."}</span>
                        </div>
                    </div>

                    <p className="font-medium italic">Hai bên cùng thống nhất ký kết Hợp đồng với các điều khoản sau:</p>

                    {/* DIEU 1 */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-xl uppercase tracking-wide text-teal-800">ĐIỀU 1: PHẠM VI DỊCH VỤ VÀ MÔ HÌNH HỢP TÁC</h4>
                        <div className="space-y-4 pl-4 border-l-2 border-teal-100">
                            <div>
                                <h5 className="font-bold italic">1.1. Địa điểm cung cấp dịch vụ</h5>
                                <p>Bên A đồng ý cung cấp và Bên B đồng ý sử dụng dịch vụ kho bãi và quản lý hàng hóa tại các địa điểm thuộc hệ thống kho của Bên A. Danh sách kho và địa chỉ cụ thể được quy định chi tiết tại Phụ lục 01 đính kèm Hợp đồng này.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">1.2. Mô hình Dịch vụ và Quy mô thuê</h5>
                                <p>Tùy theo nhu cầu thực tế, Bên B lựa chọn các gói dịch vụ lưu trữ sau (chi tiết được xác nhận tại Phụ lục 01):</p>
                                <ul className="list-none space-y-3 mt-2">
                                    <li className={cn(session.rental_type === 'whole' && "bg-teal-50 p-3 rounded-lg border border-teal-100")}>
                                        <p className="font-bold">(a) Gói Thuê Kho Riêng Biệt (Thuê Nguyên Kho):</p>
                                        <p className="text-sm mt-1">Bên B thuê trọn gói toàn bộ diện tích nhà kho độc lập. Bên A bàn giao toàn bộ quyền kiểm soát ra vào. Bên B tự chịu trách nhiệm về nhân sự, thiết bị vận hành và quản lý hàng hóa bên trong.</p>
                                    </li>
                                    <li className={cn(session.rental_type === 'row' && "bg-teal-50 p-3 rounded-lg border border-teal-100")}>
                                        <p className="font-bold">(b) Gói Thuê Vị trí Cố Định (Thuê Theo Dãy/Khu Vực):</p>
                                        <p className="text-sm mt-1">Bên B thuê cố định một phần không gian trong kho (dãy kệ, tầng kệ). Bên A chịu trách nhiệm cung cấp nhân sự, thiết bị và phần mềm để quản lý và bảo quản hàng hóa cho Bên B.</p>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="font-bold italic">1.3. Quy định về Khu vực Vận hành Chung</h5>
                                <p>Bao gồm cửa nhập/xuất, bãi đệm, khu vực kiểm hàng. Phục vụ quy trình tiếp nhận, trung chuyển, kiểm tra chất lượng trước khi đưa vào vị trí lưu kho cố định.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">1.4. Dịch vụ Bổ trợ và Giá trị gia tăng</h5>
                                <p>Ngoài dịch vụ lưu kho, Bên A cung cấp các dịch vụ đi kèm: Bốc xếp, gia tăng (dán tem, đóng gói), vận chuyển nội bộ, đại diện mua bảo hiểm hàng hóa.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">1.5. Hệ thống quản lý</h5>
                                <p>Bên A cam kết cung cấp tài khoản truy cập vào hệ thống phần mềm quản lý kho để Bên B theo dõi tồn kho và trạng thái đơn hàng theo thời gian thực.</p>
                            </div>
                        </div>
                    </section>

                    {/* DIEU 2 */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-xl uppercase tracking-wide text-teal-800">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG, THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN</h4>
                        <div className="space-y-4 pl-4 border-l-2 border-teal-100">
                            <div>
                                <h5 className="font-bold italic">2.1. Thời hạn Hợp đồng và Gói dịch vụ</h5>
                                <p>Bên B đăng ký sử dụng dịch vụ với thời hạn là <strong>{session.duration_months} tháng</strong>, kể từ ngày <strong>{format(startDate, "dd/MM/yyyy")}</strong> đến ngày <strong>{format(endDate, "dd/MM/yyyy")}</strong>.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.2. Giá trị Hợp đồng và Nguyên tắc tính phí</h5>
                                <p>Tổng giá trị hợp đồng tạm tính là: <strong className="text-lg">{formatCurrencyFull(session.quotation?.grandTotal || 0)}</strong> (Đã bao gồm VAT).</p>
                                <p className="text-sm mt-1 italic">Chi tiết giá và các hạng mục được quy định cụ thể tại Phụ lục 01.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.3. Phương thức và Thời hạn thanh toán</h5>
                                <p>● Thanh toán 100% giá trị gói dịch vụ đã đăng ký. Đặt cọc: {formatCurrencyFull(session.deposit_amount || 0)}.</p>
                                <p>● Thanh toán còn lại: {formatCurrencyFull((session.quotation?.grandTotal || 0) - (session.deposit_amount || 0))} trong vòng 05 ngày kể từ ngày ký.</p>
                                <p>● Hình thức: Chuyển khoản vào tài khoản ngân hàng của Bên A.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.4. Xử lý vi phạm thanh toán</h5>
                                <p>Trường hợp chậm thanh toán, Bên B chịu lãi suất 0.05%/ngày. Nếu quá 90 ngày, Bên A có quyền đơn phương chấm dứt hợp đồng và giữ hàng để thu hồi nợ.</p>
                            </div>
                        </div>
                    </section>

                    {/* DIEU 3 */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-xl uppercase tracking-wide text-teal-800">ĐIỀU 3: CAM KẾT CHẤT LƯỢNG VÀ QUY TRÌNH VẬN HÀNH</h4>
                        <div className="space-y-4 pl-4 border-l-2 border-teal-100">
                            <div>
                                <h5 className="font-bold italic">3.1. Nguyên tắc &quot;Cam kết thanh toán theo năng lực cung ứng&quot;</h5>
                                <p>Phí dịch vụ được tính dựa trên diện tích hoặc số lượng vị trí kệ mà Bên B đã đăng ký giữ chỗ, không phụ thuộc vào việc Bên B có sử dụng thực tế hay không.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">3.2. Quy trình Tiếp nhận và Điều phối</h5>
                                <p>Bên A cam kết quy trình tiếp nhận xe tải/container theo luồng vận hành tiêu chuẩn: Tiếp nhận - Nhập hàng - Hoàn tất giao nhận.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">3.3. Kiểm soát chất lượng và Phân loại</h5>
                                <p>Mọi hàng hóa được kiểm đếm ngoại quan 100% và phân loại (Đạt chuẩn / Lỗi) trước khi nhập kho.</p>
                            </div>
                        </div>
                    </section>

                    {/* DIEU 4-10 Summary */}
                    <section className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 4: TRÁCH NHIỆM BÊN A</h4>
                                <p className="text-xs">Đảm bảo quyền sử dụng kho hợp pháp, điều kiện kỹ thuật, bảo mật thông tin và bồi thường nếu lỗi do nhân viên Bên A gây ra.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 5: TRÁCH NHIỆM BÊN B</h4>
                                <p className="text-xs">Cung cấp thông tin hàng hóa chính xác, thanh toán đúng hạn, tuân thủ quy định PCCC và an toàn lao động.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 6: BẢO HIỂM HÀNG HÓA</h4>
                                <p className="text-xs">Bên B có trách nhiệm mua bảo hiểm hàng hóa. Bên A hỗ trợ đại diện mua nếu có yêu cầu.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 7: BẢO QUẢN TÀI SẢN</h4>
                                <p className="text-xs">Áp dụng cho Thuê Nguyên Kho: Bên B có nghĩa vụ giữ gìn nguyên trạng cơ sở vật chất và bàn giao lại khi hết hạn.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 8: CHẤM DỨT TRƯỚC HẠN</h4>
                                <p className="text-xs">Phải thông báo bằng văn bản trước và chịu phạt vi phạm theo % giá trị hợp đồng còn lại nếu lỗi không do bên kia.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 9: BẤT KHẢ KHÁNG</h4>
                                <p className="text-xs">Miễn trừ trách nhiệm cho các vi phạm do thiên tai, dịch bệnh, hỏa hoạn... gây ra.</p>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <h4 className="font-bold text-sm text-teal-800 uppercase">ĐIỀU 10: ĐIỀU KHOẢN CHUNG</h4>
                            <p className="text-xs">Mọi tranh chấp giải quyết bằng thương lượng hoặc Tòa án. Hợp đồng lập thành 02 bản có giá trị pháp lý như nhau.</p>
                        </div>
                    </section>

                    {/* SIGNATURE SECTION */}
                    <div className="grid grid-cols-2 gap-12 mt-16 pb-12">
                        <div className="text-center space-y-20 relative">
                            <h4 className="font-bold uppercase text-sm">ĐẠI DIỆN BÊN A</h4>
                            {/* GenHub Stamp & Signature Placeholder */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-90">
                                <Image
                                    src="/assets/genhub-stamp.png"
                                    alt="GenHub Stamp"
                                    width={128}
                                    height={128}
                                    className="w-32 h-32 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <Image
                                    src="/assets/genhub-signature.png"
                                    alt="GenHub Signature"
                                    width={96}
                                    height={64}
                                    className="w-24 h-16 object-contain -mt-16 ml-4"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                            <div className="pt-2">
                                <p className="font-bold text-base">Đặng Phạm Thành Thái</p>
                                <p className="text-xs italic">Chủ Doanh Nghiệp</p>
                            </div>
                        </div>

                        <div className="text-center space-y-20 relative">
                            <h4 className="font-bold uppercase text-sm">ĐẠI DIỆN BÊN B</h4>
                            <div className="h-32 flex items-center justify-center">
                                {isSigned ? (
                                    <div className="relative group">
                                        <img
                                            src={signatureData}
                                            alt="Customer Signature"
                                            className="max-h-24 w-auto object-contain"
                                            // eslint-disable-next-line @next/next/no-img-element
                                        />
                                        <div className="absolute -top-4 -right-4 bg-white rounded-full p-1 shadow-md border border-green-100">
                                            <CheckBadgeIcon className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-1/2 h-0.5 bg-slate-200" />
                                )}
                            </div>
                            <div className="pt-2">
                                <p className="font-bold text-base">{representativeName.toUpperCase()}</p>
                                {isSigned && signedAt && (
                                    <p className="text-[10px] text-green-600 font-mono mt-1">
                                        VERIFIED AT: {format(signedAt, "HH:mm, dd/MM/yyyy")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* APPENDIX 01 */}
                    <div className="mt-16 pt-16 border-t-4 border-double border-slate-300">
                        <div className="text-center mb-10">
                            <h3 className="font-bold text-xl uppercase mb-2">PHỤ LỤC 01: BẢNG GIÁ DỊCH VỤ VÀ DANH SÁCH ĐỊA ĐIỂM THUÊ</h3>
                            <p className="italic text-sm">(Kèm theo Hợp đồng số {contractCode})</p>
                        </div>

                        <div className="space-y-10">
                            {/* I. GÓI DỊCH VỤ LƯU TRỮ */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-teal-800">I. GÓI DỊCH VỤ LƯU TRỮ</h4>
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 uppercase text-[10px] tracking-wider">
                                            <th className="border border-slate-300 p-2 text-left">STT</th>
                                            <th className="border border-slate-300 p-2 text-left">Tên Kho & Địa chỉ</th>
                                            <th className="border border-slate-300 p-2 text-right">Quy mô</th>
                                            <th className="border border-slate-300 p-2 text-right">Đơn giá/Tháng</th>
                                            <th className="border border-slate-300 p-2 text-right">Kỳ hạn</th>
                                            <th className="border border-slate-300 p-2 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-slate-300 p-2 text-center">1</td>
                                            <td className="border border-slate-300 p-2 font-medium">
                                                {session.warehouse_name || "Kho hàng GenHub"}
                                                <div className="text-[10px] font-normal text-slate-500 mt-0.5 italic">
                                                    Hệ thống kho bãi đạt chuẩn của Bên A
                                                </div>
                                            </td>
                                            <td className="border border-slate-300 p-2 text-right font-mono">
                                                {session.rental_type === 'whole' ? 'Nguyên Kho' : 'Vị trí/Kệ'}
                                            </td>
                                            <td className="border border-slate-300 p-2 text-right font-mono">
                                                {formatCurrencyFull(session.quotation?.basePrice || 0)}
                                            </td>
                                            <td className="border border-slate-300 p-2 text-right">
                                                {session.duration_months} tháng
                                            </td>
                                            <td className="border border-slate-300 p-2 text-right font-bold">
                                                {formatCurrencyFull(session.quotation?.basePrice || 0)}
                                            </td>
                                        </tr>
                                        {/* Row for Discount if exists */}
                                        {!!(session.quotation?.durationDiscountAmount && session.quotation.durationDiscountAmount > 0) && (
                                            <tr className="bg-green-50/30 text-green-700">
                                                <td colSpan={5} className="border border-slate-300 p-2 text-right italic">
                                                    Ưu đãi ký hạn đặc biệt ({session.quotation.durationDiscountPercent}%)
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right font-bold">
                                                    -{formatCurrencyFull(session.quotation.durationDiscountAmount)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* II. DỊCH VỤ CỘNG THÊM & LOGISTICS */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-teal-800">II. DỊCH VỤ CỘNG THÊM & LOGISTICS</h4>
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 uppercase text-[10px] tracking-wider">
                                            <th className="border border-slate-300 p-2 text-left">STT</th>
                                            <th className="border border-slate-300 p-2 text-left">Hạng mục dịch vụ</th>
                                            <th className="border border-slate-300 p-2 text-center">Đơn vị</th>
                                            <th className="border border-slate-300 p-2 text-right">Số lượng/Kỳ hạn</th>
                                            <th className="border border-slate-300 p-2 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Add-ons from session */}
                                        {session.addon_details && session.addon_details.length > 0 ? (
                                            session.addon_details.map((addon, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                                                    <td className="border border-slate-300 p-2">{addon.name}</td>
                                                    <td className="border border-slate-300 p-2 text-center">{addon.is_monthly_payment ? "Tháng" : "Lần"}</td>
                                                    <td className="border border-slate-300 p-2 text-right">
                                                        {addon.is_monthly_payment ? `${session.duration_months} tháng` : "1 gói"}
                                                    </td>
                                                    <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrencyFull(addon.price)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="border border-slate-300 p-2 text-center italic text-slate-400">Không có dịch vụ cộng thêm</td>
                                            </tr>
                                        )}

                                        {/* Insurance if exists */}
                                        {!!session.insurance_details && (
                                            <tr>
                                                <td className="border border-slate-300 p-2 text-center">#</td>
                                                <td className="border border-slate-300 p-2">Bảo hiểm hàng hóa: {session.insurance_details.name}</td>
                                                <td className="border border-slate-300 p-2 text-center">Gói</td>
                                                <td className="border border-slate-300 p-2 text-right">1</td>
                                                <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrencyFull(session.insurance_details.price)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* TOTAL SUMMARY */}
                            <div className="bg-slate-900 text-white p-6 rounded-xl space-y-4">
                                <h4 className="font-bold text-center uppercase border-b border-slate-700 pb-3">TỔNG HỢP GIÁ TRỊ THANH TOÁN (LẦN 1)</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Tạm tính trước thuế:</span>
                                        <span className="font-mono">{formatCurrencyFull((session.quotation?.grandTotal || 0) / 1.1)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Thuế GTGT (10%):</span>
                                        <span className="font-mono">{formatCurrencyFull((session.quotation?.grandTotal || 0) - ((session.quotation?.grandTotal || 0) / 1.1))}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-700 mt-2">
                                        <span className="font-bold text-lg">TỔNG CỘNG THANH TOÁN (A + B):</span>
                                        <span className="font-bold text-2xl text-teal-400">{formatCurrencyFull(session.quotation?.grandTotal || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
