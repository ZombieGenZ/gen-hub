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