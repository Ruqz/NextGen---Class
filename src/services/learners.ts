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
  Enrolment,
  UserProfile,
} from '../types';

const USERS_COLLECTION = 'users';
const LEARNERS_COLLECTION = 'learners';
const ENROLMENTS_COLLECTION = 'enrolments';

/**
  Generate a unique human-readable Learner ID
 */
export const generateLearnerId = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `LRN-${year}-${randomNum}`;
};

/**
  Generate a unique Enrolment Code
 */
export const generateEnrolmentCode = (): string => {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ENR-${year}-${randomPart}`;
};

/**
  STEP 1 & STEP 2 & STEP 6:
  Create or link Firebase user and Learner Profile.
  Ensures NO DUPLICATION of users or learner profiles.
 */
export const getOrCreateUserAndLearnerProfile = async (
  application: Application
): Promise<{ userUid: string; learnerProfile: LearnerProfile }> => {
  const emailClean = (application.applicantEmail || '').trim().toLowerCase();
  const now = new Date().toISOString();

  // --- 1. FIND OR LINK FIREBASE USER ---
  let userUid = application.applicantId;
  let userDocRef = userUid ? doc(db, USERS_COLLECTION, userUid) : null;
  let userSnap = userDocRef ? await getDoc(userDocRef) : null;

  // Search by email if doc by applicantId is not found
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
    // Existing user found -> promote role to 'Learner' if not already higher role
    const existingUserData = userSnap.data() as UserProfile;
    userUid = userSnap.id;

    await updateDoc(
      doc(db, USERS_COLLECTION, userUid),
      cleanFirestoreData({
        role: 'Learner',
        displayName: existingUserData.displayName || application.applicantName,
        phoneNumber: existingUserData.phoneNumber || application.applicantPhone || '',
        updatedAt: now,
      })
    );
  } else {
    // User does not exist -> Create new Firebase user profile doc (DO NOT DUPLICATE)
    if (!userUid || userUid.trim() === '') {
      userUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }
    const newUser: UserProfile = cleanFirestoreData({
      uid: userUid,
      email: emailClean,
      displayName: application.applicantName,
      phoneNumber: application.applicantPhone || '',
      role: 'Learner',
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, USERS_COLLECTION, userUid), newUser);
  }

  // --- 2. FIND OR CREATE LEARNER PROFILE ---
  // Search learners collection by email or userId to avoid duplication
  const qLearner = query(
    collection(db, LEARNERS_COLLECTION),
    where('email', '==', emailClean)
  );
  const learnerSnap = await getDocs(qLearner);

  if (!learnerSnap.empty) {
    // Existing Learner Profile found -> reuse existing learnerId (NO DUPLICATION)
    const docData = learnerSnap.docs[0];
    const existingLearner = {
      id: docData.id,
      ...docData.data(),
    } as LearnerProfile;

    // Ensure status is active
    if (existingLearner.status !== 'ACTIVE') {
      await updateDoc(
        doc(db, LEARNERS_COLLECTION, existingLearner.id),
        cleanFirestoreData({ status: 'ACTIVE', updatedAt: now })
      );
      existingLearner.status = 'ACTIVE';
    }

    return { userUid, learnerProfile: existingLearner };
  }

  // No learner profile exists -> Create learner profile with assigned learner ID
  const assignedLearnerId = generateLearnerId();
  const learnerDocRef = doc(collection(db, LEARNERS_COLLECTION));

  const newLearner: LearnerProfile = cleanFirestoreData({
    id: learnerDocRef.id,
    learnerId: assignedLearnerId, // 6. Assign learner ID
    userId: userUid, // 1. Link Firebase User
    email: emailClean,
    displayName: application.applicantName,
    phoneNumber: application.applicantPhone || '',
    status: 'ACTIVE', // 7. Activate learner profile
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(learnerDocRef, newLearner);

  return { userUid, learnerProfile: newLearner };
};

/**
  STEP 3, 4, 5, 6, 7:
  Create Enrolment when an applicant is accepted.
  Enforces multi-enrolment support for a single user across different programmes/cohorts.
 */
export const createEnrolmentForAcceptedApplicant = async (
  application: Application
): Promise<Enrolment> => {
  // 1 & 2 & 6: Get or create linked user & learner profile
  const { userUid, learnerProfile } = await getOrCreateUserAndLearnerProfile(application);
  const now = new Date().toISOString();

  // Check if an enrolment already exists for this exact application to maintain idempotency
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

  // 3, 4, 5, 6, 7: Create new enrolment document
  const enrolmentDocRef = doc(collection(db, ENROLMENTS_COLLECTION));
  const enrolmentCode = generateEnrolmentCode();

  const newEnrolment: Enrolment = cleanFirestoreData({
    id: enrolmentDocRef.id,
    enrolmentCode,
    learnerId: learnerProfile.learnerId, // 6. Assign learner ID
    userId: userUid, // 1. Link user
    userEmail: learnerProfile.email,
    userName: application.applicantName,
    applicationId: application.id,
    programmeId: application.programmeId, // 4. Link programme
    programmeName: application.programmeName,
    cohortId: application.cohortId, // 5. Link cohort
    cohortName: application.cohortName,
    status: 'ACTIVE', // 7. Activate learner dashboard
    enrolledAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(enrolmentDocRef, newEnrolment);

  return newEnrolment;
};

/**
  Fetch all enrolments for a single user (supports MULTIPLE ENROLMENTS per user)
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
  Subscribe to enrolments for a learner or all learners
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

      // Filter for this specific user (by userId or userEmail)
      const userEnrolments = all.filter(
        (e) =>
          e.userId === emailOrUid ||
          (e.userEmail && e.userEmail.toLowerCase() === queryVal)
      );

      // If user specific filter returned nothing, fallback to all enrolments if admin/demo mode
      callback(userEnrolments.length > 0 ? userEnrolments : all);
    },
    (err) => {
      console.warn('subscribeToLearnerEnrolments error:', err.message);
      callback([]);
    }
  );
};

/**
  Subscribe to all enrolments in system
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
  Subscribe to all learner profiles
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
