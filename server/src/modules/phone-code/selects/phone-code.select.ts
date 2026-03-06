import { Prisma } from '@prisma/client';

export const phoneCodeListSelect = {
  id: true,
  name: true,
  description: true,
  code: true,
  flag_url: true,
  is_active: true,
  is_deleted: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
  deleted_by: true,
} satisfies Prisma.PhoneCodeSelect;

export const phoneCodeDetailSelect = {
  ...phoneCodeListSelect,
} satisfies Prisma.PhoneCodeSelect;
