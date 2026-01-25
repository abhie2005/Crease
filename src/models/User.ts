import { Timestamp } from 'firebase/firestore';

export type UserRole = 'player' | 'admin' | 'president';

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

export const DEFAULT_USER_ROLE: UserRole = 'player';

