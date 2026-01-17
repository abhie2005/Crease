import { Timestamp } from 'firebase/firestore';

export type UserRole = 'player' | 'admin' | 'president';

export interface User {
  uid: string;
  name: string;
  studentId: string;
  username?: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const DEFAULT_USER_ROLE: UserRole = 'player';

