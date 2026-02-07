/**
 * Firebase app, Auth, and Firestore initialization.
 * Reads config from Expo env (app.config.ts). Auth uses AsyncStorage persistence on React Native.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// RN build of firebase/auth exports this; Metro resolves to dist/rn
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => { type: string };
};

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebase?.apiKey || '',
  authDomain: Constants.expoConfig?.extra?.firebase?.authDomain || '',
  projectId: Constants.expoConfig?.extra?.firebase?.projectId || '',
  storageBucket: Constants.expoConfig?.extra?.firebase?.storageBucket || '',
  messagingSenderId: Constants.expoConfig?.extra?.firebase?.messagingSenderId || '',
  appId: Constants.expoConfig?.extra?.firebase?.appId || ''
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);

  // Use initializeAuth with AsyncStorage so auth state persists across app restarts
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });

  db = getFirestore(app);
} else {
  app = getApps()[0] as FirebaseApp;
  auth = getAuth(app);
  db = getFirestore(app);
}

/** Exported Firebase app, auth, and Firestore instances. */
export { app, auth, db };

