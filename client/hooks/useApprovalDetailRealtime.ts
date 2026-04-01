"use client";

import { useEffect, useMemo, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { authStorage } from "@/services/auth/auth-storage.service";

interface UseApprovalDetailRealtimeOptions {
    ticketId?: string | null;
    events: string[];
    enabled?: boolean;
    debounceMs?: number;
    onRefresh: () => void | Promise<void>;
    getEventTicketId: (payload: unknown) => string | undefined;
    onMatchedEvent?: (eventName: string, payload: unknown) => void;
}

export function useApprovalDetailRealtime({
    ticketId,
    events,
    enabled = true,
    debounceMs = 200,
    onRefresh,
    getEventTicketId,
    onMatchedEvent,
}: UseApprovalDetailRealtimeOptions) {
    const socketRef = useRef<Socket | null>(null);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const eventsKey = useMemo(() => events.join("|"), [events]);

    useEffect(() => {
        if (!enabled || !ticketId || events.length === 0) {
            return;
        }

        const token = authStorage.getAccessToken();
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;

        if (!token || !socketUrl) {
            return;
        }

        const scheduleRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            refreshTimeoutRef.current = setTimeout(() => {
                void onRefresh();
            }, debounceMs);
        };

        const socket = io(socketUrl, {
            auth: { token: `Bearer ${token}` },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        const handlers = new Map<string, (payload: unknown) => void>();

        events.forEach((eventName) => {
            const handler = (payload: unknown) => {
                const payloadTicketId = getEventTicketId(payload);
                if (!payloadTicketId || payloadTicketId !== ticketId) {
                    return;
                }

                onMatchedEvent?.(eventName, payload);
                scheduleRefresh();
            };

            handlers.set(eventName, handler);
            socket.on(eventName, handler);
        });

        return () => {
            handlers.forEach((handler, eventName) => {
                socket.off(eventName, handler);
            });

            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }

            socket.disconnect();
            socketRef.current = null;
        };
    }, [enabled, ticketId, eventsKey, events, debounceMs, onRefresh, getEventTicketId, onMatchedEvent]);
}
