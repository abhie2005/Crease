/**
 * User model types and default role.
 * Used across auth, profile, and user services.
 */

import { Timestamp } from 'firebase/firestore';

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
  email: string; // Store email for username-based login lookup
  studentId: string;
  username?: string; // Optional for backward compatibility
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Privacy: show recently played to others (default true). */
  showRecentlyPlayed?: boolean;
  /** Privacy: show match history to others (default true). */
  showMatchHistory?: boolean;
  /** Privacy: show pinned performance to others (default true). */
  showPinnedPerformance?: boolean;
  /** One pinned batting or bowling performance. */
  pinnedPerformance?: PinnedPerformance;
}

/** Default role assigned to new users. */
export const DEFAULT_USER_ROLE: UserRole = 'player';

