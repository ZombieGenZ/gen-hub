import { Prisma } from '@prisma/client';

export const twoFactorUserSelect = {
  id: true,
  name: true,
  email: true,
  email_confirmed: true,
  is_verified: true,
  two_factor_enabled: true,
  two_factor_token: true,
  language: true,
  created_at: true,
  is_banned: true,
  banned_end: true,
} satisfies Prisma.UserSelect;
