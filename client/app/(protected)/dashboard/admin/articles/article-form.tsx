"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ArticleService } from "@/services/article/article.service";
import { CategoryService } from "@/services/article/category.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArticleResponse, CreateArticleDto, ArticleType, ArticleStatus } from "@/types/article/article.type";
import { CategoryResponse } from "@/types/article/category.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/contacts/TiptapEditor";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const articleService = new ArticleService();
const categoryService = new CategoryService();

interface ArticleFormProps {
    initialData?: ArticleResponse;
    isEdit?: boolean;
}

export function ArticleForm({ initialData, isEdit = false }: ArticleFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    // Convert arrays back and forth
    const initialCategoryIds = initialData?.categories?.map(c => c.id) || [];
    const initialTags = initialData?.tags?.join(", ") || "";
    const initialKeywords = initialData?.seo_keywords?.join(", ") || "";

    const [formData, setFormData] = useState<any>({
        title: initialData?.title || "",
        slug: initialData?.slug || "",
        excerpt: initialData?.excerpt || "",
        content: initialData?.content || "",
        thumbnail: initialData?.thumbnail || "",
        type: initialData?.type || "BLOG",
        status: initialData?.status || "DRAFT",
        category_ids: initialCategoryIds.length > 0 ? initialCategoryIds[0] : "none", // For simple UI, select 1 category. The DTO accepts array, we wrap it later
        tags: initialTags,
        seo_title: initialData?.seo_title || "",
        seo_description: initialData?.seo_description || "",
        seo_keywords: initialKeywords,
        allow_comments: initialData?.allow_comments !== undefined ? initialData.allow_comments : true,
        is_featured: initialData?.is_featured || false,
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const data: any = await categoryService.getAllCategories(token, { limit: 1000 });
                let items: CategoryResponse[] = [];
                if (data?.items) items = data.items;
                else if (data?.data?.items) items = data.data.items;
                else if (Array.isArray(data)) items = data;
                else if (Array.isArray(data?.data)) items = data.data;

                setCategories(items);
            } catch (e) {
                console.error(e);
                toast.error("Không thể tải danh sách danh mục");
            }
        };
        fetchCategories();
    }, []);

    const handleSubmit = async () => {
        try {
            if (!formData.title.trim()) {
                toast.error("Vui lòng nhập tiêu đề bài viết");
                return;
            }
            if (!formData.content.trim()) {
                toast.error("Vui lòng nhập nội dung bài viết");
                return;
            }

            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) {
                toast.error("Lỗi xác thực, vui lòng đăng nhập lại");
                return;
            }

            // Prepare payload
            const submitData: CreateArticleDto = {
                title: formData.title,
                slug: formData.slug?.trim() ? formData.slug : undefined,
                excerpt: formData.excerpt,
                content: formData.content,
                thumbnail: formData.thumbnail,
                type: formData.type as ArticleType,
                status: formData.status as ArticleStatus,
                allow_comments: formData.allow_comments,
                is_featured: formData.is_featured,
                seo_title: formData.seo_title,
                seo_description: formData.seo_description,
            };

            // Process tags and keywords
            if (formData.tags) {
                submitData.tags = formData.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t);
            }
            if (formData.seo_keywords) {
                submitData.seo_keywords = formData.seo_keywords.split(",").map((t: string) => t.trim()).filter((t: string) => t);
            }

            // Process Category
            if (formData.category_ids && formData.category_ids !== "none") {
                submitData.category_ids = [formData.category_ids];
            }

            if (isEdit && initialData?.id) {
                await articleService.updateArticle(token, initialData.id, submitData);
                toast.success("Cập nhật bài viết thành công");
            } else {
                await articleService.createArticle(token, submitData);
                toast.success("Tạo bài viết thành công");
            }
            router.push("/dashboard/admin/articles");
        } catch (error: any) {
            console.error("Failed to save article", error);
            toast.error(error.message || "Có lỗi xảy ra khi lưu bài viết");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full" aria-label="Quay lại danh sách bài viết">
                        <Link href="/dashboard/admin/articles">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEdit ? "Chỉnh sửa Bài Viết" : "Viết Bài Mới"}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/admin/articles")}
                        disabled={loading}
                        className="rounded-xl px-6"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-xl px-8 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shadow-md active:scale-95 transition-all"
                    >
                        {loading ? "Đang lưu..." : isEdit ? "Cập nhật Bài Viết" : "Lưu Bài Viết"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-0 shadow-premium rounded-3xl overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-base font-semibold">Tiêu đề bài viết <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Nhập tiêu đề hấp dẫn..."
                                    className="text-lg font-medium py-6 bg-muted/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content" className="text-base font-semibold">Nội dung <span className="text-red-500">*</span></Label>
                                <div className="min-h-[400px]">
                                    <TiptapEditor
                                        content={formData.content}
                                        onChange={(html) => setFormData({ ...formData, content: html })}
                                        placeholder="Bắt đầu viết nội dung bài viết tại đây..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-premium rounded-3xl overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <h3 className="text-lg font-semibold border-b pb-2">Tóm tắt & Hiển thị</h3>

                            <div className="space-y-2">
                                <Label htmlFor="excerpt">Đoạn trích (Mô tả ngắn gọn)</Label>
                                <Textarea
                                    id="excerpt"
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Đoạn tóm tắt nội dung sẽ hiển thị ở danh sách bài viết..."
                                    className="bg-muted/30 min-h-[100px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="thumbnail">Ảnh thu nhỏ (Thumbnail URL)</Label>
                                <Input
                                    id="thumbnail"
                                    value={formData.thumbnail}
                                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="https://example.com/image.jpg"
                                    className="bg-muted/30"
                                />
                                {formData.thumbnail && (
                                    <div className="mt-4 rounded-xl overflow-hidden border bg-muted aspect-video w-full max-w-sm">
                                        <img src={formData.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-premium rounded-3xl overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <h3 className="text-lg font-semibold border-b pb-2">Tối ưu máy tìm kiếm (SEO)</h3>

                            <div className="space-y-2">
                                <Label htmlFor="seo_title">SEO Title</Label>
                                <Input
                                    id="seo_title"
                                    value={formData.seo_title}
                                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Để trống sẽ dùng tiêu đề bài viết"
                                    className="bg-muted/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="seo_description">SEO Description</Label>
                                <Textarea
                                    id="seo_description"
                                    value={formData.seo_description}
                                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Mô tả cho kết quả tìm kiếm Google..."
                                    className="bg-muted/30 min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="seo_keywords">SEO Keywords</Label>
                                <Input
                                    id="seo_keywords"
                                    value={formData.seo_keywords}
                                    onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Từ khóa 1, Từ khóa 2, Thẻ tìm kiếm..."
                                    className="bg-muted/30"
                                />
                            </div>

                            <div className="space-y-2 mt-4 pt-4 border-t">
                                <Label htmlFor="slug">Slug (Đường dẫn tĩnh ngầm định)</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Để trống sẽ tự tạo từ tiêu đề"
                                    className="bg-muted/30"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Setup */}
                <div className="space-y-6">
                    <Card className="border-0 shadow-premium rounded-3xl overflow-hidden sticky top-24">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-lg font-semibold border-b pb-2">Phân loại</h3>

                            <div className="space-y-2">
                                <Label htmlFor="status">Trạng thái</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger className="bg-muted/30 rounded-xl h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PUBLISHED">Công khai (Published)</SelectItem>
                                        <SelectItem value="DRAFT">Bản nháp (Draft)</SelectItem>
                                        <SelectItem value="HIDDEN">Ẩn (Hidden)</SelectItem>
                                        <SelectItem value="ARCHIVED">Lưu trữ (Archived)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Loại bài viết</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger className="bg-muted/30 rounded-xl h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BLOG">Blog</SelectItem>
                                        <SelectItem value="NEWS">Tin Tức</SelectItem>
                                        <SelectItem value="GUIDE">Hướng dẫn</SelectItem>
                                        <SelectItem value="ANNOUNCEMENT">Thông báo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Danh mục</Label>
                                <Select
                                    value={formData.category_ids}
                                    onValueChange={(val) => setFormData({ ...formData, category_ids: val })}
                                >
                                    <SelectTrigger className="bg-muted/30 rounded-xl h-11">
                                        <SelectValue placeholder="Chọn danh mục" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Không xếp loại --</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tags">Thẻ (Tags)</Label>
                                <Input
                                    id="tags"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    style={{ borderRadius: "12px" }}
                                    placeholder="Thẻ 1, Thẻ 2..."
                                    className="bg-muted/30"
                                />
                            </div>

                            <div className="pt-6 mt-6 border-t space-y-4">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Cài đặt khác</h3>

                                <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border">
                                    <Label htmlFor="is_featured" className="cursor-pointer font-medium mb-0">Bài viết nổi bật</Label>
                                    <Switch
                                        id="is_featured"
                                        checked={formData.is_featured}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                                    />
                                </div>

                                <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border">
                                    <Label htmlFor="allow_comments" className="cursor-pointer font-medium mb-0">Cho phép bình luận</Label>
                                    <Switch
                                        id="allow_comments"
                                        checked={formData.allow_comments}
                                        onCheckedChange={(checked) => setFormData({ ...formData, allow_comments: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
