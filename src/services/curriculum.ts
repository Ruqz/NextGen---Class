import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  CurriculumModuleItem,
  CurriculumWeek,
  CurriculumLesson,
  CurriculumResource,
  CurriculumResourceType,
} from '../types';

const CURRICULUM_COLLECTION = 'curriculumModules';

/**
 * Seed initial sample curriculum for a programme if none exist
 */
export const seedInitialCurriculumIfEmpty = async (
  programmeId: string,
  programmeName: string
) => {
  try {
    const q = query(
      collection(db, CURRICULUM_COLLECTION),
      where('programmeId', '==', programmeId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      const now = new Date().toISOString();
      const sampleModules: Omit<CurriculumModuleItem, 'id'>[] = [
        {
          programmeId,
          programmeName,
          title: 'Module 1: Foundations of Generative AI & Architecture',
          code: 'MOD-101',
          description: 'Master core concepts of generative models, transformer pipelines, and cloud database state management.',
          order: 1,
          published: true,
          createdAt: now,
          updatedAt: now,
          weeks: [
            {
              id: 'wk-1-1',
              weekNumber: 1,
              title: 'Week 1: Introduction to Model Architecture',
              description: 'Overview of transformer models, vector embeddings, and API design patterns.',
              lessons: [
                {
                  id: 'les-1-1-1',
                  title: 'Lesson 1: Generative Model Fundamentals',
                  description: 'Deep dive into attention mechanisms and latent space representations.',
                  durationMinutes: 45,
                  order: 1,
                  resources: [
                    {
                      id: 'res-1-1-1-1',
                      title: 'Model Architecture PDF Guide',
                      type: 'PDF',
                      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                      description: 'Comprehensive 15-page architectural reference document.',
                      fileSize: '3.2 MB',
                      downloadable: true,
                    },
                    {
                      id: 'res-1-1-1-2',
                      title: 'Attention Mechanism Video Lecture',
                      type: 'video',
                      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                      description: 'High-definition recorded video presentation.',
                      fileSize: '120 MB',
                      downloadable: false,
                    },
                  ],
                },
                {
                  id: 'les-1-1-2',
                  title: 'Lesson 2: Tokenization & Embedding Pipelines',
                  description: 'Hands-on practice converting raw text inputs into multi-dimensional vectors.',
                  durationMinutes: 60,
                  order: 2,
                  resources: [
                    {
                      id: 'res-1-1-2-1',
                      title: 'Tokenization Lab Worksheet',
                      type: 'document',
                      url: 'https://docs.google.com/document/d/sample',
                      description: 'Step-by-step guided coding tutorial document.',
                      downloadable: true,
                    },
                    {
                      id: 'res-1-1-2-2',
                      title: 'OpenAI Embedding Playground',
                      type: 'link',
                      url: 'https://platform.openai.com/playground',
                      description: 'Interactive web link to test vector similarity.',
                      downloadable: false,
                    },
                  ],
                },
              ],
            },
            {
              id: 'wk-1-2',
              weekNumber: 2,
              title: 'Week 2: Secure Database & Auth Integration',
              description: 'Configuring Firestore rules, ABAC policies, and real-time listeners.',
              lessons: [
                {
                  id: 'les-1-2-1',
                  title: 'Lesson 1: ABAC Security Gate Setup',
                  description: 'Learn attribute-based access control strategies for enterprise apps.',
                  durationMinutes: 50,
                  order: 1,
                  resources: [
                    {
                      id: 'res-1-2-1-1',
                      title: 'Security Specification Download Package',
                      type: 'download',
                      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                      description: 'Downloadable zip containing code templates and security checklists.',
                      fileSize: '5.8 MB',
                      downloadable: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          programmeId,
          programmeName,
          title: 'Module 2: Advanced Prompt Engineering & Automation Workflows',
          code: 'MOD-102',
          description: 'Construct multi-step agentic execution flows, tool calling pipelines, and automated fallback logic.',
          order: 2,
          published: true,
          createdAt: now,
          updatedAt: now,
          weeks: [
            {
              id: 'wk-2-1',
              weekNumber: 3,
              title: 'Week 3: Agentic Tool Use & Function Calling',
              description: 'Executing structured API triggers from AI models safely in production.',
              lessons: [
                {
                  id: 'les-2-1-1',
                  title: 'Lesson 1: Tool Calling & Schema Validation',
                  description: 'Defining JSON schemas for structured model tool calls.',
                  durationMinutes: 60,
                  order: 1,
                  resources: [
                    {
                      id: 'res-2-1-1-1',
                      title: 'Tool Calling Blueprint PDF',
                      type: 'PDF',
                      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                      description: 'Official framework specification sheet.',
                      fileSize: '1.8 MB',
                      downloadable: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          programmeId,
          programmeName,
          title: 'Module 3: Production Capstone & Enterprise Deployment (Draft)',
          code: 'MOD-103',
          description: 'Deploying end-to-end full-stack applications with Cloud Run, CI/CD, and monitoring.',
          order: 3,
          published: false, // Draft / Unpublished
          createdAt: now,
          updatedAt: now,
          weeks: [
            {
              id: 'wk-3-1',
              weekNumber: 4,
              title: 'Week 4: Final Capstone Review',
              description: 'Peer evaluations and live evaluation presentations.',
              lessons: [
                {
                  id: 'les-3-1-1',
                  title: 'Lesson 1: Production Readiness Checklist',
                  description: 'Ensuring non-breaking builds and security compliance.',
                  durationMinutes: 30,
                  order: 1,
                  resources: [
                    {
                      id: 'res-3-1-1-1',
                      title: 'Deployment Guide Document',
                      type: 'document',
                      url: 'https://docs.google.com/document/d/capstone',
                      description: 'Internal evaluation doc.',
                      downloadable: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      for (const mod of sampleModules) {
        const docRef = doc(collection(db, CURRICULUM_COLLECTION));
        await setDoc(docRef, cleanFirestoreData({ id: docRef.id, ...mod }));
      }
    }
  } catch (err) {
    console.warn('seedInitialCurriculumIfEmpty error:', err);
  }
};

/**
 * Subscribe to all curriculum modules (for Programme Managers)
 */
export const subscribeToCurriculumModules = (
  callback: (modules: CurriculumModuleItem[]) => void,
  programmeId?: string
) => {
  const colRef = collection(db, CURRICULUM_COLLECTION);
  const q = programmeId ? query(colRef, where('programmeId', '==', programmeId)) : colRef;

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CurriculumModuleItem[];
      // Sort by order
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(list);
    },
    (err) => {
      console.warn('subscribeToCurriculumModules error:', err);
      callback([]);
    }
  );
};

/**
 * Subscribe to PUBLISHED curriculum modules ONLY (for Learners)
 */
export const subscribeToLearnerCurriculum = (
  programmeId: string,
  callback: (modules: CurriculumModuleItem[]) => void
) => {
  const colRef = collection(db, CURRICULUM_COLLECTION);

  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CurriculumModuleItem[];

      // Filter for learner: matching programmeId AND published == true
      const filtered = list.filter(
        (m) => (!programmeId || m.programmeId === programmeId) && m.published === true
      );

      filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(filtered);
    },
    (err) => {
      console.warn('subscribeToLearnerCurriculum error:', err);
      callback([]);
    }
  );
};

/**
 * Create a new Curriculum Module
 */
export const createCurriculumModule = async (
  moduleData: Omit<CurriculumModuleItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const docRef = doc(collection(db, CURRICULUM_COLLECTION));
  const now = new Date().toISOString();
  const newModule: CurriculumModuleItem = cleanFirestoreData({
    id: docRef.id,
    ...moduleData,
    createdAt: now,
    updatedAt: now,
  });
  await setDoc(docRef, newModule);
  return docRef.id;
};

/**
 * Update an existing Curriculum Module
 */
export const updateCurriculumModule = async (
  id: string,
  updates: Partial<Omit<CurriculumModuleItem, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, CURRICULUM_COLLECTION, id);
  await updateDoc(
    docRef,
    cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  );
};

/**
 * Publish a Curriculum Module
 */
export const publishCurriculumModule = async (id: string): Promise<void> => {
  await updateCurriculumModule(id, { published: true });
};

/**
 * Unpublish a Curriculum Module
 */
export const unpublishCurriculumModule = async (id: string): Promise<void> => {
  await updateCurriculumModule(id, { published: false });
};

/**
 * Delete a Curriculum Module
 */
export const deleteCurriculumModule = async (id: string): Promise<void> => {
  const docRef = doc(db, CURRICULUM_COLLECTION, id);
  await deleteDoc(docRef);
};
