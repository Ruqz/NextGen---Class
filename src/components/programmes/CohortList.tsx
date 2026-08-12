import React, { useState, useEffect } from 'react';
import { Cohort, CohortStatus, Programme } from '../../types';
import {
  subscribeToCohorts,
  getProgrammes,
  createCohort,
  updateCohort,
  archiveCohort,
  seedInitialDataIfEmpty,
} from '../../services/programmes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import {
  Plus,
  Edit2,
  Archive,
  GraduationCap,
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';

export const CohortList: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    programmeId: '',
    name: 'Cohort 2',
    code: 'GAI-C2',
    startDate: '2026-09-01',
    endDate: '2026-11-25',
    applicationOpenDate: '2026-08-01',
    applicationCloseDate: '2026-08-28',
    capacity: 50,
    status: 'APPLICATION_OPEN' as CohortStatus,
  });

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const loadData = async () => {
      setLoading(true);
      try {
        await seedInitialDataIfEmpty();
        const progList = await getProgrammes();
        setProgrammes(progList);

        unsubscribe = subscribeToCohorts((cohortData) => {
          setCohorts(cohortData);
          setLoading(false);
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load cohorts');
        setLoading(false);
      }
    };

    loadData();

    return () => unsubscribe();
  }, []);

  const handleOpenCreateModal = () => {
    const defaultProgId = programmes.length > 0 ? programmes[0].id : '';
    const defaultProg = programmes.find((p) => p.id === defaultProgId);

    setEditingCohort(null);
    setFormData({
      programmeId: defaultProgId,
      name: 'Cohort 2',
      code: defaultProg ? `${defaultProg.code || 'GAI'}-C2` : 'GAI-C2',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicationOpenDate: new Date().toISOString().split('T')[0],
      applicationCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      capacity: 50,
      status: 'APPLICATION_OPEN',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setFormData({
      programmeId: cohort.programmeId,
      name: cohort.name,
      code: cohort.code,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      applicationOpenDate: cohort.applicationOpenDate,
      applicationCloseDate: cohort.applicationCloseDate,
      capacity: cohort.capacity,
      status: cohort.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parentProg = programmes.find((p) => p.id === formData.programmeId);
    const programmeName = parentProg ? parentProg.name : 'Generative AI & AI Automation';

    try {
      if (editingCohort) {
        await updateCohort(editingCohort.id, {
          ...formData,
          programmeName,
        });
      } else {
        await createCohort({
          ...formData,
          programmeName,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save cohort');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive cohort "${name}"?`)) {
      try {
        await archiveCohort(id);
      } catch (err: any) {
        setError(err.message || 'Failed to archive cohort');
      }
    }
  };

  const getStatusBadge = (status: CohortStatus) => {
    switch (status) {
      case 'APPLICATION_OPEN':
        return <Badge variant="success">APPLICATION OPEN</Badge>;
      case 'APPLICATION_CLOSED':
        return <Badge variant="warning">APPLICATION CLOSED</Badge>;
      case 'ACTIVE':
        return <Badge variant="primary">ACTIVE</Badge>;
      case 'COMPLETED':
        return <Badge variant="neutral">COMPLETED</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'ARCHIVED':
        return <Badge variant="danger">ARCHIVED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredCohorts = cohorts.filter((c) => {
    const matchesProgramme =
      selectedProgrammeFilter === 'ALL' || c.programmeId === selectedProgrammeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.programmeName && c.programmeName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProgramme && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cohorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <Select
              options={[
                { value: 'ALL', label: 'All Programmes' },
                ...programmes.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={selectedProgrammeFilter}
              onChange={(e) => setSelectedProgrammeFilter(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <Select
              options={[
                { value: 'ALL', label: 'All Cohort Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'APPLICATION_OPEN', label: 'Application Open' },
                { value: 'APPLICATION_CLOSED', label: 'Application Closed' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-1" />
          Create Cohort
        </Button>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cohorts Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" label="Loading cohorts from Firestore..." />
        </div>
      ) : filteredCohorts.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-10 h-10 text-slate-400" />}
          title="No cohorts found"
          description="Create your first cohort to open applications and admit learners."
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              Create Cohort
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCohorts.map((cohort) => (
            <Card
              key={cohort.id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-wider">
                      {cohort.code}
                    </span>
                    <CardTitle className="text-base text-slate-900 mt-0.5">
                      {cohort.name}
                    </CardTitle>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {cohort.programmeName || 'Generative AI & AI Automation'}
                    </p>
                  </div>
                  {getStatusBadge(cohort.status)}
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2 text-xs py-2.5 border-y border-slate-100 bg-slate-50/60 rounded-lg px-3">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Applications:
                    </span>
                    <span className="font-medium text-slate-800">
                      {cohort.applicationOpenDate} to {cohort.applicationCloseDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Cohort Duration:
                    </span>
                    <span className="font-medium text-slate-800">
                      {cohort.startDate} to {cohort.endDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Capacity Target:
                    </span>
                    <span className="font-semibold text-slate-900">{cohort.capacity} Learners</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {cohort.id.substring(0, 8)}...
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(cohort)}
                      title="Edit Cohort"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                    {cohort.status !== 'ARCHIVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(cohort.id, cohort.name)}
                        title="Archive Cohort"
                        className="text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create & Edit Cohort Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCohort ? 'Edit Cohort Details' : 'Create New Cohort'}
        description="Configure application windows, dates, capacity and lifecycle state."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Parent Programme"
            options={programmes.map((p) => ({ value: p.id, label: p.name }))}
            value={formData.programmeId}
            onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cohort Name"
              placeholder="e.g. Cohort 2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Cohort Code"
              placeholder="e.g. GAI-C2"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-slate-700">Application Window</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Application Open Date"
                type="date"
                value={formData.applicationOpenDate}
                onChange={(e) =>
                  setFormData({ ...formData, applicationOpenDate: e.target.value })
                }
                required
              />
              <Input
                label="Application Close Date"
                type="date"
                value={formData.applicationCloseDate}
                onChange={(e) =>
                  setFormData({ ...formData, applicationCloseDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-slate-700">Cohort Execution Period</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Cohort Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              <Input
                label="Cohort End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Learner Capacity Target"
              type="number"
              placeholder="50"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })
              }
              required
            />

            <Select
              label="Cohort Status"
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'APPLICATION_OPEN', label: 'Application Open' },
                { value: 'APPLICATION_CLOSED', label: 'Application Closed' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as CohortStatus })
              }
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              {editingCohort ? 'Update Cohort' : 'Create Cohort'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
