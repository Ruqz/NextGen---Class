import React, { useState, useEffect } from 'react';
import { Programme, ProgrammeStatus } from '../../types';
import {
  subscribeToProgrammes,
  createProgramme,
  updateProgramme,
  archiveProgramme,
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
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';

export const ProgrammeList: React.FC = () => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    slug: '',
    description: '',
    duration: '12 Weeks',
    deliveryFormat: 'Hybrid' as 'Online' | 'Hybrid' | 'In-Person',
    status: 'ACTIVE' as ProgrammeStatus,
  });

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToProgrammes((data) => {
      setProgrammes(data);
      setLoading(false);
    });

    // Seed initial data if database is empty
    seedInitialDataIfEmpty().catch(console.error);

    return () => unsubscribe();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProgramme(null);
    setFormData({
      name: '',
      code: '',
      slug: '',
      description: '',
      duration: '12 Weeks',
      deliveryFormat: 'Hybrid',
      status: 'DRAFT',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (prog: Programme) => {
    setEditingProgramme(prog);
    setFormData({
      name: prog.name,
      code: prog.code || '',
      slug: prog.slug || '',
      description: prog.description,
      duration: prog.duration,
      deliveryFormat: prog.deliveryFormat,
      status: prog.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const generatedSlug =
        formData.slug ||
        formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (editingProgramme) {
        await updateProgramme(editingProgramme.id, {
          ...formData,
          slug: generatedSlug,
        });
      } else {
        await createProgramme({
          ...formData,
          slug: generatedSlug,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save programme');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to archive programme "${name}"?`)) {
      try {
        await archiveProgramme(id);
      } catch (err: any) {
        setError(err.message || 'Failed to archive programme');
      }
    }
  };

  const getStatusBadge = (status: ProgrammeStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">ACTIVE</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral">INACTIVE</Badge>;
      case 'ARCHIVED':
        return <Badge variant="danger">ARCHIVED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredProgrammes = programmes.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search programmes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <Select
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setLoading(true);
              await seedInitialDataIfEmpty();
              setLoading(false);
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500 mr-1" />
            Ensure Initial Data
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-1" />
            Create Programme
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Programme Cards List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" label="Loading programmes from Firestore..." />
        </div>
      ) : filteredProgrammes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
          title="No programmes found"
          description={
            statusFilter !== 'ALL'
              ? `No programmes with status "${statusFilter}" match your criteria.`
              : 'Create your first programme to configure cohorts and learning specs.'
          }
          action={
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              Create Programme
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProgrammes.map((programme) => (
            <Card
              key={programme.id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-wider">
                      {programme.code || 'PROG'}
                    </span>
                    <CardTitle className="text-base text-slate-900 mt-0.5">
                      {programme.name}
                    </CardTitle>
                  </div>
                  {getStatusBadge(programme.status)}
                </div>
                <CardDescription className="text-xs line-clamp-3 mt-2 text-slate-600">
                  {programme.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 bg-slate-50/50 rounded-lg px-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <span className="font-semibold text-slate-800">{programme.duration}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Delivery Format</span>
                    <span className="font-semibold text-slate-800">
                      {programme.deliveryFormat}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    Slug: {programme.slug}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(programme)}
                      title="Edit Programme"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                    {programme.status !== 'ARCHIVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(programme.id, programme.name)}
                        title="Archive Programme"
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

      {/* Modal for Creating & Editing Programmes */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProgramme ? 'Edit Programme Specifications' : 'Create New Programme'}
        description="Configure master specifications and status for this skills initiative."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Programme Name"
            placeholder="e.g. Generative AI & AI Automation"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Programme Code"
              placeholder="e.g. GAI"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText="Short prefix for cohorts and certificate codes"
            />

            <Input
              label="URL Slug (Optional)"
              placeholder="generative-ai-cohort-2"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              helperText="Auto-generated if left blank"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description & Objectives
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              placeholder="Provide a overview of programme outcomes and target audience..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Duration"
              placeholder="e.g. 12 Weeks"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />

            <Select
              label="Delivery Format"
              options={[
                { value: 'Online', label: 'Online' },
                { value: 'Hybrid', label: 'Hybrid' },
                { value: 'In-Person', label: 'In-Person' },
              ]}
              value={formData.deliveryFormat}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliveryFormat: e.target.value as 'Online' | 'Hybrid' | 'In-Person',
                })
              }
              required
            />

            <Select
              label="Lifecycle Status"
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as ProgrammeStatus })
              }
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              {editingProgramme ? 'Update Programme' : 'Create Programme'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
