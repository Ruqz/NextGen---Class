import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { FormStudyResource, Programme, Cohort } from '../../types';
import { getProgrammes, getCohorts } from '../../services/programmes';
import {
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Download,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Search,
  Upload,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cleanFirestoreData } from '../../lib/utils';

export interface AssessmentResourceItem {
  id: string;
  title: string;
  description: string;
  type: 'PDF' | 'DOCUMENT' | 'SYLLABUS' | 'LINK' | 'SAMPLE_QUESTIONS';
  url: string;
  fileSize?: string;
  programmeId: string;
  programmeName?: string;
  cohortId?: string;
  cohortName?: string;
  isRequired: boolean;
  published: boolean;
  createdAt: string;
}

const RESOURCES_COLLECTION = 'assessmentStudyResources';

export const StaffAssessmentResourcesView: React.FC = () => {
  const [resources, setResources] = useState<AssessmentResourceItem[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AssessmentResourceItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssessmentResourceItem['type']>('PDF');
  const [url, setUrl] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    getProgrammes().then((progs) => {
      setProgrammes(progs);
      if (progs.length > 0) {
        setProgrammeId(progs[0].id);
      }
    });

    getCohorts().then(setCohorts);

    const unsub = onSnapshot(
      collection(db, RESOURCES_COLLECTION),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AssessmentResourceItem[];
        setResources(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading assessment study resources:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingResource(null);
    setTitle('');
    setDescription('');
    setType('PDF');
    setUrl('');
    setFileToUpload(null);
    setIsRequired(false);
    if (programmes.length > 0) setProgrammeId(programmes[0].id);
    setIsModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a resource title');
      return;
    }

    setSaving(true);
    setError(null);

    const prog = programmes.find((p) => p.id === programmeId);
    const coh = cohorts.find((c) => c.id === cohortId);

    try {
      const resourceData: Omit<AssessmentResourceItem, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim() || (fileToUpload ? `https://storage.nextgenclass.org/resources/${fileToUpload.name}` : 'https://docs.nextgenclass.org/sample-syllabus.pdf'),
        fileSize: fileToUpload ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
        programmeId,
        programmeName: prog?.name || 'All Programmes',
        cohortId: cohortId || undefined,
        cohortName: coh?.name || undefined,
        isRequired,
        published: true,
        createdAt: new Date().toISOString(),
      };

      if (editingResource) {
        const docRef = doc(db, RESOURCES_COLLECTION, editingResource.id);
        await updateDoc(docRef, cleanFirestoreData(resourceData));
        setSuccess('Assessment resource updated successfully');
      } else {
        await addDoc(collection(db, RESOURCES_COLLECTION), cleanFirestoreData(resourceData));
        setSuccess('Assessment study resource attached and published for applicants');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assessment resource?')) return;
    try {
      await deleteDoc(doc(db, RESOURCES_COLLECTION, id));
      setSuccess('Resource removed');
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const filteredResources = resources.filter((res) => {
    const matchSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProg =
      selectedProgrammeFilter === 'ALL' || res.programmeId === selectedProgrammeFilter;
    return matchSearch && matchProg;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-0 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 rounded-lg text-white">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Applicant Assessment Study Resources</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Attach and publish study guides, entrance exam syllabi, sample aptitude question PDFs, and technical reading materials that applicants see in their portal before taking assessments.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0 shadow-md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Assessment Resource
          </Button>
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
            placeholder="Search resources by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: 'ALL', label: 'All Target Programmes' },
              ...programmes.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={selectedProgrammeFilter}
            onChange={(e) => setSelectedProgrammeFilter(e.target.value)}
            className="text-xs min-w-[200px]"
          />
        </div>
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 bg-white rounded-2xl border border-slate-200">
          <Spinner size="md" />
          <p className="text-xs font-medium">Loading assessment study resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState
          title="No Assessment Resources Found"
          description="You haven't attached any application or assessment study resources yet. Click 'Add Assessment Resource' above to attach syllabus PDFs or prep guides."
          actionLabel="Add Assessment Resource"
          onAction={handleOpenCreateModal}
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filteredResources || []).map((res) => (
            <Card key={res.id} className="p-5 bg-white border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <Badge variant={res.isRequired ? 'warning' : 'info'} className="text-[9px]">
                      {res.isRequired ? 'Required Reading' : 'Recommended'}
                    </Badge>
                  </div>

                  <button
                    onClick={() => handleDeleteResource(res.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
                    title="Delete resource"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{res.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{res.description}</p>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold text-slate-700">{res.programmeName}</span>
                  </div>
                  {res.cohortName && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{res.cohortName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">{res.fileSize || 'PDF Doc'}</span>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Preview / Open</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingResource ? 'Edit Assessment Resource' : 'Attach Application / Assessment Resource'}
        >
          <form onSubmit={handleSaveResource} className="space-y-4">
            <Input
              label="Resource Title *"
              placeholder="e.g. Python & Problem Solving Entrance Exam Study Guide"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              label="Description & Instructions for Applicant"
              placeholder="Explain why the applicant should review this material before starting their assessment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Resource Type"
                options={[
                  { value: 'PDF', label: 'PDF Document / Syllabus' },
                  { value: 'SAMPLE_QUESTIONS', label: 'Sample Question Set' },
                  { value: 'SYLLABUS', label: 'Detailed Course Syllabus' },
                  { value: 'LINK', label: 'External Web Link / Video' },
                ]}
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              />

              <Select
                label="Target Programme *"
                options={programmes.map((p) => ({ value: p.id, label: p.name }))}
                value={programmeId}
                onChange={(e) => setProgrammeId(e.target.value)}
                required
              />
            </div>

            <Input
              label="Direct URL / File Link (Optional if uploading file)"
              placeholder="https://docs.nextgenclass.org/syllabus.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Or Upload Document / File (PDF, DOCX, XLSX)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileToUpload(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="isRequired" className="text-xs font-medium text-slate-700 cursor-pointer">
                Mark as Mandatory Preparation Material
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                {saving ? 'Publishing...' : 'Publish Resource'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
