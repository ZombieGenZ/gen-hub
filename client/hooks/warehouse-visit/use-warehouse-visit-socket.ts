import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { authStorage } from "@/services/auth/auth-storage.service";

const VISIT_EVENTS = {
    CREATED: "warehouseVisit:created",
} as const;

export interface WarehouseVisitSocketCreated {
    bookingId: string;
    warehouseId: string;
    createdBy: string;
    timestamp: string;
}

interface UseWarehouseVisitSocketOptions {
    enabled?: boolean;
    onCreated?: (data: WarehouseVisitSocketCreated) => void;
}

export function useWarehouseVisitSocket(options?: UseWarehouseVisitSocketOptions) {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);
    const enabled = options?.enabled !== false;
    const onCreated = options?.onCreated;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const token = authStorage.getAccessToken();
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;

        if (!socketUrl || !token) {
            return;
        }

        const socket = io(socketUrl, {
            auth: { token: `Bearer ${token}` },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on(VISIT_EVENTS.CREATED, (data: WarehouseVisitSocketCreated) => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-visits'] });
            onCreated?.(data);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [enabled, onCreated, queryClient]);
}
