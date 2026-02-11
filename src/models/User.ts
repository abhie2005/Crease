/**
 * User model. Re-exports from types; keeps DEFAULT_USER_ROLE constant.
 */

import type { UserRole } from '@/types/user';
export type { User, UserRole, PinnedPerformance } from '@/types/user';

/** Default role assigned to new users. */
export const DEFAULT_USER_ROLE: UserRole = 'player';
