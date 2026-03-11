"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    ContactSocketClosed,
    ContactSocketCreated,
    ContactSocketDeleted,
    ContactSocketDeletedMany,
    ContactSocketMessageCreated,
    ContactSocketReopened,
    ContactSocketUpdated,
} from "@/types/contact/contact.type";
import { contactKeys } from "./use-contacts";

const CONTACT_EVENTS = {
    CREATED: "contact:created",
    UPDATED: "contact:updated",
    MESSAGE_CREATED: "contact:messageCreated",
    CLOSED: "contact:closed",
    REOPENED: "contact:reopened",
    DELETED: "contact:deleted",
    DELETED_MANY: "contact:deletedMany",
} as const;

interface UseContactSocketOptions {
    activeTicketId?: string;
    enabled?: boolean;
    onCreated?: (data: ContactSocketCreated) => void;
    onMessageCreated?: (data: ContactSocketMessageCreated) => void;
    onTicketUpdated?: (data: ContactSocketUpdated) => void;
    onClosed?: (data: ContactSocketClosed) => void;
    onReopened?: (data: ContactSocketReopened) => void;
    onDeleted?: (data: ContactSocketDeleted) => void;
    onDeletedMany?: (data: ContactSocketDeletedMany) => void;
}

export function useContactSocket(options?: UseContactSocketOptions) {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);
    const activeTicketId = options?.activeTicketId;
    const enabled = options?.enabled;
    const onClosed = options?.onClosed;
    const onCreated = options?.onCreated;
    const onDeleted = options?.onDeleted;
    const onDeletedMany = options?.onDeletedMany;
    const onMessageCreated = options?.onMessageCreated;
    const onReopened = options?.onReopened;
    const onTicketUpdated = options?.onTicketUpdated;

    useEffect(() => {
        if (enabled === false) {
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

        const refreshActiveTicket = (conversationId: string) => {
            if (!activeTicketId || activeTicketId !== conversationId) {
                return;
            }

            queryClient.invalidateQueries({ queryKey: contactKeys.detail(activeTicketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.messages(activeTicketId) });
        };

        socket.on(CONTACT_EVENTS.CREATED, (data: ContactSocketCreated) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            onCreated?.(data);
        });

        socket.on(CONTACT_EVENTS.UPDATED, (data: ContactSocketUpdated) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            refreshActiveTicket(data.conversationId);
            onTicketUpdated?.(data);
        });

        socket.on(CONTACT_EVENTS.MESSAGE_CREATED, (data: ContactSocketMessageCreated) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            refreshActiveTicket(data.conversationId);
            onMessageCreated?.(data);
        });

        socket.on(CONTACT_EVENTS.CLOSED, (data: ContactSocketClosed) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            refreshActiveTicket(data.conversationId);
            onClosed?.(data);
        });

        socket.on(CONTACT_EVENTS.REOPENED, (data: ContactSocketReopened) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            refreshActiveTicket(data.conversationId);
            onReopened?.(data);
        });

        socket.on(CONTACT_EVENTS.DELETED, (data: ContactSocketDeleted) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            refreshActiveTicket(data.conversationId);
            onDeleted?.(data);
        });

        socket.on(CONTACT_EVENTS.DELETED_MANY, (data: ContactSocketDeletedMany) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            onDeletedMany?.(data);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [activeTicketId, enabled, onClosed, onCreated, onDeleted, onDeletedMany, onMessageCreated, onReopened, onTicketUpdated, queryClient]);
}
