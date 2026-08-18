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

  const [allAvailableCohorts, setAllAvailableCohorts] = useState<Cohort[]>([]);
  const [allAvailableProgrammes, setAllAvailableProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const meta = (await seedInitialDataIfEmpty().catch(() => null)) as
          | { programmeId: string; cohortId: string }
          | null
          | undefined;
        let allCohorts = await getCohorts();
        let allProgs = await getProgrammes();

        if (allCohorts.length === 0 || allProgs.length === 0) {
          // If Firestore collections were just initialized, retry fetch
          allCohorts = await getCohorts();
          allProgs = await getProgrammes();
        }

        if (isMounted) {
          setAllAvailableCohorts(allCohorts);
          setAllAvailableProgrammes(allProgs);
        }

        // Try to match cohort by ID, code, programme ID, or programme slug
        let selectedCohort: Cohort | undefined = undefined;
        let selectedProg: Programme | undefined = undefined;

        if (cohortId) {
          selectedCohort = allCohorts.find((c) => c.id === cohortId || c.code === cohortId);
          if (!selectedCohort) {
            // Check if cohortId matches a programme ID or slug
            selectedProg = allProgs.find(
              (p) => p.id === cohortId || p.slug === cohortId || p.code === cohortId
            );
            if (selectedProg) {
              selectedCohort =
                allCohorts.find(
                  (c) => c.programmeId === selectedProg?.id && c.status === 'APPLICATION_OPEN'
                ) || allCohorts.find((c) => c.programmeId === selectedProg?.id);
            }
          }
        }

        if (!selectedCohort && allCohorts.length > 0) {
          selectedCohort =
            allCohorts.find((c) => c.status === 'APPLICATION_OPEN') || allCohorts[0];
        }

        if (!selectedCohort && meta?.cohortId) {
          selectedCohort = {
            id: meta.cohortId,
            programmeId: meta.programmeId,
            programmeName: 'Generative AI & AI Automation',
            name: 'Cohort 2',
            code: 'GAI-C2',
            startDate: '2026-09-01',
            endDate: '2026-11-25',
            applicationOpenDate: '2026-08-01',
            applicationCloseDate: '2026-08-28',
            capacity: 50,
            status: 'APPLICATION_OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        if (!selectedCohort) {
          // Absolute fallback cohort
          selectedCohort = {
            id: 'cohort_genai_c2',
            programmeId: 'prog_genai_automation',
            programmeName: 'Generative AI & AI Automation',
            name: 'Cohort 2 (Fall 2026)',
            code: 'GAI-C2',
            startDate: '2026-09-01',
            endDate: '2026-11-25',
            applicationOpenDate: '2026-08-01',
            applicationCloseDate: '2026-08-28',
            capacity: 50,
            status: 'APPLICATION_OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        if (isMounted) {
          setCohort(selectedCohort);
        }

        if (!selectedProg) {
          selectedProg =
            allProgs.find((p) => p.id === selectedCohort!.programmeId) ||
            allProgs[0] || {
              id: selectedCohort.programmeId,
              name: selectedCohort.programmeName || 'Generative AI & AI Automation',
              code: 'GAI',
              slug: 'generative-ai-cohort-2',
              description:
                'Master cutting-edge generative AI, prompt engineering, autonomous workflows, and agent architecture.',
              status: 'ACTIVE',
              duration: '12 Weeks',
              deliveryFormat: 'Hybrid',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
        }

        if (isMounted) {
          setProgramme(selectedProg);
        }

        // Fetch Published Application Form Template from Firestore
        let form = await getPublishedFormForProgramme(
          selectedCohort.programmeId,
          selectedCohort.id
        );

        // Fallback seed if no form exists in collection yet
        if (!form) {
          try {
            await seedDefaultFormIfEmpty(
              selectedCohort.programmeId,
              selectedProg?.name || selectedCohort.programmeName || 'Flagship Programme',
              selectedCohort.id
            );
            form = await getPublishedFormForProgramme(
              selectedCohort.programmeId,
              selectedCohort.id
            );
          } catch (seedErr) {
            console.warn('Fallback form creation note:', seedErr);
          }
        }

        // Guaranteed fallback template structure
        if (!form) {
          form = {
            id: 'default_template',
            programmeId: selectedCohort.programmeId,
            programmeName: selectedProg?.name || selectedCohort.programmeName || 'Generative AI & AI Automation',
            cohortId: selectedCohort.id,
            title: `${selectedProg?.name || selectedCohort.programmeName || 'Programme'} Application Form`,
            description: 'Please complete all required fields to submit your admission application.',
            version: 1,
            status: 'PUBLISHED',
            sections: [
              { id: 'sec_personal', title: '1. Personal & Contact Information', description: 'Basic applicant identity and contact details', order: 1 },
              { id: 'sec_background', title: '2. Education & Professional Background', description: 'Educational qualification and prior experience', order: 2 },
              { id: 'sec_readiness', title: '3. Technical Readiness & Commitment', description: 'Equipment, internet access, and weekly availability', order: 3 },
              { id: 'sec_motivation', title: '4. Motivation & Program Fit', description: 'Career aspirations and motivation to join NextGen Class', order: 4 },
            ],
            fields: [
              { id: 'q_laptop', sectionId: 'sec_readiness', label: 'Do you have regular access to a laptop/computer for live labs and projects?', fieldType: 'yes_no', options: ['Yes', 'No'], required: true, order: 1, active: true },
              { id: 'q_internet', sectionId: 'sec_readiness', label: 'Do you have stable internet connection for synchronous virtual sessions?', fieldType: 'yes_no', options: ['Yes', 'No'], required: true, order: 2, active: true },
              { id: 'q_weekly_hours', sectionId: 'sec_readiness', label: 'How many hours per week can you dedicate to coursework and assignments?', fieldType: 'dropdown', options: ['10 - 15 Hours', '15 - 20 Hours', '20+ Hours (Full Dedication)'], required: true, order: 3, active: true },
              { id: 'q_education_level', sectionId: 'sec_background', label: 'Highest Educational Qualification', fieldType: 'dropdown', options: ['High School / Secondary', 'Diploma / OND / HND', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate / PhD', 'Other'], required: true, order: 4, active: true },
              { id: 'q_experience_level', sectionId: 'sec_background', label: 'Prior Experience with Tech / AI Tools', fieldType: 'dropdown', options: ['Beginner (Zero prior experience)', 'Intermediate (Used AI tools like ChatGPT / Claude)', 'Advanced (Coding / Software engineering background)'], required: true, order: 5, active: true },
              { id: 'q_motivation', sectionId: 'sec_motivation', label: 'Why do you want to join this programme and what are your career goals?', fieldType: 'textarea', placeholder: 'Explain your learning goals and future career plans...', required: true, order: 6, active: true },
              { id: 'q_confirm_truthful', sectionId: 'sec_motivation', label: 'I certify that all information provided in this application is accurate and true.', fieldType: 'checkbox', required: true, order: 7, active: true },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        if (isMounted) {
          setFormTemplate(form);
        }

        // Pre-fill user profile info if logged in
        if (userProfile && isMounted) {
          if (!applicantName) setApplicantName(userProfile.displayName || `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
          if (!applicantEmail) setApplicantEmail(userProfile.email || currentUser?.email || '');
          if (!applicantPhone && userProfile.phoneNumber) setApplicantPhone(userProfile.phoneNumber);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load application form details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
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
              id="btn-return-applicant-dash"
              onClick={() => onNavigate('/applicant/dashboard')}
            >
              Track Application in Applicant Dashboard
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('/applicant/dashboard')}
            >
              Back to Portal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <button
          type="button"
          onClick={() => onNavigate(currentUser ? '/applicant/dashboard' : '/')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 font-medium cursor-pointer mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {currentUser ? 'Applicant Dashboard' : 'Programme Overview'}
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

          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="primary" className="text-xs font-mono self-start sm:self-auto">
              Cohort Code: {cohort?.code}
            </Badge>

            {allAvailableCohorts.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] text-slate-400">Change Cohort:</span>
                <select
                  aria-label="Select Cohort"
                  value={cohort?.id || ''}
                  onChange={(e) => {
                    const newCohort = allAvailableCohorts.find((c) => c.id === e.target.value);
                    if (newCohort) {
                      setCohort(newCohort);
                      const newProg = allAvailableProgrammes.find((p) => p.id === newCohort.programmeId);
                      if (newProg) setProgramme(newProg);
                    }
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {allAvailableCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.programmeName || 'Programme'} — {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
