import { Prisma } from '@prisma/client';

export const addonTypeListSelect = {
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
  addons: {
    where: { is_deleted: false },
    include: {
      addon: true,
    },
  },
} satisfies Prisma.AddonTypeSelect;

export const addonDetailSelect = {
  ...addonTypeListSelect,
} satisfies Prisma.AddonTypeSelect;
