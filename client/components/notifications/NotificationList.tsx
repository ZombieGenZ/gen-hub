// components/notifications/NotificationList.tsx
'use client';

import { Bell, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export interface Notification {
    id: string;
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

export function NotificationList() {
  // Dữ liệu mẫu, bạn có thể thay thế bằng dữ liệu từ API
    const notifications: Notification[] = [
        {
        id: '1',
        type: 'success',
        title: 'Đơn hàng đã được xác nhận',
        message: 'Đơn hàng #12345 của bạn đã được xác nhận thành công',
        time: '10 phút trước',
        read: false
        },
        {
        id: '2',
        type: 'warning',
        title: 'Cảnh báo thanh toán',
        message: 'Vui lòng thanh toán đơn hàng #12345 trước 24h',
        time: '2 giờ trước',
        read: false
        },
        // Thêm các thông báo khác...
    ];

    const getIcon = (type: string) => {
        switch (type) {
        case 'success':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'warning':
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        default:
            return <Clock className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Thông báo</h3>
            <button className="text-sm text-blue-500 hover:text-blue-600">
                Đánh dấu tất cả đã đọc
            </button>
            </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
                Không có thông báo mới
            </div>
            ) : (
            notifications.map((notification) => (
                <div
                key={notification.id}
                className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                >
                <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900 dark:text-white">
                        {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                        {notification.time}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {notification.message}
                    </p>
                    </div>
                    {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                </div>
                </div>
            ))
            )}
        </div>
        
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
            <button className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
            Xem tất cả thông báo
            </button>
        </div>
        </div>
    );
}