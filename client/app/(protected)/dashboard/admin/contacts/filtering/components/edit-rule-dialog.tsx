"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ContactListService } from "@/services/contact-list/contact-list.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import { ContactListType, ContactListMatchType, ContactListEntry } from "@/types/contact/contact-list.type";

const contactListService = new ContactListService();

const formSchema = z.object({
    list_type: z.nativeEnum(ContactListType),
    match_type: z.nativeEnum(ContactListMatchType),
    value: z.string().min(1, "Giá trị không được để trống"),
    reason: z.string().optional(),
    notes: z.string().optional(),
    is_active: z.boolean(),
});

interface EditRuleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: ContactListEntry | null;
    onSuccess: () => void;
}

export function EditRuleDialog({ open, onOpenChange, entry, onSuccess }: EditRuleDialogProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            list_type: ContactListType.BLACKLIST,
            match_type: ContactListMatchType.EMAIL,
            value: "",
            reason: "",
            notes: "",
            is_active: true,
        },
    });

    useEffect(() => {
        if (entry) {
            form.reset({
                list_type: entry.list_type,
                match_type: entry.match_type,
                value: entry.value,
                reason: entry.reason || "",
                notes: entry.notes || "",
                is_active: entry.is_active,
            });
        }
    }, [entry, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!entry) return;
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            await contactListService.update(token, entry.id, values);
            showToast("Đã cập nhật quy tắc", "success");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to update rule", error);
            showToast(error.message || "Không thể cập nhật quy tắc", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa quy tắc</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin quy tắc lọc.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="list_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loại danh sách</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn loại" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={ContactListType.BLACKLIST}>Blacklist (Chặn)</SelectItem>
                                                <SelectItem value={ContactListType.WHITELIST}>Whitelist (Ưu tiên)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="match_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kiểu khớp</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn kiểu" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={ContactListMatchType.EMAIL}>Email cụ thể</SelectItem>
                                                <SelectItem value={ContactListMatchType.EMAIL_DOMAIN}>Tên miền Email</SelectItem>
                                                <SelectItem value={ContactListMatchType.IP_V4}>Địa chỉ IPv4</SelectItem>
                                                <SelectItem value={ContactListMatchType.IP_V6}>Địa chỉ IPv6</SelectItem>
                                                <SelectItem value={ContactListMatchType.REGION_COUNTRY}>Quốc gia</SelectItem>
                                                <SelectItem value={ContactListMatchType.REGION_CITY}>Thành phố</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Giá trị</FormLabel>
                                    <FormControl>
                                        <Input placeholder="VD: spam@example.com hoặc @spam.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lý do (Tùy chọn)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="VD: Spam quảng cáo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ghi chú nội bộ</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ghi chú thêm cho quản trị viên..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
