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
  ApplicationFormTemplate,
  FormField,
  FormSection,
  FormStatus,
  FormFieldType,
} from '../types';

const FORMS_COLLECTION = 'applicationForms';

export const handleFirestoreError = (error: unknown, operation: string, path: string) => {
  console.warn(`Firestore Error during ${operation} on ${path}:`, error);
  throw error;
};

// --- DEFAULT TEMPLATE SEED ---
export const DEFAULT_FORM_SECTIONS: FormSection[] = [
  { id: 'sec_personal', title: '1. Personal & Contact Information', description: 'Basic applicant identity and contact details', order: 1 },
  { id: 'sec_background', title: '2. Education & Professional Background', description: 'Tell us about your educational background and work history', order: 2 },
  { id: 'sec_readiness', title: '3. Technical Readiness & Commitment', description: 'Equipment, internet access, and weekly availability', order: 3 },
  { id: 'sec_motivation', title: '4. Motivation & Program Fit', description: 'Why you want to join this program', order: 4 },
  { id: 'sec_documents', title: '5. Document Uploads & Verification', description: 'Required identification and resume/CV attachments', order: 5 },
];

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: 'q_full_name',
    sectionId: 'sec_personal',
    label: 'Full Legal Name',
    fieldType: 'text',
    description: 'Enter your full name as it appears on official identification documents',
    placeholder: 'e.g. Chukwuemeka Emmanuel Okafor',
    required: true,
    order: 1,
    active: true,
    characterLimit: 100,
  },
  {
    id: 'q_email',
    sectionId: 'sec_personal',
    label: 'Primary Email Address',
    fieldType: 'email',
    description: 'We will send all admission notices and interview invites to this email',
    placeholder: 'applicant@example.com',
    required: true,
    order: 2,
    active: true,
  },
  {
    id: 'q_phone',
    sectionId: 'sec_personal',
    label: 'Phone / WhatsApp Number',
    fieldType: 'phone',
    description: 'Include country code',
    placeholder: '+234 800 123 4567',
    required: true,
    order: 3,
    active: true,
  },
  {
    id: 'q_dob',
    sectionId: 'sec_personal',
    label: 'Date of Birth',
    fieldType: 'date',
    description: 'Select your birth date',
    required: true,
    order: 4,
    active: true,
  },
  {
    id: 'q_education_level',
    sectionId: 'sec_background',
    label: 'Highest Educational Qualification',
    fieldType: 'dropdown',
    description: 'Select your highest level of completed education',
    required: true,
    options: ['High School / Secondary', 'Diploma / OND / HND', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate / PhD', 'Other'],
    order: 5,
    active: true,
  },
  {
    id: 'q_field_of_study',
    sectionId: 'sec_background',
    label: 'Field of Study / Discipline',
    fieldType: 'text',
    placeholder: 'e.g. Computer Science, Economics, Mass Comm',
    required: false,
    order: 6,
    active: true,
  },
  {
    id: 'q_laptop_access',
    sectionId: 'sec_readiness',
    label: 'Do you have access to a functional laptop or computer?',
    fieldType: 'yes_no',
    description: 'A laptop (min 8GB RAM recommended) is required for practical lab exercises',
    required: true,
    order: 7,
    active: true,
  },
  {
    id: 'q_laptop_specs',
    sectionId: 'sec_readiness',
    label: 'Please specify your computer specifications (OS, RAM, Processor)',
    fieldType: 'text',
    placeholder: 'e.g., Windows 11, Core i5, 16GB RAM',
    required: false,
    order: 8,
    active: true,
    conditionalLogic: {
      dependsOnFieldId: 'q_laptop_access',
      operator: 'equals',
      value: 'Yes',
      action: 'show',
    },
  },
  {
    id: 'q_weekly_hours',
    sectionId: 'sec_readiness',
    label: 'How many hours per week can you commit to live classes and assignments?',
    fieldType: 'single_choice',
    required: true,
    options: ['Less than 10 hours', '10 - 15 hours', '15 - 20 hours', '20+ hours (Full Commitment)'],
    order: 9,
    active: true,
  },
  {
    id: 'q_ai_exp_level',
    sectionId: 'sec_motivation',
    label: 'Rate your prior experience with Artificial Intelligence & Automation',
    fieldType: 'dropdown',
    required: true,
    options: [
      'Complete Beginner (No prior experience)',
      'Novice (Used ChatGPT or Basic Tools)',
      'Intermediate (Prompt engineering & simple APIs)',
      'Advanced (Building models & workflows)',
    ],
    order: 10,
    active: true,
  },
  {
    id: 'q_motivation_essay',
    sectionId: 'sec_motivation',
    label: 'Statement of Purpose / Personal Motivation',
    fieldType: 'textarea',
    description: 'Explain why you wish to join this program and how it aligns with your career goals.',
    placeholder: 'Write a brief 2-3 paragraph statement...',
    required: true,
    characterLimit: 1000,
    order: 11,
    active: true,
  },
  {
    id: 'q_linkedin_url',
    sectionId: 'sec_background',
    label: 'LinkedIn Profile URL or Portfolio Link',
    fieldType: 'url',
    placeholder: 'https://www.linkedin.com/in/yourprofile',
    required: false,
    order: 12,
    active: true,
  },
  {
    id: 'q_cv_upload',
    sectionId: 'sec_documents',
    label: 'Upload CV / Resume (PDF/DOC)',
    fieldType: 'file_upload',
    description: 'Upload your latest curriculum vitae or resume',
    required: true,
    order: 13,
    active: true,
    fileConfig: {
      allowedTypes: ['pdf', 'doc', 'docx'],
      maxSizeBytes: 5242880, // 5MB
      uploadInstructions: 'PDF or Word documents only, max 5MB.',
      maxFiles: 1,
    },
  },
  {
    id: 'q_id_doc_upload',
    sectionId: 'sec_documents',
    label: 'Upload Government-Issued ID Card',
    fieldType: 'file_upload',
    description: 'Passport, National Identity Slip, Voters Card, or Drivers License',
    required: false,
    order: 14,
    active: true,
    fileConfig: {
      allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSizeBytes: 5242880,
      uploadInstructions: 'Clear image or PDF, max 5MB.',
      maxFiles: 1,
    },
  },
  {
    id: 'q_agreement_checkbox',
    sectionId: 'sec_documents',
    label: 'I confirm that all information provided in this application is truthful and complete.',
    fieldType: 'checkbox',
    required: true,
    order: 15,
    active: true,
  },
];

