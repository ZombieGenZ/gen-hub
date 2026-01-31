"use client";

import React, { useEffect, useState } from "react";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization } from "@/types/organization/organization.type";
import { authStorage } from '@/services/auth/auth-storage.service';
import { useDebounce } from "@/hooks/use-debounce";

import { useRouter } from "next/navigation";
import { Plus, Users, Search, MoreVertical, Building2, Filter, ArrowUpDown } from "lucide-react";

const organizationService = new OrganizationService();

export default function OrganizationPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push('/login');
                return;
            }
            const response = await organizationService.getOrganizations(token, { limit: 10 });
            if (!Array.isArray(response.items)) {
                throw new Error('Expected an array of organizations');
            }
            setOrganizations(response.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    return (
        <div className="flex-1 bg-slate-50/50">


            <main className="p-4 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-brand bg-brand-subtle p-1.5 rounded-lg" />
                            Quản lý Tổ chức
                        </h1>
                        <p className="text-slate-500 mt-1">Quản lý danh sách các công ty và đối tác trong hệ thống.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand-active transition-all shadow-md shadow-brand/20">
                        <Plus className="w-4 h-4" />
                        Thêm Tổ chức
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm tổ chức..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <Filter className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <ArrowUpDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên Tổ chức</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người sở hữu</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : organizations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <Building2 className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                                            <p className="font-medium">Không tìm thấy tổ chức nào.</p>
                                        </td>
                                    </tr>
                                ) : organizations.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center text-brand font-bold">
                                                    {org.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{org.name}</p>
                                                    <p className="text-xs text-slate-500 italic">{org._count.api_keys} API Keys</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-medium text-slate-900">{org.owner?.name || 'N/A'}</p>
                                                <p className="text-xs text-slate-500">{org.owner?.email || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${org.is_active
                                                ? 'bg-success/10 text-success border border-success/20'
                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}>
                                                {org.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(org.created_at).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}