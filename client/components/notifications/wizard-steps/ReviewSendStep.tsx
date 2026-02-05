
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useNotificationWizard } from "../NotificationWizardContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    InformationCircleIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    UsersIcon,
    ClockIcon,
    ExclamationTriangleIcon as WarningIcon,
    CalendarIcon,
} from "@heroicons/react/24/outline";
import { NotificationType } from "@/types/notification/notification.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { User } from "@/types/user/user.type";

const userService = new UserService();


const typeConfig: Record<NotificationType, { icon: any; bgColor: string; textColor: string; borderColor: string }> = {
    INFO: {
        icon: InformationCircleIcon,
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
    },
    WARNING: {
        icon: ExclamationTriangleIcon,
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
    },
    SUCCESS: {
        icon: CheckCircleIcon,
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
    },
    ERROR: {
        icon: ExclamationCircleIcon,
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
    },
};

const typeLabels: Record<NotificationType, string> = {
    INFO: "Thông tin",
    WARNING: "Cảnh báo",
    SUCCESS: "Thành công",
    ERROR: "Lỗi",
};

export function ReviewSendStep() {
    const { data, setData, setCanProceed, selectedUsers, isSubmitting, setIsSubmitting } = useNotificationWizard();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Fetch current user for preview fallback
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();
                if (token && refreshToken) {
                    const userData = await userService.getUser(token, refreshToken);
                    setCurrentUser(userData.user);
                }
            } catch (error) {
                console.error("Failed to fetch current user profile", error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Always valid on review step (unless scheduling without date)
    useEffect(() => {
        if (!data.sendImmediately && !data.scheduledAt) {
            setCanProceed(false);
        } else {
            setCanProceed(true);
        }
    }, [data.sendImmediately, data.scheduledAt, setCanProceed]);

    // Calculate recipient count
    const getRecipientCount = () => {
        switch (data.targetType) {
            case "individual":
                return selectedUsers.length;
            case "role":
                return data.selectedRoles.length * 50;
            case "broadcast":
                return 156;
            case "import":
                return data.importedUserIds.length;
            default:
                return 0;
        }
    };

    const recipientCount = getRecipientCount();
    const config = typeConfig[data.type];
    const TypeIcon = config.icon;

    // Get recipient label
    const getRecipientLabel = () => {
        switch (data.targetType) {
            case "individual":
                if (selectedUsers.length === 1) {
                    return selectedUsers[0].full_name;
                }
                return `${selectedUsers.length} người dùng`;
            case "role":
                const roleLabels: Record<string, string> = {
                    warehouse_owner: "Chủ kho",
                    staff: "Nhân viên",
                    customer: "Khách thuê",
                };
                return data.selectedRoles.map(r => roleLabels[r]).join(", ");
            case "broadcast":
                return "Tất cả người dùng";
            case "import":
                return `${data.importedUserIds.length} người từ file`;
            default:
                return "";
        }
    };

    // Replace variables in content for preview with REAL data
    const getPreviewContent = () => {
        let content = data.content;

        // Priority: First selected user -> Current User (Sender) -> Fallback
        const previewUser = selectedUsers[0] || currentUser;

        if (previewUser) {
            const user = previewUser as any;
            const name = user.full_name || user.name;
            const email = user.email || "email@example.com";

            content = content.replace(/\{\{full_name\}\}/g, name || "Người dùng");
            content = content.replace(/\{\{email\}\}/g, email);
        } else {
            content = content.replace(/\{\{full_name\}\}/g, "Nguyễn Văn A");
            content = content.replace(/\{\{email\}\}/g, "nguyen.a@example.com");
        }

        return content;
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setData({ scheduledAt: date.toISOString() });
        } else {
            setData({ scheduledAt: undefined });
        }
    };

    return (
        <div className="review-send-step space-y-8">
            <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Xem trước & Gửi</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Kiểm tra lại thông tin trước khi gửi đi
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Left Column: Preview */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live Preview */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Xem trước thông báo</Label>
                        <div className={cn(
                            "relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md",
                            config.borderColor
                        )}>
                            {/* Accent Bar */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", config.bgColor.replace('bg-', 'bg-').replace('50', '500'))} />

                            <div className="p-5 pl-7 flex items-start gap-4">
                                <div className={cn("p-2.5 rounded-full shrink-0", config.bgColor)}>
                                    <TypeIcon className={cn("w-6 h-6", config.textColor)} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-4">
                                        <h4 className="font-semibold text-lg text-foreground leading-tight">{data.title}</h4>
                                        <span className="text-xs font-medium text-muted-foreground shrink-0 bg-muted px-2 py-1 rounded-full">Vừa xong</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                                        {getPreviewContent()}
                                    </p>

                                    {data.actionType !== "none" && (
                                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Hành động đính kèm:</span>
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {data.actionLink || "Liên kết"}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-center sm:text-left text-muted-foreground px-1">
                            * Nội dung hiển thị đang sử dụng dữ liệu của:
                            <span className="font-medium text-foreground ml-1">
                                {selectedUsers[0] ? selectedUsers[0].full_name : (currentUser?.name || "Người dùng mẫu")}
                            </span>
                        </p>
                    </div>

                    {/* Send Options */}
                    <div className="space-y-4 pt-4">
                        <Label className="text-base font-semibold">Tùy chọn gửi</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Send Immediately Option */}
                            <button
                                type="button"
                                onClick={() => setData({ sendImmediately: true, scheduledAt: undefined })}
                                className={cn(
                                    "flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group hover:shadow-md",
                                    data.sendImmediately
                                        ? "border-[#0F766E] bg-teal-50/50"
                                        : "border-border bg-card hover:border-[#0F766E]/30"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    data.sendImmediately ? "bg-teal-100 text-[#0F766E]" : "bg-muted text-muted-foreground"
                                )}>
                                    <ClockIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={cn("font-bold text-sm", data.sendImmediately ? "text-[#0F766E]" : "text-foreground")}>Gửi ngay lập tức</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Thông báo sẽ được gửi đi ngay sau khi bạn xác nhận lệnh này
                                    </p>
                                </div>
                                {data.sendImmediately && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0F766E]" />
                                )}
                            </button>

                            {/* Schedule Option */}
                            <div className={cn(
                                "flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group hover:shadow-md",
                                !data.sendImmediately
                                    ? "border-[#0F766E] bg-teal-50/50"
                                    : "border-border bg-card hover:border-[#0F766E]/30"
                            )}
                            >
                                {/* Invisible overlay to select mode when clicking anywhere on the card */}
                                <div
                                    className="absolute inset-0 z-0 cursor-pointer"
                                    onClick={() => !data.scheduledAt && setData({ sendImmediately: false })}
                                />

                                <div className={cn(
                                    "p-2 rounded-lg transition-colors relative z-10 pointer-events-none",
                                    !data.sendImmediately ? "bg-teal-100 text-[#0F766E]" : "bg-muted text-muted-foreground"
                                )}>
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                <div className="relative z-10 w-full pointer-events-none">
                                    <p className={cn("font-bold text-sm", !data.sendImmediately ? "text-[#0F766E]" : "text-foreground")}>Hẹn giờ gửi</p>
                                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                                        Chọn thời điểm gửi thông báo
                                    </p>
                                </div>

                                {/* Date Picker - Clickable */}
                                <div className="relative z-20 w-full" onClick={(e) => e.stopPropagation()}>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-9 text-xs",
                                                    !data.scheduledAt && "text-muted-foreground",
                                                    data.sendImmediately && "opacity-50"
                                                )}
                                                onClick={() => setData({ sendImmediately: false })}
                                            >
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                {data.scheduledAt ? format(new Date(data.scheduledAt), "PPP p", { locale: vi }) : <span>Chọn ngày giờ</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={data.scheduledAt ? new Date(data.scheduledAt) : undefined}
                                                onSelect={handleDateSelect}
                                                initialFocus
                                                disabled={(date) => date < new Date()}
                                            />
                                            <div className="p-3 border-t border-border">
                                                <Label className="text-xs mb-2 block">Thời gian (HH:MM)</Label>
                                                <input
                                                    type="time"
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={data.scheduledAt ? format(new Date(data.scheduledAt), "HH:mm") : ""}
                                                    onChange={(e) => {
                                                        const time = e.target.value;
                                                        if (!time) return;

                                                        const [hours, minutes] = time.split(':').map(Number);
                                                        const date = data.scheduledAt ? new Date(data.scheduledAt) : new Date();
                                                        date.setHours(hours);
                                                        date.setMinutes(minutes);
                                                        handleDateSelect(date);
                                                    }}
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {!data.sendImmediately && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0F766E]" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="space-y-6">
                    <div className="bg-muted/30 rounded-2xl p-5 border border-border/50 space-y-5">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <InformationCircleIcon className="w-5 h-5 text-muted-foreground" />
                            Tóm tắt
                        </h4>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Đối tượng</span>
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">{getRecipientLabel()}</span>
                                    <Badge variant="secondary" className="shrink-0">{recipientCount}</Badge>
                                </div>
                            </div>

                            <div className="h-px bg-border/50" />

                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Loại</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(config.bgColor, config.textColor, config.borderColor, "border")}>
                                        {typeLabels[data.type]}
                                    </Badge>
                                </div>
                            </div>

                            <div className="h-px bg-border/50" />

                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Thời gian gửi</span>
                                <div className="flex items-center gap-2 min-h-[24px]">
                                    <span className="text-sm font-medium text-foreground">
                                        {data.sendImmediately
                                            ? "Gửi ngay lập tức"
                                            : (data.scheduledAt
                                                ? format(new Date(data.scheduledAt), "HH:mm, dd/MM/yyyy", { locale: vi })
                                                : "Chưa chọn thời gian")
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-border/50" />

                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Hành động</span>
                                <div className="flex items-center gap-2 min-h-[24px]">
                                    <span className="text-sm font-medium text-foreground">
                                        {data.actionType === "none" ? "Không có" : (data.actionType === "external_link" ? "Mở liên kết ngoài" : "Mở trang nội bộ")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning for large recipient count */}
                    {recipientCount > 10 && (
                        <div className="bg-yellow-50/80 border border-yellow-200 rounded-2xl p-4 animate-in zoom-in-95">
                            <div className="flex items-start gap-3">
                                <WarningIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-yellow-800">
                                        Lưu ý quan trọng
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-1 leading-snug">
                                        Bạn sắp gửi thông báo đến <strong>{recipientCount}</strong> người. Hãy kiểm tra kỹ nội dung vì thao tác này không thể hoàn tác.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal for large sends */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <DialogTitle className="text-center">Xác nhận gửi thông báo?</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            Thông báo sẽ được gửi đến <strong>{recipientCount}</strong> người dùng.
                            <br />Bạn có chắc chắn muốn tiếp tục không?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="sm:w-32">
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={() => setShowConfirmModal(false)}
                            className="bg-[#0F766E] hover:bg-[#0D655D] sm:w-32"
                        >
                            Đồng ý gửi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
