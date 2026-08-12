import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import { Programme, ProgrammeStatus, Cohort, CohortStatus } from '../types';

const PROGRAMMES_COLLECTION = 'programmes';
const COHORTS_COLLECTION = 'cohorts';

// --- PROGRAMMES CRUD ---

export const getProgrammes = async (): Promise<Programme[]> => {
  const snapshot = await getDocs(collection(db, PROGRAMMES_COLLECTION));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Programme[];
};

export const subscribeToProgrammes = (callback: (programmes: Programme[]) => void) => {
  return onSnapshot(
    collection(db, PROGRAMMES_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Programme[];
      callback(list);
    },
    (error) => {
      console.warn('subscribeToProgrammes error:', error.message);
      callback([]);
    }
  );
};

export const createProgramme = async (
  data: Omit<Programme, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, PROGRAMMES_COLLECTION), cleanFirestoreData({
    ...data,
    createdAt: now,
    updatedAt: now,
  }));
  return docRef.id;
};

export const updateProgramme = async (
  id: string,
  data: Partial<Omit<Programme, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, PROGRAMMES_COLLECTION, id);
  await updateDoc(docRef, cleanFirestoreData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const archiveProgramme = async (id: string): Promise<void> => {
  await updateProgramme(id, { status: 'ARCHIVED' });
};

// --- COHORTS CRUD ---

export const getCohorts = async (programmeId?: string): Promise<Cohort[]> => {
  const colRef = collection(db, COHORTS_COLLECTION);
  let q = query(colRef);
  if (programmeId) {
    q = query(colRef, where('programmeId', '==', programmeId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Cohort[];
};

export const subscribeToCohorts = (
  callback: (cohorts: Cohort[]) => void,
  programmeId?: string
) => {
  const colRef = collection(db, COHORTS_COLLECTION);
  const q = programmeId ? query(colRef, where('programmeId', '==', programmeId)) : query(colRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Cohort[];
      callback(list);
    },
    (error) => {
      console.warn('subscribeToCohorts error:', error.message);
      callback([]);
    }
  );
};

export const createCohort = async (
  data: Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COHORTS_COLLECTION), cleanFirestoreData({
    ...data,
    createdAt: now,
    updatedAt: now,
  }));
  return docRef.id;
};

export const updateCohort = async (
  id: string,
  data: Partial<Omit<Cohort, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, COHORTS_COLLECTION, id);
  await updateDoc(docRef, cleanFirestoreData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const archiveCohort = async (id: string): Promise<void> => {
  await updateCohort(id, { status: 'ARCHIVED' });
};

// --- INITIAL SEEDING HELPER ---

export const seedInitialDataIfEmpty = async (): Promise<{
  programmeId: string;
  cohortId: string;
}> => {
  const existingProgrammes = await getProgrammes();
  let defaultProgramme = existingProgrammes.find(
    (p) => p.name.toLowerCase().includes('generative ai') || p.slug === 'generative-ai-cohort-2'
  );

  let programmeId = defaultProgramme?.id;

  if (!defaultProgramme) {
    const now = new Date().toISOString();
    const newProgRef = await addDoc(collection(db, PROGRAMMES_COLLECTION), {
      name: 'Generative AI & AI Automation',
      code: 'GAI',
      slug: 'generative-ai-cohort-2',
      description:
        'Comprehensive 12-week intensive programme training learners on Generative AI, Prompt Engineering, Autonomous AI Agents, and Enterprise Automation workflows.',
      status: 'ACTIVE' as ProgrammeStatus,
      duration: '12 Weeks',
      deliveryFormat: 'Hybrid',
      createdAt: now,
      updatedAt: now,
    });
    programmeId = newProgRef.id;
  }

  const existingCohorts = await getCohorts(programmeId);
  let defaultCohort = existingCohorts.find(
    (c) => c.name.toLowerCase().includes('cohort 2') || c.code === 'GAI-C2'
  );

  let cohortId = defaultCohort?.id;

  if (!defaultCohort && programmeId) {
    const now = new Date().toISOString();
    const newCohortRef = await addDoc(collection(db, COHORTS_COLLECTION), {
      programmeId: programmeId,
      programmeName: 'Generative AI & AI Automation',
      name: 'Cohort 2',
      code: 'GAI-C2',
      startDate: '2026-09-01',
      endDate: '2026-11-25',
      applicationOpenDate: '2026-08-01',
      applicationCloseDate: '2026-08-28',
      capacity: 50,
      status: 'APPLICATION_OPEN' as CohortStatus,
      createdAt: now,
      updatedAt: now,
    });
    cohortId = newCohortRef.id;
  }

  return { programmeId: programmeId!, cohortId: cohortId! };
};
