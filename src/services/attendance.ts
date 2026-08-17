import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/utils';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceThresholdConfig,
  LearnerAttendanceSummary,
  ClassAttendanceSummary,
} from '../types';

const ATTENDANCE_COLLECTION = 'attendance';
const THRESHOLD_CONFIG_DOC = 'settings/attendance_thresholds';

export const DEFAULT_ATTENDANCE_THRESHOLDS: AttendanceThresholdConfig = {
  warningThresholdPercentage: 80,
  criticalThresholdPercentage: 75,
  lateWeightPercentage: 50,
  updatedAt: new Date().toISOString(),
};

/**
 * Subscribe to all attendance records, or filtered by classSessionId
 */
export const subscribeToAttendanceRecords = (
  classSessionId: string | undefined,
  callback: (records: AttendanceRecord[]) => void
) => {
  const collectionRef = collection(db, ATTENDANCE_COLLECTION);
  let q = query(collectionRef);

  if (classSessionId) {
    q = query(collectionRef, where('classSessionId', '==', classSessionId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AttendanceRecord[];
      callback(records);
    },
    (err) => {
      console.warn('subscribeToAttendanceRecords warning:', err.message);
      callback([]);
    }
  );
};

/**
 * Subscribe to attendance threshold configuration
 */
export const subscribeToAttendanceThresholdConfig = (
  callback: (config: AttendanceThresholdConfig) => void
) => {
  const docRef = doc(db, 'settings', 'attendance_thresholds');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as AttendanceThresholdConfig);
      } else {
        callback(DEFAULT_ATTENDANCE_THRESHOLDS);
      }
    },
    (err) => {
      console.warn('subscribeToAttendanceThresholdConfig warning:', err.message);
      callback(DEFAULT_ATTENDANCE_THRESHOLDS);
    }
  );
};

/**
 * Get current attendance threshold configuration synchronously/once
 */
export const getAttendanceThresholdConfig = async (): Promise<AttendanceThresholdConfig> => {
  try {
    const docRef = doc(db, 'settings', 'attendance_thresholds');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as AttendanceThresholdConfig;
    }
  } catch (err) {
    console.warn('Error reading attendance thresholds:', err);
  }
  return DEFAULT_ATTENDANCE_THRESHOLDS;
};

/**
 * Save/update attendance threshold configuration
 */
