import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ContactService } from "@/services/contact/contact.service";
import { UpdateContactDto } from "@/types/contact/contact.type";
import { contactKeys } from "./use-contacts";
import { toast } from "sonner";

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
            toast.success("Đã gửi phản hồi thành công! ✉️");
        },
        onError: (error: any) => {
            toast.error(error.message || "Gửi phản hồi thất bại");
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
            toast.success("Cập nhật ticket thành công ✅");
        },
        onError: (error: any) => {
            toast.error(error.message || "Cập nhật thất bại");
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
            toast.success("Đã đóng ticket 🔒");
        },
        onError: (error: any) => {
            toast.error(error.message || "Không thể đóng ticket");
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
            toast.success("Đã mở lại ticket 🔓");
        },
        onError: (error: any) => {
            toast.error(error.message || "Không thể mở lại ticket");
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
            toast.success("Đã xóa ticket thành công 🗑️");
        },
        onError: (error: any) => {
            toast.error(error.message || "Xóa ticket thất bại");
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
            toast.success("Đã xóa các ticket đã chọn 🗑️");
        },
        onError: (error: any) => {
            toast.error(error.message || "Xóa nhiều ticket thất bại");
        },
    });
}
