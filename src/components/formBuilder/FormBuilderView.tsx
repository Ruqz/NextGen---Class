import React, { useState, useEffect } from 'react';
import {
  ApplicationFormTemplate,
  FormField,
  FormSection,
  Programme,
  Cohort,
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

  // Subscribe to forms for selected programme
  useEffect(() => {
    if (!selectedProgrammeId) return;

    const unsubscribe = subscribeToFormTemplates((formList) => {
      setForms(formList);
      if (formList.length > 0) {
        setCurrentForm(formList[0]);
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
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentForm.fields.length) return;

    const fields = [...currentForm.fields];
    const temp = fields[index];
    fields[index] = fields[targetIdx];
    fields[targetIdx] = temp;

    const reordered = fields.map((f, i) => ({ ...f, order: i + 1 }));
    setCurrentForm({ ...currentForm, fields: reordered });
    updateFormTemplate(currentForm.id, { fields: reordered });
  };

  const handleToggleFieldActive = (fieldId: string) => {
    if (!currentForm) return;
    const updatedFields = currentForm.fields.map((f) =>
      f.id === fieldId ? { ...f, active: !f.active } : f
    );
    setCurrentForm({ ...currentForm, fields: updatedFields });
    updateFormTemplate(currentForm.id, { fields: updatedFields });
  };

  // --- SECTION MANIPULATION ---
  const handleSaveSections = (newSections: FormSection[]) => {
    if (!currentForm) return;
    setCurrentForm({ ...currentForm, sections: newSections });
    updateFormTemplate(currentForm.id, { sections: newSections });
    setNotification({ type: 'success', message: 'Sections updated.' });
  };

  // --- FORM LIFECYCLE ACTIONS ---
  const handlePublish = async () => {
    if (!currentForm) return;
    try {
      setIsLoading(true);
      const newVersion = await publishForm(currentForm.id);
      setNotification({
        type: 'success',
        message: `Form template published successfully! (Form Version v${newVersion})`,
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
      setNotification({ type: 'success', message: 'Form cloned as draft template.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to clone form' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!currentForm) return;
    if (!confirm('Are you sure you want to archive this application form?')) return;
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

  const currentProgramme = programmes.find((p) => p.id === selectedProgrammeId);

  return (
    <div className="space-y-6">
      {/* Header Selector & Metadata */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-600" /> Application Form Builder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Build, version, and customize dynamic application questions without code changes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProgrammeId}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  Programme: {p.name}
                </option>
              ))}
            </select>

            {forms.length > 1 && (
              <select
                value={currentForm?.id || ''}
                onChange={(e) => handleSelectForm(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} (v{f.version} - {f.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Current Form Overview Banner */}
        {currentForm && (
          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentForm.title}</span>
                <Badge
                  variant={
                    currentForm.status === 'PUBLISHED'
                      ? 'success'
                      : currentForm.status === 'DRAFT'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  Version v{currentForm.version} • {currentForm.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{currentForm.description}</p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(true)}
                className="text-slate-900 bg-white hover:bg-slate-100"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSectionModalOpen(true)}
                className="text-slate-900 bg-white hover:bg-slate-100"
              >
                <FolderPlus className="w-3.5 h-3.5" /> Sections ({currentForm.sections?.length || 0})
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setIsFieldModalOpen(true);
                }}
                className="bg-orange-600 hover:bg-orange-500"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </Button>

              {currentForm.status === 'PUBLISHED' ? (
                <Button variant="outline" size="sm" onClick={handleUnpublish} isLoading={isLoading}>
                  <Lock className="w-3.5 h-3.5" /> Unpublish
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  isLoading={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Globe className="w-3.5 h-3.5" /> Publish Form
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleClone} isLoading={isLoading}>
                <Copy className="w-3.5 h-3.5" /> Clone
              </Button>

              <Button variant="outline" size="sm" onClick={handleArchive} isLoading={isLoading}>
                <Archive className="w-3.5 h-3.5" /> Archive
              </Button>
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
                    <p className="text-xs text-slate-400 italic py-2">
                      No questions in this section yet. Click "Add Question" above to add one.
                    </p>
                  ) : (
                    sectionFields.map((field, idx) => (
                      <div
                        key={field.id}
                        className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                          !field.active ? 'opacity-40 bg-slate-50/50' : ''
                        }`}
                      >
                        <div className="space-y-1 flex-1">
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
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {field.fieldType.replace('_', ' ')}
                            </Badge>

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
                              Options: {field.options.join(' • ')}
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
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveField(idx, 'down')}
                            disabled={idx === sectionFields.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
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
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateField(field)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteField(field.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
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
    </div>
  );
};
