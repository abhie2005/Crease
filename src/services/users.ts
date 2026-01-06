import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { userDoc } from '@/firebase/firestore';
import { User, DEFAULT_USER_ROLE } from '@/models/User';

export const createOrUpdateUser = async (
  uid: string,
  data: { name: string; studentId: string; role?: User['role'] }
): Promise<void> => {
  const userRef = userDoc(uid);
  const existingUser = await getDoc(userRef);
  
  const userData: User = {
    uid,
    name: data.name,
    studentId: data.studentId,
    role: data.role || DEFAULT_USER_ROLE,
    createdAt: existingUser.exists() ? existingUser.data().createdAt : serverTimestamp() as any,
    updatedAt: serverTimestamp() as any
  };

  await setDoc(userRef, userData, { merge: true });
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = userDoc(uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  return userSnap.data();
};

