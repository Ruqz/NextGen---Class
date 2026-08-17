import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToFinalProjectConfigs,
  subscribeToAllProjectSubmissions,
  saveFinalProjectConfig,
  gradeAndApproveFinalProject,
} from '../services/finalProject';
import { getProgrammes, getCohorts } from '../services/programmes';
import {
  FinalProjectConfig,
  FinalProjectSubmission,
  Programme,
  Cohort,
  FinalProjectStatus,
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Award,
  Edit3,
  Send,
  Plus,
  BookOpen,
  Github,
  Link,
  Users,
} from 'lucide-react';

export const PMFinalProjectDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const reviewerName = userProfile?.displayName || 'Programme Manager';

  // Firestore Data State
  const [configs, setConfigs] = useState<FinalProjectConfig[]>([]);
  const [submissions, setSubmissions] = useState<FinalProjectSubmission[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>('ALL');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Define/Edit Project Config Modal State
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [editConfigProgrammeId, setEditConfigProgrammeId] = useState<string>('ALL');
  const [configTitle, setConfigTitle] = useState<string>('');
  const [configDescription, setConfigDescription] = useState<string>('');
  const [configRequirements, setConfigRequirements] = useState<string>('');
  const [configDueDate, setConfigDueDate] = useState<string>('');
  const [configMaxGrade, setConfigMaxGrade] = useState<number>(100);
  const [configPassingGrade, setConfigPassingGrade] = useState<number>(70);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Review & Grade Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<FinalProjectSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [approveInput, setApproveInput] = useState<boolean>(true);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    getProgrammes().then((pList) => setProgrammes(pList));
    getCohorts().then((cList) => setCohorts(cList));

    const unsubConfigs = subscribeToFinalProjectConfigs((cList) => {
      setConfigs(cList);
    });

    const unsubSubmissions = subscribeToAllProjectSubmissions(
      selectedProgrammeId,
      selectedCohortId,
      (sList) => {
        setSubmissions(sList);
        setLoading(false);
      }
    );

    return () => {
      unsubConfigs();
      unsubSubmissions();
    };
  }, [selectedProgrammeId, selectedCohortId]);

  // Handle Opening Define Project Config Modal
  const handleOpenConfigModal = (programmeIdToEdit?: string) => {
    const targetProgId = programmeIdToEdit || selectedProgrammeId || 'ALL';
    const existingConfig = configs.find((c) => c.programmeId === targetProgId) || configs[0];

    const targetProgObj = programmes.find((p) => p.id === targetProgId);

    setEditConfigProgrammeId(targetProgId);
    setConfigTitle(existingConfig?.title || (targetProgObj ? `${targetProgObj.name} Capstone` : 'Full-Stack Capstone Project'));
    setConfigDescription(existingConfig?.description || 'Comprehensive final project demonstrating full mastery.');
    setConfigRequirements(
      existingConfig?.requirements ||
        `### Capstone Requirements:
1. Architectural documentation and technical specs.
2. Production code deployment with clean database persistence.
3. Live hosted URL and open-source GitHub repository.`
    );
    setConfigDueDate(existingConfig?.dueDate || '2026-09-30');
    setConfigMaxGrade(existingConfig?.maxGrade || 100);
    setConfigPassingGrade(existingConfig?.passingGrade || 70);

    setShowConfigModal(true);
  };

  // Handle Save Project Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setActionError(null);

    try {
      const progObj = programmes.find((p) => p.id === editConfigProgrammeId);

      await saveFinalProjectConfig({
        id: editConfigProgrammeId,
        programmeId: editConfigProgrammeId,
        programmeName: progObj ? progObj.name : 'All Programmes',
        title: configTitle,
        description: configDescription,
        requirements: configRequirements,
        dueDate: configDueDate,
        maxGrade: configMaxGrade,
        passingGrade: configPassingGrade,
        updatedBy: reviewerName,
      });

      setActionSuccess('Programme final project requirements updated successfully.');
      setShowConfigModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save project requirements.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Open Grade Review Modal
  const handleOpenReview = (sub: FinalProjectSubmission) => {
    setSelectedSubmission(sub);
    setGradeInput(sub.grade ?? 85);
    setFeedbackInput(sub.facilitatorFeedback || 'Excellent work on the capstone requirements.');
    setApproveInput(sub.status === 'APPROVED' || (sub.grade ?? 0) >= 70);
  };

  // Handle Save Review & Grade
  const handleSaveReview = async () => {
    if (!selectedSubmission) return;
    setIsGrading(true);
    setActionError(null);

    try {
      await gradeAndApproveFinalProject({
        submissionId: selectedSubmission.id,
        learnerId: selectedSubmission.learnerId,
        programmeId: selectedSubmission.programmeId,
        grade: Number(gradeInput),
        facilitatorFeedback: feedbackInput,
        approved: approveInput,
        reviewedBy: reviewerName,
      });

      setActionSuccess(`Graded and synced final project score (${gradeInput}%) for ${selectedSubmission.learnerName}.`);
      setSelectedSubmission(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to grade submission.');
    } finally {
      setIsGrading(false);
    }
  };

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (selectedProgrammeId !== 'ALL' && s.programmeId !== selectedProgrammeId) return false;
    if (selectedCohortId !== 'ALL' && s.cohortId !== selectedCohortId) return false;
    if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.learnerName.toLowerCase().includes(q);
      const matchEmail = s.learnerEmail.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDesc) return false;
    }

    return true;
  });

  // Calculate Summary Metrics
  const totalSubmissions = filteredSubmissions.length;
  const pendingReviews = filteredSubmissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW').length;
  const approvedCount = filteredSubmissions.filter((s) => s.status === 'APPROVED').length;
  const gradedList = filteredSubmissions.filter((s) => s.grade !== undefined);
  const avgGrade = gradedList.length > 0 ? (gradedList.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedList.length).toFixed(1) : 'N/A';

  const getStatusBadge = (status?: FinalProjectStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" size="sm">✓ APPROVED</Badge>;
      case 'SUBMITTED':
        return <Badge variant="warning" size="sm">PENDING REVIEW</Badge>;
      case 'IN_REVIEW':
        return <Badge variant="purple" size="sm">IN REVIEW</Badge>;
      case 'NEEDS_REVISION':
        return <Badge variant="danger" size="sm">NEEDS REVISION</Badge>;
      default:
        return <Badge variant="secondary" size="sm">NOT SUBMITTED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Programme Management & Evaluation
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Final Capstone Project Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Define programme final project requirements, review learner submissions, grade, and approve capstones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenConfigModal()}
              className="font-semibold text-xs border-slate-300"
            >
              <Edit3 className="w-4 h-4 mr-1.5" /> Define Programme Requirements
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Submissions</span>
            <span className="text-xl font-extrabold text-slate-900">{totalSubmissions}</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <span className="text-xl font-extrabold text-amber-900">{pendingReviews}</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Approved Projects</span>
            <span className="text-xl font-extrabold text-emerald-900">{approvedCount}</span>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Average Grade</span>
            <span className="text-xl font-extrabold text-indigo-900">{avgGrade}%</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Filters & Search Bar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filter Programme</label>
            <select
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800"
            >
              <option value="ALL">All Programmes</option>
              {(programmes || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filter Cohort</label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800"
            >
              <option value="ALL">All Cohorts</option>
              {(cohorts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filter Status</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted (Pending Review)</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED">Approved / Passed</option>
              <option value="NEEDS_REVISION">Needs Revision</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Search Submissions</label>
            <Input
              placeholder="Learner name, email, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />
          </div>
        </div>
      </Card>

      {/* Submissions Table Card */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-600" />
            <h2 className="font-bold text-slate-900 text-sm">Learner Capstone Submissions</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Showing {filteredSubmissions.length} record(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Spinner size="md" label="Loading final project submissions..." />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No submissions found</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Learners enrolled in selected programmes can submit their final capstone description, files, and links from their Learner Portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Programme / Cohort</th>
                  <th className="py-3 px-4">Deliverables & Links</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{sub.learnerName}</div>
                      <div className="text-[10px] text-slate-400">{sub.learnerEmail}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{sub.programmeName}</div>
                      <div className="text-[10px] text-slate-400">{sub.cohortName || 'All Cohorts'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {sub.repositoryUrl && (
                          <a
                            href={sub.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md"
                          >
                            <Github className="w-3 h-3" /> Repo
                          </a>
                        )}

                        {sub.liveDemoUrl && (
                          <a
                            href={sub.liveDemoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md"
                          >
                            <Link className="w-3 h-3" /> Live Demo
                          </a>
                        )}

                        {sub.attachments && sub.attachments.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            📎 {sub.attachments.length} file(s)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(sub.status)}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {sub.grade !== undefined ? (
                        <span className="text-orange-600 font-extrabold">{sub.grade}%</span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenReview(sub)}
                        className="font-bold border-slate-300"
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-orange-600" /> Review & Grade
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Define / Edit Requirements Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Define Programme Final Project Requirements"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Target Programme *</label>
              <select
                value={editConfigProgrammeId}
                onChange={(e) => setEditConfigProgrammeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-slate-50"
              >
                <option value="ALL">All Programmes (Global Default)</option>
                {(programmes || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Project Title *"
              placeholder="e.g., Enterprise Full-Stack AI Capstone"
              value={configTitle}
              onChange={(e) => setConfigTitle(e.target.value)}
              required
            />

            <Textarea
              label="Overview & Description *"
              rows={3}
              placeholder="High-level description of what learners must build..."
              value={configDescription}
              onChange={(e) => setConfigDescription(e.target.value)}
              required
            />

            <Textarea
              label="Detailed Requirements & Specifications (Markdown supported) *"
              rows={5}
              placeholder="1. Architecture & Design specs&#10;2. Production API endpoints & DB integration&#10;3. Live deployment link"
              value={configRequirements}
              onChange={(e) => setConfigRequirements(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="date"
                label="Due Date"
                value={configDueDate}
                onChange={(e) => setConfigDueDate(e.target.value)}
              />

              <Input
                type="number"
                label="Max Score Points"
                value={configMaxGrade}
                onChange={(e) => setConfigMaxGrade(Number(e.target.value))}
              />

              <Input
                type="number"
                label="Passing Score Benchmark"
                value={configPassingGrade}
                onChange={(e) => setConfigPassingGrade(Number(e.target.value))}
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingConfig}
                className="font-bold"
              >
                {isSavingConfig ? <Spinner size="sm" /> : 'Save Programme Requirements'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Review & Grade Submission Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          title={`Review Capstone: ${selectedSubmission.learnerName}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Learner & Project Info Header */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{selectedSubmission.learnerName}</h3>
                  <p className="text-[11px] text-slate-500">{selectedSubmission.learnerEmail} | {selectedSubmission.programmeName}</p>
                </div>
                {getStatusBadge(selectedSubmission.status)}
              </div>
            </div>

            {/* Submitted Description */}
            <div className="space-y-1">
              <label className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider">Learner Project Description:</label>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono text-[11px]">
                {selectedSubmission.description}
              </div>
            </div>

            {/* Links & Deliverables */}
            <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl space-y-2">
              <label className="font-bold text-orange-950 block text-[11px] uppercase">Submitted Links & Attachments:</label>

              <div className="flex flex-wrap items-center gap-3">
                {selectedSubmission.repositoryUrl ? (
                  <a
                    href={selectedSubmission.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 text-xs"
                  >
                    <Github className="w-4 h-4" /> Code Repository <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No repository URL provided</span>
                )}

                {selectedSubmission.liveDemoUrl ? (
                  <a
                    href={selectedSubmission.liveDemoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 text-xs"
                  >
                    <Link className="w-4 h-4" /> Live Application Demo <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No live demo URL provided</span>
                )}
              </div>

              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                <div className="pt-2 border-t border-orange-200/60 space-y-1">
                  <span className="text-[10px] font-bold text-orange-900 block">Attached File Deliverables:</span>
                  <div className="space-y-1">
                    {selectedSubmission.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-200 text-xs">
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 font-bold hover:underline text-[11px] flex items-center gap-1"
                        >
                          View File <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grading Form */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold uppercase text-xs text-orange-400 tracking-wider">Facilitator Evaluation & Grading</span>
                <span className="text-[10px] text-slate-400">Syncs score to Progress Engine</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <Input
                  type="number"
                  label="Grade Score (0 - 100%)"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="bg-slate-800 border-slate-700 text-white font-bold"
                />

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">Approval Decision</label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <input
                      type="checkbox"
                      checked={approveInput}
                      onChange={(e) => setApproveInput(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-600 focus:ring-orange-500"
                    />
                    <span className="font-bold text-emerald-400 text-xs">
                      Approve & Mark Capstone Passed
                    </span>
                  </label>
                </div>
              </div>

              <Textarea
                label="Facilitator Review Comments & Feedback *"
                rows={3}
                placeholder="Enter feedback for the learner regarding their architecture, code, deployment, and capstone presentation..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSubmission(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveReview}
                disabled={isGrading}
                className="font-bold px-5"
              >
                {isGrading ? <Spinner size="sm" /> : 'Save Grade & Submit Review'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
