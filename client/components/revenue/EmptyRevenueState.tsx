"use client";

import { InboxIcon } from "@heroicons/react/24/outline";

export function EmptyRevenueState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <InboxIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Không có dữ liệu doanh thu
            </h3>
            <p className="text-sm text-slate-500 max-w-md">
                Không tìm thấy dữ liệu doanh thu nào cho khoảng thời gian và bộ lọc đã chọn. Vui lòng điều chỉnh bộ lọc hoặc chọn khoảng thời gian khác để xem dữ liệu.
            </p>
        </div>
    );
}
