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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ContactTagsService } from "@/services/contact-tags/contact-tags.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import { ContactTag } from "@/types/contact/contact-tag.type";

const contactTagsService = new ContactTagsService();

const formSchema = z.object({
    name: z.string().min(1, "Tên nhãn không được để trống"),
    description: z.string().optional(),
    color: z.string().min(1, "Màu sắc không được để trống"),
    is_active: z.boolean(),
});

interface EditTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tag: ContactTag | null;
    onSuccess: () => void;
}

const PRESET_COLORS = [
    "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981",
    "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#D946EF",
    "#F43F5E", "#64748B"
];

export function EditTagDialog({ open, onOpenChange, tag, onSuccess }: EditTagDialogProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            color: "#3B82F6",
            is_active: true,
        },
    });

    useEffect(() => {
        if (tag) {
            form.reset({
                name: tag.name,
                description: tag.description || "",
                color: tag.color || "#3B82F6",
                is_active: tag.is_active,
            });
        }
    }, [tag, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!tag) return;
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            await contactTagsService.update(token, tag.id, values);
            showToast("Đã cập nhật nhãn", "success");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to update tag", error);
            showToast(error.message || "Không thể cập nhật nhãn", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa nhãn</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin nhãn dán.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tên nhãn</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mô tả</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Mô tả ngắn gọn về nhãn này..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Màu sắc</FormLabel>
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === color ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => field.onChange(color)}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="color"
                                                className="w-12 h-10 p-1 cursor-pointer"
                                                {...field}
                                            />
                                            <span className="text-sm text-slate-500 uppercase">{field.value}</span>
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center space-x-2">
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 w-full">
                                        <FormControl>
                                            <Input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="w-4 h-4"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Kích hoạt
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

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
