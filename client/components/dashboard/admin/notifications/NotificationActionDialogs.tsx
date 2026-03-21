import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { BellAlertIcon } from "@heroicons/react/24/outline";
import { NotificationWizard } from "@/components/notifications/NotificationWizard";
import { UserNotification, NotificationType } from "@/types/notification/notification.type";
import { formatDateTime } from "@/lib/format-time";

interface SentNotification extends UserNotification {
    recipient_name: string;
    recipient_count?: number;
    sender_name: string;
    status: 'sent' | 'failed';
    creator?: { name: string; email: string };
}

interface NotificationActionDialogsProps {
    isBulkDeleteDialogOpen: boolean;
    setIsBulkDeleteDialogOpen: (val: boolean) => void;
    isBulkActionLoading: boolean;
    handleBulkDelete: () => void;
    selectedIdsLength: number;
    isComposeOpen: boolean;
    setIsComposeOpen: (val: boolean) => void;
    handleComposeSuccess: () => void;
    selectedNotification: SentNotification | null;
    setSelectedNotification: (val: SentNotification | null) => void;
    typeBadgeConfig: Record<NotificationType, { label: string; className: string; icon: any }>;
}

export function NotificationActionDialogs({
    isBulkDeleteDialogOpen,
    setIsBulkDeleteDialogOpen,
    isBulkActionLoading,
    handleBulkDelete,
    selectedIdsLength,
    isComposeOpen,
    setIsComposeOpen,
    handleComposeSuccess,
    selectedNotification,
    setSelectedNotification,
    typeBadgeConfig,
}: NotificationActionDialogsProps) {
    return (
        <>
            {/* Bulk Delete Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={(open) => { if (!isBulkActionLoading) setIsBulkDeleteDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🗑️ Xóa thông báo</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIdsLength} thông báo</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">⚠️ Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkActionLoading} className="transition-all duration-200 rounded-xl">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="gap-2 min-w-[120px] transition-all duration-200 rounded-xl">
                            {isBulkActionLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><BellAlertIcon className="w-4 h-4" /> Xóa {selectedIdsLength} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Compose Dialog */}
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                <DialogContent className="w-[95vw] max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle>Tạo thông báo mới</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-premium">
                        <NotificationWizard
                            onSuccess={handleComposeSuccess}
                            onCancel={() => setIsComposeOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Notification Detail Dialog */}
            <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
                <DialogContent className="rounded-2xl sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-foreground pr-8">{selectedNotification?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nội dung</span>
                            <p className="text-sm mt-2 leading-relaxed text-foreground/90 whitespace-pre-wrap">{selectedNotification?.content}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Loại</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {selectedNotification && (
                                        <div className={selectedNotification ? "text-primary" : ""}>
                                            {/* @ts-ignore */}
                                            {React.createElement(typeBadgeConfig[selectedNotification.type].icon, { className: "w-4 h-4" })}
                                        </div>
                                    )}
                                    <p className="text-sm font-medium">{selectedNotification && typeBadgeConfig[selectedNotification.type].label}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Đối tượng</span>
                                <p className="text-sm font-medium mt-0.5">{selectedNotification?.recipient_name}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Thời gian gửi</span>
                                <p className="text-sm font-medium mt-0.5">
                                    {selectedNotification && formatDateTime(selectedNotification.created_at)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Người gửi</span>
                                <p className="text-sm font-medium mt-0.5 text-primary">{selectedNotification?.sender_name}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4 border-t mt-4">
                        <Button variant="secondary" onClick={() => setSelectedNotification(null)} className="rounded-xl px-8">
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
