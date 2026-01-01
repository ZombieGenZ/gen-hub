import {
    ContactConversation,
    ContactMessage,
    ContactStatus,
    ContactPriority,
    ContactChannel,
    MessageSender,
    MessageType,
} from '@prisma/client';

/**
 * ContactConversation với messages
 */
export interface IContactConversationWithMessages extends ContactConversation {
    messages?: ContactMessage[];
}

/**
 * ContactMessage với thông tin conversation
 */
export interface IContactMessageWithConversation extends ContactMessage {
    conversation?: ContactConversation;
}

/**
 * Response phân trang
 */
export interface IPaginatedContactResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Data tạo conversation từ form
 */
export interface ICreateContactData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    subject?: string;
    message: string;
}

/**
 * Data tạo message
 */
export interface ICreateMessageData {
    conversation_id: string;
    sender_type: MessageSender;
    sender_id?: string;
    sender_name: string;
    sender_email?: string;
    message_type?: MessageType;
    content: string;
    content_html?: string;
    email_message_id?: string;
    email_in_reply_to?: string;
    email_subject?: string;
    is_internal?: boolean;
    created_by?: string;
}

/**
 * Data gửi email confirmation
 */
export interface IContactEmailData {
    to: string;
    name: string;
    ticketCode: string;
    subject?: string;
    message: string;
    lang?: string;
}

/**
 * Data gửi email reply
 */
export interface IContactReplyEmailData {
    to: string;
    name: string;
    ticketCode: string;
    originalSubject?: string;
    replyContent: string;
    inReplyTo?: string;
    references?: string[];
    lang?: string;
}

export {
    ContactStatus,
    ContactPriority,
    ContactChannel,
    MessageSender,
    MessageType,
};
