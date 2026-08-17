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
import {
  RiskRuleConfig,
  InterventionRecord,
  FlaggedAtRiskLearner,
  RiskLevel,
  InterventionOutcome,
  LearnerProgressScore,
} from '../types';

const RISK_RULES_COLLECTION = 'atRiskRuleConfigs';
const INTERVENTIONS_COLLECTION = 'interventions';
const PROGRESS_COLLECTION = 'learnerProgress';

// Default Risk Rule Configuration
export const DEFAULT_RISK_RULE: RiskRuleConfig = {
  id: 'DEFAULT_RISK_RULE',
  programmeId: 'ALL',
  programmeName: 'All Programmes (Default At-Risk Rules)',
  attendanceMinThreshold: 80, // Flag if attendance < 80%
  missedAssignmentsMaxThreshold: 2, // Flag if missed assignments > 2
  assessmentScoreMinThreshold: 70, // Flag if assessment score < 70%
  inactivityDaysMaxThreshold: 7, // Flag if inactive > 7 days
  updatedAt: new Date().toISOString(),
  updatedBy: 'pm@platform.org',
};

// Seed Interventions for realistic initial state
export const SEED_INTERVENTIONS: InterventionRecord[] = [
  {
    id: 'int_001',
    learnerId: 'learner_101',
    learnerName: 'Alex Morgan',
    learnerEmail: 'alex.morgan@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    reason: 'Attendance below threshold (62%) and 3 missed lab assignments.',
    riskLevel: 'CRITICAL',
    action: 'Schedule mandatory 1-on-1 academic coaching & extended assignment deadline',
    assignedStaffId: 'staff_pm_1',
    assignedStaffName: 'Dr. Evelyn Vance',
    assignedStaffRole: 'Programme Manager',
    followUpDate: '2026-08-20',
    outcome: 'IN_PROGRESS',
    notes: 'Learner reported technical issues with Cloud Run lab deployment. Granted 3-day extension.',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'pm@platform.org',
  },
  {
    id: 'int_002',
    learnerId: 'learner_102',
    learnerName: 'Devon Vance',
    learnerEmail: 'devon.vance@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    reason: 'Assessment average score at 58% (below 70% benchmark).',
    riskLevel: 'HIGH',
    action: 'Assign peer mentor and provide supplementary study materials for Module 4',
    assignedStaffId: 'staff_fac_1',
    assignedStaffName: 'Marcus Thorne',
    assignedStaffRole: 'Lead Facilitator',
    followUpDate: '2026-08-18',
    outcome: 'PENDING',
    notes: 'First check-in call scheduled for Friday afternoon.',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'facilitator@platform.org',
  },
  {
    id: 'int_003',
    learnerId: 'learner_103',
    learnerName: 'Samantha Reed',
    learnerEmail: 'samantha.reed@student.edu',
    programmeId: 'prog_cloud_ops',
    programmeName: 'Cloud Infrastructure & DevOps',
    cohortId: 'cohort_2026_q2',
    cohortName: 'Cohort 2026-Q2',
    reason: 'Prolonged portal inactivity (10 days without log-in or submission).',
    riskLevel: 'HIGH',
    action: 'Send urgent welfare check email and SMS reminder regarding upcoming capstone',
    assignedStaffId: 'staff_pm_1',
    assignedStaffName: 'Dr. Evelyn Vance',
    assignedStaffRole: 'Programme Manager',
    followUpDate: '2026-08-15',
    outcome: 'RESOLVED',
    notes: 'Learner responded: was out sick. Re-engaged and completed Module 3 quiz.',
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'pm@platform.org',
  },
];

/**
 * Subscribe to Risk Rule Configurations
 */
export const subscribeToRiskRuleConfigs = (
  callback: (configs: RiskRuleConfig[]) => void
) => {
  return onSnapshot(
    collection(db, RISK_RULES_COLLECTION),
    async (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RiskRuleConfig[];

      if (snap.empty) {
        const docRef = doc(db, RISK_RULES_COLLECTION, DEFAULT_RISK_RULE.id);
        await setDoc(docRef, cleanFirestoreData(DEFAULT_RISK_RULE));
        list = [DEFAULT_RISK_RULE];
      }

      callback(list);
    },
    (err) => {
      console.warn('subscribeToRiskRuleConfigs error:', err.message);
      callback([DEFAULT_RISK_RULE]);
    }
  );
};

