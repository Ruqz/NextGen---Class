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
import { UserProfile, UserRole, AccountType, AccountStatus, StaffProfile, StaffRole } from '../types';

export const MASTER_STAFF_CREDENTIALS = {
  email: 'master.staff@nextgenclass.org',
  password: 'NextGenMaster2026!',
  displayName: 'Master Staff Administrator',
  role: 'Super Admin' as UserRole,
  accountType: 'STAFF' as AccountType,
  staffRole: 'ADMIN' as StaffRole,
};

export const MASTER_FACILITATOR_CREDENTIALS = {
  email: 'lead.facilitator@nextgenclass.org',
  password: 'NextGenFacilitator2026!',
  displayName: 'Lead Facilitator',
  role: 'Facilitator' as UserRole,
  accountType: 'STAFF' as AccountType,
  staffRole: 'FACILITATOR' as StaffRole,
};

export const seedMasterStaffAccountsInFirestore = async (): Promise<void> => {
  try {
    // 1. Seed Master Staff Admin in Firestore
    const masterAdminRef = doc(db, 'users', 'master_staff_admin');
    const snapAdmin = await getDoc(masterAdminRef);
    if (!snapAdmin.exists()) {
      await setDoc(masterAdminRef, cleanFirestoreData({
        uid: 'master_staff_admin',
        id: 'master_staff_admin',
        firstName: 'Master',
        lastName: 'Administrator',
        email: MASTER_STAFF_CREDENTIALS.email,
        displayName: MASTER_STAFF_CREDENTIALS.displayName,
        role: 'Super Admin',
        accountType: 'STAFF',
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    await ensureStaffProfile('master_staff_admin', 'ADMIN');

    // 2. Seed Lead Facilitator in Firestore
    const masterFacilitatorRef = doc(db, 'users', 'master_lead_facilitator');
    const snapFacil = await getDoc(masterFacilitatorRef);
    if (!snapFacil.exists()) {
      await setDoc(masterFacilitatorRef, cleanFirestoreData({
        uid: 'master_lead_facilitator',
        id: 'master_lead_facilitator',
        firstName: 'Lead',
        lastName: 'Facilitator',
        email: MASTER_FACILITATOR_CREDENTIALS.email,
        displayName: MASTER_FACILITATOR_CREDENTIALS.displayName,
        role: 'Facilitator',
        accountType: 'STAFF',
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    await ensureStaffProfile('master_lead_facilitator', 'FACILITATOR');
  } catch (err) {
    console.warn('Notice: Seeding master staff accounts in Firestore:', err);
  }
};

export const getStaffProfile = async (userId: string): Promise<StaffProfile | null> => {
  try {
    const docRef = doc(db, 'staffProfiles', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as StaffProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return null;
  }
};

export const ensureStaffProfile = async (
  userId: string,
  staffRole: StaffRole = 'PROGRAMME_MANAGER'
): Promise<StaffProfile> => {
  const docRef = doc(db, 'staffProfiles', userId);
  const existing = await getStaffProfile(userId);
  if (existing) return existing;

  const permissionsMap: Record<StaffRole, string[]> = {
    PROGRAMME_MANAGER: [
      'manage_programmes',
      'manage_cohorts',
      'manage_applications',
      'manage_admissions',
      'manage_classes',
      'manage_attendance',
      'manage_assignments',
      'manage_assessments',
      'manage_learners',
      'manage_reports',
      'manage_certificates',
    ],
    FACILITATOR: [
      'manage_assigned_classes',
      'manage_assigned_learners',
      'manage_attendance',
      'manage_assignments',
      'manage_assessments',
      'view_learner_progress',
    ],
    ME: [
      'view_programme_metrics',
      'view_cohort_metrics',
      'view_attendance_data',
      'view_progress_data',
      'view_impact_data',
      'export_reports',
    ],
    ADMIN: [
      'super_admin_access',
      'manage_system_settings',
      'manage_staff_roles',
      'manage_all_data',
    ],
  };

  const newStaffProfile: StaffProfile = cleanFirestoreData({
    userId,
    staffRole,
    permissions: permissionsMap[staffRole] || [],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, newStaffProfile);
  return newStaffProfile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Ensure backward compatible role and accountType fields
      const accountType: AccountType = data.accountType || (
        data.role === 'Applicant' ? 'APPLICANT' :
        data.role === 'Learner' ? 'LEARNER' : 'STAFF'
      );
      const accountStatus: AccountStatus = data.accountStatus || 'ACTIVE';

      return {
        uid: data.uid || data.id || uid,
        ...data,
        accountType,
        accountStatus,
      } as UserProfile;
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

  const isMasterStaffEmail =
    user.email?.toLowerCase() === MASTER_STAFF_CREDENTIALS.email.toLowerCase() ||
    user.email?.toLowerCase() === 'admin@nextgenclass.org' ||
    user.email?.toLowerCase() === 'horlahidey25@gmail.com';

  const isMasterFacilitatorEmail =
    user.email?.toLowerCase() === MASTER_FACILITATOR_CREDENTIALS.email.toLowerCase();

  let effectiveRole: UserRole = defaultRole;
  if (isMasterStaffEmail) {
    effectiveRole = 'Super Admin';
  } else if (isMasterFacilitatorEmail) {
    effectiveRole = 'Facilitator';
  }

  const defaultName = isMasterStaffEmail
    ? 'Master Staff Administrator'
    : isMasterFacilitatorEmail
    ? 'Lead Facilitator'
    : 'Platform User';

  const fullName = customDisplayName || user.displayName || existingProfile?.displayName || defaultName;
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || 'Platform';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  let accountType: AccountType = 'APPLICANT';
  if (effectiveRole === 'Learner' || effectiveRole === 'LEARNER') accountType = 'LEARNER';
  if (
    ['Facilitator', 'Programme Manager', 'M&E Manager', 'Super Admin', 'STAFF', 'PROGRAMME_MANAGER', 'FACILITATOR', 'ME_MANAGER', 'SUPER_ADMIN'].includes(effectiveRole)
  ) {
    accountType = 'STAFF';
  }

  if (existingProfile) {
    const updated: Partial<UserProfile> = cleanFirestoreData({
      email: user.email || existingProfile.email,
      displayName: fullName,
      firstName: existingProfile.firstName || firstName,
      lastName: existingProfile.lastName || lastName,
      photoURL: user.photoURL || existingProfile.photoURL,
      role: isMasterStaffEmail ? 'Super Admin' : existingProfile.role,
      accountType: isMasterStaffEmail ? 'STAFF' : (existingProfile.accountType || accountType),
      accountStatus: existingProfile.accountStatus || 'ACTIVE',
      updatedAt: new Date().toISOString(),
    });
    await setDoc(userRef, updated, { merge: true });

    // If accountType is STAFF, ensure staffProfile exists
    if ((existingProfile.accountType || accountType) === 'STAFF' || isMasterStaffEmail) {
      const staffRole: StaffRole =
        isMasterStaffEmail ? 'ADMIN' :
        effectiveRole === 'Facilitator' || effectiveRole === 'FACILITATOR' ? 'FACILITATOR' :
        effectiveRole === 'M&E Manager' || effectiveRole === 'ME_MANAGER' ? 'ME' :
        effectiveRole === 'Super Admin' || effectiveRole === 'SUPER_ADMIN' ? 'ADMIN' : 'PROGRAMME_MANAGER';
      await ensureStaffProfile(user.uid, staffRole);
    }

    return { ...existingProfile, ...updated };
  } else {
    const newProfile: UserProfile = cleanFirestoreData({
      uid: user.uid,
      id: user.uid,
      firstName,
      lastName,
      email: user.email || '',
      displayName: fullName,
      photoURL: user.photoURL || '',
      phoneNumber: user.phoneNumber || '',
      role: effectiveRole,
      accountType,
      accountStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(userRef, newProfile);

    if (accountType === 'STAFF') {
      const staffRole: StaffRole =
        isMasterStaffEmail ? 'ADMIN' :
        effectiveRole === 'Facilitator' || effectiveRole === 'FACILITATOR' ? 'FACILITATOR' :
        effectiveRole === 'M&E Manager' || effectiveRole === 'ME_MANAGER' ? 'ME' :
        effectiveRole === 'Super Admin' || effectiveRole === 'SUPER_ADMIN' ? 'ADMIN' : 'PROGRAMME_MANAGER';
      await ensureStaffProfile(user.uid, staffRole);
    }

    return newProfile;
  }
};

export const formatAuthErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const code = error.code || '';
  const message = error.message || '';

  if (
    code === 'auth/api-key-not-valid' ||
    code === 'auth/invalid-api-key' ||
    message.includes('api-key-not-valid') ||
    message.includes('API key not valid')
  ) {
    return 'Firebase API key is being updated or restricted in Firebase Console. Using local verified session.';
  }
  if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
    return 'This email address is already registered. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || message.includes('weak-password') || message.includes('Password should be at least 6 characters')) {
    return 'Password must be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Email/Password sign-in is disabled in Firebase Console (Authentication > Sign-in method > Email/Password).';
  }
  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'Current domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (code === 'auth/user-not-found' || message.includes('user-not-found')) {
    return 'No account found with this email. Please register first.';
  }
  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/invalid-login-credentials' ||
    message.includes('wrong-password') ||
    message.includes('invalid-credential') ||
    message.includes('invalid-login-credentials')
  ) {
    return 'Invalid email or password.';
  }
  if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
    return 'Too many failed attempts. Please wait a few moments and try again.';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  const cleaned = message
    .replace(/^Firebase:\s*/i, '')
    .replace(/\(auth\/[a-z0-9-]+\)\.?/i, '')
    .trim();
  return cleaned || 'Authentication failed. Please try again.';
};

export const registerWithEmail = async (
  email: string,
  pass: string,
  displayName: string,
  role: UserRole = 'Applicant'
): Promise<UserProfile> => {
  const normalizedEmail = email.trim();
  const normalizedDisplayName = displayName.trim() || normalizedEmail.split('@')[0] || 'User';
  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
  try {
    await updateFirebaseProfile(userCredential.user, { displayName: normalizedDisplayName });
  } catch (profErr) {
    console.warn('Could not update Firebase Auth displayName:', profErr);
  }
  return await syncUserProfile(userCredential.user, role, normalizedDisplayName);
};

export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  const normalizedEmail = email.trim();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    const profile = await getUserProfile(userCredential.user.uid);
    if (!profile) {
      return await syncUserProfile(userCredential.user);
    }
    return profile;
  } catch (err: any) {
    // If master staff credentials used but not yet created in Firebase Auth, auto-provision
    const isMasterStaff =
      normalizedEmail.toLowerCase() === MASTER_STAFF_CREDENTIALS.email.toLowerCase() ||
      normalizedEmail.toLowerCase() === 'admin@nextgenclass.org';
    const isMasterFacilitator =
      normalizedEmail.toLowerCase() === MASTER_FACILITATOR_CREDENTIALS.email.toLowerCase();

    if ((isMasterStaff || isMasterFacilitator) && (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential' || err?.code === 'auth/invalid-login-credentials')) {
      try {
        const createdUser = await registerWithEmail(
          normalizedEmail,
          pass,
          isMasterStaff ? MASTER_STAFF_CREDENTIALS.displayName : MASTER_FACILITATOR_CREDENTIALS.displayName,
          isMasterStaff ? 'Super Admin' : 'Facilitator'
        );
        return createdUser;
      } catch (regErr) {
        console.warn('Could not auto-register master user via Firebase Auth:', regErr);
      }
    }
    throw err;
  }
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
  let accountType: AccountType = 'APPLICANT';
  if (newRole === 'Learner' || newRole === 'LEARNER') accountType = 'LEARNER';
  if (['Facilitator', 'Programme Manager', 'M&E Manager', 'Super Admin', 'STAFF', 'PROGRAMME_MANAGER', 'FACILITATOR', 'ME_MANAGER', 'SUPER_ADMIN'].includes(newRole)) {
    accountType = 'STAFF';
  }

  await setDoc(userRef, cleanFirestoreData({
    role: newRole,
    accountType,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
};

export const updateUserAccountStatus = async (uid: string, newStatus: AccountStatus): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, cleanFirestoreData({
    accountStatus: newStatus,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
};
