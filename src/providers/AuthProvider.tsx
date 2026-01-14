import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getUser, User as UserProfile } from '@/services/users';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/providers/AuthProvider.tsx:fetchUserProfile',message:'Fetching user profile',data:{uid:firebaseUser.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const profile = await getUser(firebaseUser.uid);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/providers/AuthProvider.tsx:fetchUserProfile',message:'Profile fetched',data:{hasProfile:!!profile,profileName:profile?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setUserProfile(profile);
      return profile;
    } else {
      setUserProfile(null);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/providers/AuthProvider.tsx:refreshUserProfile',message:'Refreshing user profile',data:{uid:user.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      await fetchUserProfile(user);
    }
  };

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/providers/AuthProvider.tsx:29',message:'AuthProvider mount, setting up listener',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9a7e5339-61cc-4cc7-b07b-4ed757a68704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/providers/AuthProvider.tsx:31',message:'onAuthStateChanged triggered',data:{hasUser:!!firebaseUser,uid:firebaseUser?.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setUser(firebaseUser);
      await fetchUserProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

