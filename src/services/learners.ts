import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  Application,
  LearnerProfile,
  LearnerAccessState,
  Enrolment,
  UserProfile,
} from '../types';

const USERS_COLLECTION = 'users';
const LEARNERS_COLLECTION = 'learners';
const ENROLMENTS_COLLECTION = 'enrolments';

/**
 * Generate a unique human-readable Learner ID in standard NGP-YYYY-XXXXX format
 * Example: NGP-2026-00452
 */
export const generateLearnerId = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100 + Math.random() * 90000);
  const formattedNum = String(randomNum).padStart(5, '0');
  return `NGP-${year}-${formattedNum}`;
};

/**
 * Generate a unique Enrolment Code
 */
export const generateEnrolmentCode = (): string => {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ENR-${year}-${randomPart}`;
};

/**
 * Look up or initialize a user and learner profile for an accepted applicant.
 * Note: Acceptance alone sets accessState to 'Accepted' / 'Enrolled' with isActivated=false.
 * It does NOT grant active dashboard access until activated by Program Manager.
 */
export const getOrCreateUserAndLearnerProfile = async (
  application: Application,
  autoActivate: boolean = false
): Promise<{ userUid: string; learnerProfile: LearnerProfile }> => {
  const emailClean = (application.applicantEmail || '').trim().toLowerCase();
  const now = new Date().toISOString();

  // --- 1. FIND OR LINK FIREBASE USER ---
  let userUid = application.applicantId;
  let userDocRef = userUid ? doc(db, USERS_COLLECTION, userUid) : null;
  let userSnap = userDocRef ? await getDoc(userDocRef) : null;

  if (!userSnap || !userSnap.exists()) {
    const qUser = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', emailClean)
    );
    const userQuerySnap = await getDocs(qUser);

    if (!userQuerySnap.empty) {
      const existingUserDoc = userQuerySnap.docs[0];
      userUid = existingUserDoc.id;
      userDocRef = doc(db, USERS_COLLECTION, userUid);
      userSnap = existingUserDoc;
    }
  }

  if (userSnap && userSnap.exists()) {
    const existingUserData = userSnap.data() as UserProfile;
    userUid = userSnap.id;

    await setDoc(
      doc(db, USERS_COLLECTION, userUid),
      cleanFirestoreData({
        role: autoActivate ? 'Learner' : (existingUserData.role || 'Applicant'),
        accountType: autoActivate ? 'LEARNER' : (existingUserData.accountType || 'APPLICANT'),
        accountStatus: autoActivate ? 'ACTIVE' : (existingUserData.accountStatus || 'ACTIVE'),
        displayName: existingUserData.displayName || application.applicantName,
        phoneNumber: existingUserData.phoneNumber || application.applicantPhone || '',
        updatedAt: now,
      }),
      { merge: true }
    );
  } else {
    if (!userUid || userUid.trim() === '') {
      userUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    const newUser: UserProfile = cleanFirestoreData({
      uid: userUid,
      id: userUid,
      email: emailClean,
      displayName: application.applicantName,
      phoneNumber: application.applicantPhone || '',
      role: autoActivate ? 'Learner' : 'Applicant',
      accountType: autoActivate ? 'LEARNER' : 'APPLICANT',
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, USERS_COLLECTION, userUid), newUser);
  }

  // --- 2. FIND OR CREATE LEARNER PROFILE ---
  const qLearner = query(
    collection(db, LEARNERS_COLLECTION),
    where('email', '==', emailClean)
  );
  const learnerSnap = await getDocs(qLearner);

  if (!learnerSnap.empty) {
    const docData = learnerSnap.docs[0];
    const existingLearner = {
      id: docData.id,
      ...docData.data(),
    } as LearnerProfile;

    if (autoActivate && !existingLearner.isActivated) {
      await setDoc(
        doc(db, LEARNERS_COLLECTION, existingLearner.id),
        cleanFirestoreData({
          status: 'ACTIVE',
          accessState: 'Active',
          isActivated: true,
          activatedAt: now,
          updatedAt: now,
        }),
        { merge: true }
      );
      existingLearner.status = 'ACTIVE';
      existingLearner.accessState = 'Active';
      existingLearner.isActivated = true;
    }

    return { userUid, learnerProfile: existingLearner };
  }

  // No learner profile exists -> generate unique Learner ID (e.g. NGP-2026-00452)
  const assignedLearnerId = generateLearnerId();
  const learnerDocRef = doc(collection(db, LEARNERS_COLLECTION));

  const newLearner: LearnerProfile = cleanFirestoreData({
    id: learnerDocRef.id,
    learnerId: assignedLearnerId,
    userId: userUid,
    email: emailClean,
    displayName: application.applicantName,
    phoneNumber: application.applicantPhone || '',
    programmeId: application.programmeId,
    programmeName: application.programmeName,
    cohortId: application.cohortId,
    cohortName: application.cohortName,
    status: autoActivate ? 'ACTIVE' : 'INACTIVE',
    accessState: autoActivate ? 'Active' : 'Enrolled',
    isActivated: autoActivate,
    activatedAt: autoActivate ? now : undefined,
    temporaryPassword: 'NextGen2026!',
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(learnerDocRef, newLearner);
  return { userUid, learnerProfile: newLearner };
};

/**
 * Create Enrolment when an applicant is accepted.
 * Initial state is 'PENDING_ACTIVATION' with isActivated=false unless explicitly auto-activated.
 */
export const createEnrolmentForAcceptedApplicant = async (
  application: Application,
  autoActivate: boolean = false
): Promise<Enrolment> => {
  const { userUid, learnerProfile } = await getOrCreateUserAndLearnerProfile(application, autoActivate);
  const now = new Date().toISOString();

  // Check if an enrolment already exists for this exact application
  const qEnrolment = query(
    collection(db, ENROLMENTS_COLLECTION),
    where('applicationId', '==', application.id)
  );
  const existingEnrolments = await getDocs(qEnrolment);

  if (!existingEnrolments.empty) {
    const existingDoc = existingEnrolments.docs[0];
    return {
      id: existingDoc.id,
      ...existingDoc.data(),
    } as Enrolment;
  }

  const enrolmentDocRef = doc(collection(db, ENROLMENTS_COLLECTION));
  const enrolmentCode = generateEnrolmentCode();

  const newEnrolment: Enrolment = cleanFirestoreData({
    id: enrolmentDocRef.id,
    enrolmentCode,
    learnerId: learnerProfile.learnerId,
    userId: userUid,
    userEmail: learnerProfile.email,
    userName: application.applicantName,
    applicationId: application.id,
    programmeId: application.programmeId,
    programmeName: application.programmeName,
    cohortId: application.cohortId,
    cohortName: application.cohortName,
    status: autoActivate ? 'ACTIVE' : 'PENDING_ACTIVATION',
    accessState: autoActivate ? 'Active' : 'Enrolled',
    isActivated: autoActivate,
    activatedAt: autoActivate ? now : undefined,
    enrolledAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(enrolmentDocRef, newEnrolment);
  return newEnrolment;
};

/**
 * Program Manager Action: Activate a Learner Account
 * Moves access state to 'Active', isActivated=true, status='ACTIVE'
 */
export const activateLearnerAccount = async (
  learnerIdOrDocId: string
): Promise<{ success: boolean; learnerId: string; email: string }> => {
  const cleanId = learnerIdOrDocId.trim().toUpperCase();
  const now = new Date().toISOString();

  // Find learner doc
  let learnerDocSnap: any = null;
  let learnerDocId = '';
  let learnerData: LearnerProfile | null = null;

  // Search by document ID first
  try {
    const directDoc = await getDoc(doc(db, LEARNERS_COLLECTION, learnerIdOrDocId));
    if (directDoc.exists()) {
      learnerDocSnap = directDoc;
      learnerDocId = directDoc.id;
      learnerData = directDoc.data() as LearnerProfile;
    }
  } catch {}

  // If not found by doc id, search by learnerId (e.g. NGP-2026-00452)
  if (!learnerData) {
    const qLearner = query(
      collection(db, LEARNERS_COLLECTION),
      where('learnerId', '==', cleanId)
    );
    const snap = await getDocs(qLearner);
    if (!snap.empty) {
      learnerDocSnap = snap.docs[0];
      learnerDocId = snap.docs[0].id;
      learnerData = snap.docs[0].data() as LearnerProfile;
    }
  }

  if (!learnerData) {
    throw new Error('Learner record not found to activate.');
  }

  // 1. Update Learner Profile
  await updateDoc(
    doc(db, LEARNERS_COLLECTION, learnerDocId),
    cleanFirestoreData({
      status: 'ACTIVE',
      accessState: 'Active',
      isActivated: true,
      activatedAt: now,
      updatedAt: now,
    })
  );

  // 2. Update all Enrolments for this learner
  const qEnr = query(
    collection(db, ENROLMENTS_COLLECTION),
    where('learnerId', '==', learnerData.learnerId)
  );
  const enrSnap = await getDocs(qEnr);
  for (const eDoc of enrSnap.docs) {
    await updateDoc(
      doc(db, ENROLMENTS_COLLECTION, eDoc.id),
      cleanFirestoreData({
        status: 'ACTIVE',
        accessState: 'Active',
        isActivated: true,
        activatedAt: now,
        updatedAt: now,
      })
    );
  }

  // 3. Update User Record to Learner role & ACTIVE status
  if (learnerData.userId) {
    await setDoc(
      doc(db, USERS_COLLECTION, learnerData.userId),
      cleanFirestoreData({
        role: 'Learner',
        accountType: 'LEARNER',
        accountStatus: 'ACTIVE',
        updatedAt: now,
      }),
      { merge: true }
    );
  }

  return {
    success: true,
    learnerId: learnerData.learnerId,
    email: learnerData.email,
  };
};

/**
 * Program Manager Action: Suspend Learner Access
 */
export const suspendLearnerAccount = async (
  learnerIdOrDocId: string
): Promise<void> => {
  const cleanId = learnerIdOrDocId.trim().toUpperCase();
  const now = new Date().toISOString();

  let learnerData = await findLearnerByLearnerId(cleanId);
  if (!learnerData) {
    const directDoc = await getDoc(doc(db, LEARNERS_COLLECTION, learnerIdOrDocId));
    if (directDoc.exists()) {
      learnerData = { id: directDoc.id, ...directDoc.data() } as LearnerProfile;
    }
  }

  if (!learnerData) {
    throw new Error('Learner record not found.');
  }

  // 1. Update Learner Profile
  await updateDoc(
    doc(db, LEARNERS_COLLECTION, learnerData.id),
    cleanFirestoreData({
      status: 'SUSPENDED',
      accessState: 'Suspended',
      updatedAt: now,
    })
  );

  // 2. Update Enrolments
  const qEnr = query(
    collection(db, ENROLMENTS_COLLECTION),
    where('learnerId', '==', learnerData.learnerId)
  );
  const enrSnap = await getDocs(qEnr);
  for (const eDoc of enrSnap.docs) {
    await updateDoc(
      doc(db, ENROLMENTS_COLLECTION, eDoc.id),
      cleanFirestoreData({
        status: 'SUSPENDED',
        accessState: 'Suspended',
        updatedAt: now,
      })
    );
  }

  // 3. Update User Record
  if (learnerData.userId) {
    await setDoc(
      doc(db, USERS_COLLECTION, learnerData.userId),
      cleanFirestoreData({
        accountStatus: 'SUSPENDED',
        updatedAt: now,
      }),
      { merge: true }
    );
  }
};

/**
 * Program Manager Action: Reactivate Learner Access
 */
export const reactivateLearnerAccount = async (
  learnerIdOrDocId: string
): Promise<void> => {
  await activateLearnerAccount(learnerIdOrDocId);
};

/**
 * Program Manager Action: Reassign Learner to Program and Cohort
 */
export const reassignLearnerCohort = async (
  learnerId: string,
  programmeId: string,
  programmeName: string,
  cohortId: string,
  cohortName: string
): Promise<void> => {
  const cleanId = learnerId.trim().toUpperCase();
  const now = new Date().toISOString();

  const learner = await findLearnerByLearnerId(cleanId);
  if (!learner) throw new Error('Learner not found.');

  await updateDoc(
    doc(db, LEARNERS_COLLECTION, learner.id),
    cleanFirestoreData({
      programmeId,
      programmeName,
      cohortId,
      cohortName,
      updatedAt: now,
    })
  );

  const qEnr = query(
    collection(db, ENROLMENTS_COLLECTION),
    where('learnerId', '==', cleanId)
  );
  const enrSnap = await getDocs(qEnr);
  for (const eDoc of enrSnap.docs) {
    await updateDoc(
      doc(db, ENROLMENTS_COLLECTION, eDoc.id),
      cleanFirestoreData({
        programmeId,
        programmeName,
        cohortId,
        cohortName,
        updatedAt: now,
      })
    );
  }
};

/**
 * STEP 2 & STEP 4: VERIFY LEARNER ACCESS RULES
 *
 * Checks:
 * 1. Learner ID exists in system
 * 2. Learner is assigned to a program
 * 3. Learner is assigned to a cohort
 * 4. Enrollment status is Active
 * 5. Account is activated
 * 6. Account is not suspended
 */
export const verifyLearnerAccess = async (
  learnerId: string
): Promise<{
  isValid: boolean;
  errorMessage?: string;
  learnerProfile?: LearnerProfile;
  enrolment?: Enrolment;
}> => {
  const cleanId = learnerId.trim().toUpperCase();

  // 1. Verify Learner ID exists
  const learnerProfile = await findLearnerByLearnerId(cleanId);
  if (!learnerProfile) {
    return {
      isValid: false,
      errorMessage: 'Learner ID not recognized. Please check your ID or contact the program team.',
    };
  }

  // Fetch enrolments for this learner
  const enrolments = await getEnrolmentsForLearnerId(cleanId);
  const activeEnrolment = enrolments.length > 0 ? enrolments[0] : null;

  // 2 & 3. Verify assigned to program and cohort
  const hasProgram = Boolean(learnerProfile.programmeId || activeEnrolment?.programmeId || learnerProfile.programmeName || activeEnrolment?.programmeName);
  const hasCohort = Boolean(learnerProfile.cohortId || activeEnrolment?.cohortId || learnerProfile.cohortName || activeEnrolment?.cohortName);

  if (!hasProgram || !hasCohort) {
    return {
      isValid: false,
      errorMessage: 'Learner account is not yet assigned to an active cohort. Please contact the program team.',
      learnerProfile,
    };
  }

  // 6. Check if suspended
  if (
    learnerProfile.status === 'SUSPENDED' ||
    learnerProfile.accessState === 'Suspended' ||
    activeEnrolment?.status === 'SUSPENDED' ||
    activeEnrolment?.accessState === 'Suspended'
  ) {
    return {
      isValid: false,
      errorMessage: 'Your account access has been suspended. Please contact the program management team.',
      learnerProfile,
    };
  }

  // 4 & 5. Check if account is activated and enrollment is active
  const isActivated =
    learnerProfile.isActivated === true ||
    learnerProfile.accessState === 'Active' ||
    learnerProfile.status === 'ACTIVE' ||
    activeEnrolment?.status === 'ACTIVE' ||
    activeEnrolment?.isActivated === true;

  if (!isActivated) {
    return {
      isValid: false,
      errorMessage: 'Your enrollment is still being processed. You will receive your Learner ID and access instructions once your enrollment has been activated.',
      learnerProfile,
    };
  }

  return {
    isValid: true,
    learnerProfile,
    enrolment: activeEnrolment || undefined,
  };
};

/**
 * Fetch all enrolments for a specific learnerId
 */
export const getEnrolmentsForLearnerId = async (
  learnerId: string
): Promise<Enrolment[]> => {
  if (!learnerId) return [];
  const clean = learnerId.trim().toUpperCase();

  try {
    const q = query(
      collection(db, ENROLMENTS_COLLECTION),
      where('learnerId', '==', clean)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Enrolment[];
  } catch (err) {
    console.warn('Error fetching enrolments for learnerId:', err);
    return [];
  }
};

/**
 * Fetch all enrolments for a single user (supports MULTIPLE ENROLMENTS per user)
 */
export const getEnrolmentsForUser = async (
  emailOrUid: string
): Promise<Enrolment[]> => {
  if (!emailOrUid) return [];
  const queryVal = emailOrUid.trim().toLowerCase();

  try {
    // Try query by userId
    const qUid = query(
      collection(db, ENROLMENTS_COLLECTION),
      where('userId', '==', emailOrUid)
    );
    const snapUid = await getDocs(qUid);

    if (!snapUid.empty) {
      return snapUid.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enrolment[];
    }

    // Try query by userEmail
    const qEmail = query(
      collection(db, ENROLMENTS_COLLECTION),
      where('userEmail', '==', queryVal)
    );
    const snapEmail = await getDocs(qEmail);

    return snapEmail.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Enrolment[];
  } catch (err) {
    console.error('Error fetching enrolments for user:', err);
    return [];
  }
};

/**
 * Subscribe to enrolments for a learner or all learners
 */
export const subscribeToLearnerEnrolments = (
  emailOrUid: string | undefined,
  callback: (enrolments: Enrolment[]) => void
) => {
  if (!emailOrUid) {
    return subscribeToAllEnrolments(callback);
  }

  const queryVal = emailOrUid.trim().toLowerCase();

  return onSnapshot(
    collection(db, ENROLMENTS_COLLECTION),
    (snap) => {
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enrolment[];

      const userEnrolments = all.filter(
        (e) =>
          e.userId === emailOrUid ||
          (e.userEmail && e.userEmail.toLowerCase() === queryVal) ||
          e.learnerId === emailOrUid.toUpperCase()
      );

      callback(userEnrolments.length > 0 ? userEnrolments : all);
    },
    (err) => {
      console.warn('subscribeToLearnerEnrolments error:', err.message);
      callback([]);
    }
  );
};

/**
 * Subscribe to all enrolments in system
 */
export const subscribeToAllEnrolments = (
  callback: (enrolments: Enrolment[]) => void
) => {
  return onSnapshot(
    collection(db, ENROLMENTS_COLLECTION),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enrolment[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToAllEnrolments error:', err.message);
      callback([]);
    }
  );
};

/**
 * Subscribe to all learner profiles
 */
export const subscribeToLearnerProfiles = (
  callback: (learners: LearnerProfile[]) => void
) => {
  return onSnapshot(
    collection(db, LEARNERS_COLLECTION),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as LearnerProfile[];
      callback(list);
    },
    (err) => {
      console.warn('subscribeToLearnerProfiles error:', err.message);
      callback([]);
    }
  );
};

/**
 * Find a LearnerProfile by assigned Learner ID (e.g. NGP-2026-00452 or LRN-2026-00101)
 */
export const findLearnerByLearnerId = async (
  learnerId: string
): Promise<LearnerProfile | null> => {
  if (!learnerId) return null;
  const cleanId = learnerId.trim().toUpperCase();

  try {
    const qLearner = query(
      collection(db, LEARNERS_COLLECTION),
      where('learnerId', '==', cleanId)
    );
    const snap = await getDocs(qLearner);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as LearnerProfile;
    }

    // Check enrolments for this learnerId
    const qEnrolment = query(
      collection(db, ENROLMENTS_COLLECTION),
      where('learnerId', '==', cleanId)
    );
    const enrSnap = await getDocs(qEnrolment);
    if (!enrSnap.empty) {
      const enr = enrSnap.docs[0].data() as Enrolment;
      return {
        id: enr.id,
        learnerId: enr.learnerId,
        userId: enr.userId,
        email: enr.userEmail,
        displayName: enr.userName,
        programmeId: enr.programmeId,
        programmeName: enr.programmeName,
        cohortId: enr.cohortId,
        cohortName: enr.cohortName,
        status: enr.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        accessState: enr.accessState || (enr.status === 'ACTIVE' ? 'Active' : 'Enrolled'),
        isActivated: enr.isActivated !== undefined ? enr.isActivated : enr.status === 'ACTIVE',
        createdAt: enr.createdAt || new Date().toISOString(),
        updatedAt: enr.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.warn('Error querying learner by ID:', err);
    return null;
  }
};

/**
 * Resolve login identifier if user entered Learner ID or email
 */
export const resolveLoginIdentifier = async (
  identifier: string
): Promise<{ email: string; isLearnerId: boolean; resolvedProfile: LearnerProfile | null }> => {
  const clean = identifier.trim();
  if (clean.includes('@')) {
    return { email: clean.toLowerCase(), isLearnerId: false, resolvedProfile: null };
  }

  const upper = clean.toUpperCase();
  const learnerProfile = await findLearnerByLearnerId(upper);
  if (learnerProfile && learnerProfile.email) {
    return { email: learnerProfile.email.toLowerCase(), isLearnerId: true, resolvedProfile: learnerProfile };
  }

  const synthesizedEmail = `${upper.toLowerCase().replace(/[^a-z0-9]/g, '')}@learner.nextgenclass.org`;
  return { email: synthesizedEmail, isLearnerId: true, resolvedProfile: null };
};

/**
 * Look up Learner ID or admission status for an applicant email
 */
export const lookupAdmissionByEmail = async (
  email: string
): Promise<{
  found: boolean;
  learnerId?: string;
  programmeName?: string;
  cohortName?: string;
  status?: string;
  candidateName?: string;
  isActivated?: boolean;
}> => {
  if (!email) return { found: false };
  const cleanEmail = email.trim().toLowerCase();

  try {
    const enrolments = await getEnrolmentsForUser(cleanEmail);
    if (enrolments.length > 0) {
      const activeEnr = enrolments[0];
      return {
        found: true,
        learnerId: activeEnr.learnerId,
        programmeName: activeEnr.programmeName,
        cohortName: activeEnr.cohortName,
        status: activeEnr.status === 'ACTIVE' ? 'Enrolled & Active' : 'Enrolled — Pending Activation',
        candidateName: activeEnr.userName,
        isActivated: activeEnr.isActivated ?? (activeEnr.status === 'ACTIVE'),
      };
    }

    const qLearner = query(
      collection(db, LEARNERS_COLLECTION),
      where('email', '==', cleanEmail)
    );
    const learnerSnap = await getDocs(qLearner);
    if (!learnerSnap.empty) {
      const l = learnerSnap.docs[0].data() as LearnerProfile;
      return {
        found: true,
        learnerId: l.learnerId,
        programmeName: l.programmeName,
        cohortName: l.cohortName,
        status: l.status === 'ACTIVE' ? 'Enrolled & Active' : 'Enrolled — Pending Activation',
        candidateName: l.displayName,
        isActivated: l.isActivated,
      };
    }

    return { found: false };
  } catch (err) {
    console.warn('Error looking up admission by email:', err);
    return { found: false };
  }
};

/**
 * Seed sample enrolled learners so the platform has immediately testable active and pending learners.
 * Includes example: NGP-2026-00452
 */
export const seedInitialEnrolledLearnersIfEmpty = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, LEARNERS_COLLECTION));
    if (!snap.empty) return; // Already seeded

    const now = new Date().toISOString();

    // 1. Active enrolled learner: NGP-2026-00452 (Amina Bello)
    const activeLearnerId = 'NGP-2026-00452';
    const activeUserUid = 'usr_amina_bello';
    const activeEmail = 'amina.bello@learner.nextgenclass.org';

    await setDoc(doc(db, USERS_COLLECTION, activeUserUid), {
      uid: activeUserUid,
      id: activeUserUid,
      email: activeEmail,
      displayName: 'Amina Bello',
      role: 'Learner',
      accountType: 'LEARNER',
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, LEARNERS_COLLECTION, 'learner_amina_bello'), {
      id: 'learner_amina_bello',
      learnerId: activeLearnerId,
      userId: activeUserUid,
      email: activeEmail,
      displayName: 'Amina Bello',
      phoneNumber: '+234 801 234 5678',
      programmeId: 'prog_gen_ai',
      programmeName: 'Generative AI & AI Automation',
      cohortId: 'cohort_2_2026',
      cohortName: 'Cohort 2 (Fall 2026)',
      status: 'ACTIVE',
      accessState: 'Active',
      isActivated: true,
      activatedAt: now,
      temporaryPassword: 'NextGen2026!',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, ENROLMENTS_COLLECTION, 'enr_amina_bello'), {
      id: 'enr_amina_bello',
      enrolmentCode: 'ENR-2026-A1092',
      learnerId: activeLearnerId,
      userId: activeUserUid,
      userEmail: activeEmail,
      userName: 'Amina Bello',
      applicationId: 'app_user_1',
      programmeId: 'prog_gen_ai',
      programmeName: 'Generative AI & AI Automation',
      cohortId: 'cohort_2_2026',
      cohortName: 'Cohort 2 (Fall 2026)',
      status: 'ACTIVE',
      accessState: 'Active',
      isActivated: true,
      activatedAt: now,
      enrolledAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Pending Activation learner: NGP-2026-00819 (David Okonjo)
    const pendingLearnerId = 'NGP-2026-00819';
    const pendingUserUid = 'usr_david_okonjo';
    const pendingEmail = 'david.okonjo@example.com';

    await setDoc(doc(db, USERS_COLLECTION, pendingUserUid), {
      uid: pendingUserUid,
      id: pendingUserUid,
      email: pendingEmail,
      displayName: 'David Okonjo',
      role: 'Applicant',
      accountType: 'APPLICANT',
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, LEARNERS_COLLECTION, 'learner_david_okonjo'), {
      id: 'learner_david_okonjo',
      learnerId: pendingLearnerId,
      userId: pendingUserUid,
      email: pendingEmail,
      displayName: 'David Okonjo',
      phoneNumber: '+234 802 987 6543',
      programmeId: 'prog_gen_ai',
      programmeName: 'Generative AI & AI Automation',
      cohortId: 'cohort_2_2026',
      cohortName: 'Cohort 2 (Fall 2026)',
      status: 'INACTIVE',
      accessState: 'Enrolled',
      isActivated: false,
      temporaryPassword: 'NextGen2026!',
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, ENROLMENTS_COLLECTION, 'enr_david_okonjo'), {
      id: 'enr_david_okonjo',
      enrolmentCode: 'ENR-2026-D4412',
      learnerId: pendingLearnerId,
      userId: pendingUserUid,
      userEmail: pendingEmail,
      userName: 'David Okonjo',
      applicationId: 'app_user_2',
      programmeId: 'prog_gen_ai',
      programmeName: 'Generative AI & AI Automation',
      cohortId: 'cohort_2_2026',
      cohortName: 'Cohort 2 (Fall 2026)',
      status: 'PENDING_ACTIVATION',
      accessState: 'Enrolled',
      isActivated: false,
      enrolledAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.warn('Error seeding initial enrolled learners:', err);
  }
};
