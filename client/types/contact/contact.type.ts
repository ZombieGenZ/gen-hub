export interface ContactAssignedStaff {
    id: string,
    name: string,
    email?: string
}

export interface Contact {
    id: string,
    code: string,
    customer_name: string,
    customer_email: string,
    customer_phone: string,
    customer_company: string,
    subject: string,
    status: string,
    priority: string,
    channel: string,
    assigned_staff_list: ContactAssignedStaff[],
    tags?: ContactTag[],
    assigned_staff_count: number,
    messages_count: number,
    last_activity_at: string,
    created_at: string,
    enable_ai_reply?: boolean,
    is_skipped?: boolean,
    is_priority_customer?: boolean
}

export interface ContactTag {
    id: string,
    name: string,
    description: string,
    color: string,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    is_deleted: boolean,
    deleted_at: string,
    created_by: string,
    updated_by: string,
    deleted_by: string
}

export interface ContactRequest {
    name: string,
    email: string,
    phone: string,
    company: string,
    subject: string,
    message: string
}

export interface ReplyRequest {
    content: string,
    is_internal: boolean
}

export interface ContactTagRequest {
    name: string,
    description: string,
    color: string
}

export interface UpdateContactTagRequest {
    name: string,
    description: string,
    color: string
    is_active: boolean
}

export interface ContactMessage {
    id: string,
    conversation_id: string,
    sender_type: 'CUSTOMER' | 'STAFF' | 'AI' | 'BOT' | 'SYSTEM',
    sender_name: string,
    sender_email?: string,
    content: string,
    attachments?: string[],
    is_internal: boolean,
    created_at: string
}

export interface ContactConversation extends Contact {
    message?: string,
    messages?: ContactMessage[],
    ai_summary?: string,
    satisfaction_rating?: number,
    first_response_at?: string,
    is_skipped?: boolean,
    resolved_at?: string,
    closed_at?: string,
    assigned_staff_id?: string,
    assigned_staff_name?: string,
    customer_avatar?: string
}

export interface UpdateContactDto {
    status?: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'SPAM',
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    tags?: string[],
    staff_ids?: string[],
    enable_ai_reply?: boolean
}

export interface ContactQueryParams {
    type?: 'SUPPORT' | 'SALES' | 'PARTNERSHIP',
    status?: string,
    keywords?: string,
    is_priority_customer?: boolean,
    is_skipped?: boolean,
    offset?: number,
    limit?: number
}

export interface ContactListPayload {
    items: Contact[],
    total: number,
    limit?: number,
    offset?: number,
    hasMore?: boolean
}

export interface ContactSocketCreated {
    conversationId: string;
    code: string;
    email: string;
    timestamp: string;
}

export interface ContactSocketUpdated {
    conversationId: string;
    code: string;
    updatedFields: string[];
    updatedBy: string;
    timestamp: string;
}

export interface ContactSocketMessageCreated {
    conversationId: string;
    message: {
        id: string;
        sender_type: 'CUSTOMER' | 'STAFF' | 'AI';
        sender_name: string;
        content: string;
        is_internal: boolean;
        created_at: string;
    };
    timestamp: string;
}

export interface ContactSocketClosed {
    conversationId: string;
    code: string;
    closedBy: string;
    timestamp: string;
}

export interface ContactSocketReopened {
    conversationId: string;
    code: string;
    reopenedBy: string;
    timestamp: string;
}

export interface ContactSocketDeleted {
    conversationId: string;
    deletedBy: string;
    timestamp: string;
}

export interface ContactSocketDeletedMany {
    requestedIds: string[];
    count: number;
    deletedBy: string;
    timestamp: string;
}
