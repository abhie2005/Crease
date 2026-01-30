/**
 * Firebase Authentication helpers: sign up, login (email or username), logout.
 * Used by auth screens and AuthProvider.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential
} from 'firebase/auth';
import { auth } from './config';
import { getUserByUsername, getUser, createOrUpdateUser } from '@/services/users';

/**
 * Creates a new user account with email and password.
 * @param email - User email
 * @param password - User password
 * @returns Firebase UserCredential
 */
export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Signs in with email and password. Performs lazy migration to set email on Firestore profile if missing.
 * @param email - User email
 * @param password - User password
 * @returns Firebase UserCredential
 */
export const logIn = async (email: string, password: string): Promise<UserCredential> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  
  // Lazy migration: Update Firestore if email field is missing
  try {
    const userProfile = await getUser(credential.user.uid);
    if (userProfile && !userProfile.email) {
      // User exists but email field is missing - update it
      await createOrUpdateUser(credential.user.uid, {
        name: userProfile.name,
        email: email,
        studentId: userProfile.studentId,
        username: userProfile.username,
        role: userProfile.role
      });
    }
  } catch (error) {
    // Ignore migration errors - user is already logged in
    console.error('Email migration failed:', error);
  }
  
  return credential;
};

/**
 * Signs in with either email or username and password.
 * @param emailOrUsername - Email address or username
 * @param password - User password
 * @returns Firebase UserCredential
 */
export const logInWithEmailOrUsername = async (
  emailOrUsername: string,
  password: string
): Promise<UserCredential> => {
  const credential = emailOrUsername.trim();
  
  // Check if input contains @ symbol to determine if it's an email
  if (credential.includes('@')) {
    // Direct email login with lazy migration
    return logIn(credential, password);
  } else {
    // Username login - need to look up email first
    const user = await getUserByUsername(credential);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    if (!user.email) {
      throw new Error('Account needs migration. Please login with your email once, then you can use your username.');
    }
    
    // Login with the email associated with this username
    const loginCredential = await signInWithEmailAndPassword(auth, user.email, password);
    
    return loginCredential;
  }
};

/** Signs out the current user. */
export const logOut = async (): Promise<void> => {
  return signOut(auth);
};

/** Returns the currently signed-in Firebase user, or null. */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

