import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  getUserProfile,
  syncUserProfile,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout as authLogout,
  updateUserRoleInFirestore,
} from '../services/auth';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  activeRole: UserRole;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string, role?: UserRole) => Promise<void>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  demoLoginAs: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('Applicant');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);
      if (user) {
        setCurrentUser(user);
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            profile = await syncUserProfile(user, 'Applicant');
          }
          setUserProfile(profile);
          setActiveRole(profile.role || 'Applicant');
        } catch (err: any) {
          console.error('Error syncing auth profile:', err);
          setError(err.message || 'Failed to sync user profile');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setActiveRole('Applicant');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithEmail(email, pass);
      setUserProfile(profile);
      setActiveRole(profile.role);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, displayName: string, role: UserRole = 'Applicant') => {
    setError(null);
    setLoading(true);
    try {
      const profile = await registerWithEmail(email, pass, displayName, role);
      setUserProfile(profile);
      setActiveRole(profile.role);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (defaultRole: UserRole = 'Applicant') => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithGoogle(defaultRole);
      setUserProfile(profile);
      setActiveRole(profile.role);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await authLogout();
      setCurrentUser(null);
      setUserProfile(null);
      setActiveRole('Applicant');
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  };

  const switchRole = async (newRole: UserRole) => {
    setActiveRole(newRole);
    if (userProfile && currentUser) {
      try {
        await updateUserRoleInFirestore(currentUser.uid, newRole);
        setUserProfile({ ...userProfile, role: newRole });
      } catch (err) {
        console.warn('Could not persist role update in Firestore, active role updated locally:', err);
      }
    }
  };

  const demoLoginAs = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    const demoEmail = `demo.${role.toLowerCase().replace(/[^a-z0-9]/g, '')}@nextgenpro.org`;
    const demoPass = 'DemoNextGen2026!';
    const demoName = `Demo ${role}`;

    try {
      // Attempt real Firebase auth registration or sign in silently
      let profile: UserProfile | null = null;
      try {
        profile = await loginWithEmail(demoEmail, demoPass);
      } catch (loginErr: any) {
        if (loginErr?.code === 'auth/user-not-found' || loginErr?.code === 'auth/invalid-credential') {
          profile = await registerWithEmail(demoEmail, demoPass, demoName, role);
        } else {
          throw loginErr;
        }
      }

      if (profile) {
        setUserProfile(profile);
        setActiveRole(role);
      }
    } catch (err: any) {
      // If Firebase Auth provider is disabled (auth/operation-not-allowed) or offline,
      // fallback smoothly to local demo session mode for platform testing
      setError(null);
      setActiveRole(role);
      setUserProfile({
        uid: `demo-${role.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        email: demoEmail,
        displayName: demoName,
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        loading,
        error,
        setError,
        login,
        register,
        signInWithGoogle,
        logout,
        switchRole,
        demoLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
