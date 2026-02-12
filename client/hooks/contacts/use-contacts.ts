import { useQuery } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactService } from "@/services/contact/contact.service";
import { Contact, ContactConversation, ContactMessage, ContactTag } from "@/types/contact/contact.type";

const contactService = new ContactService();

function getToken() {
    return authStorage.getAccessToken() || "";
}

// ─── Query Keys ─────────────────────────────────────────────
export const contactKeys = {
    all: ["contacts"] as const,
    list: (filters?: Record<string, unknown>) => [...contactKeys.all, "list", filters] as const,
    detail: (id: string) => [...contactKeys.all, "detail", id] as const,
    messages: (id: string) => [...contactKeys.all, "messages", id] as const,
    tags: () => [...contactKeys.all, "tags"] as const,
    priority: () => [...contactKeys.all, "priority"] as const,
};

// ─── Query Hooks ────────────────────────────────────────────

/** Fetch all contacts (with optional filters as query key) */
export function useContacts(filters?: Record<string, unknown>) {
    return useQuery<Contact[]>({
        queryKey: contactKeys.list(filters),
        queryFn: async () => {
            const token = getToken();
            if (!token) return [];
            const response = await contactService.getAllContact(token);
            if (response?.data?.items && Array.isArray(response.data.items)) {
                return response.data.items;
            } else if (response?.data && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        },
    });
}

/** Fetch a single contact by ID */
export function useContactDetail(id: string) {
    return useQuery<ContactConversation | null>({
        queryKey: contactKeys.detail(id),
        queryFn: async () => {
            const token = getToken();
            if (!token) return null;
            const response = await contactService.getContactById(token, id);
            return response?.data || response || null;
        },
        enabled: !!id,
    });
}

/** Fetch messages for a ticket */
export function useContactMessages(id: string) {
    return useQuery<ContactMessage[]>({
        queryKey: contactKeys.messages(id),
        queryFn: async () => {
            const token = getToken();
            if (!token) return [];
            const response = await contactService.getContactMessages(token, id);
            if (response?.data?.items && Array.isArray(response.data.items)) {
                return response.data.items;
            } else if (response?.data && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        },
        enabled: !!id,
    });
}

/** Fetch all contact tags */
export function useContactTags() {
    return useQuery<ContactTag[]>({
        queryKey: contactKeys.tags(),
        queryFn: async () => {
            const token = getToken();
            if (!token) return [];
            const response = await contactService.getAllContactTag(token);
            if (response?.data?.items && Array.isArray(response.data.items)) {
                return response.data.items;
            } else if (response?.data && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        },
    });
}
