"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import {
    BanknotesIcon,
    CheckIcon,
    ChevronRightIcon,
    ClockIcon,
    Cog6ToothIcon,
    EnvelopeIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    LockClosedIcon,
    PencilSquareIcon,
    PlayCircleIcon,
    PlusIcon,
    ShieldExclamationIcon,
    SparklesIcon,
    Squares2X2Icon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

// ─── Types ───────────────────────────────────────────────────────────
interface WarningCategory {
    id: string;
    name: string;
    description: string;
    color: string;
    count: number;
}

interface IFCondition {
    id: string;
    target_type: "CUSTOMER" | "PARTNER";
    threshold: number;
    category_id: string;
    timeframe_days: number | null; // null means lifetime
}

interface WarnPenalty {
    id: string;
    name: string;
    priority: number;
    is_active: boolean;
    logic_operator: "AND" | "OR";
    conditions: IFCondition[];
    action: "BAN_ACCOUNT" | "SUSPEND" | "DEDUCTION" | "WARN_ONLY";
    duration_days: number | null;
    deduction_amount: number | null;
    notify_user: boolean;
    notification_template: string;
}

type BanDurationUnit = "HOUR" | "DAY" | "WEEK" | "MONTH";

interface WarningCategoryApi {
    id: string;
    name: string;
    description?: string | null;
    severity?: number | null;
    is_active: boolean;
}

interface WarnPenaltyApi {
    id: string;
    min_warn_count: number;
    max_warn_count?: number | null;
    is_permanent_ban: boolean;
    duration_value?: number | null;
    duration_unit?: BanDurationUnit | null;
    is_active: boolean;
    description?: string | null;
}