// --- GET FORMS ---
export const getFormTemplates = async (programmeId?: string): Promise<ApplicationFormTemplate[]> => {
  try {
    const colRef = collection(db, FORMS_COLLECTION);
    const q = programmeId ? query(colRef, where('programmeId', '==', programmeId)) : query(colRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as ApplicationFormTemplate[];
  } catch (err) {
    handleFirestoreError(err, 'getFormTemplates', FORMS_COLLECTION);
    return [];
  }
};

export const subscribeToFormTemplates = (
  callback: (forms: ApplicationFormTemplate[]) => void,
  programmeId?: string
) => {
  const colRef = collection(db, FORMS_COLLECTION);
  const q = programmeId ? query(colRef, where('programmeId', '==', programmeId)) : query(colRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ApplicationFormTemplate[];
      callback(list);
    },
    (error) => {
      console.warn('subscribeToFormTemplates listener error:', error.message);
      callback([]);
    }
  );
};

export const getFormById = async (formId: string): Promise<ApplicationFormTemplate | null> => {
  try {
    const docRef = doc(db, FORMS_COLLECTION, formId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...snap.data(),
    } as ApplicationFormTemplate;
  } catch (err) {
    handleFirestoreError(err, 'getFormById', FORMS_COLLECTION);
    return null;
  }
};

