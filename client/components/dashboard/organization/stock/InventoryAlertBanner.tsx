"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { InventoryAlertService } from "@/services/inventory-alert/inventory-alert.service";
import type { InventoryAlert } from "@/services/inventory-alert/inventory-alert.types";

const alertService = new InventoryAlertService();

const ALERT_REALTIME_EVENTS = ["org:inventory-alert"];

interface InventoryAlertBannerProps {
    onResolve?: () => void;
}

function urgencyColor(days: number): string {
    if (days <= 0) return "bg-red-50 border-red-400 text-red-800";
    if (days <= 3) return "bg-orange-50 border-orange-400 text-orange-800";
    return "bg-yellow-50 border-yellow-400 text-yellow-800";
}

function urgencyLabel(days: number): string {
    if (days <= 0) return "Hết hàng";
    if (days <= 1) return "Nguy cấp";
    if (days <= 3) return "Khẩn cấp";
    return "Sắp hết";
}

export function InventoryAlertBanner({ onResolve }: InventoryAlertBannerProps) {
    const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [resolving, setResolving] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Dùng ref để giữ hàm fetch ổn định (không gây loop trong useEffect)
    const fetchAlertsRef = useRef<(() => Promise<void>) | undefined>(undefined);

    const fetchAlerts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data = await alertService.listAlerts(token, { is_resolved: false });
            setAlerts(data);
        } catch {
            // Không critical — không hiển thị lỗi để không làm nhiễu UX
        } finally {
            setLoading(false);
        }
    }, []);

    fetchAlertsRef.current = fetchAlerts;

    // Lấy orgId để subscribe WebSocket đúng channel
    useEffect(() => {
        const init = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const id = await orgHelper.getOrgId(token);
                setOrgId(id);
            } catch {
                // bỏ qua
            }
        };
        void init();
    }, []);

    useEffect(() => {
        void fetchAlerts();
    }, [fetchAlerts]);

    // ── WebSocket real-time: nhận alert mới ngay lập tức ──────────────────────
    useOrganizationRealtime({
        orgId,
        events: ALERT_REALTIME_EVENTS,
        enabled: !!orgId,
        onEvent: (_eventName, _payload) => {
            // Refresh danh sách alert khi server push event mới
            void fetchAlertsRef.current?.();
        },
    });

    const handleResolve = async (alertId: string) => {
        try {
            setResolving(alertId);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await alertService.resolveAlert(token, alertId);
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
            onResolve?.();
        } finally {
            setResolving(null);
        }
    };

    if (loading || alerts.length === 0) return null;

    const visible = expanded ? alerts : alerts.slice(0, 3);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                        {alerts.length} cảnh báo tồn kho
                    </span>
                </div>
                {alerts.length > 3 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                        {expanded ? "Thu gọn" : `Xem tất cả ${alerts.length}`}
                    </button>
                )}
            </div>

            {visible.map((alert) => (
                <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${urgencyColor(alert.days_until_stockout)}`}
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                                {urgencyLabel(alert.days_until_stockout)}
                            </span>
                            <span className="font-semibold text-sm truncate">
                                {alert.product?.name ?? alert.product_id}
                            </span>
                            {alert.warehouse && (
                                <span className="text-xs opacity-70">— {alert.warehouse.name}</span>
                            )}
                        </div>
                        {alert.ai_suggestion && (
                            <p className="text-xs mt-1 opacity-80 leading-relaxed">{alert.ai_suggestion}</p>
                        )}
                        <p className="text-xs mt-1 opacity-60 flex gap-3 flex-wrap">
                            <span>Tồn: <strong>{Number(alert.current_quantity).toLocaleString("vi-VN")}</strong></span>
                            <span>Còn <strong>{alert.days_until_stockout <= 0 ? "0" : alert.days_until_stockout}</strong> ngày</span>
                            <span>Xuất TB: {Number(alert.avg_daily_outbound).toFixed(1)}/ngày</span>
                        </p>
                    </div>
                    <button
                        disabled={resolving === alert.id}
                        onClick={() => handleResolve(alert.id)}
                        className="shrink-0 text-xs px-2 py-1 rounded bg-white/60 hover:bg-white/90 border border-current/20 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
                    >
                        {resolving === alert.id ? "..." : "Đã xử lý"}
                    </button>
                </div>
            ))}
        </div>
    );
}
