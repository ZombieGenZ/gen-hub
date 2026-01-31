export interface WarehouseManagerTemplate {
    id: string,
    user: {
        id: string,
        full_name: string
    },
    warehouse_template: {
        id: string,
        name: string
    },
    roles: WarehouseManagerTemplateRole[]
}

export interface WarehouseManagerTemplateRole {
    id: string,
    name: string,
    description: string,
    permissions: WarehouseManagerTemplatePermission[]
}

export interface WarehouseManagerTemplatePermission {
    id: string,
    name: string,
    code: string
}

export interface WarehouseVisitBooking {
    id: string,
    visitor_name: string,
    visit_date: string,
    visit_time_start: string,
    visit_time_end: string,
    status: string,
    booking_code: string,
    warehouse_template: {
        id: string,
        name: string
    }
}
