import React, { useState, useEffect } from 'react';
import {
  Application,
  ApplicationStatus,
  QualificationStatus,
  AssessmentStatus,
  AdmissionStatus,
  Cohort,
  Programme,
} from '../types';
import {
  subscribeToAllApplications,
  updateApplicationStatuses,
  exportApplicationsToCSV,
} from '../services/applications';
import { getCohorts, getProgrammes } from '../services/programmes';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Users,
  Search,
  Download,
  Eye,
  FileText,
  FileCheck,
  ShieldCheck,
  Paperclip,
  ExternalLink,
  Layers,
} from 'lucide-react';

export const PMApplicationDashboard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [qualFilter, setQualFilter] = useState<string>('ALL');
  const [assessmentFilter, setAssessmentFilter] = useState<string>('ALL');
  const [admissionFilter, setAdmissionFilter] = useState<string>('ALL');
  const [programmeFilter, setProgrammeFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [targetStatusInput, setTargetStatusInput] = useState<ApplicationStatus>('UNDER_REVIEW');
  const [targetQualInput, setTargetQualInput] = useState<QualificationStatus>('PENDING');
  const [targetAssessmentInput, setTargetAssessmentInput] = useState<AssessmentStatus>('NOT_STARTED');
  const [targetAdmissionInput, setTargetAdmissionInput] = useState<AdmissionStatus>('APPLIED');

  useEffect(() => {
    setLoading(true);

    const unsubApps = subscribeToAllApplications((appsData) => {
      setApplications(appsData);
      setLoading(false);
    });

    getCohorts()
      .then((cData) => setCohorts(cData))
      .catch((err) => console.error('Error fetching cohorts:', err));

    getProgrammes()
      .then((pData) => setProgrammes(pData))
      .catch((err) => console.error('Error fetching programmes:', err));

    return () => unsubApps();
  }, []);

  // Filter logic
  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (app.applicantName || '').toLowerCase().includes(q) ||
      (app.applicantEmail || '').toLowerCase().includes(q) ||
      (app.applicantPhone || '').toLowerCase().includes(q) ||
      app.id.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesQual = qualFilter === 'ALL' || app.qualificationStatus === qualFilter;
    const matchesAssessment = assessmentFilter === 'ALL' || app.assessmentStatus === assessmentFilter;
    const matchesAdmission = admissionFilter === 'ALL' || app.admissionStatus === admissionFilter;
    const matchesProgramme = programmeFilter === 'ALL' || app.programmeId === programmeFilter;
    const matchesCohort = cohortFilter === 'ALL' || app.cohortId === cohortFilter;
    const matchesDate = !dateFilter || app.submittedAt.startsWith(dateFilter);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesQual &&
      matchesAssessment &&
      matchesAdmission &&
      matchesProgramme &&
      matchesCohort &&
      matchesDate
    );
  });

  const handleOpenReview = (app: Application) => {
    setSelectedApp(app);
    setReviewNotesInput(app.reviewNotes || '');
    setTargetStatusInput(app.status);
    setTargetQualInput(app.qualificationStatus || 'PENDING');
    setTargetAssessmentInput(app.assessmentStatus || 'NOT_STARTED');
    setTargetAdmissionInput(app.admissionStatus || 'APPLIED');
  };

  const handleUpdateStatuses = async () => {
    if (!selectedApp) return;

    setUpdatingStatus(true);
    setError(null);
    try {
      await updateApplicationStatuses(selectedApp.id, {
        status: targetStatusInput,
        qualificationStatus: targetQualInput,
        assessmentStatus: targetAssessmentInput,
        admissionStatus: targetAdmissionInput,
        reviewNotes: reviewNotesInput,
      });
      setSelectedApp(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update application decision status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Stats
  const totalApps = applications.length;
  const submittedCount = applications.filter((a) => a.status === 'SUBMITTED').length;
  const underReviewCount = applications.filter((a) => a.status === 'UNDER_REVIEW').length;
  const qualifiedCount = applications.filter((a) => a.qualificationStatus === 'QUALIFIED').length;
  const passedAssessmentCount = applications.filter((a) => a.assessmentStatus === 'PASSED').length;
  const enrolledCount = applications.filter((a) => a.admissionStatus === 'ENROLLED').length;

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="primary">SUBMITTED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'SHORTLISTED':
        return <Badge variant="info">SHORTLISTED</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success" className="bg-emerald-600 text-white font-bold">ACCEPTED</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">NOT SELECTED</Badge>;
      case 'WITHDRAWN':
        return <Badge variant="neutral">WITHDRAWN</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner size="lg" label="Loading application management dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Programme Management Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Application Management & Selection Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate dynamic responses, uploaded documents, update qualification & assessment stages, and export data.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportApplicationsToCSV(filteredApps)}
          disabled={filteredApps.length === 0}
          className="text-slate-700 border-slate-300 hover:bg-slate-50 font-bold"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export CSV ({filteredApps.length})
        </Button>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Apps</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalApps}</p>
        </Card>

        <Card className="p-4 bg-blue-50/50 border-blue-200/60">
          <p className="text-[11px] font-semibold text-blue-700 uppercase">Submitted</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{submittedCount}</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 border-amber-200/60">
          <p className="text-[11px] font-semibold text-amber-700 uppercase">Under Review</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{underReviewCount}</p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200/60">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase">Qualified</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{qualifiedCount}</p>
        </Card>

        <Card className="p-4 bg-purple-50/50 border-purple-200/60">
          <p className="text-[11px] font-semibold text-purple-700 uppercase">Passed Exam</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{passedAssessmentCount}</p>
        </Card>

        <Card className="p-4 bg-emerald-100/60 border-emerald-300">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase">Enrolled</p>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{enrolledCount}</p>
        </Card>
      </div>

      {/* Filter Controls Bar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search name, email, phone, or Ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Overall Statuses' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'UNDER_REVIEW', label: 'Under Review' },
              { value: 'SHORTLISTED', label: 'Shortlisted' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'WITHDRAWN', label: 'Withdrawn' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Qualification States' },
              { value: 'PENDING', label: 'Pending Qualification' },
              { value: 'QUALIFIED', label: 'Qualified' },
              { value: 'DISQUALIFIED', label: 'Disqualified' },
            ]}
            value={qualFilter}
            onChange={(e) => setQualFilter(e.target.value)}
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Assessment States' },
              { value: 'NOT_STARTED', label: 'Exam Not Started' },
              { value: 'IN_PROGRESS', label: 'Exam In Progress' },
              { value: 'PASSED', label: 'Passed Assessment' },
              { value: 'FAILED', label: 'Failed Assessment' },
            ]}
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <Select
            options={[
              { value: 'ALL', label: 'All Admission States' },
              { value: 'APPLIED', label: 'Applied' },
              { value: 'SHORTLISTED', label: 'Shortlisted' },
              { value: 'OFFERED', label: 'Offered Admission' },
              { value: 'ENROLLED', label: 'Enrolled Learner' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
            value={admissionFilter}
            onChange={(e) => setAdmissionFilter(e.target.value)}
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Programmes' },
              ...(programmes || []).map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Cohorts' },
              ...(cohorts || []).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
            ]}
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
          />

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Applications Table */}
      {filteredApps.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-slate-400" />}
          title="No Matching Applications Found"
          description="Try adjusting your search query, stage filters, or date range."
        />
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Ref ID / Applicant</th>
                  <th className="p-3.5">Programme & Cohort</th>
                  <th className="p-3.5">Form Version</th>
                  <th className="p-3.5">Qualification & Exam</th>
                  <th className="p-3.5">Overall Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-orange-600 text-[11px]">
                        #{app.id.substring(0, 8)}
                      </div>
                      <div className="font-semibold text-slate-900 text-xs mt-0.5">
                        {app.applicantName}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {app.applicantEmail} {app.applicantPhone && `• ${app.applicantPhone}`}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">{app.programmeName}</div>
                      <div className="text-slate-500 text-[11px]">{app.cohortName}</div>
                    </td>

                    <td className="p-3.5">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        Form v{app.formVersion || 1}
                      </Badge>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Qual:</span>
                        <Badge
                          variant={
                            app.qualificationStatus === 'QUALIFIED'
                              ? 'success'
                              : app.qualificationStatus === 'DISQUALIFIED'
                              ? 'danger'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {app.qualificationStatus || 'PENDING'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Exam:</span>
                        <Badge
                          variant={
                            app.assessmentStatus === 'PASSED'
                              ? 'success'
                              : app.assessmentStatus === 'FAILED'
                              ? 'danger'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {app.assessmentStatus || 'NOT_STARTED'}
                        </Badge>
                      </div>
                    </td>

                    <td className="p-3.5">{getStatusBadge(app.status)}</td>

                    <td className="p-3.5 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenReview(app)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Evaluate & Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed Review Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Evaluate Application — ${selectedApp.applicantName}`}
          description={`Reference ID: ${selectedApp.id} • Form Template Version v${selectedApp.formVersion || 1}`}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            {/* Applicant Summary Header */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicant Name</span>
                <span className="font-semibold text-slate-900">{selectedApp.applicantName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-semibold text-slate-900">{selectedApp.applicantEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                <span className="font-semibold text-slate-900">{selectedApp.applicantPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Form Snapshot</span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  Version v{selectedApp.formVersion || 1}
                </Badge>
              </div>
            </div>

            {/* Application Responses */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-orange-600" /> Application Form Responses
              </h4>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {Object.entries(selectedApp.answers || {}).map(([qId, answerVal], idx) => {
                  const fieldSnap = selectedApp.fieldSnapshots?.find((f) => f.id === qId);
                  const labelText = fieldSnap?.label || qId;

                  let displayValue = answerVal;
                  if (Array.isArray(answerVal)) {
                    displayValue = answerVal.join(', ');
                  } else if (typeof answerVal === 'boolean') {
                    displayValue = answerVal ? 'Yes' : 'No';
                  }

                  return (
                    <div key={qId} className="p-3.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                      <p className="font-bold text-slate-900">
                        Q{idx + 1}. {labelText}
                      </p>
                      <div className="text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 font-medium whitespace-pre-wrap">
                        {displayValue !== undefined && displayValue !== null && String(displayValue).trim() !== ''
                          ? String(displayValue)
                          : 'No Response Provided'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uploaded Documents Section */}
            {selectedApp.uploadedFiles && Object.keys(selectedApp.uploadedFiles).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-orange-600" /> Uploaded Documents & Verification Files
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedApp.uploadedFiles).map(([fieldId, fileList]) => {
                    const fieldSnap = selectedApp.fieldSnapshots?.find((f) => f.id === fieldId);
                    const filesArr = Array.isArray(fileList) ? fileList : [];
                    return filesArr.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate">{fieldSnap?.label || 'Document'}</p>
                          <p className="text-[11px] text-slate-500 truncate">{file.name}</p>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white text-orange-600 border border-slate-200 rounded-md hover:bg-orange-50 transition cursor-pointer shrink-0 ml-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}

            {/* PM Review Controls */}
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-orange-600" /> Committee Decision & Admission Pipeline
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select
                  label="Overall Application Status"
                  options={[
                    { value: 'SUBMITTED', label: 'SUBMITTED' },
                    { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' },
                    { value: 'SHORTLISTED', label: 'SHORTLISTED' },
                    { value: 'ACCEPTED', label: 'ACCEPTED' },
                    { value: 'REJECTED', label: 'REJECTED' },
                    { value: 'WITHDRAWN', label: 'WITHDRAWN' },
                  ]}
                  value={targetStatusInput}
                  onChange={(e) => setTargetStatusInput(e.target.value as ApplicationStatus)}
                />

                <Select
                  label="Qualification Status"
                  options={[
                    { value: 'PENDING', label: 'PENDING' },
                    { value: 'QUALIFIED', label: 'QUALIFIED' },
                    { value: 'DISQUALIFIED', label: 'DISQUALIFIED' },
                  ]}
                  value={targetQualInput}
                  onChange={(e) => setTargetQualInput(e.target.value as QualificationStatus)}
                />

                <Select
                  label="Assessment Status"
                  options={[
                    { value: 'NOT_STARTED', label: 'NOT_STARTED' },
                    { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
                    { value: 'PASSED', label: 'PASSED' },
                    { value: 'FAILED', label: 'FAILED' },
                  ]}
                  value={targetAssessmentInput}
                  onChange={(e) => setTargetAssessmentInput(e.target.value as AssessmentStatus)}
                />

                <Select
                  label="Admission Status"
                  options={[
                    { value: 'APPLIED', label: 'APPLIED' },
                    { value: 'SHORTLISTED', label: 'SHORTLISTED' },
                    { value: 'OFFERED', label: 'OFFERED' },
                    { value: 'ENROLLED', label: 'ENROLLED' },
                    { value: 'REJECTED', label: 'REJECTED' },
                  ]}
                  value={targetAdmissionInput}
                  onChange={(e) => setTargetAdmissionInput(e.target.value as AdmissionStatus)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Committee Review Notes / Internal Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Applicant verified. Passed assessment score 85%. Dispatched offer letter."
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(null)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateStatuses}
                isLoading={updatingStatus}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Save Decision & Status Pipeline
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
