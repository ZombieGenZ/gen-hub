import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactListService } from "@/services/contact-list/contact-list.service";
import { CreateContactListDto, UpdateContactListDto, QueryContactListDto, ContactListType } from "@/types/contact/contact-list.type";

const contactListService = new ContactListService();

function getToken() {
    return authStorage.getAccessToken() || "";
}

export const contactListKeys = {
    all: ["contact-list"] as const,
    list: (filters?: QueryContactListDto) => [...contactListKeys.all, "list", filters] as const,
    detail: (id: string) => [...contactListKeys.all, "detail", id] as const,
    check: (value: string) => [...contactListKeys.all, "check", value] as const,
};

// ─── Query Hooks ────────────────────────────────────────────

export function useContactListEntries(filters?: QueryContactListDto) {
    return useQuery({
        queryKey: contactListKeys.list(filters),
        queryFn: async () => {
            const token = getToken();
            if (!token) return { data: [], meta: { total: 0 } };
            return contactListService.getAll(token, filters);
        },
    });
}

export function useContactListCheck(value: string | undefined, type: ContactListType) {
    return useQuery({
        queryKey: contactListKeys.check(value || ""),
        queryFn: async () => {
            const token = getToken();
            if (!token || !value) return null;
            // We reuse getAll, filtering by value and type
            // Ideally backend should have a check endpoint, but getAll works for now
            const response = await contactListService.getAll(token, {
                search: value,
                list_type: type,
                limit: 1,
            });
            return response.data && response.data.length > 0 ? response.data[0] : null;
        },
        enabled: !!value,
    });
}

// ─── Mutation Hooks ─────────────────────────────────────────

export function useCreateContactListEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateContactListDto) => {
            const token = getToken();
            return contactListService.create(token, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactListKeys.all });
        },
    });
}

export function useUpdateContactListEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateContactListDto }) => {
            const token = getToken();
            return contactListService.update(token, id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactListKeys.all });
        },
    });
}

export function useDeleteContactListEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const token = getToken();
            return contactListService.delete(token, id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactListKeys.all });
        },
    });
}
