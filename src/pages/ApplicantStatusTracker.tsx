import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus } from '../types';
import {
  subscribeToApplicantApplications,
  withdrawApplication,
} from '../services/applications';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  Trash2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface ApplicantStatusTrackerProps {
  onNavigate: (path: string) => void;
}

export const ApplicantStatusTracker: React.FC<ApplicantStatusTrackerProps> = ({ onNavigate }) => {
  const { currentUser, userProfile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewing response modal
  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToApplicantApplications(currentUser.uid, (data) => {
      setApplications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleWithdraw = async (appId: string) => {
    if (window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      try {
        await withdrawApplication(appId);
      } catch (err: any) {
        setError(err.message || 'Failed to withdraw application.');
      }
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="primary">SUBMITTED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="warning">UNDER REVIEW</Badge>;
      case 'SHORTLISTED':
        return <Badge variant="success">SHORTLISTED</Badge>;
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
        <Spinner size="lg" label="Loading application status tracking..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" /> Applicant Status Tracker
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Cohort Applications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track admission progress, view review status notes, and manage active submissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('/')}
        >
          <GraduationCap className="w-4 h-4 mr-1.5" /> Explore Programmes
        </Button>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-slate-400" />}
          title="No Submitted Applications Found"
          description="You haven't submitted any applications for NextGen Class cohorts yet."
          action={
            <Button variant="primary" size="sm" onClick={() => onNavigate('/')}>
              Browse Open Cohorts & Apply
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {applications.map((app) => (
            <Card key={app.id} className="p-6 border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      REF: {app.id.substring(0, 10)}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {app.programmeName}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Target Cohort: <strong className="text-slate-800">{app.cohortName}</strong>
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500 space-y-1">
                  <p>
                    Submitted At: <span className="font-semibold text-slate-800">{new Date(app.submittedAt).toLocaleDateString()}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Last Updated: {new Date(app.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Review Notes from Programme Managers */}
              {app.reviewNotes && (
                <div className="my-4 p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-orange-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-600" /> Message from Selection Committee:
                  </p>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    "{app.reviewNotes}"
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Applicant: <strong className="text-slate-800">{app.applicantName}</strong> ({app.applicantEmail})
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingApp(app)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Submitted Answers
                  </Button>

                  {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWithdraw(app.id)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Withdraw
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Submitted Answers Modal */}
      {viewingApp && (
        <Modal
          isOpen={true}
          onClose={() => setViewingApp(null)}
          title={`Application Submission — ${viewingApp.programmeName}`}
          description={`Reference ID: ${viewingApp.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p><strong>Applicant:</strong> {viewingApp.applicantName} ({viewingApp.applicantEmail})</p>
              <p><strong>Cohort:</strong> {viewingApp.cohortName}</p>
              <p><strong>Status:</strong> {viewingApp.status}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Submitted Responses</h4>
              {Object.entries(viewingApp.answers || {}).map(([qId, val], idx) => {
                const questionObj = viewingApp.questionSnapshots?.find((q) => q.id === qId);
                return (
                  <div key={qId} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-900">
                      {idx + 1}. {questionObj?.questionText || qId}
                    </p>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 font-medium">
                      {val || 'No answer provided'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewingApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
