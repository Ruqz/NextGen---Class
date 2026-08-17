import React, { useState, useEffect } from 'react';
import {
  QuestionBank,
  AssessmentQuestion,
  Assessment,
  AssessmentAttempt,
  QuestionType,
  AssessmentAvailability,
} from '../types';
import {
  getQuestionBanks,
  subscribeToQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  getQuestionsForBank,
  addQuestionToBank,
  updateQuestion,
  deleteQuestion,
  getAssessments,
  subscribeToAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  subscribeToAllAttempts,
  seedDefaultAssessmentIfEmpty,
} from '../services/assessments';
import { getProgrammes, getCohorts } from '../services/programmes';
import { Programme, Cohort } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
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
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart2,
  Settings,
  ListChecks,
  Layers,
  Shuffle,
  ShieldAlert,
  Award,
  Search,
  BookOpen,
  Sparkles,
  BrainCircuit,
} from 'lucide-react';

interface PMAssessmentManagementProps {
  onNavigate?: (path: string) => void;
}

export const PMAssessmentManagement: React.FC<PMAssessmentManagementProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'assessments' | 'banks' | 'attempts'>('assessments');

  // Core Data States
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Question Bank Modal States
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [bankTitle, setBankTitle] = useState('');
  const [bankDesc, setBankDesc] = useState('');
  const [bankProgId, setBankProgId] = useState('');

  // Selected Bank & Questions Management Modal
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [bankQuestions, setBankQuestions] = useState<AssessmentQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isQModalOpen, setIsQModalOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<AssessmentQuestion | null>(null);

  // Question Form Inputs
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [qChoices, setQChoices] = useState<{ id: string; text: string }[]>([
    { id: 'c1', text: '' },
    { id: 'c2', text: '' },
    { id: 'c3', text: '' },
    { id: 'c4', text: '' },
  ]);
  const [qCorrectId, setQCorrectId] = useState('c1');
  const [qExplanation, setQExplanation] = useState('');
  const [qPoints, setQPoints] = useState(10);

  // Assessment Config Modal States
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [asstTitle, setAsstTitle] = useState('');
  const [asstDesc, setAsstDesc] = useState('');
  const [asstProgId, setAsstProgId] = useState('');
  const [asstCohortId, setAsstCohortId] = useState('');
  const [asstBankId, setAsstBankId] = useState('');
  const [asstDuration, setAsstDuration] = useState(20);
  const [asstPassThreshold, setAsstPassThreshold] = useState(70);
  const [asstMaxAttempts, setAsstMaxAttempts] = useState(2);
  const [asstRandomizeQ, setAsstRandomizeQ] = useState(true);
  const [asstAvailability, setAsstAvailability] = useState<AssessmentAvailability>('PUBLISHED');

  // Attempt Review Modal
  const [selectedAttempt, setSelectedAttempt] = useState<AssessmentAttempt | null>(null);

  useEffect(() => {
    setLoading(true);

    // Initial seed if no data exists
    seedDefaultAssessmentIfEmpty().catch(console.error);

    const unsubAssessments = subscribeToAssessments((aData) => {
      setAssessments(aData);
    });

    const unsubBanks = subscribeToQuestionBanks((bData) => {
      setBanks(bData);
    });

    const unsubAttempts = subscribeToAllAttempts((attData) => {
      setAttempts(attData);
      setLoading(false);
    });

    getProgrammes().then(setProgrammes).catch(console.error);
    getCohorts().then(setCohorts).catch(console.error);

    return () => {
      unsubAssessments();
      unsubBanks();
      unsubAttempts();
    };
  }, []);

  // Fetch Questions when a Bank is selected
  const handleSelectBank = async (bank: QuestionBank) => {
    setSelectedBank(bank);
    setLoadingQuestions(true);
    try {
      const qList = await getQuestionsForBank(bank.id);
      setBankQuestions(qList);
    } catch (err: any) {
      setError(err.message || 'Failed to load bank questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // --- QUESTION BANK HANDLERS ---
  const handleOpenBankModal = (bank?: QuestionBank) => {
    if (bank) {
      setEditingBank(bank);
      setBankTitle(bank.title);
      setBankDesc(bank.description || '');
      setBankProgId(bank.programmeId || '');
    } else {
      setEditingBank(null);
      setBankTitle('');
      setBankDesc('');
      setBankProgId('');
    }
    setIsBankModalOpen(true);
  };

  const handleSaveBank = async () => {
    if (!bankTitle.trim()) {
      setError('Please provide a title for the question bank.');
      return;
    }

    try {
      const selectedProg = programmes.find((p) => p.id === bankProgId);
      if (editingBank) {
        await updateQuestionBank(editingBank.id, {
          title: bankTitle.trim(),
          description: bankDesc.trim(),
          programmeId: bankProgId || undefined,
          programmeName: selectedProg?.name,
        });
        setSuccessMsg('Question bank updated successfully.');
      } else {
        await createQuestionBank({
          title: bankTitle.trim(),
          description: bankDesc.trim(),
          programmeId: bankProgId || undefined,
          programmeName: selectedProg?.name,
        });
        setSuccessMsg('Question bank created successfully.');
      }
      setIsBankModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save question bank.');
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this question bank and all associated questions?')) {
      return;
    }
    try {
      await deleteQuestionBank(bankId);
      if (selectedBank?.id === bankId) {
        setSelectedBank(null);
        setBankQuestions([]);
      }
      setSuccessMsg('Question bank deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete question bank.');
    }
  };

  // --- QUESTION FORM HANDLERS ---
  const handleOpenQModal = (q?: AssessmentQuestion) => {
    if (q) {
      setEditingQ(q);
      setQText(q.text);
      setQType(q.type);
      setQChoices(
        q.choices.length > 0
          ? q.choices
          : [
              { id: 'c1', text: '' },
              { id: 'c2', text: '' },
            ]
      );
      setQCorrectId(q.correctAnswerId);
      setQExplanation(q.explanation || '');
      setQPoints(q.points || 10);
    } else {
      setEditingQ(null);
      setQText('');
      setQType('MULTIPLE_CHOICE');
      setQChoices([
        { id: 'c1', text: '' },
        { id: 'c2', text: '' },
        { id: 'c3', text: '' },
        { id: 'c4', text: '' },
      ]);
      setQCorrectId('c1');
      setQExplanation('');
      setQPoints(10);
    }
    setIsQModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!selectedBank) return;
    if (!qText.trim()) {
      setError('Please enter the question text.');
      return;
    }

    let finalChoices = qChoices;
    if (qType === 'TRUE_FALSE') {
      finalChoices = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
    } else {
      // Validate multiple choice inputs
      const filledChoices = qChoices.filter((c) => c.text.trim() !== '');
      if (filledChoices.length < 2) {
        setError('Please provide at least 2 valid option choices.');
        return;
      }
      finalChoices = filledChoices;
    }

    try {
      if (editingQ) {
        await updateQuestion(editingQ.id, {
          text: qText.trim(),
          type: qType,
          choices: finalChoices,
          correctAnswerId: qCorrectId,
          explanation: qExplanation.trim(),
          points: Number(qPoints) || 10,
        });
        setSuccessMsg('Question updated.');
      } else {
        await addQuestionToBank(selectedBank.id, {
          text: qText.trim(),
          type: qType,
          choices: finalChoices,
          correctAnswerId: qCorrectId,
          explanation: qExplanation.trim(),
          points: Number(qPoints) || 10,
        });
        setSuccessMsg('New question added to bank.');
      }

      setIsQModalOpen(false);
      // Refresh questions list
      const updated = await getQuestionsForBank(selectedBank.id);
      setBankQuestions(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedBank) return;
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(qId, selectedBank.id);
      const updated = await getQuestionsForBank(selectedBank.id);
      setBankQuestions(updated);
      setSuccessMsg('Question removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete question.');
    }
  };

  // --- ASSESSMENT CONFIG HANDLERS ---
  const handleOpenAssessmentModal = async (asst?: Assessment) => {
    if (asst) {
      setEditingAssessment(asst);
      setAsstTitle(asst.title);
      setAsstDesc(asst.description || '');
      setAsstProgId(asst.programmeId || '');
      setAsstCohortId(asst.cohortId || '');
      setAsstBankId(asst.questionBankId || '');
      setAsstDuration(asst.durationMinutes || 20);
      setAsstPassThreshold(asst.passThresholdPercentage || 70);
      setAsstMaxAttempts(asst.maxAttempts || 2);
      setAsstRandomizeQ(asst.randomizeQuestions ?? true);
      setAsstAvailability(asst.availability || 'PUBLISHED');
    } else {
      setEditingAssessment(null);
      setAsstTitle('');
      setAsstDesc('');
      setAsstProgId(programmes[0]?.id || '');
      setAsstCohortId('');
      setAsstBankId(banks[0]?.id || '');
      setAsstDuration(20);
      setAsstPassThreshold(70);
      setAsstMaxAttempts(2);
      setAsstRandomizeQ(true);
      setAsstAvailability('PUBLISHED');
    }
    setIsAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async () => {
    if (!asstTitle.trim()) {
      setError('Please enter an assessment title.');
      return;
    }

    try {
      // Fetch selected bank's questions if a bank is linked
      let attachedQuestions: AssessmentQuestion[] = [];
      if (asstBankId) {
        attachedQuestions = await getQuestionsForBank(asstBankId);
      }

      const selectedProg = programmes.find((p) => p.id === asstProgId);
      const selectedCohort = cohorts.find((c) => c.id === asstCohortId);

      if (editingAssessment) {
        await updateAssessment(editingAssessment.id, {
          title: asstTitle.trim(),
          description: asstDesc.trim(),
          programmeId: asstProgId || undefined,
          programmeName: selectedProg?.name,
          cohortId: asstCohortId || undefined,
          cohortName: selectedCohort?.name,
          questionBankId: asstBankId || undefined,
          questions: attachedQuestions.length > 0 ? attachedQuestions : editingAssessment.questions,
          durationMinutes: Number(asstDuration) || 0,
          passThresholdPercentage: Number(asstPassThreshold) || 70,
          maxAttempts: Number(asstMaxAttempts) || 1,
          randomizeQuestions: asstRandomizeQ,
          availability: asstAvailability,
        });
        setSuccessMsg('Assessment configuration updated.');
      } else {
        await createAssessment({
          title: asstTitle.trim(),
          description: asstDesc.trim(),
          programmeId: asstProgId || undefined,
          programmeName: selectedProg?.name,
          cohortId: asstCohortId || undefined,
          cohortName: selectedCohort?.name,
          questionBankId: asstBankId || undefined,
          questions: attachedQuestions,
          durationMinutes: Number(asstDuration) || 0,
          passThresholdPercentage: Number(asstPassThreshold) || 70,
          maxAttempts: Number(asstMaxAttempts) || 1,
          randomizeQuestions: asstRandomizeQ,
          availability: asstAvailability,
        });
        setSuccessMsg('New assessment created successfully.');
      }

      setIsAssessmentModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save assessment configuration.');
    }
  };

  const handleDeleteAssessment = async (asstId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
      await deleteAssessment(asstId);
      setSuccessMsg('Assessment deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete assessment.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" label="Loading Assessment Engine Management..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Programme Management Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Assessment & Skill Testing Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure objective test parameters, question banks, duration limits, passing thresholds, and view auto-scored candidate attempts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate ? onNavigate('/portal/pm/ai') : (window.location.pathname = '/portal/pm/ai')}
            className="border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold"
            title="Generate curriculum-grounded assessment questions with Gemini AI and human admin review"
          >
            <BrainCircuit className="w-4 h-4 mr-1 text-orange-600" /> ✨ AI Question Generator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenBankModal()}
          >
            <Plus className="w-4 h-4 mr-1" /> New Question Bank
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAssessmentModal()}
            className="bg-orange-600 hover:bg-orange-500 font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Assessment
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert type="success" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'assessments'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Active Assessments ({assessments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banks')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'banks'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Question Banks ({banks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attempts')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'attempts'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Results & Attempts ({attempts.length})
        </button>
      </div>

      {/* --- TAB 1: ASSESSMENTS LIST --- */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          {assessments.length === 0 ? (
            <EmptyState
              icon={<Award className="w-10 h-10 text-slate-400" />}
              title="No Active Assessments Created"
              description="Create a new objective skill assessment linked to a question bank to start evaluating candidates."
              actionLabel="Create First Assessment"
              onAction={() => handleOpenAssessmentModal()}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessments.map((asst) => (
                <Card key={asst.id} variant="bordered-orange" className="p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant={
                          asst.availability === 'PUBLISHED'
                            ? 'success'
                            : asst.availability === 'CLOSED'
                            ? 'danger'
                            : 'secondary'
                        }
                      >
                        {asst.availability}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAssessmentModal(asst)}
                          className="p-1 text-slate-400 hover:text-orange-600 rounded transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssessment(asst.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{asst.title}</h3>
                      {asst.programmeName && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {asst.programmeName}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {asst.description || 'No description provided.'}
                    </p>

                    {/* Parameter Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-700">
                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>{asst.durationMinutes > 0 ? `${asst.durationMinutes} mins` : 'Unlimited'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{asst.passThresholdPercentage}% Pass Benchmark</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                        <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                        <span>{asst.questions?.length || 0} Questions ({asst.totalPoints || 0} pts)</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                        <Shuffle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Max {asst.maxAttempts > 0 ? `${asst.maxAttempts} Attempts` : 'Unlimited'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Created: {new Date(asst.createdAt).toLocaleDateString()}</span>
                    <Badge variant="neutral" className="text-[10px]">
                      {asst.randomizeQuestions ? 'Randomized' : 'Sequential'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: QUESTION BANKS MANAGEMENT --- */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Banks List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Question Banks ({banks.length})
              </h3>
              <Button variant="outline" size="sm" onClick={() => handleOpenBankModal()}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Bank
              </Button>
            </div>

            <div className="space-y-2">
              {banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBank(b)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-1 ${
                    selectedBank?.id === b.id
                      ? 'bg-orange-50/80 border-orange-400 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBankModal(b);
                        }}
                        className="p-1 text-slate-400 hover:text-orange-600 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBank(b.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {b.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">{b.description}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                    <span>{b.programmeName || 'General'}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {b.questionCount || 0} Questions
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Bank Questions Viewer */}
          <div className="lg:col-span-2 space-y-4">
            {selectedBank ? (
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
                      Active Question Bank
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{selectedBank.title}</h2>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenQModal()}
                    className="bg-orange-600 hover:bg-orange-500 font-bold self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Question
                  </Button>
                </div>

                {loadingQuestions ? (
                  <div className="py-10 flex justify-center">
                    <Spinner size="md" label="Loading bank questions..." />
                  </div>
                ) : bankQuestions.length === 0 ? (
                  <EmptyState
                    icon={<HelpCircle className="w-8 h-8 text-slate-400" />}
                    title="No Questions in this Bank"
                    description="Click 'Add Question' to create multiple choice or True/False items."
                  />
                ) : (
                  <div className="space-y-3">
                    {bankQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-orange-600">Q{idx + 1}.</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {q.type === 'TRUE_FALSE' ? 'True / False' : 'Multiple Choice'}
                            </Badge>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({q.points || 10} pts)
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenQModal(q)}
                              className="p-1 text-slate-400 hover:text-orange-600 rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="font-semibold text-slate-900 text-sm">{q.text}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.choices || []).map((c) => {
                            const isCorrect = c.id === q.correctAnswerId;
                            return (
                              <div
                                key={c.id}
                                className={`p-2 rounded-lg border font-medium flex items-center justify-between text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{c.text}</span>
                                {isCorrect && (
                                  <Badge variant="success" className="text-[9px]">
                                    CORRECT
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 mt-2">
                            <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-10 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Select a Question Bank</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Choose a bank from the left panel to manage its multiple choice and True/False questions.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: ATTEMPTS & RESULTS DASHBOARD --- */}
      {activeTab === 'attempts' && (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 uppercase tracking-wider">
              Candidate Test Attempts & Deterministic Scores ({attempts.length})
            </span>
            <Badge variant="primary" className="text-[10px]">
              Auto-Scored System
            </Badge>
          </div>

          {attempts.length === 0 ? (
            <div className="p-10 text-center">
              <EmptyState
                icon={<BarChart2 className="w-10 h-10 text-slate-400" />}
                title="No Exam Attempts Recorded Yet"
                description="When applicants take published assessments, auto-graded attempt reports will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Candidate</th>
                    <th className="p-3.5">Assessment</th>
                    <th className="p-3.5">Attempt #</th>
                    <th className="p-3.5">Score / Percentage</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Submitted At</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{att.userName}</p>
                        <p className="text-[11px] text-slate-500">{att.userEmail}</p>
                      </td>

                      <td className="p-3.5 font-medium text-slate-800">{att.assessmentTitle}</td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          Attempt #{att.attemptNumber || 1}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">
                          {att.score} / {att.maxScore} pts ({att.percentage}%)
                        </div>
                        <Badge
                          variant={att.passed ? 'success' : 'danger'}
                          className="text-[10px] mt-0.5"
                        >
                          {att.passed ? 'PASSED' : 'FAILED'}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            att.status === 'SUBMITTED'
                              ? 'success'
                              : att.status === 'IN_PROGRESS'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {att.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {att.submittedAt
                          ? new Date(att.submittedAt).toLocaleString()
                          : new Date(att.startedAt).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAttempt(att)}
                        >
                          View Breakdown
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* --- QUESTION BANK MODAL --- */}
      {isBankModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsBankModalOpen(false)}
          title={editingBank ? 'Edit Question Bank' : 'Create Question Bank'}
          description="Group objective test questions into reusable repositories."
        >
          <div className="space-y-4">
            <Input
              label="Bank Title"
              placeholder="e.g. AI Automation & Prompt Engineering Fundamentals"
              value={bankTitle}
              onChange={(e) => setBankTitle(e.target.value)}
              required
            />

            <Select
              label="Associated Programme (Optional)"
              options={[
                { value: '', label: 'None (Global Repository)' },
                ...programmes.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={bankProgId}
              onChange={(e) => setBankProgId(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Description / Scope
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of skills tested in this bank..."
                value={bankDesc}
                onChange={(e) => setBankDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveBank}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Save Question Bank
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- QUESTION ADD/EDIT MODAL --- */}
      {isQModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsQModalOpen(false)}
          title={editingQ ? 'Edit Question' : 'Add Question to Bank'}
          description={`Target Bank: ${selectedBank?.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Question Type"
                options={[
                  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
                  { value: 'TRUE_FALSE', label: 'True / False' },
                ]}
                value={qType}
                onChange={(e) => {
                  const val = e.target.value as QuestionType;
                  setQType(val);
                  if (val === 'TRUE_FALSE') {
                    setQCorrectId('true');
                  } else {
                    setQCorrectId('c1');
                  }
                }}
              />

              <Input
                label="Points Weight"
                type="number"
                min={1}
                max={100}
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter objective test question..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Multiple Choice Options */}
            {qType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Option Choices & Correct Answer Selector
                </label>
                {qChoices.map((choice, i) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={qCorrectId === choice.id}
                      onChange={() => setQCorrectId(choice.id)}
                      className="text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={choice.text}
                      onChange={(e) => {
                        const newC = [...qChoices];
                        newC[i].text = e.target.value;
                        setQChoices(newC);
                      }}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* True / False Selection */}
            {qType === 'TRUE_FALSE' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Correct Answer
                </label>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={qCorrectId === 'true'}
                      onChange={() => setQCorrectId('true')}
                    />
                    <span>True</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={qCorrectId === 'false'}
                      onChange={() => setQCorrectId('false')}
                    />
                    <span>False</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Answer Explanation (Shown to Candidate Post-Test)
              </label>
              <textarea
                rows={2}
                placeholder="Explain why the answer is correct..."
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsQModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveQuestion}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Save Question
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- ASSESSMENT CONFIG MODAL --- */}
      {isAssessmentModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAssessmentModalOpen(false)}
          title={editingAssessment ? 'Edit Assessment Settings' : 'Create Assessment Configuration'}
          description="Configure objective testing parameters, duration, threshold, and question sources."
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <Input
              label="Assessment Title"
              placeholder="e.g. AI Automation Skills Exam"
              value={asstTitle}
              onChange={(e) => setAsstTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Candidate instructions..."
                value={asstDesc}
                onChange={(e) => setAsstDesc(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Programme Target"
                options={[
                  { value: '', label: 'All Programmes' },
                  ...programmes.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={asstProgId}
                onChange={(e) => setAsstProgId(e.target.value)}
              />

              <Select
                label="Target Question Bank Source"
                options={[
                  { value: '', label: 'Select Bank Source' },
                  ...banks.map((b) => ({ value: b.id, label: `${b.title} (${b.questionCount} Qs)` })),
                ]}
                value={asstBankId}
                onChange={(e) => setAsstBankId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Duration (Minutes)"
                type="number"
                min={0}
                placeholder="0 = Unlimited"
                value={asstDuration}
                onChange={(e) => setAsstDuration(Number(e.target.value))}
              />

              <Input
                label="Pass Threshold (%)"
                type="number"
                min={1}
                max={100}
                value={asstPassThreshold}
                onChange={(e) => setAsstPassThreshold(Number(e.target.value))}
              />

              <Input
                label="Max Allowed Attempts"
                type="number"
                min={1}
                placeholder="e.g. 1, 2, or 3"
                value={asstMaxAttempts}
                onChange={(e) => setAsstMaxAttempts(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <Select
                label="Availability Status"
                options={[
                  { value: 'PUBLISHED', label: 'PUBLISHED (Active)' },
                  { value: 'DRAFT', label: 'DRAFT' },
                  { value: 'CLOSED', label: 'CLOSED' },
                ]}
                value={asstAvailability}
                onChange={(e) => setAsstAvailability(e.target.value as AssessmentAvailability)}
              />

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="randQ"
                  checked={asstRandomizeQ}
                  onChange={(e) => setAsstRandomizeQ(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="randQ" className="text-xs font-semibold text-slate-800">
                  Randomize Questions Order for Candidates
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsAssessmentModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAssessment}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Save Assessment Settings
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- ATTEMPT REVIEW MODAL --- */}
      {selectedAttempt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAttempt(null)}
          title={`Attempt Breakdown — ${selectedAttempt.userName}`}
          description={`Assessment: ${selectedAttempt.assessmentTitle} • Status: ${selectedAttempt.status}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Score</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedAttempt.score} / {selectedAttempt.maxScore}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Percentage</span>
                <span className="font-bold text-slate-900 text-sm">{selectedAttempt.percentage}%</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Outcome</span>
                <Badge variant={selectedAttempt.passed ? 'success' : 'danger'}>
                  {selectedAttempt.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Answer Choices Log
              </h4>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
                {Object.entries(selectedAttempt.answers || {}).map(([qId, choiceId]) => (
                  <div key={qId} className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">Question ID #{qId.substring(0, 8)}</span>
                    <span className="font-bold text-slate-900">Selected Answer: {choiceId}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedAttempt(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
