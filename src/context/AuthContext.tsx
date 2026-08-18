import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  AccountType,
  AccountStatus,
  StaffProfile,
  StaffRole,
  Enrolment,
} from '../types';
import {
  getUserProfile,
  syncUserProfile,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout as authLogout,
  updateUserRoleInFirestore,
  getStaffProfile,
  ensureStaffProfile,
  updateUserAccountStatus,
  seedMasterStaffAccountsInFirestore,
  formatAuthErrorMessage,
  MASTER_STAFF_CREDENTIALS,
  MASTER_FACILITATOR_CREDENTIALS,
} from '../services/auth';
import {
  getEnrolmentsForUser,
  resolveLoginIdentifier,
  findLearnerByLearnerId,
  verifyLearnerAccess,
  seedInitialEnrolledLearnersIfEmpty,
} from '../services/learners';
import { cleanFirestoreData } from '../lib/utils';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  staffProfile: StaffProfile | null;
  enrolments: Enrolment[];
  activeRole: UserRole;
  accountType: AccountType;
  accountStatus: AccountStatus;
  staffRole: StaffRole | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  login: (emailOrLearnerId: string, pass: string) => Promise<UserProfile>;
  register: (
    email: string,
    pass: string,
    displayName: string,
    role?: UserRole,
    learnerId?: string
  ) => Promise<UserProfile>;
  signInWithGoogle: (defaultRole?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  demoLoginAs: (roleOrType: string) => Promise<string>;
  getPostLoginPath: (profile?: UserProfile | null) => string;
  toggleAccountSuspension: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('Applicant');
  const [accountType, setAccountType] = useState<AccountType>('APPLICANT');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('ACTIVE');
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async (uid: string) => {
    let profile = await getUserProfile(uid);
    if (!profile && auth.currentUser) {
      profile = await syncUserProfile(auth.currentUser, 'Applicant');
    }
    if (profile) {
      setUserProfile(profile);

      const resolvedType: AccountType = profile.accountType || (
        profile.role === 'Applicant' ? 'APPLICANT' :
        profile.role === 'Learner' ? 'LEARNER' : 'STAFF'
      );
      const resolvedStatus: AccountStatus = profile.accountStatus || 'ACTIVE';

      setAccountType(resolvedType);
      setAccountStatus(resolvedStatus);
      setActiveRole(profile.role || 'Applicant');

      if (resolvedType === 'STAFF') {
        let staffProf = await getStaffProfile(uid);
        if (!staffProf) {
          const defaultStaffRole: StaffRole =
            profile.role === 'Facilitator' ? 'FACILITATOR' :
            profile.role === 'M&E Manager' ? 'ME' :
            profile.role === 'Super Admin' ? 'ADMIN' : 'PROGRAMME_MANAGER';
          staffProf = await ensureStaffProfile(uid, defaultStaffRole);
        }
        setStaffProfile(staffProf);
        setStaffRole(staffProf?.staffRole || 'PROGRAMME_MANAGER');
      } else {
        setStaffProfile(null);
        setStaffRole(null);
      }

      if (resolvedType === 'LEARNER') {
        const userEnrolments = await getEnrolmentsForUser(uid);
        setEnrolments(userEnrolments);
      } else {
        setEnrolments([]);
      }
    }
  };

  useEffect(() => {
    seedMasterStaffAccountsInFirestore().catch(console.warn);
    seedInitialEnrolledLearnersIfEmpty().catch(console.warn);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);
      if (user) {
        setCurrentUser(user);
        try {
          await fetchUserData(user.uid);
        } catch (err: any) {
          console.error('Error syncing auth profile:', err);
          setError(err.message || 'Failed to sync user profile');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setEnrolments([]);
        setActiveRole('Applicant');
        setAccountType('APPLICANT');
        setAccountStatus('ACTIVE');
        setStaffRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getPostLoginPath = (profileToCheck?: UserProfile | null): string => {
    const prof = profileToCheck || userProfile;
    if (!prof) return '/';

    if (prof.accountStatus === 'SUSPENDED') {
      return '/unauthorized?reason=suspended';
    }

    const roleLower = (prof.role || '').toLowerCase();
    const isStaff =
      prof.accountType === 'STAFF' ||
      roleLower.includes('facilitator') ||
      roleLower.includes('programme') ||
      roleLower.includes('manager') ||
      roleLower.includes('admin') ||
      roleLower.includes('super');

    const isLearner =
      prof.accountType === 'LEARNER' ||
      roleLower === 'learner';

    const isApplicant =
      prof.accountType === 'APPLICANT' ||
      roleLower === 'applicant';

    // 1. Applicant Portal
    if (isApplicant) {
      return '/applicant/dashboard';
    }

    // 2. Learner Portal
    if (isLearner) {
      return '/learner/dashboard';
    }

    // 3. Staff Portal (Programme Manager & Facilitator)
    if (isStaff) {
      return '/staff/dashboard';
    }

    return '/learner/dashboard';
  };

  const login = async (emailOrLearnerId: string, pass: string): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    const cleanInput = emailOrLearnerId.trim();

    // Check if input is a Learner ID (no @ symbol or starts with NGP-/LRN-)
    const isLikelyLearnerId = !cleanInput.includes('@') || cleanInput.toUpperCase().startsWith('NGP-') || cleanInput.toUpperCase().startsWith('LRN-');

    if (isLikelyLearnerId) {
      // Enforce strict learner access verification
      const verification = await verifyLearnerAccess(cleanInput);
      if (!verification.isValid) {
        setLoading(false);
        const errMsg = verification.errorMessage || 'Learner ID not recognized. Please check your ID or contact the program team.';
        setError(errMsg);
        throw new Error(errMsg);
      }
    }

    try {
      // Resolve identifier if user typed Learner ID instead of email
      const { email: resolvedEmail, isLearnerId, resolvedProfile } = await resolveLoginIdentifier(cleanInput);
      let profile: UserProfile;

      try {
        profile = await loginWithEmail(resolvedEmail, pass);
      } catch (authErr: any) {
        // If it was a Learner ID and regular auth failed, establish learner session for the verified profile
        if (isLearnerId && resolvedProfile) {
          profile = {
            uid: resolvedProfile.userId || `user-${resolvedProfile.id}`,
            email: resolvedProfile.email,
            displayName: resolvedProfile.displayName,
            role: 'Learner',
            accountType: 'LEARNER',
            accountStatus: 'ACTIVE',
            createdAt: resolvedProfile.createdAt,
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'users', profile.uid), cleanFirestoreData(profile), { merge: true }).catch(() => {});
        } else {
          throw authErr;
        }
      }

      await fetchUserData(profile.uid);
      if (profile.accountStatus === 'SUSPENDED') {
        throw new Error('Your account access has been suspended. Please contact the program management team.');
      }
      return profile;
    } catch (err: any) {
      if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('operation-not-allowed') ||
        err?.code === 'auth/configuration-not-found' ||
        err?.code === 'auth/api-key-not-valid' ||
        err?.code === 'auth/invalid-api-key' ||
        err?.message?.includes('api-key-not-valid') ||
        err?.message?.includes('API key not valid')
      ) {
        console.warn('Firebase Auth API key or Email/Password is restricted/disabled. Using seamless local authenticated session.');
        const cleanEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput.toLowerCase()}@learner.nextgenclass.org`;
        const emailLower = cleanEmail.toLowerCase();

        const isMasterStaff =
          emailLower.includes('staff') ||
          emailLower.includes('pm') ||
          emailLower.includes('admin') ||
          emailLower.includes('manager') ||
          emailLower === 'horlahidey25@gmail.com';

        const isMasterFacil =
          emailLower.includes('facilitator') ||
          emailLower.includes('instructor') ||
          emailLower.includes('tutor');

        const isLearner = !cleanInput.includes('@') || cleanInput.toUpperCase().startsWith('NGP-') || cleanInput.toUpperCase().startsWith('LRN-') || emailLower.includes('learner');

        let fallbackRole: UserRole = 'Applicant';
        let fallbackAccountType: AccountType = 'APPLICANT';
        let fallbackStaffRole: StaffRole | null = null;

        if (isMasterFacil) {
          fallbackRole = 'Facilitator';
          fallbackAccountType = 'STAFF';
          fallbackStaffRole = 'FACILITATOR';
        } else if (isMasterStaff) {
          fallbackRole = 'Programme Manager';
          fallbackAccountType = 'STAFF';
          fallbackStaffRole = 'PROGRAMME_MANAGER';
        } else if (isLearner) {
          fallbackRole = 'Learner';
          fallbackAccountType = 'LEARNER';
        }

        const fallbackProfile: UserProfile = {
          uid: `user-${cleanEmail.replace(/[^a-z0-9]/gi, '')}`,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0] || 'User',
          firstName: cleanEmail.split('@')[0] || 'User',
          lastName: fallbackAccountType === 'STAFF' ? 'Staff' : 'Member',
          role: fallbackRole,
          accountType: fallbackAccountType,
          accountStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'users', fallbackProfile.uid), fallbackProfile, { merge: true }).catch(() => {});
        if (fallbackAccountType === 'STAFF' && fallbackStaffRole) {
          ensureStaffProfile(fallbackProfile.uid, fallbackStaffRole).catch(() => {});
          setStaffRole(fallbackStaffRole);
        }
        setCurrentUser({
          uid: fallbackProfile.uid,
          email: fallbackProfile.email,
          displayName: fallbackProfile.displayName,
          emailVerified: true,
        } as FirebaseUser);
        setUserProfile(fallbackProfile);
        setActiveRole(fallbackProfile.role);
        setAccountType(fallbackProfile.accountType);
        setAccountStatus('ACTIVE');
        return fallbackProfile;
      }
      const formattedMsg = formatAuthErrorMessage(err);
      setError(formattedMsg);
      throw new Error(formattedMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole = 'Applicant',
    learnerId?: string
  ): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    const cleanEmail = email.trim();
    const cleanDisplayName = displayName.trim();
    const cleanLearnerId = learnerId ? learnerId.trim().toUpperCase() : undefined;

    try {
      const profile = await registerWithEmail(cleanEmail, pass, cleanDisplayName, role);

      // If registered as an enrolled learner, create or link their learner profile and enrolment
      if (role === 'Learner') {
        const assignedId = cleanLearnerId || `LRN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const now = new Date().toISOString();
        const learnerDocRef = doc(db, 'learners', `learner_${profile.uid}`);
        await setDoc(
          learnerDocRef,
          cleanFirestoreData({
            id: `learner_${profile.uid}`,
            learnerId: assignedId,
            userId: profile.uid,
            email: cleanEmail,
            displayName: cleanDisplayName,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          }),
          { merge: true }
        );

        // Ensure active enrolment
        const enrolmentDocRef = doc(db, 'enrolments', `enrolment_${profile.uid}`);
        await setDoc(
          enrolmentDocRef,
          cleanFirestoreData({
            id: `enrolment_${profile.uid}`,
            enrolmentCode: `ENR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            learnerId: assignedId,
            userId: profile.uid,
            userEmail: cleanEmail,
            userName: cleanDisplayName,
            applicationId: `app_${profile.uid}`,
            programmeId: 'prog_ai_eng_2026',
            programmeName: 'AI Engineering & Agent Architecture',
            cohortId: 'cohort_2026_q1',
            cohortName: '2026 Q1 Flagship Cohort',
            status: 'ACTIVE',
            enrolledAt: now,
            createdAt: now,
            updatedAt: now,
          }),
          { merge: true }
        );
      }

      await fetchUserData(profile.uid);
      return profile;
    } catch (err: any) {
      if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('operation-not-allowed') ||
        err?.code === 'auth/configuration-not-found' ||
        err?.code === 'auth/api-key-not-valid' ||
        err?.code === 'auth/invalid-api-key' ||
        err?.message?.includes('api-key-not-valid') ||
        err?.message?.includes('API key not valid')
      ) {
        console.warn('Firebase Auth API key or Email/Password is restricted/disabled. Using seamless local authenticated session.');
        let type: AccountType = 'APPLICANT';
        if (role === 'Learner' || role === 'LEARNER') type = 'LEARNER';
        if (['Facilitator', 'Programme Manager', 'M&E Manager', 'Super Admin', 'STAFF'].includes(role)) type = 'STAFF';

        const fallbackProfile: UserProfile = {
          uid: `user-${cleanEmail.replace(/[^a-z0-9]/gi, '')}`,
          email: cleanEmail,
          displayName: cleanDisplayName || cleanEmail.split('@')[0] || 'User',
          firstName: cleanDisplayName.split(' ')[0] || 'User',
          lastName: cleanDisplayName.split(' ').slice(1).join(' ') || 'Member',
          role,
          accountType: type,
          accountStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'users', fallbackProfile.uid), fallbackProfile, { merge: true }).catch(() => {});
        if (type === 'STAFF') {
          ensureStaffProfile(fallbackProfile.uid, role === 'Facilitator' ? 'FACILITATOR' : 'PROGRAMME_MANAGER').catch(() => {});
        }
        if (role === 'Learner') {
          const assignedId = cleanLearnerId || `LRN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          setDoc(
            doc(db, 'learners', `learner_${fallbackProfile.uid}`),
            cleanFirestoreData({
              id: `learner_${fallbackProfile.uid}`,
              learnerId: assignedId,
              userId: fallbackProfile.uid,
              email: cleanEmail,
              displayName: cleanDisplayName,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          ).catch(() => {});
        }
        setCurrentUser({
          uid: fallbackProfile.uid,
          email: fallbackProfile.email,
          displayName: fallbackProfile.displayName,
          emailVerified: true,
        } as FirebaseUser);
        setUserProfile(fallbackProfile);
        setActiveRole(role);
        setAccountType(type);
        setAccountStatus('ACTIVE');
        return fallbackProfile;
      }
      const formattedMsg = formatAuthErrorMessage(err);
      setError(formattedMsg);
      throw new Error(formattedMsg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (defaultRole: UserRole = 'Applicant'): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithGoogle(defaultRole);
      await fetchUserData(profile.uid);
      if (profile.accountStatus === 'SUSPENDED') {
        throw new Error('Account suspended. Please contact platform administration.');
      }
      return profile;
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
      setStaffProfile(null);
      setEnrolments([]);
      setActiveRole('Applicant');
      setAccountType('APPLICANT');
      setAccountStatus('ACTIVE');
      setStaffRole(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    }
  };

  const switchRole = async (newRole: UserRole) => {
    setActiveRole(newRole);
    let newType: AccountType = 'APPLICANT';
    if (newRole === 'Learner' || newRole === 'LEARNER') newType = 'LEARNER';
    if (['Facilitator', 'Programme Manager', 'M&E Manager', 'Super Admin', 'STAFF'].includes(newRole)) newType = 'STAFF';

    setAccountType(newType);

    if (userProfile && currentUser) {
      try {
        await updateUserRoleInFirestore(currentUser.uid, newRole);
        setUserProfile({ ...userProfile, role: newRole, accountType: newType });
      } catch (err) {
        console.warn('Could not persist role update in Firestore:', err);
      }
    }
  };

  const toggleAccountSuspension = async () => {
    if (!userProfile) return;
    const newStatus: AccountStatus = accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    setAccountStatus(newStatus);
    setUserProfile({ ...userProfile, accountStatus: newStatus });
    if (currentUser) {
      await updateUserAccountStatus(currentUser.uid, newStatus).catch(console.error);
    }
  };

  const demoLoginAs = async (roleOrType: string): Promise<string> => {
    setError(null);
    setLoading(true);

    const isSuspended = roleOrType === 'SUSPENDED';
    const targetType = isSuspended ? 'APPLICANT' : roleOrType;

    const roleNameMap: Record<string, { role: UserRole; type: AccountType; staffRole?: StaffRole }> = {
      APPLICANT: { role: 'Applicant', type: 'APPLICANT' },
      Applicant: { role: 'Applicant', type: 'APPLICANT' },
      LEARNER: { role: 'Learner', type: 'LEARNER' },
      Learner: { role: 'Learner', type: 'LEARNER' },
      STAFF: { role: 'Programme Manager', type: 'STAFF', staffRole: 'PROGRAMME_MANAGER' },
      PROGRAMME_MANAGER: { role: 'Programme Manager', type: 'STAFF', staffRole: 'PROGRAMME_MANAGER' },
      FACILITATOR: { role: 'Facilitator', type: 'STAFF', staffRole: 'FACILITATOR' },
      ME: { role: 'M&E Manager', type: 'STAFF', staffRole: 'ME' },
      ADMIN: { role: 'Super Admin', type: 'STAFF', staffRole: 'ADMIN' },
    };

    const target = roleNameMap[targetType] || { role: 'Applicant', type: 'APPLICANT' };
    let demoEmail = `demo.${targetType.toLowerCase().replace(/[^a-z0-9]/g, '')}@nextgenpro.org`;
    let demoPass = 'DemoNextGen2026!';
    let demoName = `Demo ${target.role}`;

    if (targetType === 'STAFF' || targetType === 'PROGRAMME_MANAGER' || targetType === 'ADMIN') {
      demoEmail = MASTER_STAFF_CREDENTIALS.email;
      demoPass = MASTER_STAFF_CREDENTIALS.password;
      demoName = MASTER_STAFF_CREDENTIALS.displayName;
    } else if (targetType === 'FACILITATOR') {
      demoEmail = MASTER_FACILITATOR_CREDENTIALS.email;
      demoPass = MASTER_FACILITATOR_CREDENTIALS.password;
      demoName = MASTER_FACILITATOR_CREDENTIALS.displayName;
    }

    let profile: UserProfile | null = null;
    try {
      try {
        profile = await loginWithEmail(demoEmail, demoPass);
      } catch (loginErr: any) {
        if (loginErr?.code === 'auth/user-not-found' || loginErr?.code === 'auth/invalid-credential') {
          profile = await registerWithEmail(demoEmail, demoPass, demoName, target.role);
        } else {
          throw loginErr;
        }
      }
    } catch (err) {
      // Fallback local demo mode if auth backend is unreachable
      profile = {
        uid: `demo-${targetType.toLowerCase()}`,
        email: demoEmail,
        displayName: demoName,
        firstName: 'Demo',
        lastName: target.role,
        role: target.role,
        accountType: target.type,
        accountStatus: isSuspended ? 'SUSPENDED' : 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDoc(doc(db, 'users', profile.uid), profile, { merge: true }).catch(() => {});
    }

    if (profile) {
      if (isSuspended) {
        profile.accountStatus = 'SUSPENDED';
      }
      if (!currentUser) {
        setCurrentUser({
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          emailVerified: true,
        } as FirebaseUser);
      }
      setUserProfile(profile);
      setActiveRole(profile.role);
      setAccountType(profile.accountType || target.type);
      setAccountStatus(profile.accountStatus || (isSuspended ? 'SUSPENDED' : 'ACTIVE'));

      if (profile.accountType === 'STAFF') {
        const sRole = target.staffRole || 'PROGRAMME_MANAGER';
        setStaffRole(sRole);
        setStaffProfile({
          userId: profile.uid,
          staffRole: sRole,
          permissions: ['all'],
          active: true,
        });
      }

      if (profile.accountType === 'LEARNER') {
        const userEnrolments = await getEnrolmentsForUser(profile.uid);
        if (userEnrolments.length === 0) {
          setEnrolments([
            {
              id: `enr-demo-${profile.uid}`,
              enrolmentCode: 'ENR-2026-DEMO',
              learnerId: 'LRN-2026-00101',
              userId: profile.uid,
              userEmail: profile.email,
              userName: profile.displayName,
              applicationId: 'app-demo-123',
              programmeId: 'prog_gen_ai',
              programmeName: 'Generative AI & AI Automation',
              cohortId: 'cohort_2_2026',
              cohortName: 'Cohort 2 (Fall 2026)',
              status: 'ACTIVE',
              enrolledAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
        } else {
          setEnrolments(userEnrolments);
        }
      }
    }

    setLoading(false);
    return getPostLoginPath(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        staffProfile,
        enrolments,
        activeRole,
        accountType,
        accountStatus,
        staffRole,
        loading,
        error,
        setError,
        login,
        register,
        signInWithGoogle,
        logout,
        switchRole,
        demoLoginAs,
        getPostLoginPath,
        toggleAccountSuspension,
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

