'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon, CubeIcon } from '@heroicons/react/24/outline';
import * as HeroIcons from '@heroicons/react/24/outline';

// Icon map with Vietnamese and English keywords
const ICON_DATA: Array<{ name: string; keywords: string[] }> = [
    { name: 'WifiIcon', keywords: ['wifi', 'internet', 'mạng', 'không dây', 'wireless'] },
    { name: 'FireIcon', keywords: ['fire', 'lửa', 'nóng', 'hot', 'cháy'] },
    { name: 'BoltIcon', keywords: ['bolt', 'điện', 'electric', 'sét', 'lightning', 'power'] },
    { name: 'SunIcon', keywords: ['sun', 'mặt trời', 'ánh sáng', 'light', 'solar'] },
    { name: 'MoonIcon', keywords: ['moon', 'trăng', 'đêm', 'night'] },
    { name: 'CloudIcon', keywords: ['cloud', 'mây', 'sky', 'trời'] },
    { name: 'HomeIcon', keywords: ['home', 'nhà', 'house', 'căn hộ'] },
    { name: 'BuildingOfficeIcon', keywords: ['building', 'tòa nhà', 'văn phòng', 'office'] },
    { name: 'BuildingStorefrontIcon', keywords: ['store', 'cửa hàng', 'shop', 'bán hàng'] },
    { name: 'TruckIcon', keywords: ['truck', 'xe tải', 'vận chuyển', 'delivery', 'shipping'] },
    { name: 'ShoppingCartIcon', keywords: ['cart', 'giỏ hàng', 'shopping', 'mua sắm'] },
    { name: 'CubeIcon', keywords: ['cube', 'hộp', 'box', 'package', 'kiện hàng'] },
    { name: 'ArchiveBoxIcon', keywords: ['archive', 'lưu trữ', 'storage', 'kho'] },
    { name: 'InboxIcon', keywords: ['inbox', 'hộp thư', 'mail', 'thư'] },
    { name: 'EnvelopeIcon', keywords: ['envelope', 'thư', 'email', 'mail'] },
    { name: 'PhoneIcon', keywords: ['phone', 'điện thoại', 'call', 'gọi'] },
    { name: 'DevicePhoneMobileIcon', keywords: ['mobile', 'di động', 'smartphone'] },
    { name: 'ComputerDesktopIcon', keywords: ['computer', 'máy tính', 'desktop', 'pc'] },
    { name: 'TvIcon', keywords: ['tv', 'tivi', 'television', 'màn hình'] },
    { name: 'CameraIcon', keywords: ['camera', 'máy ảnh', 'chụp', 'photo'] },
    { name: 'VideoCameraIcon', keywords: ['video', 'quay phim', 'camera', 'filming'] },
    { name: 'MicrophoneIcon', keywords: ['microphone', 'mic', 'micro', 'âm thanh'] },
    { name: 'SpeakerWaveIcon', keywords: ['speaker', 'loa', 'âm thanh', 'sound', 'audio'] },
    { name: 'MusicalNoteIcon', keywords: ['music', 'nhạc', 'note', 'âm nhạc'] },
    { name: 'FilmIcon', keywords: ['film', 'phim', 'movie', 'video'] },
    { name: 'PhotoIcon', keywords: ['photo', 'ảnh', 'image', 'hình'] },
    { name: 'MapIcon', keywords: ['map', 'bản đồ', 'địa điểm', 'location'] },
    { name: 'MapPinIcon', keywords: ['pin', 'ghim', 'vị trí', 'marker', 'location'] },
    { name: 'GlobeAltIcon', keywords: ['globe', 'toàn cầu', 'world', 'thế giới'] },
    { name: 'ClockIcon', keywords: ['clock', 'đồng hồ', 'time', 'thời gian', 'giờ'] },
    { name: 'CalendarIcon', keywords: ['calendar', 'lịch', 'date', 'ngày'] },
    { name: 'BellIcon', keywords: ['bell', 'chuông', 'notification', 'thông báo'] },
    { name: 'ChatBubbleLeftIcon', keywords: ['chat', 'trò chuyện', 'message', 'tin nhắn'] },
    { name: 'UserIcon', keywords: ['user', 'người dùng', 'person', 'người'] },
    { name: 'UserGroupIcon', keywords: ['group', 'nhóm', 'team', 'đội'] },
    { name: 'UsersIcon', keywords: ['users', 'người dùng', 'people', 'nhiều người'] },
    { name: 'HeartIcon', keywords: ['heart', 'tim', 'yêu thích', 'love', 'favorite'] },
    { name: 'StarIcon', keywords: ['star', 'sao', 'đánh giá', 'rating'] },
    { name: 'SparklesIcon', keywords: ['sparkles', 'lấp lánh', 'magic', 'phép thuật'] },
    { name: 'GiftIcon', keywords: ['gift', 'quà', 'present', 'tặng'] },
    { name: 'ShieldCheckIcon', keywords: ['shield', 'khiên', 'bảo vệ', 'security', 'an ninh'] },
    { name: 'LockClosedIcon', keywords: ['lock', 'khóa', 'bảo mật', 'secure'] },
    { name: 'KeyIcon', keywords: ['key', 'chìa khóa', 'access', 'truy cập'] },
    { name: 'EyeIcon', keywords: ['eye', 'mắt', 'xem', 'view', 'nhìn'] },
    { name: 'HandThumbUpIcon', keywords: ['thumb', 'like', 'thích', 'good'] },
    { name: 'CurrencyDollarIcon', keywords: ['dollar', 'tiền', 'money', 'currency', 'tài chính'] },
    { name: 'BanknotesIcon', keywords: ['banknote', 'tiền mặt', 'cash', 'money'] },
    { name: 'CreditCardIcon', keywords: ['credit', 'thẻ', 'card', 'payment', 'thanh toán'] },
    { name: 'WrenchIcon', keywords: ['wrench', 'cờ lê', 'tool', 'công cụ', 'sửa chữa'] },
    { name: 'WrenchScrewdriverIcon', keywords: ['repair', 'sửa chữa', 'maintenance', 'bảo trì'] },
    { name: 'Cog6ToothIcon', keywords: ['cog', 'bánh răng', 'settings', 'cài đặt'] },
    { name: 'AdjustmentsHorizontalIcon', keywords: ['adjustments', 'điều chỉnh', 'settings', 'tùy chọn'] },
    { name: 'BeakerIcon', keywords: ['beaker', 'cốc thí nghiệm', 'lab', 'phòng thí nghiệm'] },
    { name: 'BookOpenIcon', keywords: ['book', 'sách', 'đọc', 'read'] },
    { name: 'AcademicCapIcon', keywords: ['academic', 'học thuật', 'education', 'giáo dục'] },
    { name: 'DocumentTextIcon', keywords: ['document', 'tài liệu', 'văn bản', 'text'] },
    { name: 'ClipboardDocumentListIcon', keywords: ['clipboard', 'danh sách', 'list', 'checklist'] },
    { name: 'PencilIcon', keywords: ['pencil', 'bút chì', 'write', 'viết', 'edit'] },
    { name: 'PrinterIcon', keywords: ['printer', 'máy in', 'print', 'in ấn'] },
    { name: 'PaperClipIcon', keywords: ['paperclip', 'kẹp giấy', 'attach', 'đính kèm'] },
    { name: 'FolderIcon', keywords: ['folder', 'thư mục', 'file', 'tệp'] },
    { name: 'ArrowPathIcon', keywords: ['refresh', 'làm mới', 'reload', 'sync'] },
    { name: 'ArrowUpTrayIcon', keywords: ['upload', 'tải lên', 'up'] },
    { name: 'ArrowDownTrayIcon', keywords: ['download', 'tải xuống', 'down'] },
    { name: 'SignalIcon', keywords: ['signal', 'tín hiệu', 'network', 'mạng'] },
    { name: 'RssIcon', keywords: ['rss', 'feed', 'tin tức', 'news'] },
    { name: 'LinkIcon', keywords: ['link', 'liên kết', 'url', 'đường dẫn'] },
    { name: 'ShareIcon', keywords: ['share', 'chia sẻ', 'send'] },
    { name: 'QrCodeIcon', keywords: ['qr', 'mã qr', 'code', 'scan'] },
    { name: 'BarsArrowUpIcon', keywords: ['bars', 'thanh', 'chart', 'biểu đồ'] },
    { name: 'ChartBarIcon', keywords: ['chart', 'biểu đồ', 'statistics', 'thống kê'] },
    { name: 'ChartPieIcon', keywords: ['pie', 'tròn', 'chart', 'biểu đồ'] },
    { name: 'PresentationChartLineIcon', keywords: ['presentation', 'thuyết trình', 'line chart'] },
    { name: 'TableCellsIcon', keywords: ['table', 'bảng', 'grid', 'lưới'] },
    { name: 'ViewColumnsIcon', keywords: ['columns', 'cột', 'layout', 'bố cục'] },
    { name: 'Squares2X2Icon', keywords: ['squares', 'ô vuông', 'grid', 'lưới'] },
    { name: 'RectangleGroupIcon', keywords: ['rectangle', 'chữ nhật', 'group', 'nhóm'] },
    { name: 'CircleStackIcon', keywords: ['stack', 'chồng', 'database', 'cơ sở dữ liệu'] },
    { name: 'ServerIcon', keywords: ['server', 'máy chủ', 'hosting'] },
    { name: 'CloudArrowUpIcon', keywords: ['cloud upload', 'tải lên mây', 'backup'] },
    { name: 'CloudArrowDownIcon', keywords: ['cloud download', 'tải xuống mây'] },
    { name: 'CommandLineIcon', keywords: ['command', 'dòng lệnh', 'terminal', 'code'] },
    { name: 'CodeBracketIcon', keywords: ['code', 'mã', 'programming', 'lập trình'] },
    { name: 'CpuChipIcon', keywords: ['cpu', 'chip', 'processor', 'vi xử lý'] },
    { name: 'Battery100Icon', keywords: ['battery', 'pin', 'power', 'năng lượng'] },
    { name: 'LightBulbIcon', keywords: ['lightbulb', 'bóng đèn', 'idea', 'ý tưởng', 'đèn'] },
    { name: 'TagIcon', keywords: ['tag', 'thẻ', 'label', 'nhãn'] },
    { name: 'TicketIcon', keywords: ['ticket', 'vé', 'coupon', 'phiếu'] },
    { name: 'ReceiptPercentIcon', keywords: ['receipt', 'hóa đơn', 'discount', 'giảm giá'] },
    { name: 'ShoppingBagIcon', keywords: ['bag', 'túi', 'shopping', 'mua sắm'] },
    { name: 'ScaleIcon', keywords: ['scale', 'cân', 'balance', 'cân bằng'] },
    { name: 'FunnelIcon', keywords: ['funnel', 'phễu', 'filter', 'lọc'] },
    { name: 'MegaphoneIcon', keywords: ['megaphone', 'loa phát', 'announcement', 'thông báo'] },
    { name: 'FlagIcon', keywords: ['flag', 'cờ', 'report', 'báo cáo'] },
    { name: 'BookmarkIcon', keywords: ['bookmark', 'đánh dấu', 'save', 'lưu'] },
    { name: 'PaperAirplaneIcon', keywords: ['paper airplane', 'máy bay giấy', 'send', 'gửi'] },
    { name: 'TrophyIcon', keywords: ['trophy', 'cúp', 'award', 'giải thưởng'] },
    { name: 'FireIcon', keywords: ['fire', 'lửa', 'hot', 'nóng'] },
];

