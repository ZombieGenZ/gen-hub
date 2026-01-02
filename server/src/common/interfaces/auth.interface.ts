/**
 * Auth-related interfaces shared across modules
 * Used by: account, auth, two-factor
 */

/**
 * Interface cho device info từ request
 */
export interface IDeviceInfo {
    ip?: string;
    location?: string;
    device?: string;
    os?: string;
}

/**
 * Interface cho JWT Payload cơ bản
 */
export interface IJwtPayload {
    userId: string;
    email?: string;
}

/**
 * Interface cho JWT Payload với thông tin mở rộng
 */
export interface IJwtPayloadExtended extends IJwtPayload {
    iat?: number;
    exp?: number;
}