export const getPublishedFormForProgramme = async (
  programmeId: string,
  cohortId?: string
): Promise<ApplicationFormTemplate | null> => {
  try {
    const colRef = collection(db, FORMS_COLLECTION);
    // Fetch all forms for this programme
    const q = query(colRef, where('programmeId', '==', programmeId));
    const snapshot = await getDocs(q);
    const allForms = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ApplicationFormTemplate[];

    // Filter by cohort if specific cohort form exists, or published
    let match = cohortId
      ? allForms.find((f) => f.cohortId === cohortId && f.status === 'PUBLISHED')
      : null;

    if (!match) {
      match = allForms.find((f) => f.status === 'PUBLISHED');
    }

    // Fallback: if no published form exists, look for any draft form, or seed a default published form
    if (!match && allForms.length > 0) {
      match = allForms[0];
    }

    return match || null;
  } catch (err) {
    console.warn('Error fetching published form for programme:', err);
    return null;
  }
};

// --- CREATE & UPDATE FORMS ---
export const createFormTemplate = async (
  data: Omit<ApplicationFormTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...data,
    version: data.version || 1,
    status: data.status || 'DRAFT',
    sections: data.sections || DEFAULT_FORM_SECTIONS,
    fields: data.fields || DEFAULT_FORM_FIELDS,
    createdAt: now,
    updatedAt: now,
  });
  const docRef = await addDoc(collection(db, FORMS_COLLECTION), payload);
  return docRef.id;
};

export const updateFormTemplate = async (
  formId: string,
  data: Partial<ApplicationFormTemplate>
): Promise<void> => {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  const payload = cleanFirestoreData({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, payload);
};

// --- PUBLISH / UNPUBLISH WITH VERSIONING ---
export const publishForm = async (formId: string): Promise<number> => {
  const form = await getFormById(formId);
  if (!form) throw new Error('Form not found.');

  const now = new Date().toISOString();
  // If form was already published previously and modified, bump version number
  const newVersion = form.status === 'PUBLISHED' ? form.version + 1 : form.version || 1;

  const payload = cleanFirestoreData({
    status: 'PUBLISHED',
    version: newVersion,
    publishedAt: now,
    updatedAt: now,
  });
  await updateDoc(doc(db, FORMS_COLLECTION, formId), payload);

  return newVersion;
};

export const unpublishForm = async (formId: string): Promise<void> => {
  const payload = cleanFirestoreData({
    status: 'UNPUBLISHED',
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, FORMS_COLLECTION, formId), payload);
};

export const cloneForm = async (
  formId: string,
  newTitle?: string,
  targetProgrammeId?: string
): Promise<string> => {
  const sourceForm = await getFormById(formId);
  if (!sourceForm) throw new Error('Source form template not found.');

  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    programmeId: targetProgrammeId || sourceForm.programmeId,
    programmeName: sourceForm.programmeName,
    cohortId: sourceForm.cohortId || null,
    title: newTitle || `${sourceForm.title} (Copy)`,
    description: sourceForm.description || '',
    version: 1,
    status: 'DRAFT',
    sections: JSON.parse(JSON.stringify(sourceForm.sections || [])),
    fields: JSON.parse(JSON.stringify(sourceForm.fields || [])),
    createdAt: now,
    updatedAt: now,
  });
  const clonedRef = await addDoc(collection(db, FORMS_COLLECTION), payload);

  return clonedRef.id;
};

export const archiveForm = async (formId: string): Promise<void> => {
  const payload = cleanFirestoreData({
    status: 'ARCHIVED',
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, FORMS_COLLECTION, formId), payload);
};

export const deleteForm = async (formId: string): Promise<void> => {
  await deleteDoc(doc(db, FORMS_COLLECTION, formId));
};

// --- SEED INITIAL DEFAULT FORM IF NONE EXISTS ---
export const seedDefaultFormIfEmpty = async (
  programmeId: string,
  programmeName: string,
  cohortId?: string
): Promise<string> => {
  const existing = await getFormTemplates(programmeId);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const newId = await createFormTemplate({
    programmeId,
    programmeName,
    cohortId: cohortId || '',
    title: `${programmeName} Official Application Form`,
    description: 'Please complete all required sections to submit your application for review by the admissions committee.',
    version: 1,
    status: 'PUBLISHED',
    sections: DEFAULT_FORM_SECTIONS,
    fields: DEFAULT_FORM_FIELDS,
    publishedAt: new Date().toISOString(),
  });

  return newId;
};
