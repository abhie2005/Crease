/**
 * User domain types and username aliases.
 */

import { Timestamp } from 'firebase/firestore';
import type { OptionalString } from './common';

/** User role for access control and UI. */
export type UserRole = 'player' | 'admin' | 'president';

/** Pinned performance: one batting or bowling performance from a match. */
export interface PinnedPerformance {
  matchId: string;
  type: 'batting' | 'bowling';
}

/** Firestore user profile document shape. */
export interface User {
  uid: string;
  name: string;
  email: string;
  studentId: string;
  username?: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  showRecentlyPlayed?: boolean;
  showMatchHistory?: boolean;
  showPinnedPerformance?: boolean;
  pinnedPerformance?: PinnedPerformance;
}

/** Optional username input (form field, search query). */
export type UsernameInput = OptionalString;

/** Normalized username (lowercase, trimmed) for storage/comparison. */
export type NormalizedUsername = string | undefined;
