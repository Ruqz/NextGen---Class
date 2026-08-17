import React, { useState, useEffect } from 'react';
import {
  ApplicationFormTemplate,
  FormField,
  FormSection,
  Programme,
  Cohort,
  FormCategory,
  FormStudyResource,
  CohortAssessmentState,
} from '../../types';
import {
  subscribeToFormTemplates,
  createFormTemplate,
  updateFormTemplate,
  publishForm,
  unpublishForm,
  cloneForm,
  archiveForm,
  seedDefaultFormIfEmpty,
} from '../../services/formBuilder';
import { FormFieldEditorModal } from './FormFieldEditorModal';
import { SectionManagerModal } from './SectionManagerModal';
import { FormPreviewModal } from './FormPreviewModal';
import { QuestionBankUploadModal } from './QuestionBankUploadModal';
import { downloadQuestionBankTemplate } from '../../services/questionBankParser';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import {
  Plus,
  Sliders,
  FolderPlus,
  Eye,
  CheckCircle2,
  Copy,
  Archive,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Sparkles,
  GitBranch,
  FileCheck,
  Globe,
  Lock,
  Upload,
  Download,
  Award,
  Clock,
  BookOpen,
  PlayCircle,
  StopCircle,
  FileSpreadsheet,
  GripVertical,
  Check,
} from 'lucide-react';

