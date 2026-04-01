"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { authStorage } from "@/services/auth/auth-storage.service";

interface UseOrganizationRealtimeOptions {
    orgId?: string | null;
    events: string[];
    enabled?: boolean;
    onEvent?: (eventName: string, payload: unknown) => void;
}

export function useOrganizationRealtime({
    orgId,
    events,
    enabled = true,
    onEvent,
}: UseOrganizationRealtimeOptions) {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const eventsKey = useMemo(() => events.join("|"), [events]);

    useEffect(() => {
        if (!enabled || !orgId || events.length === 0) return;

        const token = authStorage.getAccessToken();
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
        if (!token || !socketUrl) return;

        const socket = io(socketUrl, {
            auth: { token: `Bearer ${token}` },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        const handlers = new Map<string, (payload: unknown) => void>();

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("subscribe", {
                rooms: [`organization:${orgId}`],
            });
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        events.forEach((eventName) => {
            const handler = (payload: unknown) => {
                onEvent?.(eventName, payload);
            };

            handlers.set(eventName, handler);
            socket.on(eventName, handler);
        });

        return () => {
            handlers.forEach((handler, eventName) => {
                socket.off(eventName, handler);
            });
            socket.off("connect");
            socket.off("disconnect");
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [enabled, orgId, eventsKey, events, onEvent]);

    return { connected };
}
