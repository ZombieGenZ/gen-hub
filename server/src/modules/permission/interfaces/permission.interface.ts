/**
 * Interface cho Permission trong hệ thống
 */
export interface IPermission {
    id: string;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Interface cho Permission với trạng thái gán
 */
export interface IPermissionWithAssignment extends IPermission {
    is_assigned: boolean;
}

/**
 * Kết quả phân trang Permission
 */
export interface IPermissionListResult {
    data: IPermission[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Kết quả Permission với trạng thái gán
 */
export interface IPermissionWithAssignmentListResult {
    data: IPermissionWithAssignment[];
    total: number;
    limit: number;
    offset: number;
}
