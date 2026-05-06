import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactService } from "@/services/contact/contact.service";
import { UpdateContactDto } from "@/types/contact/contact.type";
import { contactKeys } from "./use-contacts";
import { useToast } from "@/contexts/ToastContext";
const contactService = new ContactService();

function getToken() {
    return authStorage.getAccessToken() || "";
}

export function useReplyContact(ticketId: string) {
    const { showToast } = useToast();
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
            showToast("Đã gửi phản hồi thành công! ✉️", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Gửi phản hồi thất bại", "error");
        },
    });
}

export function useUpdateContact(ticketId: string) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updateData: UpdateContactDto) => {
            const token = getToken();
            return contactService.updateContact(token, ticketId, updateData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            showToast("Cập nhật ticket thành công ✅", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Cập nhật thất bại", "error");
        },
    });
}

export function useCloseContact(ticketId: string) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const token = getToken();
            return contactService.closeContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            showToast("Đã đóng ticket 🔒", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Không thể đóng ticket", "error");
        },
    });
}

export function useReopenContact(ticketId: string) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const token = getToken();
            return contactService.reopenContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(ticketId) });
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            showToast("Đã mở lại ticket 🔓", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Không thể mở lại ticket", "error");
        },
    });
}

export function useDeleteContact() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ticketId: string) => {
            const token = getToken();
            return contactService.deleteContact(token, ticketId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            showToast("Đã xóa ticket thành công 🗑️", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Xóa ticket thất bại", "error");
        },
    });
}

export function useDeleteManyContacts() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const token = getToken();
            return contactService.deleteManyContacts(token, ids);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contactKeys.all });
            showToast("Đã xóa các ticket đã chọn 🗑️", "success");
        },
        onError: (error: any) => {
            showToast(error.message || "Xóa nhiều ticket thất bại", "error");
        },
    });
}