export const saveAttendanceThresholdConfig = async (
  config: Omit<AttendanceThresholdConfig, 'updatedAt'>
): Promise<void> => {
  const docRef = doc(db, 'settings', 'attendance_thresholds');
  const payload = cleanFirestoreData({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, payload, { merge: true });
};

/**
 * Bulk save/upsert attendance roster for a class session
 */
export const saveBulkAttendanceRecords = async (
  records: Array<Omit<AttendanceRecord, 'id'>>
): Promise<void> => {
  const now = new Date().toISOString();

  const promises = records.map(async (rec) => {
    // Generate deterministic ID or query by classSessionId + learnerId to update existing
    const uniqueKey = `${rec.classSessionId}_${rec.learnerId || rec.userId}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const docRef = doc(db, ATTENDANCE_COLLECTION, uniqueKey);

    const snap = await getDoc(docRef);
    const payload: AttendanceRecord = cleanFirestoreData({
      id: uniqueKey,
      ...rec,
      updatedAt: now,
      markedAt: rec.markedAt || now,
    });

    await setDoc(docRef, payload as any, { merge: true });
  });

  await Promise.all(promises);
};

/**
 * Individual attendance record correction
 */
export const updateAttendanceRecord = async (
  recordId: string,
  newStatus: AttendanceStatus,
  correctionReason: string,
  correctedBy: string
): Promise<void> => {
  const docRef = doc(db, ATTENDANCE_COLLECTION, recordId);
  const now = new Date().toISOString();

  const updates = cleanFirestoreData({
    status: newStatus,
    correctionReason,
    correctedBy,
    correctedAt: now,
    updatedAt: now,
  });

  await updateDoc(docRef, updates);
};

/**
 * Utility: calculate weighted attendance percentage
 */
export const calculateAttendancePercentage = (
  presentCount: number,
  lateCount: number,
  totalClassesCount: number,
  lateWeightPercentage: number = 50
): number => {
  if (totalClassesCount <= 0) return 100;
  const lateCredit = (lateCount * (lateWeightPercentage / 100));
  const effectivePresent = presentCount + lateCredit;
  const pct = (effectivePresent / totalClassesCount) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
};

/**
 * Helper to compute learner summaries across all attendance records
 */
export const computeLearnerAttendanceSummaries = (
  records: AttendanceRecord[],
  totalClassSessionsCount: number,
  config: AttendanceThresholdConfig = DEFAULT_ATTENDANCE_THRESHOLDS
): LearnerAttendanceSummary[] => {
  const learnerMap: Record<string, LearnerAttendanceSummary> = {};

  records.forEach((rec) => {
    const key = rec.learnerId || rec.userId || rec.learnerEmail;
    if (!key) return;

    if (!learnerMap[key]) {
      learnerMap[key] = {
        learnerId: rec.learnerId || key,
        userId: rec.userId || '',
        learnerName: rec.learnerName || 'Learner',
        learnerEmail: rec.learnerEmail || '',
        totalClasses: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        attendancePercentage: 100,
        riskLevel: 'NORMAL',
      };
    }

    const item = learnerMap[key];
    item.totalClasses += 1;

    if (rec.status === 'PRESENT') item.presentCount += 1;
    else if (rec.status === 'LATE') item.lateCount += 1;
    else if (rec.status === 'ABSENT') item.absentCount += 1;
    else if (rec.status === 'EXCUSED') item.excusedCount += 1;
  });

  // Calculate percentage and risk for each learner
  return Object.values(learnerMap).map((l) => {
    // Total classes evaluated is either total recorded for learner or total sessions held
    const evaluatedTotal = Math.max(l.totalClasses, totalClassSessionsCount || 1);
    const pct = calculateAttendancePercentage(
      l.presentCount,
      l.lateCount,
      evaluatedTotal,
      config.lateWeightPercentage
    );

    let riskLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
    if (pct < config.criticalThresholdPercentage) {
      riskLevel = 'CRITICAL';
    } else if (pct < config.warningThresholdPercentage) {
      riskLevel = 'WARNING';
    }

    return {
      ...l,
      attendancePercentage: pct,
      riskLevel,
    };
  });
};

/**
 * Helper to compute class attendance summaries
 */
export const computeClassAttendanceSummaries = (
  records: AttendanceRecord[]
): ClassAttendanceSummary[] => {
  const classMap: Record<string, ClassAttendanceSummary> = {};

  records.forEach((rec) => {
    const key = rec.classSessionId;
    if (!key) return;

    if (!classMap[key]) {
      classMap[key] = {
        classSessionId: rec.classSessionId,
        classTitle: rec.classSessionTitle || 'Class Session',
        classDate: rec.classSessionDate || '',
        programmeId: rec.programmeId || '',
        programmeName: rec.programmeName || '',
        cohortId: rec.cohortId || '',
        cohortName: rec.cohortName || '',
        totalEnrolled: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        attendancePercentage: 0,
      };
    }

    const cItem = classMap[key];
    cItem.totalEnrolled += 1;

    if (rec.status === 'PRESENT') cItem.presentCount += 1;
    else if (rec.status === 'LATE') cItem.lateCount += 1;
    else if (rec.status === 'ABSENT') cItem.absentCount += 1;
    else if (rec.status === 'EXCUSED') cItem.excusedCount += 1;
  });

  return Object.values(classMap).map((c) => {
    const pct = calculateAttendancePercentage(c.presentCount, c.lateCount, c.totalEnrolled, 50);
    return {
      ...c,
      attendancePercentage: pct,
    };
  });
};
