import { Prisma } from '@prisma/client';

export const wardListSelect = {
  id: true,
  code: true,
  name: true,
  slug: true,
  type: true,
  province_id: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.WardSelect;

export const wardDetailSelect = {
  ...wardListSelect,
  province: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.WardSelect;
