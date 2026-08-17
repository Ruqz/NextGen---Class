import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { UserProfile, StaffProfile, StaffRole, Programme, Cohort } from '../../types';
import { getProgrammes, getCohorts } from '../../services/programmes';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cleanFirestoreData } from '../../lib/utils';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Mail,
  Edit2,
  GraduationCap,
} from 'lucide-react';

export const StaffManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Edit Staff Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('FACILITATOR');
  const [assignedCohorts, setAssignedCohorts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProgrammes().then(setProgrammes);
    getCohorts().then(setCohorts);

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        })) as unknown as UserProfile[];
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching users:', err);
        setLoading(false);
      }
    );

    const unsubStaff = onSnapshot(
      collection(db, 'staffProfiles'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          ...d.data(),
        })) as unknown as StaffProfile[];
        setStaffProfiles(list);
      },
      (err) => console.warn('Error fetching staff profiles:', err)
    );

    return () => {
      unsubUsers();
      unsubStaff();
    };
  }, []);

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    const existingStaff = staffProfiles.find((sp) => sp.userId === user.uid);
    const role: StaffRole =
      existingStaff?.staffRole ||
      (user.role?.toLowerCase().includes('facilitator') ? 'FACILITATOR' : 'PROGRAMME_MANAGER');
    setNewStaffRole(role);
    setAssignedCohorts(existingStaff?.assignedCohorts || []);
    setIsEditModalOpen(true);
  };

  const handleSaveStaffRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    setError(null);

    const userId = selectedUser.uid;

    try {
      // 1. Update user document
      const userRoleName = newStaffRole === 'FACILITATOR' ? 'Facilitator' : 'Programme Manager';
      await updateDoc(
        doc(db, 'users', userId),
        cleanFirestoreData({
          role: userRoleName,
          accountType: 'STAFF',
          updatedAt: new Date().toISOString(),
        })
      );

      // 2. Update staff profile document
      const staffDocRef = doc(db, 'staffProfiles', userId);
      await setDoc(
        staffDocRef,
        cleanFirestoreData({
          userId,
          staffRole: newStaffRole,
          assignedCohorts,
          permissions:
            newStaffRole === 'PROGRAMME_MANAGER'
              ? ['all']
              : ['manage_assigned_classes', 'manage_assigned_learners', 'manage_attendance', 'manage_assignments'],
          active: true,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );

      setSuccess(`Role updated for ${selectedUser.displayName || selectedUser.email}`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update staff permissions');
    } finally {
      setSaving(false);
    }
  };

  const staffUsers = users.filter((u) => {
    const isStaff =
      u.accountType === 'STAFF' ||
      ['Facilitator', 'Programme Manager', 'M&E Manager', 'Super Admin', 'STAFF'].includes(u.role || '');
    return isStaff;
  });

  const filteredStaff = staffUsers.filter((u) => {
    const name = (u.displayName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    const matchRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'FACILITATOR' && u.role?.toLowerCase().includes('facilitator')) ||
      (roleFilter === 'PROGRAMME_MANAGER' && !u.role?.toLowerCase().includes('facilitator'));
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white border-0 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Staff Management & Role Assignments</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Manage instructional staff and programme operators. Assign team members as Programme Managers (full system & M&E operations) or Facilitators (cohort delivery & grading).
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: 'ALL', label: 'All Staff Roles' },
              { value: 'PROGRAMME_MANAGER', label: 'Programme Managers' },
              { value: 'FACILITATOR', label: 'Facilitators' },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs min-w-[180px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 bg-white rounded-2xl border border-slate-200">
          <Spinner size="md" />
          <p className="text-xs font-medium">Loading staff directory...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          title="No Staff Members Found"
          description="No staff profiles match your search criteria. You can invite team members or update learner accounts to staff roles."
          icon={<Users className="w-10 h-10 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const isFacil = staff.role?.toLowerCase().includes('facilitator');
            const staffProf = staffProfiles.find((sp) => sp.userId === staff.uid);

            return (
              <Card key={staff.uid} className="p-5 bg-white border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {(staff.displayName || staff.email || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{staff.displayName || 'Staff User'}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {staff.email}
                        </p>
                      </div>
                    </div>

                    <Badge variant={isFacil ? 'default' : 'info'} className="text-[9px]">
                      {isFacil ? 'FACILITATOR' : 'PROGRAMME MANAGER'}
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Permissions Scope:</span>
                      <span className="font-semibold text-slate-900">
                        {isFacil ? 'Assigned Cohorts & Classes' : 'Full Operations & M&E'}
                      </span>
                    </div>

                    {staffProf?.assignedCohorts && staffProf.assignedCohorts.length > 0 && (
                      <div className="pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                          Assigned Cohorts ({staffProf.assignedCohorts.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {staffProf.assignedCohorts.map((cId) => {
                            const c = cohorts.find((coh) => coh.id === cId);
                            return (
                              <span key={cId} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-700">
                                {c?.name || cId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(staff)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit Permissions
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && selectedUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Configure Staff: ${selectedUser.displayName || selectedUser.email}`}
        >
          <form onSubmit={handleSaveStaffRole} className="space-y-4">
            <Select
              label="Staff Role & Responsibilities *"
              options={[
                {
                  value: 'PROGRAMME_MANAGER',
                  label: 'Programme Manager (Full Operational, Admissions, M&E & Admin)',
                },
                {
                  value: 'FACILITATOR',
                  label: 'Facilitator (Teaching, Attendance, Grading & Classroom Delivery)',
                },
              ]}
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
            />

            {newStaffRole === 'FACILITATOR' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Assign Cohorts to Facilitator
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {cohorts.map((c) => {
                    const isChecked = assignedCohorts.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedCohorts([...assignedCohorts, c.id]);
                            } else {
                              setAssignedCohorts(assignedCohorts.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-slate-400">({c.programmeName})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {saving ? 'Saving...' : 'Save Role & Permissions'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
