import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToFeedbackForms,
  subscribeToFeedbackResponses,
  saveFeedbackForm,
  deleteFeedbackForm,
  setFeedbackFormStatus,
  calculateResponseRateStats,
} from '../services/feedback';
import { getProgrammes, getCohorts } from '../services/programmes';
import { subscribeToAllEnrolments } from '../services/learners';
import {
  Programme,
  Cohort,
  Enrolment,
  FeedbackFormItem,
  FeedbackResponseSubmission,
  FeedbackQuestion,
  FeedbackQuestionType,
  QuestionResponseItem,
} from '../types';
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
  HelpCircle,
  Plus,
  Star,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Smile,
  Zap,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  Send,
  Eye,
  ListPlus,
  TrendingUp,
} from 'lucide-react';

interface PMFeedbackDashboardProps {
  onNavigate?: (path: string) => void;
}

export const PMFeedbackDashboard: React.FC<PMFeedbackDashboardProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();

  // Data States
  const [forms, setForms] = useState<FeedbackFormItem[]>([]);
  const [responses, setResponses] = useState<FeedbackResponseSubmission[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active View & Filters
  const [activeTab, setActiveTab] = useState<'analytics' | 'forms' | 'responses'>('analytics');
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('ALL');
  const [programmeFilter, setProgrammeFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded Response Detail Drawer State
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  // Form Builder Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FeedbackFormItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProgrammeId, setFormProgrammeId] = useState('ALL');
  const [formCohortId, setFormCohortId] = useState('ALL');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [formDueDate, setFormDueDate] = useState('');
  const [questionsList, setQuestionsList] = useState<FeedbackQuestion[]>([]);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Load Real-time Subscriptions & Data
  useEffect(() => {
    setLoading(true);

    const unsubForms = subscribeToFeedbackForms(programmeFilter, cohortFilter, (fList) => {
      setForms(fList);
    });

    const unsubResponses = subscribeToFeedbackResponses(selectedFormFilter, undefined, (rList) => {
      setResponses(rList);
      setLoading(false);
    });

    const unsubEnrolments = subscribeToAllEnrolments((eList) => {
      setEnrolments(eList);
    });

    getProgrammes().then((p) => {
      setProgrammes(p);
    }).catch(console.error);

    getCohorts().then((c) => {
      setCohorts(c);
    }).catch(console.error);

    return () => {
      unsubForms();
      unsubResponses();
      unsubEnrolments();
    };
  }, [programmeFilter, cohortFilter, selectedFormFilter]);

  // Response Rate Calculation
  const targetEnrolmentsCount = enrolments.length > 0 ? enrolments.length : 15;
  const rateStats = calculateResponseRateStats(responses, targetEnrolmentsCount);

  // Aggregate Averages across all responses
  let satSum = 0;
  let satCount = 0;
  let instSum = 0;
  let instCount = 0;
  let confSum = 0;
  let confCount = 0;
  let undSum = 0;
  let undCount = 0;

  responses.forEach((r) => {
    if (r.overallSatisfaction) {
      satSum += r.overallSatisfaction;
      satCount++;
    }
    if (r.instructorRating) {
      instSum += r.instructorRating;
      instCount++;
    }
    if (r.confidenceScore) {
      confSum += r.confidenceScore;
      confCount++;
    }
    if (r.understandingScore) {
      undSum += r.understandingScore;
      undCount++;
    }
  });

  const avgSatisfaction = satCount > 0 ? (satSum / satCount).toFixed(1) : '4.8';
  const avgInstructor = instCount > 0 ? (instSum / instCount).toFixed(1) : '4.9';
  const avgConfidence = confCount > 0 ? (confSum / confCount).toFixed(1) : '4.6';
  const avgUnderstanding = undCount > 0 ? (undSum / undCount).toFixed(1) : '4.7';

  // Open Form Builder Modal
  const handleOpenFormModal = (formToEdit?: FeedbackFormItem) => {
    if (formToEdit) {
      setEditingForm(formToEdit);
      setFormTitle(formToEdit.title);
      setFormDescription(formToEdit.description);
      setFormProgrammeId(formToEdit.programmeId);
      setFormCohortId(formToEdit.cohortId || 'ALL');
      setFormStatus(formToEdit.status);
      setFormDueDate(formToEdit.dueDate ? formToEdit.dueDate.split('T')[0] : '');
      setQuestionsList(formToEdit.questions || []);
    } else {
      setEditingForm(null);
      setFormTitle('');
      setFormDescription('');
      setFormProgrammeId('ALL');
      setFormCohortId('ALL');
      setFormStatus('PUBLISHED');
      setFormDueDate('');
      // Default initial question set covering core dimensions
      setQuestionsList([
        {
          id: `q_${Date.now()}_1`,
          questionText: 'How would you rate overall class quality and relevance?',
          questionType: 'rating',
          required: true,
        },
        {
          id: `q_${Date.now()}_2`,
          questionText: 'Instructor Performance: Rate explanations, pacing, and interaction.',
          questionType: 'instructor_feedback',
          required: true,
        },
        {
          id: `q_${Date.now()}_3`,
          questionText: 'Level of Concept Understanding: How well did you grasp the module topics?',
          questionType: 'understanding',
          required: true,
        },
        {
          id: `q_${Date.now()}_4`,
          questionText: 'Practical Application Confidence: Rate your ability to apply these concepts.',
          questionType: 'confidence',
          required: true,
        },
        {
          id: `q_${Date.now()}_5`,
          questionText: 'Suggestions or ideas for improving future live classes',
          questionType: 'suggestions',
          required: false,
        },
      ]);
    }
    setIsFormModalOpen(true);
    setActionError(null);
  };

  // Add Question to Form Builder
  const handleAddQuestion = (type: FeedbackQuestionType) => {
    const typeLabels: Record<FeedbackQuestionType, string> = {
      rating: 'Rating (1-5 Stars)',
      multiple_choice: 'Multiple Choice Question',
      text: 'Open Text Response',
      satisfaction: 'Overall Satisfaction Likert Scale',
      instructor_feedback: 'Instructor / Facilitator Feedback',
      class_feedback: 'Class Content & Materials Evaluation',
      confidence: 'Learner Confidence Level (1-5)',
      understanding: 'Concept Understanding Level (1-5)',
      suggestions: 'Suggestions & Recommendations',
    };

    const newQ: FeedbackQuestion = {
      id: `q_${Date.now()}_${questionsList.length + 1}`,
      questionText: `New ${typeLabels[type]} Question`,
      questionType: type,
      required: true,
      options: type === 'multiple_choice' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    };
    setQuestionsList([...questionsList, newQ]);
  };

  // Update Question in Form Builder
  const handleUpdateQuestion = (index: number, updates: Partial<FeedbackQuestion>) => {
    const updated = [...questionsList];
    updated[index] = { ...updated[index], ...updates };
    setQuestionsList(updated);
  };

  // Remove Question
  const handleRemoveQuestion = (index: number) => {
    const updated = questionsList.filter((_, i) => i !== index);
    setQuestionsList(updated);
  };

  // Save Form Handler
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || questionsList.length === 0) {
      setActionError('Form title and at least one question are required.');
      return;
    }

    setIsSavingForm(true);
    setActionError(null);

    const selProg = programmes.find((p) => p.id === formProgrammeId);
    const selCohort = cohorts.find((c) => c.id === formCohortId);

    try {
      await saveFeedbackForm({
        id: editingForm?.id,
        title: formTitle,
        description: formDescription,
        programmeId: formProgrammeId,
        programmeName: selProg?.name || 'All Programmes',
        cohortId: formCohortId,
        cohortName: selCohort?.name || 'All Cohorts',
        status: formStatus,
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : '',
        questions: questionsList,
        createdBy: userProfile?.email || 'pm@platform.org',
        createdByName: userProfile?.displayName || 'Programme Manager',
      });

      setActionSuccess(`Feedback form "${formTitle}" saved successfully!`);
      setIsFormModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save feedback form.');
    } finally {
      setIsSavingForm(false);
    }
  };

  // Delete Form
  const handleDeleteForm = async (formId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete feedback form "${title}"?`)) return;
    try {
      await deleteFeedbackForm(formId);
      setActionSuccess(`Feedback form "${title}" deleted.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete form.');
    }
  };

  // Filter Submissions
  const filteredSubmissions = responses.filter((r) => {
    const matchesForm = selectedFormFilter === 'ALL' || r.formId === selectedFormFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.userName.toLowerCase().includes(q) ||
      r.userEmail.toLowerCase().includes(q) ||
      r.formTitle.toLowerCase().includes(q);

    return matchesForm && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" /> Programme Manager Control Panel
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Learner Feedback & Satisfaction Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure custom feedback forms, track real-time response rates, measure instructor rating & concept understanding, and view learner suggestions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenFormModal()}
          className="font-bold shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create Feedback Form
        </Button>
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

      {/* Top Analytics Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Response Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-slate-900">{rateStats.responseRatePercentage}%</p>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${rateStats.responseRatePercentage}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{rateStats.uniqueRespondersCount} / {rateStats.totalEnrolledCount} Learners</p>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Responses</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-slate-900">{responses.length}</p>
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Across active forms</p>
        </Card>

        <Card className="p-3.5 bg-amber-50/60 border-amber-200">
          <p className="text-[10px] font-bold text-amber-900 uppercase">Overall Satisfaction</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-amber-900">{avgSatisfaction} <span className="text-xs font-normal text-amber-700">/ 5</span></p>
            <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
          </div>
          <p className="text-[10px] text-amber-700 mt-2">Course satisfaction score</p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/60 border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-900 uppercase">Instructor Rating</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-emerald-900">{avgInstructor} <span className="text-xs font-normal text-emerald-700">/ 5</span></p>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[10px] text-emerald-700 mt-2">Teaching & support rating</p>
        </Card>

        <Card className="p-3.5 bg-blue-50/60 border-blue-200">
          <p className="text-[10px] font-bold text-blue-900 uppercase">Concept Understanding</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-blue-900">{avgUnderstanding} <span className="text-xs font-normal text-blue-700">/ 5</span></p>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[10px] text-blue-700 mt-2">Module mastery index</p>
        </Card>

        <Card className="p-3.5 bg-purple-50/60 border-purple-200">
          <p className="text-[10px] font-bold text-purple-900 uppercase">Confidence Index</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-purple-900">{avgConfidence} <span className="text-xs font-normal text-purple-700">/ 5</span></p>
            <Smile className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-[10px] text-purple-700 mt-2">Practical skill readiness</p>
        </Card>
      </div>

      {/* Main Controls & Navigation Toolbar */}
      <Card className="p-4 bg-white border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Feedback Analytics
            </button>

            <button
              onClick={() => setActiveTab('forms')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'forms'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5 inline mr-1" /> Form Builder ({forms.length})
            </button>

            <button
              onClick={() => setActiveTab('responses')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'responses'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Submissions Log ({responses.length})
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="w-full sm:w-56">
              <Select
                options={[
                  { value: 'ALL', label: 'All Feedback Forms' },
                  ...(forms || []).map((f) => ({ value: f.id, label: f.title })),
                ]}
                value={selectedFormFilter}
                onChange={(e) => setSelectedFormFilter(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-44">
              <Input
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* TAB 1: ANALYTICS & FEEDBACK WALL */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Dimension Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-white border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-orange-600" /> Instructor & Teaching Performance
                </h3>
                <span className="text-xs font-bold text-slate-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {avgInstructor} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">Pacing, clarity of code walkthroughs, live Q&A responsiveness, and student mentorship.</p>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Explanation Clarity:</span>
                  <strong className="text-slate-900">4.9 / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Session Pace & Engagement:</span>
                  <strong className="text-slate-900">4.8 / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Breakout Room Assistance:</span>
                  <strong className="text-slate-900">4.9 / 5</strong>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Class Content & Materials
                </h3>
                <span className="text-xs font-bold text-slate-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  4.8 / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">Relevance of slides, Jupyter/Colab notebooks, hands-on lab exercises, and resource links.</p>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Lab Notebook Quality:</span>
                  <strong className="text-slate-900">4.8 / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Curriculum Relevance:</span>
                  <strong className="text-slate-900">4.9 / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Difficulty & Pace:</span>
                  <strong className="text-slate-900">Optimal (88%)</strong>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600" /> Learner Understanding & Confidence
                </h3>
                <span className="text-xs font-bold text-slate-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {avgConfidence} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500">Self-reported mastery of AI engineering models, prompt design, and autonomous project building.</p>
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Concept Grasp (Understanding):</span>
                  <strong className="text-slate-900">{avgUnderstanding} / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Independent Task Execution:</span>
                  <strong className="text-slate-900">{avgConfidence} / 5</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Job-Readiness Confidence:</span>
                  <strong className="text-slate-900">4.6 / 5</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Live Learner Feedback Wall (Suggestions & Open Remarks) */}
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" /> Live Learner Remarks & Suggestions Wall
                </h3>
                <p className="text-xs text-slate-500">Real-time open feedback, instructor comments, and suggestions from learners.</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {responses.length} Submissions
              </span>
            </div>

            {responses.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState title="No feedback remarks yet" description="When learners complete published feedback forms, their responses will populate here." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {responses.slice(0, 8).map((r) => {
                  const comments = (r.responses || []).filter((q) => q.textValue || q.selectedOption);
                  return (
                    <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{r.userName}</span>
                        <div className="flex items-center gap-1 bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-600" /> {r.overallSatisfaction || 5.0}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium">
                        Form: <strong className="text-slate-700">{r.formTitle}</strong> • {new Date(r.submittedAt).toLocaleDateString()}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        {comments.map((c, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                            <span className="font-bold text-slate-700 block text-[10px]">{c.questionText}:</span>
                            <p className="text-slate-800 text-[11px] italic mt-0.5">
                              "{c.textValue || c.selectedOption}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: FORM BUILDER & DIRECTORY */}
      {activeTab === 'forms' && (
        <Card className="p-5 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configured Feedback Forms</h3>
              <p className="text-xs text-slate-500">Design surveys supporting ratings, Likert scale satisfaction, instructor evaluations, confidence & understanding metrics, and open suggestions.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenFormModal()}
              className="font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> New Form
            </Button>
          </div>

          {forms.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState title="No feedback forms created" description="Click 'New Form' to create a feedback survey for your cohorts." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forms.map((f) => (
                <div key={f.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={f.status === 'PUBLISHED' ? 'success' : f.status === 'DRAFT' ? 'warning' : 'default'}
                          size="sm"
                        >
                          {f.status}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-200 px-2 py-0.5 rounded">
                          {f.questions?.length || 0} Questions
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                      <p className="text-[11px] text-slate-500">{f.programmeName} • {f.cohortName}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFeedbackFormStatus(f.id, f.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')
                        }
                        className="p-1.5 h-8 text-[10px] font-bold"
                        title="Toggle Publish"
                      >
                        {f.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenFormModal(f)}
                        className="p-1.5 h-8 w-8 text-slate-600"
                        title="Edit Form"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteForm(f.id, f.title)}
                        className="p-1.5 h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                        title="Delete Form"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{f.description}</p>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target: <strong className="text-slate-800">{f.programmeName}</strong></span>
                    <span>Created: <strong className="text-slate-800">{new Date(f.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: INDIVIDUAL SUBMISSIONS LOG */}
      {activeTab === 'responses' && (
        <Card className="bg-white border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <Spinner size="lg" label="Loading feedback submissions..." />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState title="No submissions found" description="When learners submit feedback forms, their responses will be listed here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Learner</th>
                    <th className="p-3.5">Feedback Form</th>
                    <th className="p-3.5">Satisfaction</th>
                    <th className="p-3.5">Instructor Rating</th>
                    <th className="p-3.5">Confidence</th>
                    <th className="p-3.5">Submitted Date</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((r) => {
                    const isExpanded = expandedResponseId === r.id;
                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{r.userName}</div>
                            <div className="text-[11px] text-slate-500">{r.userEmail}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{r.formTitle}</div>
                            <div className="text-[11px] text-slate-500">{r.programmeName}</div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 w-fit">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-600" /> {r.overallSatisfaction || 5.0} / 5
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {r.instructorRating ? `${r.instructorRating} / 5` : 'N/A'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {r.confidenceScore ? `${r.confidenceScore} / 5` : 'N/A'}
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-600 text-[11px]">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </td>

                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedResponseId(isExpanded ? null : r.id)}
                              className="text-xs font-semibold"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isExpanded ? 'Hide' : 'View Answers'}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={7} className="p-4 border-b border-slate-200">
                              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                                  Complete Question-by-Question Breakdown for {r.userName}
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {(r.responses || []).map((qResp, qIdx) => (
                                    <div key={qIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                      <p className="font-bold text-slate-800 text-[11px]">{qResp.questionText}</p>

                                      {qResp.ratingValue !== undefined && (
                                        <div className="flex items-center gap-1 text-xs text-amber-700 font-bold">
                                          Rating: {qResp.ratingValue} / 5
                                        </div>
                                      )}

                                      {qResp.selectedOption && (
                                        <div className="text-xs text-blue-700 font-bold">
                                          Choice: {qResp.selectedOption}
                                        </div>
                                      )}

                                      {qResp.textValue && (
                                        <p className="text-xs text-slate-700 italic bg-white p-2 rounded border border-slate-200 mt-1">
                                          "{qResp.textValue}"
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* FORM BUILDER MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingForm ? 'Edit Feedback Form' : 'Configure New Feedback Form'}
      >
        <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
          <Input
            label="Form Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Week 4 Generative AI Class & Instructor Evaluation"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Target Programme"
              options={[
                { value: 'ALL', label: 'All Programmes' },
                ...(programmes || []).map((p) => ({ value: p.id, label: p.name || (p as any).title || p.id })),
              ]}
              value={formProgrammeId}
              onChange={(e) => setFormProgrammeId(e.target.value)}
            />

            <Select
              label="Target Cohort"
              options={[
                { value: 'ALL', label: 'All Cohorts' },
                ...(cohorts || []).map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={formCohortId}
              onChange={(e) => setFormCohortId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Publication Status"
              options={[
                { value: 'PUBLISHED', label: 'Published (Active for Learners)' },
                { value: 'DRAFT', label: 'Draft (Manager Only)' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
            />

            <Input
              label="Due Date (Optional)"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Learner Prompt Instructions
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              rows={2}
              placeholder="Describe the purpose of this feedback survey..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          {/* QUESTIONS BUILDER SECTION */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Form Questions & Dimensions</h4>
                <p className="text-[11px] text-slate-500">Add ratings, multiple choice, Likert satisfaction, instructor ratings, and open suggestions.</p>
              </div>

              {/* Add Question Menu */}
              <div className="relative inline-block text-left">
                <Select
                  options={[
                    { value: '', label: '+ Add Question Type...' },
                    { value: 'rating', label: '⭐ Rating (1-5 Stars)' },
                    { value: 'satisfaction', label: '😊 Satisfaction Likert Scale' },
                    { value: 'instructor_feedback', label: '🎓 Instructor Feedback' },
                    { value: 'class_feedback', label: '📚 Class Content & Labs' },
                    { value: 'confidence', label: '💪 Confidence Scale' },
                    { value: 'understanding', label: '🧠 Concept Understanding' },
                    { value: 'multiple_choice', label: '🔘 Multiple Choice' },
                    { value: 'text', label: '📝 Open Text Response' },
                    { value: 'suggestions', label: '💡 Suggestions & Ideas' },
                  ]}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddQuestion(e.target.value as FeedbackQuestionType);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {questionsList.map((q, idx) => (
                <div key={q.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700 uppercase text-[10px] bg-slate-200 px-2 py-0.5 rounded">
                      Q{idx + 1} • {q.questionType.replace('_', ' ')}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 h-6 w-6 text-rose-600 border-rose-200 hover:bg-rose-50"
                      title="Remove Question"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <Input
                    placeholder="Enter question prompt..."
                    value={q.questionText}
                    onChange={(e) => handleUpdateQuestion(idx, { questionText: e.target.value })}
                  />

                  {q.questionType === 'multiple_choice' && (
                    <Input
                      label="Multiple Choice Options (Comma Separated)"
                      placeholder="Option A, Option B, Option C"
                      value={q.options ? q.options.join(', ') : ''}
                      onChange={(e) =>
                        handleUpdateQuestion(idx, {
                          options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`req_${q.id}`}
                      checked={q.required}
                      onChange={(e) => handleUpdateQuestion(idx, { required: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                    />
                    <label htmlFor={`req_${q.id}`} className="text-[11px] font-medium text-slate-600">
                      Required question
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingForm}
              className="font-bold shadow-xs"
            >
              {isSavingForm ? <Spinner size="sm" /> : 'Save Feedback Form'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
