import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import { UserProfile, UserRole } from '../types';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const syncUserProfile = async (
  user: FirebaseUser,
  defaultRole: UserRole = 'Applicant',
  customDisplayName?: string
): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const existingProfile = await getUserProfile(user.uid);

  if (existingProfile) {
    const updated: Partial<UserProfile> = cleanFirestoreData({
      email: user.email || existingProfile.email,
      displayName: customDisplayName || user.displayName || existingProfile.displayName || 'User',
      photoURL: user.photoURL || existingProfile.photoURL,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(userRef, updated);
    return { ...existingProfile, ...updated };
  } else {
    const newProfile: UserProfile = cleanFirestoreData({
      uid: user.uid,
      email: user.email || '',
      displayName: customDisplayName || user.displayName || 'New User',
      photoURL: user.photoURL || '',
      phoneNumber: user.phoneNumber || '',
      role: defaultRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(userRef, newProfile);
    return newProfile;
  }
};

export const registerWithEmail = async (
  email: string,
  pass: string,
  displayName: string,
  role: UserRole = 'Applicant'
): Promise<UserProfile> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateFirebaseProfile(userCredential.user, { displayName });
  return await syncUserProfile(userCredential.user, role, displayName);
};

export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const profile = await getUserProfile(userCredential.user.uid);
  if (!profile) {
    return await syncUserProfile(userCredential.user);
  }
  return profile;
};

export const loginWithGoogle = async (defaultRole: UserRole = 'Applicant'): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return await syncUserProfile(result.user, defaultRole);
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const updateUserRoleInFirestore = async (uid: string, newRole: UserRole): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, cleanFirestoreData({
    role: newRole,
    updatedAt: new Date().toISOString(),
  }));
};
