
export enum ContactListType {
    BLACKLIST = 'BLACKLIST',
    WHITELIST = 'WHITELIST',
}

export enum ContactListMatchType {
    EMAIL = 'EMAIL',
    EMAIL_DOMAIN = 'EMAIL_DOMAIN',
    IP_V4 = 'IP_V4',
    IP_V6 = 'IP_V6',
    REGION_COUNTRY = 'REGION_COUNTRY',
    REGION_CITY = 'REGION_CITY',
}

export interface ContactListEntry {
    id: string;
    list_type: ContactListType;
    match_type: ContactListMatchType;
    value: string;
    description?: string;
    reason?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

export interface CreateContactListDto {
    list_type: ContactListType;
    match_type: ContactListMatchType;
    value: string;
    reason?: string;
    notes?: string;
    is_active?: boolean;
}

export interface UpdateContactListDto {
    list_type?: ContactListType;
    match_type?: ContactListMatchType;
    value?: string;
    reason?: string;
    notes?: string;
    is_active?: boolean;
}

export interface QueryContactListDto {
    page?: number;
    limit?: number;
    search?: string;
    list_type?: ContactListType;
    match_type?: ContactListMatchType;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
}
