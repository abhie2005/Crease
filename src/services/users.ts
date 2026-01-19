import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { userDoc, usersCollection } from '@/firebase/firestore';
import { User, DEFAULT_USER_ROLE } from '@/models/User';
/**
 * Normalize username to lowercase for case-insensitive storage and search
 * @param username Username to normalize
 * @returns Normalized username in lowercase, or undefined if input is empty
 */
const normalizeUsernameLocal = (username?: string): string | undefined => {
  if (!username || !username.trim()) {
    return undefined;
  }
  return username.trim().toLowerCase();
};

export const createOrUpdateUser = async (
  uid: string,
  data: { name: string; studentId: string; username?: string; role?: User['role'] }
): Promise<void> => {
  data: { name: string; studentId: string; username?: string; role?: User['role'] }
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
    userData.username = normalizeUsernameLocal(data.username);
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
  const normalized = normalizeUsernameLocal(username);
  
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
  const normalized = normalizeUsernameLocal(username);
  
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
  
  // Filter out empty strings, null, undefined, and trim whitespace
  const validUids = uids
    .filter(uid => uid != null && typeof uid === 'string')
    .map(uid => uid.trim())
    .filter(uid => uid.length > 0);
  
  if (validUids.length === 0) {
    console.log('[getUsersByUids] No valid UIDs after filtering, returning []');
    return [];
  }
  
  // Remove duplicates
  const uniqueUids = Array.from(new Set(validUids));
  console.log('[getUsersByUids] Valid unique UIDs:', uniqueUids);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Fetching users by document ID',data:{uniqueUids:uniqueUids,count:uniqueUids.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  try {
    // Fetch all users in parallel using their document IDs
    const userPromises = uniqueUids.map(uid => 
      getDoc(userDoc(uid)).catch(error => {
        console.error(`[getUsersByUids] Error fetching user ${uid}:`, error);
        return null;
      })
    );
    const userDocs = await Promise.all(userPromises);
    
    const allUsers: User[] = [];
    
    userDocs.forEach((docSnap, index) => {
      const uid = uniqueUids[index];
      if (docSnap && docSnap.exists()) {
        const userData = docSnap.data();
        // Ensure the user data has a uid field
        if (userData) {
          const userWithUid = { ...userData, uid };
          console.log('[getUsersByUids] Found user:', uid, userWithUid.name);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Found user',data:{uid:uid,name:userWithUid?.name,username:userWithUid?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          allUsers.push(userWithUid);
        }
      } else {
        // If user not found, treat the UID as a name (fallback for names added by admin)
        console.log('[getUsersByUids] User not found, using as name:', uid);
        const placeholderUser: User = {
          uid: uid,
          name: uid, // Use the string itself as the name
          studentId: 'N/A',
          role: 'player',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        allUsers.push(placeholderUser);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'User not found, using placeholder',data:{uid:uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }
    });
    
    console.log('[getUsersByUids] Returning', allUsers.length, 'users out of', uniqueUids.length, 'requested');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/services/users.ts:getUsersByUids',message:'Returning users',data:{allUsersCount:allUsers.length,requestedCount:uniqueUids.length,allUsers:allUsers.map(u=>({uid:u.uid,name:u.name,username:u.username}))},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    return allUsers;
  } catch (error) {
    console.error('[getUsersByUids] Error fetching users:', error);
    return [];
  }
};
