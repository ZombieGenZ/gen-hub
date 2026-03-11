import { useQuery } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactService } from "@/services/contact/contact.service";
import {
    Contact,
    ContactConversation,
    ContactListPayload,
    ContactMessage,
    ContactQueryParams,
    ContactTag,
} from "@/types/contact/contact.type";

const contactService = new ContactService();

function getToken() {
    return authStorage.getAccessToken() || "";
}

function normalizeContactList(response: unknown): ContactListPayload {
    const fallback: ContactListPayload = { items: [], total: 0, limit: 0, offset: 0, hasMore: false };

    if (!response || typeof response !== "object") {
        return fallback;
    }

    const root = response as Record<string, unknown>;
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const items = Array.isArray(data.items)
        ? (data.items as Contact[])
        : Array.isArray(data.data)
            ? (data.data as Contact[])
            : Array.isArray(response)
                ? (response as Contact[])
                : [];

    return {
        items,
        total: typeof data.total === "number" ? data.total : items.length,
        limit: typeof data.limit === "number" ? data.limit : items.length,
        offset: typeof data.offset === "number" ? data.offset : 0,
        hasMore: typeof data.hasMore === "boolean" ? data.hasMore : false,
    };
}

function normalizeList<T>(response: unknown): T[] {
    if (!response || typeof response !== "object") {
        return [];
    }

    const root = response as Record<string, unknown>;

    if (root.data && typeof root.data === "object") {
        const data = root.data as Record<string, unknown>;
        if (Array.isArray(data.items)) return data.items as T[];
        if (Array.isArray(data.data)) return data.data as T[];
    }

    if (Array.isArray(root.data)) return root.data as T[];
    if (Array.isArray(response)) return response as T[];

    return [];
}

export const contactKeys = {
    all: ["contacts"] as const,
    list: (filters?: ContactQueryParams) => [...contactKeys.all, "list", filters] as const,
    detail: (id: string) => [...contactKeys.all, "detail", id] as const,
    messages: (id: string) => [...contactKeys.all, "messages", id] as const,
    tags: () => [...contactKeys.all, "tags"] as const,
    priority: (filters?: ContactQueryParams) => [...contactKeys.all, "priority", filters] as const,
    normal: (filters?: ContactQueryParams) => [...contactKeys.all, "normal", filters] as const,
    skipped: (filters?: ContactQueryParams) => [...contactKeys.all, "skipped", filters] as const,
};

export function useContacts(filters?: ContactQueryParams) {
    return useQuery<ContactListPayload>({
        queryKey: contactKeys.list(filters),
        queryFn: async () => {
            const token = getToken();
            if (!token) return { items: [], total: 0, limit: filters?.limit ?? 0, offset: filters?.offset ?? 0, hasMore: false };

            const response = await contactService.getAllContact(token, filters);
            return normalizeContactList(response);
        },
    });
}

export function useContactDetail(id: string) {
    return useQuery<ContactConversation | null>({
        queryKey: contactKeys.detail(id),
        queryFn: async () => {
            const token = getToken();
            if (!token) return null;
            const response = await contactService.getContactById(token, id);
            return (response && typeof response === "object" && "data" in response
                ? (response as { data?: ContactConversation }).data
                : response) || null;
        },
        enabled: !!id,
    });
}

export function useContactMessages(id: string) {
    return useQuery<ContactMessage[]>({
        queryKey: contactKeys.messages(id),
        queryFn: async () => {
            const token = getToken();
            if (!token) return [];
            const response = await contactService.getContactMessages(token, id);
            return normalizeList<ContactMessage>(response);
        },
        enabled: !!id,
    });
}

export function useContactTags() {
    return useQuery<ContactTag[]>({
        queryKey: contactKeys.tags(),
        queryFn: async () => {
            const token = getToken();
            if (!token) return [];
            const response = await contactService.getAllContactTag(token);
            return normalizeList<ContactTag>(response);
        },
    });
}
