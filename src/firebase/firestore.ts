/**
 * Firestore collection and document references for users and matches.
 * Used by services for all Firestore reads/writes.
 */

import { db } from './config';
import {
  collection,
  doc,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { User } from '@/models/User';
import { Match } from '@/models/Match';

/** Reference to the users collection. */
export const usersCollection = collection(db, 'users') as CollectionReference<User>;
/** Reference to the matches collection. */
export const matchesCollection = collection(db, 'matches') as CollectionReference<Match>;

/**
 * Returns the Firestore document reference for a user by UID.
 * @param uid - User ID
 * @returns DocumentReference for users/{uid}
 */
export const userDoc = (uid: string): DocumentReference<User> => {
  return doc(db, 'users', uid);
};

/**
 * Returns the Firestore document reference for a match by ID.
 * @param matchId - Match document ID
 * @returns DocumentReference for matches/{matchId}
 */
export const matchDoc = (matchId: string): DocumentReference<Match> => {
  return doc(db, 'matches', matchId);
};

