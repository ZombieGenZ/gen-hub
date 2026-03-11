import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactService } from "@/services/contact/contact.service";
import { UpdateContactDto } from "@/types/contact/contact.type";
import { contactKeys } from "./use-contacts";

const contactService = new ContactService();

function getToken() {
    return authStorage.getAccessToken() || "";
}

export function useReplyContact(ticketId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ content, is_internal }: { content: string; is_internal: boolean }) => {
            const token = getToken();
            return contactService.replyContact(token, ticketId, { content, is_internal });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.messages(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}

export function useUpdateContact(ticketId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updateData: UpdateContactDto) => {
            const token = getToken();
            return contactService.updateContact(token, ticketId, updateData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}

export function useCloseContact(ticketId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const token = getToken();
            return contactService.closeContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}

export function useReopenContact(ticketId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const token = getToken();
            return contactService.reopenContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}

export function useDeleteContact() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ticketId: string) => {
            const token = getToken();
            return contactService.deleteContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}

export function useDeleteManyContacts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const token = getToken();
            return contactService.deleteManyContacts(token, ids);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
        },
    });
}
