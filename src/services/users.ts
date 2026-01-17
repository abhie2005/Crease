import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { userDoc, usersCollection } from '@/firebase/firestore';
import { User, DEFAULT_USER_ROLE } from '@/models/User';

/**
 * Normalize username to lowercase for case-insensitive storage and search
 * @param username Username to normalize
 * @returns Normalized username in lowercase, or undefined if input is empty
 */
const normalizeUsername = (username?: string): string | undefined => {
  if (!username || !username.trim()) {
    return undefined;
  }
  return username.trim().toLowerCase();
};

export const createOrUpdateUser = async (
  uid: string,
  data: { name: string; studentId: string; role?: User['role']; username?: string }
): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:createOrUpdateUser',message:'Creating/updating user',data:{uid,name:data.name},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const userRef = userDoc(uid);
  const existingUser = await getDoc(userRef);
  
  const userData: User = {
    uid,
    name: data.name,
    studentId: data.studentId,
    username: normalizeUsername(data.username),
    role: data.role || DEFAULT_USER_ROLE,
    createdAt: existingUser.exists() ? existingUser.data().createdAt : serverTimestamp() as any,
    updatedAt: serverTimestamp() as any
  };

  await setDoc(userRef, userData, { merge: true });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:createOrUpdateUser',message:'User saved to Firestore',data:{uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
};

export const getUser = async (uid: string): Promise<User | null> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUser',message:'Fetching user from Firestore',data:{uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const userRef = userDoc(uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUser',message:'User document does not exist',data:{uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return null;
  }
  
  const userData = userSnap.data();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUser',message:'User document found',data:{uid,hasName:!!userData?.name,name:userData?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return userData;
};

/**
 * Search users by username (prefix matching, case-insensitive)
 * Note: Usernames are stored in lowercase in Firestore for case-insensitive matching.
 * This function normalizes the search query to lowercase to match stored usernames.
 * @param searchQuery Search query
 * @param currentUserId Optional user ID to exclude from results
 * @param resultLimit Maximum number of results to return (default: 20)
 * @returns Array of matching users
 */
export const searchUsersByUsername = async (
  searchQuery: string,
  currentUserId?: string,
  resultLimit: number = 20
): Promise<User[]> => {
  if (!searchQuery || !searchQuery.trim()) {
    return [];
  }

  // Normalize query to lowercase to match stored usernames (which are stored in lowercase)
  const normalizedQuery = searchQuery.trim().toLowerCase();
  
  // Firestore prefix query using >= and <= with \uf8ff sentinel
  // This works because usernames are stored in lowercase
  const q = query(
    usersCollection,
    where('username', '>=', normalizedQuery),
    where('username', '<=', normalizedQuery + '\uf8ff'),
    limit(resultLimit)
  );

  const querySnapshot = await getDocs(q);
  const users: User[] = [];

  querySnapshot.forEach((doc) => {
    const userData = doc.data();
    // Filter out current user and users without username
    if (userData.username && (!currentUserId || doc.id !== currentUserId)) {
      users.push(userData);
    }
  });

  return users;
};

/**
 * Get user by username (exact match, case-insensitive)
 * Note: Usernames are stored in lowercase in Firestore for case-insensitive matching.
 * This function normalizes the search query to lowercase to match stored usernames.
 * @param username Username to search for
 * @returns User if found, null otherwise
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  if (!username || !username.trim()) {
    return null;
  }

  // Normalize username to lowercase to match stored usernames (which are stored in lowercase)
  const normalizedUsername = username.trim().toLowerCase();
  
  const q = query(
    usersCollection,
    where('username', '==', normalizedUsername),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }

  return querySnapshot.docs[0].data();
};
