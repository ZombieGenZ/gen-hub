"use client";

import React from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { formatCurrencyFull } from '@/lib/format-currency';
import type { RentalContractDetail } from '@/types/rental-contracts/rental-contracts.type';

interface ContractFullDocumentProps {
    contract: RentalContractDetail;
    scrollHeight?: string;
}

export function ContractFullDocument({ contract, scrollHeight = "h-[calc(100vh-260px)]" }: ContractFullDocumentProps) {
    const currentDate = new Date(contract.created_at);
    const startDate = new Date(contract.started_at);
    const endDate = new Date(contract.expired_at);

    const durationMonths =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

    const totalPrice = parseFloat(String(contract.total_price ?? 0));
    const finalPrice = parseFloat(String(contract.final_price ?? 0));
    const vatAmount = parseFloat(String(contract.vat_amount ?? 0));
    const discountAmount = (contract.discount_rate ?? 0) > 0
        ? totalPrice * (contract.discount_rate ?? 0)
        : 0;

    const depositPayment = contract.payments?.find(p => p.status === "PAID");
    const depositAmount = depositPayment?.amount ?? 0;

    const signedBy = contract.signers?.find(s => s.signed);
    const isSigned = !!signedBy?.signed;

    const warehouses = contract.warehouses?.length
        ? contract.warehouses
        : contract.details?.map(d => ({
            id: d.warehouse?.id || d.warehouse_template?.id || d.id,
            name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || "—",
        })) ?? [];

    const pmLabel = (pm?: string) =>
        pm === "TRANSFER" ? "Chuyển khoản ngân hàng"
        : pm === "BALANCE" ? "Số dư tài khoản"
        : pm === "HYBRID" ? "Kết hợp (Số dư + Chuyển khoản)"
        : "Chuyển khoản ngân hàng";

    return (
        <div className="bg-white p-12 shadow-sm border border-slate-200 rounded-none mx-auto max-w-4xl text-slate-900 font-serif leading-relaxed relative">
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
                <p className="text-base">Số: <span className="font-mono">{contract.code}</span></p>
            </div>

            <ScrollArea className={cn(scrollHeight, "pr-6 -mr-6")}>
                <div className="space-y-8 text-base text-justify">
                    {/* Căn cứ */}
                    <div className="space-y-2 italic text-slate-600">
                        <p>● Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
                        <p>● Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;</p>
                        <p>● Căn cứ vào nhu cầu và khả năng của hai bên.</p>
                    </div>

                    <p>
                        Hôm nay, ngày {format(currentDate, "dd", { locale: vi })} tháng {format(currentDate, "MM", { locale: vi })} năm {format(currentDate, "yyyy", { locale: vi })}, tại văn phòng Công ty TNHH GenHub Logistics, chúng tôi gồm:
                    </p>

                    {/* BÊN A */}
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

                    {/* BÊN B */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg border-b border-slate-100 pb-1 uppercase">BÊN B (Bên sử dụng dịch vụ)</h4>
                        <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1 pl-4">
                            <span className="font-semibold italic">Tên công ty:</span>
                            <span className="font-bold">{(contract.organization?.name ?? "—").toUpperCase()}</span>

                            <span className="font-semibold italic">Địa chỉ trụ sở:</span>
                            <span>....................................................</span>

                            <span className="font-semibold italic">Mã số thuế:</span>
                            <span>....................</span>

                            <span className="font-semibold italic">Đại diện bởi:</span>
                            <span>
                                Ông/Bà {(signedBy?.name ?? "").toUpperCase() || "...................."} — <span className="italic">Chức vụ:</span> {signedBy?.role || "...................."}
                            </span>
                        </div>
                    </div>

                    <p className="font-medium italic">Hai bên cùng thống nhất ký kết Hợp đồng với các điều khoản sau:</p>

                    {/* ĐIỀU 1 */}
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
                                    <li>
                                        <p className="font-bold">(a) Gói Thuê Kho Riêng Biệt (Thuê Nguyên Kho):</p>
                                        <p className="text-sm mt-1">Bên B thuê trọn gói toàn bộ diện tích nhà kho độc lập. Bên A bàn giao toàn bộ quyền kiểm soát ra vào. Bên B tự chịu trách nhiệm về nhân sự, thiết bị vận hành và quản lý hàng hóa bên trong.</p>
                                    </li>
                                    <li>
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

                    {/* ĐIỀU 2 */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-xl uppercase tracking-wide text-teal-800">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG, THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN</h4>
                        <div className="space-y-4 pl-4 border-l-2 border-teal-100">
                            <div>
                                <h5 className="font-bold italic">2.1. Thời hạn Hợp đồng và Gói dịch vụ</h5>
                                <p>Bên B đăng ký sử dụng dịch vụ với thời hạn là <strong>{durationMonths} tháng</strong>, kể từ ngày <strong>{format(startDate, "dd/MM/yyyy")}</strong> đến ngày <strong>{format(endDate, "dd/MM/yyyy")}</strong>.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.2. Giá trị Hợp đồng và Nguyên tắc tính phí</h5>
                                <p>Tổng giá trị hợp đồng là: <strong className="text-lg">{formatCurrencyFull(finalPrice)}</strong> (Đã bao gồm VAT).</p>
                                <p className="text-sm mt-1 italic">Chi tiết giá và các hạng mục được quy định cụ thể tại Phụ lục 01.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.3. Phương thức và Thời hạn thanh toán</h5>
                                <p>● Phương thức: <strong>{pmLabel(contract.payment_method)}</strong>.</p>
                                {depositAmount > 0 && (
                                    <p>● Đặt cọc: {formatCurrencyFull(depositAmount)}.</p>
                                )}
                                <p>● Hình thức: Chuyển khoản vào tài khoản ngân hàng của Bên A.</p>
                            </div>
                            <div>
                                <h5 className="font-bold italic">2.4. Xử lý vi phạm thanh toán</h5>
                                <p>Trường hợp chậm thanh toán, Bên B chịu lãi suất 0.05%/ngày. Nếu quá 90 ngày, Bên A có quyền đơn phương chấm dứt hợp đồng và giữ hàng để thu hồi nợ.</p>
                            </div>
                        </div>
                    </section>

                    {/* ĐIỀU 3 */}
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

                    {/* ĐIỀU 4-10 tóm tắt */}
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

                    {/* Ghi chú hủy hợp đồng */}
                    {contract.status === "CANCELLED" && contract.cancel_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm font-bold text-red-700 uppercase mb-1">Thông tin hủy hợp đồng</p>
                            <p className="text-sm text-red-700">Lý do: {contract.cancel_reason}</p>
                            {contract.cancelled_at && (
                                <p className="text-xs text-red-500 mt-0.5">
                                    Ngày hủy: {new Date(contract.cancelled_at).toLocaleDateString("vi-VN")}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ghi chú */}
                    {contract.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm font-bold text-amber-800 uppercase mb-1">Ghi chú</p>
                            <p className="text-sm text-amber-800 whitespace-pre-wrap">{contract.notes}</p>
                        </div>
                    )}

                    {/* Phần ký tên */}
                    <div className="grid grid-cols-2 gap-8 mt-8 pb-4">
                        <div className="text-center relative">
                            <h4 className="font-bold uppercase text-sm mb-2">ĐẠI DIỆN BÊN A</h4>
                            <p className="text-xs italic text-slate-500 mb-3">(Ký, đóng dấu)</p>
                            <div className="relative h-16 flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90">
                                    <Image
                                        src="/assets/genhub-stamp.png"
                                        alt="GenHub Stamp"
                                        width={80}
                                        height={80}
                                        className="w-20 h-20 object-contain"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                </div>
                                <Image
                                    src="/assets/genhub-signature.png"
                                    alt="GenHub Signature"
                                    width={72}
                                    height={40}
                                    className="w-18 h-10 object-contain relative z-10"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                            <div className="mt-3">
                                <p className="font-bold text-sm">Đặng Phạm Thành Thái</p>
                                <p className="text-xs italic text-slate-500">Chủ Doanh Nghiệp</p>
                            </div>
                        </div>

                        <div className="text-center relative">
                            <h4 className="font-bold uppercase text-sm mb-2">ĐẠI DIỆN BÊN B</h4>
                            <p className="text-xs italic text-slate-500 mb-3">(Ký và ghi rõ họ tên)</p>
                            <div className="h-16 flex items-center justify-center">
                                {isSigned && signedBy?.avatar ? (
                                    <div className="relative">
                                        <img
                                            src={signedBy.avatar}
                                            alt="Customer Signature"
                                            className="max-h-16 w-auto object-contain"
                                        />
                                        <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow border border-green-100">
                                            <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-1/2 h-0.5 bg-slate-200" />
                                )}
                            </div>
                            <div className="mt-3">
                                <p className="font-bold text-sm">{(contract.organization?.name ?? "—").toUpperCase()}</p>
                                {isSigned && signedBy?.signedAt && (
                                    <p className="text-[10px] text-green-600 font-mono mt-1">
                                        VERIFIED AT: {format(new Date(signedBy.signedAt), "HH:mm, dd/MM/yyyy")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PHỤ LỤC 01 */}
                    <div className="mt-16 pt-16 border-t-4 border-double border-slate-300">
                        <div className="text-center mb-10">
                            <h3 className="font-bold text-xl uppercase mb-2">PHỤ LỤC 01: BẢNG GIÁ DỊCH VỤ VÀ DANH SÁCH ĐỊA ĐIỂM THUÊ</h3>
                            <p className="italic text-sm">(Kèm theo Hợp đồng số {contract.code})</p>
                        </div>

                        <div className="space-y-10">
                            {/* I. Gói dịch vụ lưu trữ */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-teal-800">I. GÓI DỊCH VỤ LƯU TRỮ</h4>
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 uppercase text-[10px] tracking-wider">
                                            <th className="border border-slate-300 p-2 text-left">STT</th>
                                            <th className="border border-slate-300 p-2 text-left">Tên Kho & Địa chỉ</th>
                                            <th className="border border-slate-300 p-2 text-right">Kỳ hạn</th>
                                            <th className="border border-slate-300 p-2 text-right">Thành tiền (chưa VAT)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {warehouses.map((w, idx) => (
                                            <tr key={w.id ?? idx}>
                                                <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                                                <td className="border border-slate-300 p-2 font-medium">
                                                    {w.name}
                                                    <div className="text-[10px] font-normal text-slate-500 mt-0.5 italic">
                                                        Hệ thống kho bãi đạt chuẩn của Bên A
                                                    </div>
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right">
                                                    {durationMonths} tháng
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right font-bold">
                                                    {formatCurrencyFull(totalPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                        {discountAmount > 0 && (
                                            <tr className="bg-green-50/30 text-green-700">
                                                <td colSpan={3} className="border border-slate-300 p-2 text-right italic">
                                                    Chiết khấu ({Math.round((contract.discount_rate ?? 0) * 100)}%)
                                                </td>
                                                <td className="border border-slate-300 p-2 text-right font-bold">
                                                    -{formatCurrencyFull(discountAmount)}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* II. Dịch vụ cộng thêm & logistics */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg text-teal-800">II. DỊCH VỤ CỘNG THÊM & LOGISTICS</h4>
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 uppercase text-[10px] tracking-wider">
                                            <th className="border border-slate-300 p-2 text-left">STT</th>
                                            <th className="border border-slate-300 p-2 text-left">Hạng mục dịch vụ</th>
                                            <th className="border border-slate-300 p-2 text-center">Ghi chú</th>
                                            <th className="border border-slate-300 p-2 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(contract.addons ?? []).length > 0 || (contract.insurances ?? []).length > 0 ? (
                                            <>
                                                {(contract.addons ?? []).map((addon, idx) => (
                                                    <tr key={addon.id ?? idx}>
                                                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                                                        <td className="border border-slate-300 p-2">{addon.name}</td>
                                                        <td className="border border-slate-300 p-2 text-center text-slate-500">
                                                            {addon.is_gift ? "Tặng kèm" : "Trả phí"}
                                                        </td>
                                                        <td className="border border-slate-300 p-2 text-right font-mono">
                                                            {addon.is_gift ? "Miễn phí" : formatCurrencyFull(addon.price ?? 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(contract.insurances ?? []).map((ins, idx) => (
                                                    <tr key={ins.id ?? idx}>
                                                        <td className="border border-slate-300 p-2 text-center">#</td>
                                                        <td className="border border-slate-300 p-2">Bảo hiểm hàng hóa: {ins.name}</td>
                                                        <td className="border border-slate-300 p-2 text-center text-slate-500">Gói</td>
                                                        <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrencyFull(ins.price ?? 0)}</td>
                                                    </tr>
                                                ))}
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="border border-slate-300 p-2 text-center italic text-slate-400">
                                                    Không có dịch vụ cộng thêm
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Tổng hợp giá trị thanh toán */}
                            <div className="bg-slate-900 text-white p-6 rounded-xl space-y-4">
                                <h4 className="font-bold text-center uppercase border-b border-slate-700 pb-3">TỔNG HỢP GIÁ TRỊ THANH TOÁN</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Tạm tính trước thuế:</span>
                                        <span className="font-mono">{formatCurrencyFull(totalPrice)}</span>
                                    </div>
                                    {(contract.vat_rate ?? 0) > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Thuế GTGT ({Math.round((contract.vat_rate ?? 0) * 100)}%):</span>
                                            <span className="font-mono">{formatCurrencyFull(vatAmount)}</span>
                                        </div>
                                    )}
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Chiết khấu ({Math.round((contract.discount_rate ?? 0) * 100)}%):</span>
                                            <span className="font-mono text-green-400">-{formatCurrencyFull(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-700 mt-2">
                                        <span className="font-bold text-lg">TỔNG CỘNG THANH TOÁN:</span>
                                        <span className="font-bold text-2xl text-teal-400">{formatCurrencyFull(finalPrice)}</span>
                                    </div>
                                    {contract.auto_renew && (
                                        <p className="text-xs text-slate-500 italic pt-1">* Hợp đồng tự động gia hạn khi hết hạn.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