/**
 * Save or Update Risk Rule Configuration
 */
export const saveRiskRuleConfig = async (
  rule: Partial<RiskRuleConfig> & { programmeId: string }
): Promise<string> => {
  const id = rule.id || rule.programmeId || 'DEFAULT_RISK_RULE';
  const docRef = doc(db, RISK_RULES_COLLECTION, id);

  const payload: RiskRuleConfig = cleanFirestoreData({
    id,
    programmeId: rule.programmeId || 'ALL',
    programmeName: rule.programmeName || 'All Programmes',
    attendanceMinThreshold: Number(rule.attendanceMinThreshold ?? 80),
    missedAssignmentsMaxThreshold: Number(rule.missedAssignmentsMaxThreshold ?? 2),
    assessmentScoreMinThreshold: Number(rule.assessmentScoreMinThreshold ?? 70),
    inactivityDaysMaxThreshold: Number(rule.inactivityDaysMaxThreshold ?? 7),
    updatedAt: new Date().toISOString(),
    updatedBy: rule.updatedBy || 'pm@platform.org',
  });

  await setDoc(docRef, payload, { merge: true });
  return id;
};

/**
 * Subscribe to Real-Time Intervention Records
 */
export const subscribeToInterventions = (
  programmeId?: string,
  cohortId?: string,
  callback?: (records: InterventionRecord[]) => void
) => {
  return onSnapshot(
    collection(db, INTERVENTIONS_COLLECTION),
    async (snap) => {
      let list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as InterventionRecord[];

      // Seed initial sample interventions if database is empty
      if (snap.empty) {
        for (const seed of SEED_INTERVENTIONS) {
          await setDoc(doc(db, INTERVENTIONS_COLLECTION, seed.id), cleanFirestoreData(seed));
        }
        list = SEED_INTERVENTIONS;
      }

      if (programmeId && programmeId !== 'ALL') {
        list = list.filter((r) => r.programmeId === programmeId);
      }
      if (cohortId && cohortId !== 'ALL') {
        list = list.filter((r) => r.cohortId === cohortId);
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (callback) callback(list);
    },
    (err) => {
      console.warn('subscribeToInterventions error:', err.message);
      if (callback) callback(SEED_INTERVENTIONS);
    }
  );
};

/**
 * Create a New Intervention Record
 */
export const createIntervention = async (
  record: Omit<InterventionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  const id = record.id || `int_${Date.now()}`;
  const docRef = doc(db, INTERVENTIONS_COLLECTION, id);
  const now = new Date().toISOString();

  const payload: InterventionRecord = cleanFirestoreData({
    id,
    learnerId: record.learnerId,
    learnerName: record.learnerName,
    learnerEmail: record.learnerEmail,
    programmeId: record.programmeId || 'prog_ai_eng',
    programmeName: record.programmeName || 'AI & Machine Learning Engineering',
    cohortId: record.cohortId || 'ALL',
    cohortName: record.cohortName || 'All Cohorts',
    reason: record.reason,
    riskLevel: record.riskLevel || 'MEDIUM',
    action: record.action,
    assignedStaffId: record.assignedStaffId || 'staff_pm_1',
    assignedStaffName: record.assignedStaffName || 'Unassigned Staff',
    assignedStaffRole: record.assignedStaffRole || 'Facilitator',
    followUpDate: record.followUpDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    outcome: record.outcome || 'PENDING',
    notes: record.notes || '',
    createdAt: now,
    updatedAt: now,
    createdBy: record.createdBy || 'pm@platform.org',
  });

  await setDoc(docRef, payload, { merge: true });
  return id;
};

/**
 * Update Intervention Record Status / Details
 */
export const updateIntervention = async (
  id: string,
  updates: Partial<InterventionRecord>
): Promise<void> => {
  const docRef = doc(db, INTERVENTIONS_COLLECTION, id);
  await updateDoc(docRef, cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
};

/**
 * Delete Intervention Record
 */
export const deleteIntervention = async (id: string): Promise<void> => {
  const docRef = doc(db, INTERVENTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

// Seed Mock At-Risk Learners Data Pool for Auto-Evaluation
const MOCK_LEARNERS_EVAL_POOL = [
  {
    learnerId: 'learner_101',
    learnerName: 'Alex Morgan',
    learnerEmail: 'alex.morgan@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    attendancePercent: 62,
    missedAssignmentsCount: 3,
    avgAssessmentScore: 68,
    daysInactive: 4,
    lastActiveDate: '2026-08-09',
  },
  {
    learnerId: 'learner_102',
    learnerName: 'Devon Vance',
    learnerEmail: 'devon.vance@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    attendancePercent: 88,
    missedAssignmentsCount: 1,
    avgAssessmentScore: 58,
    daysInactive: 2,
    lastActiveDate: '2026-08-11',
  },
  {
    learnerId: 'learner_103',
    learnerName: 'Samantha Reed',
    learnerEmail: 'samantha.reed@student.edu',
    programmeId: 'prog_cloud_ops',
    programmeName: 'Cloud Infrastructure & DevOps',
    cohortId: 'cohort_2026_q2',
    cohortName: 'Cohort 2026-Q2',
    attendancePercent: 74,
    missedAssignmentsCount: 4,
    avgAssessmentScore: 72,
    daysInactive: 10,
    lastActiveDate: '2026-08-03',
  },
  {
    learnerId: 'learner_104',
    learnerName: 'Jordan Hayes',
    learnerEmail: 'jordan.hayes@student.edu',
    programmeId: 'prog_cloud_ops',
    programmeName: 'Cloud Infrastructure & DevOps',
    cohortId: 'cohort_2026_q2',
    cohortName: 'Cohort 2026-Q2',
    attendancePercent: 55,
    missedAssignmentsCount: 5,
    avgAssessmentScore: 52,
    daysInactive: 12,
    lastActiveDate: '2026-08-01',
  },
  {
    learnerId: 'learner_105',
    learnerName: 'Taylor Swift-Chen',
    learnerEmail: 'taylor.chen@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    attendancePercent: 94,
    missedAssignmentsCount: 0,
    avgAssessmentScore: 92,
    daysInactive: 1,
    lastActiveDate: '2026-08-12',
  },
  {
    learnerId: 'learner_106',
    learnerName: 'Chris Miller',
    learnerEmail: 'chris.miller@student.edu',
    programmeId: 'prog_ai_eng',
    programmeName: 'AI & Machine Learning Engineering',
    cohortId: 'cohort_2026_q1',
    cohortName: 'Cohort 2026-Q1',
    attendancePercent: 78,
    missedAssignmentsCount: 2,
    avgAssessmentScore: 66,
    daysInactive: 8,
    lastActiveDate: '2026-08-05',
  },
];

/**
 * Automatic Rule Evaluation Engine
 * Evaluates learners against active Risk Rules and identifies at-risk candidates
 */
export const autoEvaluateAtRiskLearners = async (
  programmeId: string = 'ALL',
  cohortId: string = 'ALL',
  ruleConfig?: RiskRuleConfig,
  activeInterventions: InterventionRecord[] = []
): Promise<FlaggedAtRiskLearner[]> => {
  const rules = ruleConfig || DEFAULT_RISK_RULE;
  const flaggedList: FlaggedAtRiskLearner[] = [];

  // Try fetching live learner progress from Firestore if available
  let pool = MOCK_LEARNERS_EVAL_POOL;

  try {
    const snap = await getDocs(collection(db, PROGRESS_COLLECTION));
    if (!snap.empty) {
      const liveData = snap.docs.map((d) => d.data() as LearnerProgressScore);
      // Merge live progress into evaluation pool
      const livePool = liveData.map((lp, idx) => ({
        learnerId: lp.learnerId || `live_${idx}`,
        learnerName: lp.learnerName || 'Live Learner',
        learnerEmail: lp.learnerEmail || 'learner@platform.org',
        programmeId: lp.programmeId || 'prog_ai_eng',
        programmeName: lp.programmeName || 'AI Engineering',
        cohortId: lp.cohortId || 'ALL',
        cohortName: lp.cohortName || 'All Cohorts',
        attendancePercent: lp.attendanceScore ?? 75,
        missedAssignmentsCount: lp.assignmentsScore < 70 ? 3 : 1,
        avgAssessmentScore: lp.assessmentsScore ?? 65,
        daysInactive: lp.overallWeightedScore < 60 ? 9 : 2,
        lastActiveDate: new Date(Date.now() - (lp.overallWeightedScore < 60 ? 9 : 2) * 86400000).toISOString().split('T')[0],
      }));

      // Combine pools uniquely
      const existingIds = new Set(livePool.map((l) => l.learnerId));
      pool = [...livePool, ...MOCK_LEARNERS_EVAL_POOL.filter((m) => !existingIds.has(m.learnerId))];
    }
  } catch (err) {
    console.warn('Using fallback evaluation pool:', err);
  }

  // Filter pool by selected programme/cohort
  let filteredPool = pool;
  if (programmeId && programmeId !== 'ALL') {
    filteredPool = filteredPool.filter((l) => l.programmeId === programmeId);
  }
  if (cohortId && cohortId !== 'ALL') {
    filteredPool = filteredPool.filter((l) => l.cohortId === cohortId);
  }

  // Evaluate each learner against the 4 configured rules
  for (const learner of filteredPool) {
    const reasons: string[] = [];

    // Rule 1: Attendance below threshold
    if (learner.attendancePercent < rules.attendanceMinThreshold) {
      reasons.push(`Attendance is ${learner.attendancePercent}% (below ${rules.attendanceMinThreshold}% benchmark)`);
    }

    // Rule 2: Missed assignments
    if (learner.missedAssignmentsCount > rules.missedAssignmentsMaxThreshold) {
      reasons.push(`${learner.missedAssignmentsCount} missed assignments (exceeds max ${rules.missedAssignmentsMaxThreshold})`);
    }

    // Rule 3: Low assessment scores
    if (learner.avgAssessmentScore < rules.assessmentScoreMinThreshold) {
      reasons.push(`Average assessment score is ${learner.avgAssessmentScore}% (below ${rules.assessmentScoreMinThreshold}% benchmark)`);
    }

    // Rule 4: Prolonged inactivity
    if (learner.daysInactive > rules.inactivityDaysMaxThreshold) {
      reasons.push(`Inactive for ${learner.daysInactive} days (exceeds max ${rules.inactivityDaysMaxThreshold} days)`);
    }

    // Determine Risk Level based on violated rules count
    if (reasons.length > 0) {
      let riskLevel: RiskLevel = 'LOW';
      if (reasons.length >= 3) {
        riskLevel = 'CRITICAL';
      } else if (reasons.length === 2) {
        riskLevel = 'HIGH';
      } else if (reasons.length === 1) {
        riskLevel = 'MEDIUM';
      }

      // Check if learner has an active intervention
      const hasActive = activeInterventions.some(
        (i) => i.learnerId === learner.learnerId && (i.outcome === 'PENDING' || i.outcome === 'IN_PROGRESS')
      );

      flaggedList.push({
        learnerId: learner.learnerId,
        learnerName: learner.learnerName,
        learnerEmail: learner.learnerEmail,
        programmeId: learner.programmeId,
        programmeName: learner.programmeName,
        cohortId: learner.cohortId,
        cohortName: learner.cohortName,
        riskLevel,
        reasons,
        attendancePercent: learner.attendancePercent,
        missedAssignmentsCount: learner.missedAssignmentsCount,
        avgAssessmentScore: learner.avgAssessmentScore,
        lastActiveDate: learner.lastActiveDate,
        daysInactive: learner.daysInactive,
        flaggedAt: new Date().toISOString(),
        hasActiveIntervention: hasActive,
      });
    }
  }

  // Sort by risk priority: CRITICAL > HIGH > MEDIUM > LOW
  const riskPriority: Record<RiskLevel, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  flaggedList.sort((a, b) => riskPriority[b.riskLevel] - riskPriority[a.riskLevel]);

  return flaggedList;
};
