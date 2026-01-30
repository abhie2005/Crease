/**
 * User model types and default role.
 * Used across auth, profile, and user services.
 */

import { Timestamp } from 'firebase/firestore';

/** User role for access control and UI. */
export type UserRole = 'player' | 'admin' | 'president';

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
}

/** Default role assigned to new users. */
export const DEFAULT_USER_ROLE: UserRole = 'player';

