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
    assigned_staff_list: [],
    tags?: ContactTag[],
    assigned_staff_count: number,
    messages_count: number,
    last_activity_at: string,
    created_at: string
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
    sender_type: 'CUSTOMER' | 'STAFF' | 'BOT' | 'SYSTEM',
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
    status?: string,
    priority?: string,
    assigned_staff_id?: string,
    tag_ids?: string[],
    is_skipped?: boolean
}