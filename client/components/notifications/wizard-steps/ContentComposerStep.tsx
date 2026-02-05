"use client";

import { useEffect, useState } from "react";
import { useNotificationWizard } from "../NotificationWizardContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    InformationCircleIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    LinkIcon,
    ArrowTopRightOnSquareIcon,
    HomeIcon,
} from "@heroicons/react/24/outline";
import { NotificationType, NotificationActionType } from "@/types/notification/notification.type";

const TITLE_MAX_LENGTH = 255;

interface TypeOption {
    id: NotificationType;
    label: string;
    icon: any;
    bgColor: string;
    textColor: string;
    borderColor: string;
}

const typeOptions: TypeOption[] = [
    {
        id: "INFO",
        label: "Thông tin",
        icon: InformationCircleIcon,
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        borderColor: "border-blue-300",
    },
    {
        id: "WARNING",
        label: "Cảnh báo",
        icon: ExclamationTriangleIcon,
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-300",
    },
    {
        id: "SUCCESS",
        label: "Thành công",
        icon: CheckCircleIcon,
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        borderColor: "border-green-300",
    },
    {
        id: "ERROR",
        label: "Lỗi",
        icon: ExclamationCircleIcon,
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        borderColor: "border-red-300",
    },
];

interface ActionOption {
    id: NotificationActionType;
    label: string;
    icon: any;
}

const actionOptions: ActionOption[] = [
    { id: "none", label: "Không có", icon: null },
    { id: "external_link", label: "Mở liên kết", icon: ArrowTopRightOnSquareIcon },
    { id: "internal_link", label: "Mở trang nội bộ", icon: HomeIcon },
];

// Variable buttons for personalization
const variableButtons = [
    { label: "{{full_name}}", description: "Tên người nhận" },
    { label: "{{email}}", description: "Email người nhận" },
];

export function ContentComposerStep() {
    const { data, setData, setCanProceed } = useNotificationWizard();
    const [titleLength, setTitleLength] = useState(data.title.length);

    // Validate and update canProceed
    useEffect(() => {
        const isValid = data.title.trim().length > 0 && data.content.trim().length > 0;
        setCanProceed(isValid);
    }, [data.title, data.content, setCanProceed]);

    const handleTitleChange = (value: string) => {
        if (value.length <= TITLE_MAX_LENGTH) {
            setData({ title: value });
            setTitleLength(value.length);
        }
    };

    const insertVariable = (variable: string) => {
        setData({ content: data.content + variable });
    };

    return (
        <div className="content-composer-step space-y-8">
            <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold tracking-tight text-foreground">Soạn nội dung thông báo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Tạo nội dung thông báo hấp dẫn cho người nhận
                </p>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-2">
                {/* Notification Type */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Loại thông báo</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {typeOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = data.type === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setData({ type: option.id })}
                                    className={cn(
                                        "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-sm",
                                        isSelected
                                            ? cn(option.bgColor, option.borderColor, "shadow-sm ring-1 ring-offset-0", option.textColor.replace('text-', 'ring-'))
                                            : "border-border bg-card hover:border-muted-foreground/20 hover:bg-muted/5"
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", isSelected ? option.textColor : "text-muted-foreground")} />
                                    <span className={cn("text-sm font-medium", isSelected ? option.textColor : "text-foreground")}>
                                        {option.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="title" className="text-base font-semibold">Tiêu đề <span className="text-red-500">*</span></Label>
                        <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full bg-muted",
                            titleLength > TITLE_MAX_LENGTH * 0.9 ? "text-red-500" : "text-muted-foreground"
                        )}>
                            {titleLength}/{TITLE_MAX_LENGTH}
                        </span>
                    </div>
                    <Input
                        id="title"
                        placeholder="Nhập tiêu đề thông báo..."
                        value={data.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className={cn(
                            "h-12 text-base rounded-xl border-muted bg-muted/30 focus:bg-background transition-all",
                            !data.title.trim() && data.title !== "" && "border-red-300 focus:border-red-500 ring-red-200"
                        )}
                    />
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Label htmlFor="content" className="text-base font-semibold">Nội dung <span className="text-red-500">*</span></Label>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground mr-1 self-center">Chèn biến:</span>
                            {variableButtons.map((variable) => (
                                <button
                                    key={variable.label}
                                    type="button"
                                    onClick={() => insertVariable(variable.label)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    title={variable.description}
                                >
                                    {variable.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Textarea
                        id="content"
                        placeholder="Nhập nội dung thông báo..."
                        value={data.content}
                        onChange={(e) => setData({ content: e.target.value })}
                        rows={6}
                        className={cn(
                            "resize-none rounded-xl border-muted bg-muted/30 focus:bg-background transition-all p-4 text-base leading-relaxed",
                            !data.content.trim() && data.content !== "" && "border-red-300 focus:border-red-500 ring-red-200"
                        )}
                    />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                        <InformationCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                        <p>
                            Sử dụng các biến số ở trên để cá nhân hóa tin nhắn cho từng người nhận.
                            Ví dụ: "Chào <span className="font-mono bg-muted px-1 rounded text-foreground">{'{{full_name}}'}</span>, hợp đồng của bạn đã được duyệt."
                        </p>
                    </div>
                </div>

                {/* Action */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Hành động (Tùy chọn)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {actionOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = data.actionType === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setData({ actionType: option.id, actionLink: "" })}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:shadow-sm text-left",
                                        isSelected
                                            ? "border-[#0F766E] bg-[#0F766E]/5 text-[#0F766E]"
                                            : "border-muted bg-card hover:border-[#0F766E]/30"
                                    )}
                                >
                                    {Icon && <Icon className="w-5 h-5 shrink-0" />}
                                    <span className="text-sm font-medium">{option.label}</span>
                                    {isSelected && <div className="ml-auto w-2 h-2 rounded-full bg-[#0F766E]" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Link Input */}
                    {data.actionType !== "none" && (
                        <div className="relative animate-in fade-in slide-in-from-top-2">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder={
                                    data.actionType === "external_link"
                                        ? "Nhập đường dẫn (VD: https://example.com)..."
                                        : "Nhập đường dẫn nội bộ (VD: /contracts/123)..."
                                }
                                value={data.actionLink}
                                onChange={(e) => setData({ actionLink: e.target.value })}
                                className="pl-11 h-12 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
