"use client";

import React, { useState, useEffect } from "react";
import { ContactTagsService } from "@/services/contact-tags/contact-tags.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactTag } from "@/types/contact/contact-tag.type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    TrashIcon,
    TagIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { CreateTagDialog } from "./components/create-tag-dialog";
import { EditTagDialog } from "./components/edit-tag-dialog";

const contactTagsService = new ContactTagsService();

export default function ContactTagsPage() {
    const [tags, setTags] = useState<ContactTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<ContactTag | null>(null);

    const { showToast } = useToast();

    const fetchTags = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const response = await contactTagsService.getAll(token, {
                search,
                sort_by: "created_at",
                sort_order: "DESC",
            });

            if (response && response.data) {
                setTags(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch contact tags", error);
            showToast("Không thể tải danh sách tags", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa tag này?")) return;

        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await contactTagsService.delete(token, id);
            showToast("Đã xóa tag thành công", "success");
            fetchTags();
        } catch (error) {
            console.error("Failed to delete tag", error);
            showToast("Không thể xóa tag", "error");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="font-bold text-slate-900" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Tags
                    </h1>
                    <p className="text-slate-500 mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý tags để phân loại và tổ chức liên hệ.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2" style={{ borderRadius: "12px" }}>
                    <PlusIcon className="w-4 h-4" />
                    Tạo tag mới
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 shadow-sm border border-slate-100 rounded-2xl">
                <div className="relative max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm tags..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ borderRadius: "12px" }}
                    />
                </div>
            </div>

            {/* Tags Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
                    ))
                ) : tags.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-3xl shadow-premium border border-dashed border-slate-200">
                        <TagIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p>Chưa có tag nào. Hãy tạo tag mới ngay!</p>
                    </div>
                ) : (
                    tags.map((tag) => (
                        <div
                            key={tag.id}
                            className="bg-white p-5 shadow-premium hover:shadow-lg transition-all border border-slate-100 group relative flex flex-col justify-between"
                            style={{ borderRadius: "20px" }}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span
                                        className="inline-block w-8 h-8 rounded-full"
                                        style={{ backgroundColor: tag.color || "#e2e8f0" }}
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <EllipsisHorizontalIcon className="w-5 h-5 text-slate-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditingTag(tag)}>
                                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                Chỉnh sửa
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                onClick={() => handleDelete(tag.id)}
                                            >
                                                <TrashIcon className="w-4 h-4 mr-2" />
                                                Xóa
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-1 truncate" title={tag.name}>
                                    {tag.name}
                                </h3>
                                <p className="text-slate-500 text-sm line-clamp-2" title={tag.description}>
                                    {tag.description || "Không có mô tả"}
                                </p>
                            </div>
                            {/* Usage count could go here if available */}
                        </div>
                    ))
                )}
            </div>

            <CreateTagDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={fetchTags}
            />

            {editingTag && (
                <EditTagDialog
                    open={!!editingTag}
                    onOpenChange={(open) => !open && setEditingTag(null)}
                    tag={editingTag}
                    onSuccess={fetchTags}
                />
            )}
        </div>
    );
}
