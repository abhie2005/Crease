import { db } from './config';
import {
  collection,
  doc,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { User } from '@/models/User';
import { Match } from '@/models/Match';

export const usersCollection = collection(db, 'users') as CollectionReference<User>;
export const matchesCollection = collection(db, 'matches') as CollectionReference<Match>;

export const userDoc = (uid: string): DocumentReference<User> => {
  return doc(db, 'users', uid);
};

export const matchDoc = (matchId: string): DocumentReference<Match> => {
  return doc(db, 'matches', matchId);
};

