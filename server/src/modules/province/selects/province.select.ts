import { Prisma } from '@prisma/client';

export const provinceListSelect = {
  id: true,
  code: true,
  name: true,
  slug: true,
  type: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.ProvinceSelect;

export const provinceDetailSelect = {
  ...provinceListSelect,
  wards: {
    where: { is_deleted: false, is_active: true },
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      type: true,
    },
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.ProvinceSelect;
