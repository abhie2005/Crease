import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential
} from 'firebase/auth';
import { auth } from './config';
import { getUserByUsername, getUser, createOrUpdateUser } from '@/services/users';

export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password);
};

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

export const logInWithEmailOrUsername = async (
  emailOrUsername: string,
  password: string
): Promise<UserCredential> => {
  const credential = emailOrUsername.trim();
  
  // Validate that input is not empty after trimming
  if (!credential) {
    throw new Error('Email or username cannot be empty');
  }
  
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

export const logOut = async (): Promise<void> => {
  return signOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

