import { Prisma } from '@prisma/client';

/**
 * Prisma select fields for Account module
 * Tối ưu queries bằng cách chỉ lấy các trường cần thiết
 */

/**
 * Fields cho profile response
 * Sử dụng trong getProfile endpoint
 */
export const accountProfileSelect = {
    id: true,
    name: true,
    email: true,
    email_confirmed: true,
    is_verified: true,
    two_factor_enabled: true,
    language: true,
    avatar_url: true,
    cover_url: true,
    avatar_image_id: true,
    cover_image_id: true,
    created_at: true,
} satisfies Prisma.UserSelect;

/**
 * Fields cơ bản cho update profile check
 * Sử dụng trong updateProfile endpoint
 */
export const accountBasicSelect = {
    id: true,
    name: true,
    email: true,
    language: true,
    avatar_url: true,
    cover_url: true,
    avatar_image_id: true,
    cover_image_id: true,
} satisfies Prisma.UserSelect;

/**
 * Fields cho change password
 * Bao gồm password để verify
 */
export const accountPasswordSelect = {
    id: true,
    email: true,
    name: true,
    password: true,
    language: true,
} satisfies Prisma.UserSelect;

/**
 * Fields cho delete account check
 */
export const accountDeleteSelect = {
    id: true,
    email: true,
    name: true,
} satisfies Prisma.UserSelect;

/**
 * Select cho roles trong profile
 */
export const accountRolesInclude = {
    where: { is_deleted: false, is_active: true },
    include: {
        role: {
            select: {
                id: true,
                name: true,
                description: true,
                permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        permission: {
                            select: {
                                id: true,
                                name: true,
                                key: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.UserRoleFindManyArgs;

/**
 * Select cho permissions trong profile
 */
export const accountPermissionsInclude = {
    where: { is_deleted: false, is_active: true },
    include: {
        permission: {
            select: {
                id: true,
                name: true,
                key: true,
                description: true,
            },
        },
    },
} satisfies Prisma.UserPermissionFindManyArgs;