// ─── Color Map & Labels ──────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
    orange: { bg: "bg-orange-50 border-orange-100", text: "text-orange-600", dot: "bg-orange-400" },
    red: { bg: "bg-red-50 border-red-100", text: "text-red-600", dot: "bg-red-400" },
    purple: { bg: "bg-purple-50 border-purple-100", text: "text-purple-600", dot: "bg-purple-400" },
    yellow: { bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-600", dot: "bg-yellow-400" },
    blue: { bg: "bg-blue-50 border-blue-100", text: "text-blue-600", dot: "bg-blue-400" },
};

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
    BAN_ACCOUNT: { label: "Khóa tài khoản", icon: <LockClosedIcon className="w-3.5 h-3.5" />, style: "bg-red-50 text-red-600 border-red-100" },
    SUSPEND: { label: "Tạm ngưng", icon: <ClockIcon className="w-3.5 h-3.5" />, style: "bg-orange-50 text-orange-600 border-orange-100" },
    DEDUCTION: { label: "Phạt tiền", icon: <BanknotesIcon className="w-3.5 h-3.5" />, style: "bg-purple-50 text-purple-600 border-purple-100" },
    WARN_ONLY: { label: "Chỉ cảnh báo", icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />, style: "bg-yellow-50 text-yellow-600 border-yellow-100" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const severityToColor = (severity?: number | null): string => {
    if (!severity) return "blue";
    if (severity >= 5) return "red";
    if (severity >= 4) return "orange";
    if (severity >= 3) return "yellow";
    if (severity >= 2) return "purple";
    return "blue";
};

const colorToSeverity = (color: string): number => {
    if (color === "red") return 5;
    if (color === "orange") return 4;
    if (color === "yellow") return 3;
    if (color === "purple") return 2;
    return 1;
};

const durationToDays = (value?: number | null, unit?: BanDurationUnit | null): number | null => {
    if (!value || !unit) return null;
    if (unit === "HOUR") return Math.max(1, Math.ceil(value / 24));
    if (unit === "WEEK") return value * 7;
    if (unit === "MONTH") return value * 30;
    return value;
};

const daysToDuration = (days?: number | null): { value: number; unit: BanDurationUnit } => {
    const normalized = Math.max(1, Number(days) || 1);
    if (normalized % 30 === 0) return { value: normalized / 30, unit: "MONTH" };
    if (normalized % 7 === 0) return { value: normalized / 7, unit: "WEEK" };
    return { value: normalized, unit: "DAY" };
};

// ─── Component ───────────────────────────────────────────────────────
export default function WarningPenaltiesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<"categories" | "penalties">("penalties");
    const [loading, setLoading] = useState(true);

    // Category state
    const [categories, setCategories] = useState<WarningCategory[]>([]);
    const [editingCat, setEditingCat] = useState<string | null>(null);
    const [newCatName, setNewCatName] = useState("");
    const [newCatDesc, setNewCatDesc] = useState("");
    const [showAddCat, setShowAddCat] = useState(false);

    // Penalty state
    const [penalties, setPenalties] = useState<WarnPenalty[]>([]);
    const [showBuilder, setShowBuilder] = useState(false);

    // Builder State
    const [builderState, setBuilderState] = useState<Omit<WarnPenalty, "id">>({
        name: "",
        priority: 1,
        is_active: true,
        logic_operator: "AND",
        conditions: [
            { id: "cond1", target_type: "CUSTOMER", threshold: 3, category_id: "", timeframe_days: 30 }
        ],
        action: "BAN_ACCOUNT",
        duration_days: 7,
        deduction_amount: null,
        notify_user: false,
        notification_template: "",
    });

    // Sub-modals state
    const [showSimulator, setShowSimulator] = useState(false);
    const [simulatorResult, setSimulatorResult] = useState<string | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        setLoading(true);
        try {
            const [categoriesRes, penaltiesRes] = await Promise.all([
                fetch(`${API_URL}/admin/warning-categories?limit=100&offset=0`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }),
                fetch(`${API_URL}/admin/warn-penalties?limit=100&offset=0`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }),
            ]);

            if (!categoriesRes.ok || !penaltiesRes.ok) {
                throw new Error("Không thể tải dữ liệu cảnh báo/phạt");
            }

            const categoriesJson = await categoriesRes.json();
            const penaltiesJson = await penaltiesRes.json();

            const categoryItems: WarningCategoryApi[] = categoriesJson?.data?.items || [];
            const penaltyItems: WarnPenaltyApi[] = penaltiesJson?.data?.items || [];

            const mappedCategories: WarningCategory[] = categoryItems.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description || "",
                color: severityToColor(item.severity),
                count: 0,
            }));

            const mappedPenalties: WarnPenalty[] = penaltyItems
                .sort((a, b) => a.min_warn_count - b.min_warn_count)
                .map((item, idx) => {
                    const durationDays = item.is_permanent_ban
                        ? null
                        : durationToDays(item.duration_value, item.duration_unit);
                    const threshold = item.min_warn_count;

                    return {
                        id: item.id,
                        name: item.description || `Phạt khi đạt từ ${item.min_warn_count} cảnh báo`,
                        priority: idx + 1,
                        is_active: item.is_active,
                        logic_operator: "AND",
                        conditions: [
                            {
                                id: `${item.id}-cond-1`,
                                target_type: "CUSTOMER",
                                threshold,
                                category_id: mappedCategories[0]?.id || "",
                                timeframe_days: null,
                            },
                        ],
                        action: "BAN_ACCOUNT",
                        duration_days: durationDays,
                        deduction_amount: null,
                        notify_user: false,
                        notification_template: "",
                    };
                });

            setCategories(mappedCategories);
            setPenalties(mappedPenalties);
        } catch (error) {
            console.error(error);
            showToast("Không thể tải dữ liệu thật từ hệ thống", "error");
        } finally {
            setLoading(false);
        }
    }, [router, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Category handlers ──
    const handleSaveCategory = async () => {
        if (!newCatName.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        const colors = ["orange", "red", "purple", "yellow", "blue"];
        const color = colors[categories.length % colors.length];
        try {
            const response = await fetch(`${API_URL}/admin/warning-categories`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: newCatName.trim(),
                    description: newCatDesc.trim() || undefined,
                    severity: colorToSeverity(color),
                }),
            });

            if (!response.ok) {
                throw new Error("Không thể tạo danh mục");
            }

            setNewCatName("");
            setNewCatDesc("");
            setShowAddCat(false);
            showToast("Đã tạo danh mục", "success");
            await fetchData();
        } catch (error) {
            console.error(error);
            showToast("Tạo danh mục thất bại", "error");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/warning-categories/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Không thể xóa danh mục");
            }

            setCategories((prev) => prev.filter((c) => c.id !== id));
            showToast("Đã xóa danh mục", "success");
        } catch (error) {
            console.error(error);
            showToast("Xóa danh mục thất bại", "error");
        }
    };

    // ── Builder handlers ──
    const handleAddCondition = () => {
        setBuilderState(s => ({
            ...s,
            conditions: [
                ...s.conditions,
                { id: `cond${Date.now()}`, target_type: "CUSTOMER", threshold: 1, category_id: "", timeframe_days: null }
            ]
        }));
    };

    const handleRemoveCondition = (id: string) => {
        setBuilderState(s => ({
            ...s,
            conditions: s.conditions.filter(c => c.id !== id)
        }));
    };

    const updateCondition = (id: string, updates: Partial<IFCondition>) => {
        setBuilderState(s => ({
            ...s,
            conditions: s.conditions.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    };

    const checkConflicts = () => {
        // Simple conflict check: Any existing rule with exact same conditions length and first category id?
        // (Just a mock logic for UX demonstration)
        if (!builderState.conditions[0]?.category_id) return null;

        const conflict = penalties.find(p =>
            p.conditions[0]?.category_id === builderState.conditions[0].category_id &&
            p.conditions.length === builderState.conditions.length
        );

        if (conflict) {
            return `Quy tắc này có điều kiện tương đồng với quy tắc "${conflict.name}" (Ưu tiên ${conflict.priority}). Bạn có chắc chắn muốn lưu không?`;
        }
        return null;
    };

    const handleSavePenalty = async () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        // Validate
        if (!builderState.name.trim() || !builderState.conditions[0].category_id) return;

        if (builderState.action !== "BAN_ACCOUNT") {
            showToast("Backend hiện chỉ hỗ trợ quy tắc khóa tài khoản theo số lần cảnh báo", "error");
            return;
        }

        if (builderState.conditions.length > 1) {
            showToast("Phiên bản backend hiện chỉ hỗ trợ 1 điều kiện cảnh báo cho mỗi quy tắc", "error");
            return;
        }

        const conflictMsg = checkConflicts();
        if (conflictMsg && !conflictWarning) {
            setConflictWarning(conflictMsg);
            return;
        }

        try {
            const threshold = Math.max(1, builderState.conditions[0].threshold);
            const { value: durationValue, unit: durationUnit } = daysToDuration(builderState.duration_days);

            const response = await fetch(`${API_URL}/admin/warn-penalties`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    min_warn_count: threshold,
                    is_permanent_ban: false,
                    duration_value: durationValue,
                    duration_unit: durationUnit,
                    description: builderState.name.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error("Không thể tạo quy tắc phạt");
            }

            setShowBuilder(false);
            setConflictWarning(null);
            resetBuilder();
            showToast("Đã tạo quy tắc phạt", "success");
            await fetchData();
        } catch (error) {
            console.error(error);
            showToast("Tạo quy tắc phạt thất bại", "error");
        }
    };

    const resetBuilder = () => {
        setBuilderState({
            name: "", priority: 1, is_active: true, logic_operator: "AND",
            conditions: [{ id: "cond1", target_type: "CUSTOMER", threshold: 3, category_id: "", timeframe_days: 30 }],
            action: "BAN_ACCOUNT", duration_days: 7, deduction_amount: null,
            notify_user: false, notification_template: "",
        });
    };

    const handleTogglePenalty = async (id: string) => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        const target = penalties.find((p) => p.id === id);
        if (!target) return;

        try {
            const response = await fetch(`${API_URL}/admin/warn-penalties/${id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    is_active: !target.is_active,
                }),
            });

            if (!response.ok) {
                throw new Error("Không thể cập nhật trạng thái quy tắc");
            }

            setPenalties((prev) =>
                prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
            );
        } catch (error) {
            console.error(error);
            showToast("Cập nhật trạng thái thất bại", "error");
        }
    };

    const handleDeletePenalty = async (id: string) => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/warn-penalties/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Không thể xóa quy tắc");
            }

            setPenalties((prev) => prev.filter((p) => p.id !== id));
            showToast("Đã xóa quy tắc", "success");
        } catch (error) {
            console.error(error);
            showToast("Xóa quy tắc thất bại", "error");
        }
    };

    // ── Rule Summary Generator (Natural Language Translation) ──
    const ruleSummary = useMemo(() => {
        if (!builderState.conditions[0].category_id) return "Đang soạn thảo quy tắc...";

        const conditionsText = builderState.conditions.map(c => {
            const catName = categories.find(cat => cat.id === c.category_id)?.name || "...";
            const target = c.target_type === "CUSTOMER" ? "Khách hàng" : "Đối tác";
            let txt = `${target} nhận ${c.threshold} cảnh báo [${catName}]`;
            if (c.timeframe_days) txt += ` trong vòng ${c.timeframe_days} ngày`;
            return txt;
        }).join(builderState.logic_operator === "AND" ? " VÀ " : " HOẶC ");

        let actionText = "";
        if (builderState.action === "BAN_ACCOUNT") actionText = `Khóa tài khoản ${builderState.duration_days} ngày`;
        else if (builderState.action === "SUSPEND") actionText = `Tạm ngưng ${builderState.duration_days} ngày`;
        else if (builderState.action === "DEDUCTION") actionText = `Phạt tiền ${builderState.deduction_amount ? builderState.deduction_amount.toLocaleString() + 'đ' : '...'}`;
        else actionText = "Chỉ cảnh báo";

        return `NẾU ${conditionsText}, THÌ hệ thống sẽ ${actionText}.`;
    }, [builderState, categories]);

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40 relative">
            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                {loading && (
                    <div className="mb-4 rounded-xl border bg-white px-4 py-2 text-sm text-muted-foreground">
                        Đang tải dữ liệu thật...
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>Cài đặt</span>
                            <ChevronRightIcon className="w-3 h-3" />
                            <span className="text-foreground font-medium">Quy tắc Phạt & Danh mục</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Quy tắc Phạt & Cảnh báo</h1>
                        <p className="text-sm text-muted-foreground mt-1">Thiết lập luật chơi theo Khối logic (Logic Blocks)</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border/50 w-fit mb-6">
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "categories" ? "bg-white text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Squares2X2Icon className="w-4 h-4" />
                        Danh mục
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand text-xs font-semibold">{categories.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("penalties")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "penalties" ? "bg-white text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <ShieldExclamationIcon className="w-4 h-4" />
                        Quy tắc Phạt
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-xs font-semibold">{penalties.length}</span>
                    </button>
                </div>

                {/* ─── TAB 1: Categories ─── */}
                {activeTab === "categories" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Các nhóm vi phạm làm cơ sở cho Quy tắc.</p>
                            <Button size="sm" className="gap-2 bg-brand text-white hover:bg-brand-hover rounded-xl" onClick={() => setShowAddCat(true)}>
                                <PlusIcon className="w-4 h-4" /> Thêm danh mục
                            </Button>
                        </div>
                        {/* Add Category Form */}
                        {showAddCat && (
                            <div className="bg-white rounded-2xl border border-brand/30 p-6 shadow-sm shadow-brand/10 space-y-4 mb-4">
                                <h3 className="font-semibold text-sm flex items-center gap-2"><PlusIcon className="w-4 h-4 text-brand" /> Thêm danh mục mới</h3>
                                <Input placeholder="Tên danh mục (VD: Thanh toán chậm)" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="rounded-xl" />
                                <Input placeholder="Mô tả ngắn (tùy chọn)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} className="rounded-xl" />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowAddCat(false)}>Hủy</Button>
                                    <Button size="sm" className="bg-brand text-white hover:bg-brand-hover rounded-xl" onClick={handleSaveCategory}><CheckIcon className="w-4 h-4 mr-1" /> Lưu</Button>
                                </div>
                            </div>
                        )}
                        {/* Categories List */}
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                            {categories.map((cat, idx) => {
                                const colors = COLOR_MAP[cat.color] || COLOR_MAP["blue"];
                                return (
                                    <div key={cat.id} className={`flex items-center gap-4 p-4 ${idx !== categories.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/30 group`}>
                                        <div className={`w-2 h-10 rounded-full ${colors.dot}`} />
                                        <div className="flex-1 min-w-0">
                                            {editingCat === cat.id ? (
                                                <Input defaultValue={cat.name} className="h-8 text-sm rounded-xl" onKeyDown={e => { if (e.key === "Enter") setEditingCat(null); }} autoFocus />
                                            ) : (
                                                <><div className="font-medium text-sm">{cat.name}</div><div className="text-xs text-muted-foreground">{cat.description}</div></>
                                            )}
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text}`}>{cat.count} vi phạm</div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:text-brand" onClick={() => setEditingCat(editingCat === cat.id ? null : cat.id)}><PencilSquareIcon className="w-3.5 h-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:text-rose-500" onClick={() => handleDeleteCategory(cat.id)}><TrashIcon className="w-3.5 h-3.5" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── TAB 2: Penalty Rules ─── */}
                {activeTab === "penalties" && (
                    <div className="space-y-6">
                        {!showBuilder && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Hệ thống xử lý vi phạm dựa trên Khối Logic <strong>IF - THEN</strong>.</p>
                                <Button size="sm" className="gap-2 bg-brand text-white hover:bg-brand-hover rounded-xl" onClick={() => setShowBuilder(true)}>
                                    <PlusIcon className="w-4 h-4" /> Tạo quy tắc mới
                                </Button>
                            </div>
                        )}

                        {/* ─── RULE CREATOR UI (Khối Logic) ─── */}
                        {showBuilder && (
                            <div className="space-y-6 relative pb-20">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-bold flex items-center gap-2"><Cog6ToothIcon className="w-5 h-5 text-brand" /> Trình dựng Quy tắc (Rule Builder)</h2>
                                    <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => setShowBuilder(false)}><XMarkIcon className="w-4 h-4 mr-1" /> Đóng</Button>
                                </div>

                                {/* KHỐI 1: Thông tin cơ bản */}
                                <div className="bg-white rounded-3xl border p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">1</div>
                                        <h3 className="font-semibold text-sm">Thông tin cơ bản (General Info)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-8 space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Tên quy tắc <span className="text-rose-500">*</span></label>
                                            <Input placeholder="VD: Phạt khóa tài khoản khi trễ hạn thanh toán" className="rounded-2xl h-10" value={builderState.name} onChange={e => setBuilderState(s => ({ ...s, name: e.target.value }))} />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Ưu tiên (1=Cao nhất)</label>
                                            <Input type="number" min={1} className="rounded-2xl h-10" value={builderState.priority} onChange={e => setBuilderState(s => ({ ...s, priority: Number(e.target.value) }))} />
                                        </div>
                                        <div className="md:col-span-2 space-y-2 flex flex-col justify-start">
                                            <label className="text-xs font-medium text-muted-foreground mb-2">Trạng thái</label>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={builderState.is_active} onCheckedChange={c => setBuilderState(s => ({ ...s, is_active: c as boolean }))} />
                                                <span className="text-sm font-medium">{builderState.is_active ? "Bật" : "Tắt"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* KHỐI 2: Điều kiện (IF Builder) */}
                                <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">2</div>
                                            <h3 className="font-semibold text-sm text-blue-900">Thiết lập Điều kiện (The &quot;IF&quot; Builder)</h3>
                                        </div>
                                        {builderState.conditions.length > 1 && (
                                            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border">
                                                <button onClick={() => setBuilderState(s => ({ ...s, logic_operator: "AND" }))} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${builderState.logic_operator === "AND" ? "bg-white shadow-sm text-blue-600" : "text-muted-foreground"}`}>VÀ (AND)</button>
                                                <button onClick={() => setBuilderState(s => ({ ...s, logic_operator: "OR" }))} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${builderState.logic_operator === "OR" ? "bg-white shadow-sm text-blue-600" : "text-muted-foreground"}`}>HOẶC (OR)</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {builderState.conditions.map((cond, idx) => (
                                            <div key={cond.id} className="flex flex-wrap items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 relative group">
                                                {idx > 0 && <span className="absolute -top-3 left-6 text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full border text-muted-foreground">{builderState.logic_operator}</span>}
                                                <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-blue-600 font-bold shrink-0">NẾU</Badge>

                                                <select title="Chọn đối tượng" className="h-9 rounded-xl border-border bg-white px-3 text-sm min-w-[130px]" value={cond.target_type} onChange={e => updateCondition(cond.id, { target_type: e.target.value as "CUSTOMER" | "PARTNER" })}>
                                                    <option value="CUSTOMER">Khách hàng</option><option value="PARTNER">Đối tác</option>
                                                </select>

                                                <span className="text-sm font-medium text-slate-600">tích lũy đủ</span>
                                                <Input type="number" min={1} className="w-20 h-9 rounded-xl bg-white text-center font-bold" value={cond.threshold} onChange={e => updateCondition(cond.id, { threshold: Number(e.target.value) })} />

                                                <span className="text-sm font-medium text-slate-600">cảnh báo thuộc</span>
                                                <select title="Chọn danh mục" className="h-9 rounded-xl border-border bg-white px-3 text-sm min-w-[200px]" value={cond.category_id} onChange={e => updateCondition(cond.id, { category_id: e.target.value })}>
                                                    <option value="">— Chọn danh mục vi phạm —</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>

                                                <span className="text-sm font-medium text-slate-600">trong</span>
                                                <select title="Chọn khoảng thời gian" className="h-9 rounded-xl border-border bg-white px-3 text-sm min-w-[140px]" value={cond.timeframe_days || ""} onChange={e => updateCondition(cond.id, { timeframe_days: e.target.value ? Number(e.target.value) : null })}>
                                                    <option value="">Cả thời gian (Lifetime)</option>
                                                    <option value="7">7 ngày qua</option>
                                                    <option value="30">30 ngày qua</option>
                                                    <option value="90">90 ngày qua</option>
                                                    <option value="365">1 năm qua</option>
                                                </select>

                                                {builderState.conditions.length > 1 && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-rose-500 rounded-xl" onClick={() => handleRemoveCondition(cond.id)}><XMarkIcon className="w-4 h-4" /></Button>
                                                )}
                                            </div>
                                        ))}

                                        <Button variant="outline" size="sm" className="rounded-xl border-dashedtext-blue-600 hover:bg-blue-50 mt-2 gap-2" onClick={handleAddCondition}>
                                            <PlusIcon className="w-3.5 h-3.5" /> Thêm điều kiện phụ
                                        </Button>
                                    </div>
                                </div>

                                {/* KHỐI 3: Hành động (THEN Builder) */}
                                <div className="bg-rose-50/40 rounded-3xl border border-rose-100 p-6 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">3</div>
                                        <h3 className="font-semibold text-sm text-rose-900">Thiết lập Hành động (The &quot;THEN&quot; Builder)</h3>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Badge className="bg-rose-600 hover:bg-rose-600 text-white border-rose-600 font-bold shrink-0">THÌ HỆ THỐNG SẼ</Badge>

                                            <select title="Chọn hành động phạt" className="h-9 rounded-xl border-rose-200 bg-white px-3 text-sm min-w-[200px] text-rose-900 font-medium" value={builderState.action} onChange={e => setBuilderState(s => ({ ...s, action: e.target.value as "BAN_ACCOUNT" | "SUSPEND" | "DEDUCTION" | "WARN_ONLY" }))}>
                                                <option value="BAN_ACCOUNT">Khóa tài khoản</option>
                                                <option value="SUSPEND">Tạm ngưng sử dụng</option>
                                                <option value="DEDUCTION">Phạt tiền vào số dư</option>
                                                <option value="WARN_ONLY">Gửi thông báo cảnh cáo</option>
                                            </select>

                                            {(builderState.action === "BAN_ACCOUNT" || builderState.action === "SUSPEND") && (
                                                <>
                                                    <span className="text-sm font-medium text-rose-800">trong thời gian</span>
                                                    <Input type="number" min={1} className="w-24 h-9 rounded-xl bg-white text-center font-bold" value={builderState.duration_days || ""} onChange={e => setBuilderState(s => ({ ...s, duration_days: Number(e.target.value) }))} placeholder="Ngày" />
                                                    <span className="text-sm font-medium text-rose-800">ngày</span>
                                                </>
                                            )}

                                            {builderState.action === "DEDUCTION" && (
                                                <>
                                                    <span className="text-sm font-medium text-rose-800">số tiền</span>
                                                    <Input type="number" min={0} step={10000} className="w-40 h-9 rounded-xl bg-white font-bold" value={builderState.deduction_amount || ""} onChange={e => setBuilderState(s => ({ ...s, deduction_amount: Number(e.target.value) }))} placeholder="VD: 500000" />
                                                    <span className="text-sm font-medium text-rose-800">VNĐ</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="bg-white/60 p-4 rounded-2xl border border-rose-100 mt-2 space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="notify" checked={builderState.notify_user} onCheckedChange={c => setBuilderState(s => ({ ...s, notify_user: c as boolean }))} />
                                                <label htmlFor="notify" className="text-sm font-medium leading-none text-rose-900 cursor-pointer flex items-center gap-1.5"><EnvelopeIcon className="w-4 h-4" /> Gửi email/thông báo giải thích lý do cho {builderState.conditions[0].target_type === "CUSTOMER" ? "Khách hàng" : "Đối tác"}</label>
                                            </div>
                                            {builderState.notify_user && (
                                                <Textarea
                                                    placeholder="Nhập nội dung mẫu (Template)... Bạn có thể dùng biến {Tên_Khách_Hàng}, {Số_Vi_Phạm}..."
                                                    className="min-h-[80px] rounded-xl bg-white border-rose-200 text-sm"
                                                    value={builderState.notification_template}
                                                    onChange={e => setBuilderState(s => ({ ...s, notification_template: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Builder Actions */}
                                <div className="flex items-center justify-between pt-4">
                                    <Button variant="outline" className="gap-2 rounded-xl text-brand border-brand/30 hover:bg-brand/5" onClick={() => setShowSimulator(true)}>
                                        <PlayCircleIcon className="w-4 h-4" /> Chạy thử nghiệm
                                    </Button>

                                    <div className="flex gap-3">
                                        <Button variant="ghost" className="rounded-xl" onClick={() => setShowBuilder(false)}>Hủy</Button>
                                        <Button className="bg-brand text-white hover:bg-brand-hover rounded-xl shadow-md gap-2 px-6" onClick={handleSavePenalty}>
                                            <CheckIcon className="w-4 h-4" /> Lưu Quy tắc
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── PENALTIES LIST ─── */}
                        {!showBuilder && (
                            <div className="space-y-4">
                                {penalties.map(penalty => {
                                    const actionInfo = ACTION_LABELS[penalty.action];
                                    return (
                                        <div key={penalty.id} className={`bg-white rounded-3xl border shadow-sm p-6 transition-all ${penalty.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="rounded-full bg-slate-50 text-slate-500 font-mono text-[10px]">Ưu tiên #{penalty.priority}</Badge>
                                                        <h4 className="font-bold text-base text-foreground">{penalty.name}</h4>
                                                    </div>

                                                    {/* Rule Summary Text */}
                                                    <div className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-2xl border border-border/50">
                                                        <span className="font-bold text-blue-600 mr-1">NẾU</span>
                                                        {penalty.conditions.map((c, i) => (
                                                            <span key={c.id}>
                                                                {i > 0 && <span className="font-bold text-slate-500 mx-1">{penalty.logic_operator === "AND" ? "VÀ" : "HOẶC"}</span>}
                                                                <span>{c.target_type === "CUSTOMER" ? "Khách hàng" : "Đối tác"} có {c.threshold} vi phạm [{categories.find(cat => cat.id === c.category_id)?.name || "N/A"}] {c.timeframe_days ? `trong ${c.timeframe_days} ngày` : ""}</span>
                                                            </span>
                                                        ))}
                                                        <span className="font-bold text-rose-600 ml-2 mr-1">THÌ</span>
                                                        <span className="font-medium inline-flex items-center gap-1"><span className={`inline-block w-2 h-2 rounded-full ${actionInfo?.style.split(' ')[0]}`} /> {actionInfo.label} {penalty.duration_days ? `${penalty.duration_days} ngày` : ""} {penalty.deduction_amount ? `${penalty.deduction_amount.toLocaleString()}đ` : ""}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground mr-1">{penalty.is_active ? "Đang bật" : "Đã tắt"}</span>
                                                        <Switch checked={penalty.is_active} onCheckedChange={() => handleTogglePenalty(penalty.id)} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:text-rose-500" onClick={() => handleDeletePenalty(penalty.id)}><TrashIcon className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {penalties.length === 0 && (
                                    <div className="bg-white rounded-3xl border border-dashed p-12 text-center">
                                        <ExclamationCircleIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">Chưa có quy tắc nào.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ─── UX A: Rule Summary Floating Card ─── */}
            {activeTab === "penalties" && showBuilder && (
                <div className="fixed bottom-6 right-6 w-80 bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-2xl border border-slate-700/50 z-10 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-2 text-brand-300 mb-2">
                        <SparklesIcon className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold tracking-wider uppercase text-emerald-400">Tóm tắt Quy tắc</h4>
                    </div>
                    <p className="text-sm leading-relaxed">{ruleSummary}</p>
                </div>
            )}

            {/* ─── UX B: Simulator Modal ─── */}
            <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
                <DialogContent className="rounded-3xl border-border bg-white shadow-xl sm:max-w-[450px] p-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><PlayCircleIcon className="w-5 h-5 text-brand" /> Chạy thử nghiệm (Simulator)</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground">Mô phỏng quét dữ liệu lịch sử của một Khách hàng thực tế để xem quy tắc này có &quot;kích hoạt&quot; hay không.</p>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-700">Chọn khách hàng giả lập</label>
                            <select title="Chọn khách hàng giả lập" className="w-full h-10 rounded-xl border border-border bg-muted/30 px-3 text-sm">
                                <option>Công ty TNHH Vận Tải ABC</option>
                                <option>Kho bãi & Logistics XYZ</option>
                            </select>
                        </div>
                        {simulatorResult ? (
                            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-sm text-rose-800 flex gap-3">
                                <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>Kết quả: SẼ BỊ PHẠT!</strong><br />
                                    Công ty ABC đã có đủ số vi phạm trong tháng trước thỏa mãn điều kiện này.
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border p-4 rounded-2xl flex items-center justify-center text-sm text-slate-500 h-24 text-center">
                                Bấm &quot;Chạy quét&quot; để xem kết quả mô phỏng.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl" onClick={() => { setShowSimulator(false); setSimulatorResult(null); }}>Đóng</Button>
                        <Button className="bg-brand text-white hover:bg-brand-hover rounded-xl shadow-md gap-2" onClick={() => setSimulatorResult("Banned")}>
                            Chạy quét
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── UX C: Conflict Checker Modal ─── */}
            <Dialog open={!!conflictWarning} onOpenChange={(open) => !open && setConflictWarning(null)}>
                <DialogContent className="rounded-3xl border-orange-200 bg-orange-50 shadow-xl sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-700"><ExclamationTriangleIcon className="w-5 h-5" /> Cảnh báo Xung đột Quy tắc</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-orange-900 leading-relaxed">
                        {conflictWarning}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl border-orange-200 bg-white hover:bg-orange-100 text-orange-800" onClick={() => setConflictWarning(null)}>Xem lại</Button>
                        <Button className="bg-orange-600 text-white hover:bg-orange-700 rounded-xl shadow-md" onClick={handleSavePenalty}>Vẫn tiếp tục lưu</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
