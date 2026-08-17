import React, { useState, useEffect } from 'react';
import { Cohort, Programme, ApplicationFormTemplate, UploadedFileMeta } from '../types';
import { getCohorts, getProgrammes, seedInitialDataIfEmpty } from '../services/programmes';
import { getPublishedFormForProgramme, seedDefaultFormIfEmpty } from '../services/formBuilder';
import { submitApplication } from '../services/applications';
import { sendApplicationReceivedNotification } from '../services/notifications';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { DynamicFormRenderer } from '../components/formBuilder/DynamicFormRenderer';
import {
  CheckCircle2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface ApplicationFormPageProps {
  cohortId?: string;
  onNavigate: (path: string) => void;
}

export const ApplicationFormPage: React.FC<ApplicationFormPageProps> = ({
  cohortId,
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [formTemplate, setFormTemplate] = useState<ApplicationFormTemplate | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Applicant Identity Details
  const [applicantName, setApplicantName] = useState(userProfile?.displayName || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState(userProfile?.phoneNumber || '');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await seedInitialDataIfEmpty().catch(console.error);
        const allCohorts = await getCohorts();
        const selectedCohort =
          allCohorts.find((c) => c.id === cohortId) || allCohorts[0];

        if (!selectedCohort) {
          setError('Selected cohort was not found.');
          setLoading(false);
          return;
        }

        setCohort(selectedCohort);

        const allProgs = await getProgrammes();
        const selectedProg = allProgs.find((p) => p.id === selectedCohort.programmeId);
        if (selectedProg) {
          setProgramme(selectedProg);
        }

        // Fetch Published Application Form Template from Firestore
        let form = await getPublishedFormForProgramme(
          selectedCohort.programmeId,
          selectedCohort.id
        );

        // Fallback seed if no form exists in collection yet
        if (!form) {
          const seededId = await seedDefaultFormIfEmpty(
            selectedCohort.programmeId,
            selectedProg?.name || selectedCohort.programmeName,
            selectedCohort.id
          );
          const allForms = await getPublishedFormForProgramme(
            selectedCohort.programmeId,
            selectedCohort.id
          );
          form = allForms;
        }

        setFormTemplate(form);

        // Pre-fill user profile info if logged in
        if (userProfile) {
          if (!applicantName) setApplicantName(userProfile.displayName || '');
          if (!applicantEmail) setApplicantEmail(userProfile.email || '');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load application form details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cohortId, userProfile]);

  const handleDynamicFormSubmit = async (
    answers: Record<string, any>,
    files: Record<string, UploadedFileMeta[]>
  ) => {
    setError(null);

    if (!cohort) {
      setError('No active cohort selected.');
      return;
    }

    if (!applicantName.trim() || !applicantEmail.trim()) {
      setError('Please provide your full legal name and primary email address.');
      return;
    }

    setSubmitting(true);
    try {
      const applicantUid = currentUser?.uid || `applicant_${Date.now()}`;

      const appId = await submitApplication({
        applicantId: applicantUid,
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        applicantPhone: applicantPhone.trim(),
        programmeId: cohort.programmeId,
        programmeName: programme?.name || cohort.programmeName || 'Generative AI & AI Automation',
        cohortId: cohort.id,
        cohortName: cohort.name,
        formId: formTemplate?.id || 'default_form',
        formVersionId: `v${formTemplate?.version || 1}`,
        formVersion: formTemplate?.version || 1,
        answers,
        uploadedFiles: files,
        fieldSnapshots: formTemplate?.fields || [],
        sectionSnapshots: formTemplate?.sections || [],
      });

      // Dispatch real notification & log delivery
      await sendApplicationReceivedNotification({
        name: applicantName.trim(),
        email: applicantEmail.trim(),
        phone: applicantPhone.trim(),
        applicationId: appId,
        programmeName: programme?.name || cohort.programmeName || 'Flagship Programme',
        cohortName: cohort.name,
        submissionDate: new Date().toLocaleDateString(),
      }).catch((e) => console.warn('Notification dispatch non-blocking error:', e));

      setSubmittedAppId(appId);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" label="Loading application form details..." />
      </div>
    );
  }

  // --- CONFIRMATION SCREEN ---
  if (submittedAppId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card variant="bordered-orange" className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <Badge variant="success" className="text-xs">
              Application Successfully Registered
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Application Submitted!
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              Your official application for <strong className="text-slate-900">{cohort?.name} ({programme?.name})</strong> has been received by the admissions board.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Application Reference ID:</span>
              <span className="font-mono font-bold text-orange-600">{submittedAppId}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Applicant Name:</span>
              <span className="font-semibold text-slate-800">{applicantName}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Form Version Submitted:</span>
              <span className="font-semibold text-slate-800">v{formTemplate?.version || 1}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Target Cohort:</span>
              <span className="font-semibold text-slate-800">{cohort?.name} ({cohort?.code})</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Current Admission Status:</span>
              <span className="font-semibold text-emerald-700 uppercase">SUBMITTED (IN REVIEW)</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('/portal')}
            >
              Track Application in Portal Dashboard
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('/')}
            >
              Return to Programme Catalog
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 font-medium cursor-pointer mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Programme Overview
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">
                Official Application Form
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Form Version v{formTemplate?.version || 1}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Apply for {cohort?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Programme: <strong className="text-slate-800">{programme?.name || cohort?.programmeName}</strong>
            </p>
          </div>

          <Badge variant="primary" className="text-xs font-mono self-start sm:self-auto">
            Cohort Code: {cohort?.code}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Applicant Primary Contact Info Card */}
      <Card className="p-6 space-y-4">
        <CardHeader className="p-0 pb-3 border-b border-slate-100">
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-orange-600" /> Primary Applicant Contact Info
          </CardTitle>
          <CardDescription className="text-xs">
            We will send all admission updates and interview schedule links to these details.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-4 pt-2">
          <Input
            label="Full Legal Name"
            placeholder="e.g. Chukwuemeka Emmanuel Okafor"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="applicant@example.com"
              value={applicantEmail}
              onChange={(e) => setApplicantEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Phone / WhatsApp Number"
              type="tel"
              placeholder="+234 800 123 4567"
              value={applicantPhone}
              onChange={(e) => setApplicantPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dynamically Rendered Form Questions */}
      {formTemplate && (
        <DynamicFormRenderer
          fields={formTemplate.fields || []}
          sections={formTemplate.sections || []}
          onSubmit={handleDynamicFormSubmit}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
};
