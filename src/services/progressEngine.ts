import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import { ProgressRuleConfig, LearnerProgressScore, ProgressStatusType } from '../types';

const RULES_COLLECTION = 'progressRules';
const PROGRESS_COLLECTION = 'learnerProgress';

// Default Fallback Rule Config
export const DEFAULT_PROGRESS_RULE: ProgressRuleConfig = {
  id: 'DEFAULT_RULE',
  programmeId: 'ALL',
  programmeName: 'Default Programme Rule',
  attendanceWeight: 20,
  assignmentsWeight: 25,
  assessmentsWeight: 20,
  finalAssessmentWeight: 15,
  finalProjectWeight: 20,
  completedThreshold: 80,
  onTrackThreshold: 70,
  atRiskThreshold: 50,
  updatedAt: new Date().toISOString(),
};

/**
 * Subscribe to real-time progress rules
 */
export const subscribeToProgressRules = (callback: (rules: ProgressRuleConfig[]) => void) => {
  return onSnapshot(
    collection(db, RULES_COLLECTION),
    async (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ProgressRuleConfig[];

      // Seed default rule if empty
      if (snap.empty) {
        const docRef = doc(db, RULES_COLLECTION, DEFAULT_PROGRESS_RULE.id);
        await setDoc(docRef, cleanFirestoreData(DEFAULT_PROGRESS_RULE));
        list = [DEFAULT_PROGRESS_RULE];
      }

      callback(list);
    },
    (err) => {
      console.warn('subscribeToProgressRules error:', err.message);
      callback([DEFAULT_PROGRESS_RULE]);
    }
  );
};

/**
 * Save or edit a progress rule configuration
 */
export const saveProgressRule = async (rule: Partial<ProgressRuleConfig> & { programmeId: string }): Promise<string> => {
  const id = rule.id || rule.programmeId || 'DEFAULT_RULE';
  const docRef = doc(db, RULES_COLLECTION, id);

  const payload: ProgressRuleConfig = cleanFirestoreData({
    id,
    programmeId: rule.programmeId || 'ALL',
    programmeName: rule.programmeName || 'All Programmes',
    attendanceWeight: Number(rule.attendanceWeight ?? 20),
    assignmentsWeight: Number(rule.assignmentsWeight ?? 25),
    assessmentsWeight: Number(rule.assessmentsWeight ?? 20),
    finalAssessmentWeight: Number(rule.finalAssessmentWeight ?? 15),
    finalProjectWeight: Number(rule.finalProjectWeight ?? 20),
    completedThreshold: Number(rule.completedThreshold ?? 80),
    onTrackThreshold: Number(rule.onTrackThreshold ?? 70),
    atRiskThreshold: Number(rule.atRiskThreshold ?? 50),
    updatedAt: new Date().toISOString(),
    updatedBy: rule.updatedBy || 'pm@platform.org',
  });

  await setDoc(docRef, payload, { merge: true });
  return id;
};

/**
 * Pure helper function to compute progress score & status from weights and inputs
 */
export const calculateProgressFromInputs = (
  inputs: {
    attendanceScore: number;
    assignmentsScore: number;
    assessmentsScore: number;
    finalAssessmentScore: number;
    finalProjectScore: number;
  },
  rule: ProgressRuleConfig
): { overallWeightedScore: number; status: ProgressStatusType } => {
  const {
    attendanceScore,
    assignmentsScore,
    assessmentsScore,
    finalAssessmentScore,
    finalProjectScore,
  } = inputs;

  const wAtt = rule.attendanceWeight || 0;
  const wAss = rule.assignmentsWeight || 0;
  const wQuiz = rule.assessmentsWeight || 0;
  const wFA = rule.finalAssessmentWeight || 0;
  const wFP = rule.finalProjectWeight || 0;

  const totalWeight = wAtt + wAss + wQuiz + wFA + wFP || 100;

  const weightedSum =
    (attendanceScore * wAtt) +
    (assignmentsScore * wAss) +
    (assessmentsScore * wQuiz) +
    (finalAssessmentScore * wFA) +
    (finalProjectScore * wFP);

  const overallWeightedScore = Math.min(100, Math.max(0, Math.round((weightedSum / totalWeight) * 10) / 10));

  let status: ProgressStatusType = 'CRITICAL';

  if (overallWeightedScore >= rule.completedThreshold && (finalProjectScore >= 70 || finalAssessmentScore >= 70)) {
    status = 'COMPLETED';
  } else if (overallWeightedScore >= rule.onTrackThreshold) {
    status = 'ON_TRACK';
  } else if (overallWeightedScore >= rule.atRiskThreshold) {
    status = 'AT_RISK';
  } else {
    status = 'CRITICAL';
  }

  return { overallWeightedScore, status };
};

/**
 * Subscribe to calculated learner progress scores
 */
export const subscribeToLearnerProgress = (
  programmeId?: string,
  cohortId?: string,
  learnerId?: string,
  callback?: (scores: LearnerProgressScore[]) => void
) => {
  return onSnapshot(
    collection(db, PROGRESS_COLLECTION),
    (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as LearnerProgressScore[];

      if (programmeId && programmeId !== 'ALL') {
        list = list.filter((p) => p.programmeId === programmeId);
      }
      if (cohortId && cohortId !== 'ALL') {
        list = list.filter((p) => p.cohortId === cohortId);
      }
      if (learnerId) {
        list = list.filter((p) => p.learnerId === learnerId);
      }

      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToLearnerProgress warning:', err.message);
      if (callback) callback([]);
    }
  );
};

/**
 * Save calculated progress score for a learner
 */
export const saveLearnerProgressScore = async (scoreData: LearnerProgressScore): Promise<void> => {
  const docRef = doc(db, PROGRESS_COLLECTION, scoreData.learnerId);
  await setDoc(docRef, cleanFirestoreData(scoreData), { merge: true });
};
