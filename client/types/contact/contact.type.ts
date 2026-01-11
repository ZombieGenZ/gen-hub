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
    tags: [],
    assigned_staff_count: number,
    messages_count: number,
    last_activity_at: string,
    created_at: string
}