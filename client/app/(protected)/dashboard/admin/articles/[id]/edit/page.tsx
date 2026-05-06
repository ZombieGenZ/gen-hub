"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ArticleService } from "@/services/article/article.service";
import { ArticleForm } from "../../article-form";
import { ArticleResponse } from "@/types/article/article.type";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/ToastContext";
const articleService = new ArticleService();

export default function EditArticlePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { showToast } = useToast();

    const [article, setArticle] = useState<ArticleResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) {
                    router.push("/auth/login");
                    return;
                }
                const data: any = await articleService.getArticleById(token, id);
                setArticle(data);
            } catch (error: any) {
                console.error("Failed to load article", error);
                showToast("Không tìm thấy bài viết hoặc có lỗi kết nối", "error");
                router.push("/dashboard/admin/articles");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchArticle();
        }
    }, [id, router]);

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto p-6">
                <Skeleton className="h-12 w-64 mb-10" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-96 w-full rounded-3xl" />
                        <Skeleton className="h-48 w-full rounded-3xl" />
                    </div>
                    <div>
                        <Skeleton className="h-[400px] w-full rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!article) return null;

    return <ArticleForm initialData={article} isEdit={true} />;
}
