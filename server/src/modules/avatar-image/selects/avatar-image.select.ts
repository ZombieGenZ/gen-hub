import { Prisma } from '@prisma/client';

export const avatarImageListSelect = {
  id: true,
  name: true,
  description: true,
  image_url: true,
  is_default: true,
  is_active: true,
  is_deleted: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
  deleted_by: true,
} satisfies Prisma.AvatarImageSelect;

export const avatarImageDetailSelect = {
  ...avatarImageListSelect,
} satisfies Prisma.AvatarImageSelect;
