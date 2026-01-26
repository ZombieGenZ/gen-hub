import { Prisma } from '@prisma/client';

export const amenityListSelect = {
    id: true,
    name: true,
    description: true,
    is_active: true,
    is_deleted: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    updated_by: true,
    deleted_at: true,
    deleted_by: true,
} satisfies Prisma.AmenitySelect;

export const amenityDetailSelect = {
    ...amenityListSelect,
} satisfies Prisma.AmenitySelect;
