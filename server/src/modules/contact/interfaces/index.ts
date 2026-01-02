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
    assigned_staff_list?: IContactConversationStaff[];
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

/**
 * Interface cho staff được assign vào conversation
 */
export interface IContactConversationStaff {
    id: string;
    conversation_id: string;
    staff_id: string;
    assigned_by?: string | null;
    assigned_at: Date;
    is_active: boolean;
    staff?: {
        id: string;
        name: string;
        email?: string | null;
    };
}

/**
 * Interface cho list item (optimized cho performance)
 */
export interface IContactConversationListItem {
    id: string;
    code: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_company?: string;
    subject?: string;
    status: ContactStatus;
    priority: ContactPriority;
    channel: ContactChannel;
    assigned_staff_id?: string;
    assigned_staff?: {
        id: string;
        name: string;
        email?: string | null;
    };
    assigned_staff_list: {
        id: string;
        name: string;
        email?: string | null;
    }[];
    tags: {
        id: string;
        name: string;
        color?: string | null;
    }[];
    assigned_staff_count: number;
    messages_count: number;
    last_activity_at?: Date;
    created_at: Date;
}

export {
    ContactStatus,
    ContactPriority,
    ContactChannel,
    MessageSender,
    MessageType,
};