interface FormBuilderViewProps {
  programmes: Programme[];
  cohorts: Cohort[];
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  programmes,
  cohorts,
}) => {
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(
    programmes[0]?.id || ''
  );
  const [forms, setForms] = useState<ApplicationFormTemplate[]>([]);
  const [currentForm, setCurrentForm] = useState<ApplicationFormTemplate | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isUploadBankModalOpen, setIsUploadBankModalOpen] = useState(false);

  // New Form Creation Modal State
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormCategory, setNewFormCategory] = useState<FormCategory>('APPLICANT_APPLICATION');

  // Study Resource Attachment Modal State
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceRequired, setResourceRequired] = useState(false);

  // Subscribe to forms for selected programme
  useEffect(() => {
    if (!selectedProgrammeId) return;

    const unsubscribe = subscribeToFormTemplates((formList) => {
      setForms(formList);
      if (formList.length > 0) {
        // Keep current selected form if it exists in list, otherwise default to first
        setCurrentForm((prev) => {
          if (prev) {
            const found = formList.find((f) => f.id === prev.id);
            if (found) return found;
          }
          return formList[0];
        });
      } else {
        // Auto seed default form template
        const prog = programmes.find((p) => p.id === selectedProgrammeId);
        if (prog) {
          seedDefaultFormIfEmpty(prog.id, prog.name).then(() => {
            console.log('Default form seeded');
          });
        }
      }
    }, selectedProgrammeId);

    return () => unsubscribe();
  }, [selectedProgrammeId, programmes]);

  const handleProgrammeChange = (progId: string) => {
    setSelectedProgrammeId(progId);
  };

  const handleSelectForm = (formId: string) => {
    const f = forms.find((item) => item.id === formId);
    if (f) setCurrentForm(f);
  };

  // --- CREATE NEW FORM TEMPLATE ---
  const handleCreateNewForm = async () => {
    if (!newFormTitle.trim() || !selectedProgrammeId) return;

    const prog = programmes.find((p) => p.id === selectedProgrammeId);
    const isAssessment = newFormCategory === 'APPLICANT_ASSESSMENT';

    try {
      setIsLoading(true);
      const newId = await createFormTemplate({
        programmeId: selectedProgrammeId,
        programmeName: prog?.name || 'Programme',
        title: newFormTitle.trim(),
        description: isAssessment
          ? 'Pre-admission psychometric & technical readiness assessment examination.'
          : 'Candidate application and registration form.',
        category: newFormCategory,
        version: 1,
        status: 'DRAFT',
        isAssessment,
        durationMinutes: isAssessment ? 45 : undefined,
        passThresholdPercentage: isAssessment ? 70 : undefined,
        cohortAssessmentState: isAssessment ? 'DRAFT' : undefined,
        sections: [
          {
            id: `sec_${Date.now()}`,
            title: isAssessment ? '1. General Aptitude & Technical Questions' : '1. General Information',
            order: 1,
          },
        ],
        fields: [],
      });

      setIsCreateFormModalOpen(false);
      setNewFormTitle('');
      setNotification({ type: 'success', message: 'New form template created successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create form template.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- FIELD MANIPULATION ---
  const handleSaveField = (savedField: FormField) => {
    if (!currentForm) return;

    let updatedFields = [...currentForm.fields];
    const exists = updatedFields.some((f) => f.id === savedField.id);

    if (exists) {
      updatedFields = updatedFields.map((f) => (f.id === savedField.id ? savedField : f));
    } else {
      updatedFields.push(savedField);
    }

    const updated = {
      ...currentForm,
      fields: updatedFields,
    };

    setCurrentForm(updated);
    updateFormTemplate(currentForm.id, { fields: updatedFields });
    setNotification({ type: 'success', message: 'Question saved successfully.' });
  };

  const handleDeleteField = (fieldId: string) => {
    if (!currentForm) return;
    const updatedFields = currentForm.fields.filter((f) => f.id !== fieldId);
    setCurrentForm({ ...currentForm, fields: updatedFields });
    updateFormTemplate(currentForm.id, { fields: updatedFields });
    setNotification({ type: 'success', message: 'Question deleted.' });
  };

  const handleDuplicateField = (field: FormField) => {
    if (!currentForm) return;
    const duplicatedField: FormField = {
      ...field,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${field.label} (Copy)`,
      order: currentForm.fields.length + 1,
    };
    const updatedFields = [...currentForm.fields, duplicatedField];
    setCurrentForm({ ...currentForm, fields: updatedFields });
    updateFormTemplate(currentForm.id, { fields: updatedFields });
    setNotification({ type: 'success', message: 'Question duplicated.' });
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!currentForm) return;
    const currentFields = currentForm.fields || [];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentFields.length) return;

    const fields = [...currentFields];
    const temp = fields[index];
    fields[index] = fields[targetIdx];
    fields[targetIdx] = temp;

    const reordered = fields.map((f, i) => ({ ...f, order: i + 1 }));
    setCurrentForm({ ...currentForm, fields: reordered });
    updateFormTemplate(currentForm.id, { fields: reordered });
  };

  const handleToggleFieldActive = (fieldId: string) => {
    if (!currentForm) return;
    const updatedFields = (currentForm.fields || []).map((f) =>
      f.id === fieldId ? { ...f, active: !f.active } : f
    );
    setCurrentForm({ ...currentForm, fields: updatedFields });
    updateFormTemplate(currentForm.id, { fields: updatedFields });
  };

  // --- IMPORT QUESTIONS FROM QUESTION BANK UPLOAD MODAL ---
  const handleImportQuestions = (
    importedFields: FormField[],
    newSections?: FormSection[]
  ) => {
    if (!currentForm) return;

    const updatedSections = newSections
      ? [...(currentForm.sections || []), ...newSections]
      : currentForm.sections || [];

    const updatedFields = [...(currentForm.fields || []), ...importedFields].map((f, idx) => ({
      ...f,
      order: idx + 1,
    }));

    const updated = {
      ...currentForm,
      sections: updatedSections,
      fields: updatedFields,
    };

    setCurrentForm(updated);
    updateFormTemplate(currentForm.id, {
      sections: updatedSections,
      fields: updatedFields,
    });

    setNotification({
      type: 'success',
      message: `Successfully imported ${importedFields.length} questions into "${currentForm.title}"!`,
    });
  };

  // --- SECTION MANIPULATION ---
  const handleSaveSections = (newSections: FormSection[]) => {
    if (!currentForm) return;
    setCurrentForm({ ...currentForm, sections: newSections });
    updateFormTemplate(currentForm.id, { sections: newSections });
    setNotification({ type: 'success', message: 'Sections updated.' });
  };

  // --- ASSESSMENT STATE TOGGLE (SYNCHRONOUS COHORT ASSESSMENT) ---
  const handleToggleAssessmentState = async (nextState: CohortAssessmentState) => {
    if (!currentForm) return;
    try {
      setIsLoading(true);
      await updateFormTemplate(currentForm.id, {
        cohortAssessmentState: nextState,
      });
      setCurrentForm({ ...currentForm, cohortAssessmentState: nextState });
      setNotification({
        type: 'success',
        message:
          nextState === 'OPEN'
            ? 'Assessment is now OPEN in real-time for all enrolled candidates!'
            : nextState === 'CLOSED'
            ? 'Assessment has been CLOSED.'
            : `Assessment state updated to ${nextState}.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update assessment state' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORM LIFECYCLE ACTIONS ---
  const handlePublish = async () => {
    if (!currentForm) return;
    try {
      setIsLoading(true);
      const newVersion = await publishForm(currentForm.id);
      setNotification({
        type: 'success',
        message: `Form template published successfully! (Version v${newVersion})`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to publish form' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentForm) return;
    try {
      setIsLoading(true);
      await unpublishForm(currentForm.id);
      setNotification({ type: 'success', message: 'Form unpublished.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to unpublish' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async () => {
    if (!currentForm) return;
    try {
      setIsLoading(true);
      const newId = await cloneForm(currentForm.id);
      setNotification({ type: 'success', message: 'Form cloned as a new draft template.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to clone form' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!currentForm) return;
    if (!confirm('Are you sure you want to archive this form template?')) return;
    try {
      setIsLoading(true);
      await archiveForm(currentForm.id);
      setNotification({ type: 'success', message: 'Form archived.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to archive form' });
    } finally {
      setIsLoading(false);
    }
  };

  // Study resource upload simulation
  const handleAddStudyResource = () => {
    if (!currentForm || !resourceTitle.trim() || !resourceFile) return;

    const newRes: FormStudyResource = {
      id: `res_${Date.now()}`,
      title: resourceTitle.trim(),
      url: URL.createObjectURL(resourceFile),
      fileType: resourceFile.name.split('.').pop()?.toUpperCase() || 'PDF',
      requiredBeforeAssessment: resourceRequired,
      downloadAllowed: true,
    };

    const updatedResources = [...(currentForm.studyResources || []), newRes];
    setCurrentForm({ ...currentForm, studyResources: updatedResources });
    updateFormTemplate(currentForm.id, { studyResources: updatedResources });

    setIsResourceModalOpen(false);
    setResourceTitle('');
    setResourceFile(null);
    setResourceRequired(false);
    setNotification({ type: 'success', message: 'Study resource attached successfully.' });
  };

  const handleRemoveStudyResource = (resId: string) => {
    if (!currentForm) return;
    const updated = (currentForm.studyResources || []).filter((r) => r.id !== resId);
    setCurrentForm({ ...currentForm, studyResources: updated });
    updateFormTemplate(currentForm.id, { studyResources: updated });
  };

  // Calculate totals
  const totalQuestions = currentForm?.fields?.length || 0;
  const totalMarks = (currentForm?.fields || []).reduce((acc, f) => acc + (f.points || 10), 0);
  const isAssessment = currentForm?.isAssessment || currentForm?.category === 'APPLICANT_ASSESSMENT';

  return (
    <div className="space-y-6">
      {/* Header Selector & Form Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Form Builder & Question Bank Manager</h2>
                <p className="text-xs text-slate-500">
                  Build dynamic application forms, candidate assessments, and question banks with AI fidelity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Programme Selector */}
            <select
              value={selectedProgrammeId}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  Programme: {p.name}
                </option>
              ))}
            </select>

            {/* Template Selector */}
            {forms.length > 0 && (
              <select
                value={currentForm?.id || ''}
                onChange={(e) => handleSelectForm(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} ({f.category || 'FORM'} • v{f.version})
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateFormModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4 text-orange-600" />}
              className="text-xs font-bold whitespace-nowrap"
            >
              New Form Template
            </Button>
          </div>
        </div>

        {/* Current Form Overview Banner */}
        {currentForm && (
          <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">{currentForm.title}</h3>
                  <Badge
                    variant={
                      currentForm.status === 'PUBLISHED'
                        ? 'success'
                        : currentForm.status === 'DRAFT'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="text-[11px] uppercase font-bold"
                  >
                    {currentForm.status} • v{currentForm.version}
                  </Badge>

                  <span className="text-[11px] font-bold text-orange-400 bg-orange-950/80 border border-orange-800 px-2 py-0.5 rounded">
                    {currentForm.category || 'APPLICATION_FORM'}
                  </span>

                  <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {totalQuestions} Questions • {totalMarks} Total Marks
                  </span>
                </div>

                <p className="text-xs text-slate-400 max-w-2xl">{currentForm.description}</p>
              </div>

              {/* Assessment Controls for Synchronous Cohorts */}
              {isAssessment && (
                <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl flex items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Cohort State</p>
                    <p className="text-xs font-black text-orange-400">
                      {currentForm.cohortAssessmentState || 'DRAFT'}
                    </p>
                  </div>

                  {currentForm.cohortAssessmentState !== 'OPEN' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleToggleAssessmentState('OPEN')}
                      disabled={isLoading}
                      leftIcon={<PlayCircle className="w-3.5 h-3.5 text-white" />}
                      className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs py-1.5"
                    >
                      Open Assessment
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleToggleAssessmentState('CLOSED')}
                      disabled={isLoading}
                      leftIcon={<StopCircle className="w-3.5 h-3.5 text-white" />}
                      className="bg-rose-600 hover:bg-rose-500 font-bold text-xs py-1.5"
                    >
                      Close Assessment
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Main Form Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                {/* Manual Add Question */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingField(null);
                    setIsFieldModalOpen(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-500 font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </Button>

                {/* Bulk Question Bank Upload */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadBankModalOpen(true)}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs border-orange-400"
                >
                  <Upload className="w-3.5 h-3.5 text-orange-600 mr-1" /> Upload Question Bank
                </Button>

                {/* Download CSV Template */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadQuestionBankTemplate}
                  className="text-xs text-slate-300 hover:text-white font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Download CSV Template
                </Button>

                {/* Section Manager */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSectionModalOpen(true)}
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border-slate-700 font-semibold"
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1" /> Sections ({currentForm.sections?.length || 0})
                </Button>

                {/* Study Resources Attachment for Assessments */}
                {isAssessment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsResourceModalOpen(true)}
                    className="bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border-slate-700 font-semibold"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-400 mr-1" /> Study Resources ({currentForm.studyResources?.length || 0})
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                </Button>

                {currentForm.status === 'PUBLISHED' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnpublish}
                    disabled={isLoading}
                    className="bg-slate-800 text-amber-400 border-amber-800 hover:bg-slate-700 text-xs"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" /> Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePublish}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
                  >
                    <Globe className="w-3.5 h-3.5 mr-1" /> Publish Form
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClone}
                  disabled={isLoading}
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Clone
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isLoading}
                  className="bg-slate-800 text-rose-400 border-rose-900/50 hover:bg-slate-700 text-xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {notification && (
        <Alert
          type={notification.type}
          onDismiss={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      {/* Attached Study Resources Section for Assessments */}
      {isAssessment && currentForm?.studyResources && currentForm.studyResources.length > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Attached Study & Assessment Resources
            </h4>
            <span className="text-[11px] text-blue-700">
              Candidates can access these materials in the Applicant Portal before taking the assessment.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {currentForm.studyResources.map((res) => (
              <div
                key={res.id}
                className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">{res.title}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Format: {res.fileType || 'PDF'} {res.requiredBeforeAssessment && '• Required Reading'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStudyResource(res.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions List grouped by Sections */}
      {currentForm && (
        <div className="space-y-6">
          {(currentForm.sections || []).sort((a, b) => a.order - b.order).map((sec) => {
            const sectionFields = (currentForm.fields || [])
              .filter((f) => f.sectionId === sec.id || (!f.sectionId && sec.order === 1))
              .sort((a, b) => a.order - b.order);

            return (
              <div
                key={sec.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                    {sec.description && (
                      <p className="text-xs text-slate-500">{sec.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {sectionFields.length} Questions
                  </span>
                </div>

                <div className="p-6 divide-y divide-slate-100">
                  {sectionFields.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-xs text-slate-400 italic">
                        No questions in this section yet.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingField(null);
                            setIsFieldModalOpen(true);
                          }}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Question
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsUploadBankModalOpen(true)}
                          className="text-xs text-orange-600 border-orange-300"
                        >
                          <Upload className="w-3 h-3 mr-1" /> Upload Question Bank
                        </Button>
                      </div>
                    </div>
                  ) : (
                    sectionFields.map((field, idx) => (
                      <div
                        key={field.id}
                        className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                          !field.active ? 'opacity-40 bg-slate-50/50' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                              {field.fieldType.replace('_', ' ')}
                            </Badge>

                            {field.points !== undefined && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {field.points} Marks
                              </span>
                            )}

                            {field.correctAnswer && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Key: {field.correctAnswer}
                              </span>
                            )}

                            {field.conditionalLogic && (
                              <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                                <GitBranch className="w-3 h-3" /> Conditional Rule
                              </Badge>
                            )}

                            {field.fieldType === 'file_upload' && field.fileConfig && (
                              <Badge variant="info" className="text-[10px] flex items-center gap-1">
                                <FileCheck className="w-3 h-3" /> Max {(field.fileConfig.maxSizeBytes / (1024*1024)).toFixed(0)}MB
                              </Badge>
                            )}
                          </div>

                          {field.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {field.description}
                            </p>
                          )}

                          {field.options && field.options.length > 0 && (
                            <p className="text-[11px] text-slate-400">
                              Choices: {field.options.join(' • ')}
                            </p>
                          )}
                        </div>

                        {/* Question Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, 'down')}
                            disabled={idx === sectionFields.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFieldActive(field.id)}
                            className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                              field.active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {field.active ? 'Active' : 'Disabled'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingField(field);
                              setIsFieldModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-orange-600 rounded hover:bg-orange-50 cursor-pointer"
                            title="Edit Question"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateField(field)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Field Editor Modal */}
      {currentForm && (
        <FormFieldEditorModal
          field={editingField}
          sections={currentForm.sections || []}
          allFields={currentForm.fields || []}
          isOpen={isFieldModalOpen}
          onClose={() => {
            setIsFieldModalOpen(false);
            setEditingField(null);
          }}
          onSave={handleSaveField}
        />
      )}

      {/* Question Bank Upload Modal */}
      {currentForm && (
        <QuestionBankUploadModal
          isOpen={isUploadBankModalOpen}
          onClose={() => setIsUploadBankModalOpen(false)}
          onImportQuestions={handleImportQuestions}
          existingFields={currentForm.fields || []}
          existingSections={currentForm.sections || []}
          programmeName={programmes.find((p) => p.id === selectedProgrammeId)?.name || 'General'}
        />
      )}

      {/* Section Manager Modal */}
      {currentForm && (
        <SectionManagerModal
          sections={currentForm.sections || []}
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          onSave={handleSaveSections}
        />
      )}

      {/* Preview Modal */}
      {currentForm && (
        <FormPreviewModal
          fields={currentForm.fields || []}
          sections={currentForm.sections || []}
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          formTitle={currentForm.title}
        />
      )}

      {/* Create New Form Modal */}
      {isCreateFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New Form Template</h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Form Title</label>
              <input
                type="text"
                placeholder="e.g. AI & Automation Cohort 5 Assessment"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Form Category</label>
              <select
                value={newFormCategory}
                onChange={(e) => setNewFormCategory(e.target.value as FormCategory)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="APPLICANT_APPLICATION">Applicant Application Form</option>
                <option value="APPLICANT_ASSESSMENT">Applicant Assessment Examination</option>
                <option value="LEARNER_FEEDBACK">Learner Feedback Form</option>
                <option value="PROGRAMME_FEEDBACK">Programme Evaluation Form</option>
                <option value="GENERAL_FORM">General Survey / Form</option>
                <option value="OTHER">Other Form Type</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateFormModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateNewForm}
                disabled={!newFormTitle.trim() || isLoading}
                className="bg-orange-600 hover:bg-orange-500 font-bold text-xs"
              >
                Create Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Study Resource Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Attach Assessment Study Resource
            </h3>
            <p className="text-xs text-slate-500">
              Upload PDF guide, curriculum syllabus, or reading material for applicants preparing for this assessment.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Resource Title</label>
              <input
                type="text"
                placeholder="e.g. Machine Learning Pre-Assessment Preparation Guide"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Upload Document (PDF / DOC)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResourceFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={resourceRequired}
                onChange={(e) => setResourceRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              Required reading before starting assessment
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsResourceModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddStudyResource}
                disabled={!resourceTitle.trim() || !resourceFile}
                className="bg-blue-600 hover:bg-blue-500 font-bold text-xs"
              >
                Attach Resource
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
