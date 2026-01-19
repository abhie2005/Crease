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
import { normalizeUsername } from '@/utils/usernameValidation';

export const createOrUpdateUser = async (
  uid: string,
  data: { name: string; studentId: string; username?: string; role?: User['role'] }
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
    role: data.role || DEFAULT_USER_ROLE,
    createdAt: existingUser.exists() ? existingUser.data().createdAt : serverTimestamp() as any,
    updatedAt: serverTimestamp() as any
  };

  // Add username if provided (store normalized/lowercase)
  if (data.username) {
    userData.username = normalizeUsername(data.username);
  }

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
 * Checks if a username is available (not taken by another user)
 * @param username - The username to check (will be normalized to lowercase)
 * @param excludeUid - Optional UID to exclude from check (for updating own username)
 * @returns true if available, false if taken
 */
export const checkUsernameAvailability = async (
  username: string,
  excludeUid?: string
): Promise<boolean> => {
  const normalized = normalizeUsername(username);
  
  // Query Firestore for users with this username
  const q = query(
    usersCollection,
    where('username', '==', normalized),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  // If no results, username is available
  if (querySnapshot.empty) {
    return true;
  }
  
  // If excludeUid is provided, check if the only match is the excluded user
  if (excludeUid) {
    const doc = querySnapshot.docs[0];
    return doc.id === excludeUid;
  }
  
  // Username is taken
  return false;
};

/**
 * Search users by username (prefix matching, case-insensitive)
 * Note: Usernames are stored in lowercase in Firestore for case-insensitive matching.
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
  const normalizedQuery = normalizeUsername(searchQuery);
  
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
 * Gets a user by their username (case-insensitive)
 * @param username - The username to search for
 * @returns User document or null if not found
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  const normalized = normalizeUsername(username);
  
  const q = query(
    usersCollection,
    where('username', '==', normalized),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  return querySnapshot.docs[0].data();
};

/**
 * Fetches multiple users by their UIDs
 * Uses getDoc to fetch users by document ID (more efficient than querying)
 * @param uids - Array of user UIDs to fetch
 * @returns Promise<User[]> - Array of user objects
 */
export const getUsersByUids = async (uids: string[]): Promise<User[]> => {
  console.log('[getUsersByUids] Called with:', uids);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Function called',data:{uidsInput:uids,uidsLength:uids?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!uids || uids.length === 0) {
    console.log('[getUsersByUids] Empty uids, returning []');
    return [];
  }
  
  // Remove duplicates
  const uniqueUids = Array.from(new Set(uids));
  console.log('[getUsersByUids] Unique UIDs:', uniqueUids);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Fetching users by document ID',data:{uniqueUids:uniqueUids,count:uniqueUids.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Fetch all users in parallel using their document IDs
  const userPromises = uniqueUids.map(uid => getDoc(userDoc(uid)));
  const userDocs = await Promise.all(userPromises);
  
  const allUsers: User[] = [];
  
  userDocs.forEach((docSnap, index) => {
    const uid = uniqueUids[index];
    if (docSnap.exists()) {
      const userData = docSnap.data();
      console.log('[getUsersByUids] Found user:', uid, userData.name);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Found user',data:{uid:uid,name:userData?.name,username:userData?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      allUsers.push(userData);
    } else {
      console.log('[getUsersByUids] User not found:', uid);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'User not found',data:{uid:uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  });
  
  console.log('[getUsersByUids] Returning', allUsers.length, 'users:', allUsers);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Returning users',data:{allUsersCount:allUsers.length,allUsers:allUsers.map(u=>({uid:u.uid,name:u.name,username:u.username}))},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  return allUsers;
};