// Function to get icon component by name
export const getIconComponent = (iconName: string): React.FC<React.SVGProps<SVGSVGElement>> | null => {
    const IconComponent = (HeroIcons as Record<string, React.FC<React.SVGProps<SVGSVGElement>>>)[iconName];
    return IconComponent || null;
};

interface IconPickerProps {
    value?: string;
    onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredIcons = useMemo(() => {
        if (!search.trim()) return ICON_DATA;

        const searchLower = search.toLowerCase();
        return ICON_DATA.filter(icon =>
            icon.name.toLowerCase().includes(searchLower) ||
            icon.keywords.some(kw => kw.toLowerCase().includes(searchLower))
        );
    }, [search]);

    const selectedIcon = value ? getIconComponent(value) : null;

    return (
        <div className="relative">
            {/* Trigger Button */}
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-start gap-3 h-12"
                style={{ borderRadius: '12px' }}
            >
                {selectedIcon ? (
                    <>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {React.createElement(selectedIcon, { className: "w-5 h-5 text-primary" })}
                        </div>
                        <span className="text-sm">{value?.replace('Icon', '')}</span>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CubeIcon className="w-5 h-5 text-primary/50" />
                        </div>
                        <span className="text-muted-foreground">Chọn icon...</span>
                    </>
                )}
            </Button>

            {/* Dropdown */}
            {
                isOpen && (
                    <div
                        className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover border rounded-xl shadow-lg p-3"
                        style={{ maxHeight: '400px' }}
                    >
                        {/* Search */}
                        <div className="relative mb-3">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm icon"
                                className="pl-9 h-9"
                                style={{ borderRadius: '8px' }}
                                autoFocus
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Icons Grid */}
                        <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                            <div className="grid grid-cols-6 gap-2">
                                {filteredIcons.map(({ name }) => {
                                    const IconComp = getIconComponent(name);
                                    if (!IconComp) return null;

                                    const isSelected = value === name;

                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => {
                                                onChange(name);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                            className={`
                                            relative p-2 rounded-lg flex items-center justify-center
                                            transition-all hover:bg-primary/10
                                            ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'}
                                        `}
                                            title={name.replace('Icon', '')}
                                        >
                                            <IconComp className={`w-5 h-5 ${isSelected ? 'text-primary' : ''}`} />
                                            {isSelected && (
                                                <CheckIcon className="absolute -top-1 -right-1 w-3.5 h-3.5 text-white bg-primary rounded-full p-0.5" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredIcons.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-8">
                                    Không tìm thấy icon phù hợp
                                </p>
                            )}
                        </div>

                        {/* Close button */}
                        <div className="mt-3 pt-3 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="w-full"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
