import React, { useState, useEffect } from 'react';
import {
  FormField,
  FormSection,
  UploadedFileMeta,
} from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  HelpCircle,
  FileCheck,
  Link as LinkIcon,
  Phone,
  Mail,
  Info,
} from 'lucide-react';

interface DynamicFormRendererProps {
  fields: FormField[];
  sections: FormSection[];
  isPreviewMode?: boolean;
  onSubmit: (answers: Record<string, any>, files: Record<string, UploadedFileMeta[]>) => void;
  isSubmitting?: boolean;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  sections,
  isPreviewMode = false,
  onSubmit,
  isSubmitting = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileMeta[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Evaluate visible fields based on conditional logic
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.active) return false;
    if (!field.conditionalLogic) return true;

    const { dependsOnFieldId, operator, value, action } = field.conditionalLogic;
    const parentVal = answers[dependsOnFieldId];

    let conditionMet = false;
    if (operator === 'equals') {
      conditionMet = String(parentVal || '').trim().toLowerCase() === String(value || '').trim().toLowerCase();
    } else if (operator === 'not_equals') {
      conditionMet = String(parentVal || '').trim().toLowerCase() !== String(value || '').trim().toLowerCase();
    } else if (operator === 'contains') {
      if (Array.isArray(parentVal)) {
        conditionMet = parentVal.includes(value);
      } else {
        conditionMet = String(parentVal || '').toLowerCase().includes(String(value || '').toLowerCase());
      }
    } else if (operator === 'is_empty') {
      conditionMet = parentVal === undefined || parentVal === null || parentVal === '' || (Array.isArray(parentVal) && parentVal.length === 0);
    } else if (operator === 'is_not_empty') {
      conditionMet = parentVal !== undefined && parentVal !== null && parentVal !== '' && (!Array.isArray(parentVal) || parentVal.length > 0);
    }

    return action === 'show' ? conditionMet : !conditionMet;
  };

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleMultipleChoiceChange = (fieldId: string, option: string, checked: boolean) => {
    const currentList: string[] = Array.isArray(answers[fieldId]) ? answers[fieldId] : [];
    if (checked) {
      setAnswers((prev) => ({ ...prev, [fieldId]: [...currentList, option] }));
    } else {
      setAnswers((prev) => ({ ...prev, [fieldId]: currentList.filter((o) => o !== option) }));
    }
  };

  const handleFileUpload = (field: FormField, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const config = field.fileConfig || {
      allowedTypes: ['pdf', 'doc', 'docx', 'png', 'jpg'],
      maxSizeBytes: 5242880,
      maxFiles: 1,
    };

    const newFilesList: UploadedFileMeta[] = [...(uploadedFiles[field.id] || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (config.allowedTypes.length > 0 && !config.allowedTypes.map(t => t.toLowerCase()).includes(ext)) {
        setError(`File "${file.name}" type is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
        return;
      }

      if (file.size > config.maxSizeBytes) {
        const sizeMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
        setError(`File "${file.name}" exceeds the maximum allowed limit of ${sizeMB}MB.`);
        return;
      }

      if (newFilesList.length >= (config.maxFiles || 1)) {
        setError(`Maximum limit of ${config.maxFiles} file(s) reached for this field.`);
        return;
      }

      // Convert file to Base64 Data URL for standalone client storage or display
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const fileMeta: UploadedFileMeta = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || ext,
          url,
          uploadedAt: new Date().toISOString(),
        };

        setUploadedFiles((prev) => ({
          ...prev,
          [field.id]: [...(prev[field.id] || []), fileMeta],
        }));
      };
      reader.readAsDataURL(file);
    }

    setError(null);
  };

  const handleRemoveFile = (fieldId: string, fileId: string) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] || []).filter((f) => f.id !== fileId),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isPreviewMode) {
      alert('This is a Form Preview Mode. Submission disabled.');
      return;
    }

    // Validate visible fields
    const visibleFields = fields.filter(isFieldVisible);

    for (const field of visibleFields) {
      if (field.fieldType === 'info_text') continue;

      if (field.required) {
        if (field.fieldType === 'file_upload') {
          const files = uploadedFiles[field.id] || [];
          if (files.length === 0) {
            setError(`Please upload the required file for: "${field.label}"`);
            return;
          }
        } else if (field.fieldType === 'checkbox') {
          if (!answers[field.id]) {
            setError(`Please accept the required terms: "${field.label}"`);
            return;
          }
        } else if (field.fieldType === 'multiple_choice') {
          const vals = answers[field.id];
          if (!vals || !Array.isArray(vals) || vals.length === 0) {
            setError(`Please select at least one option for: "${field.label}"`);
            return;
          }
        } else {
          const val = answers[field.id];
          if (val === undefined || val === null || String(val).trim() === '') {
            setError(`Please answer the required field: "${field.label}"`);
            return;
          }
        }
      }

      // Character limit check
      if (
        ['text', 'textarea'].includes(field.fieldType) &&
        field.characterLimit &&
        answers[field.id] &&
        String(answers[field.id]).length > field.characterLimit
      ) {
        setError(
          `Field "${field.label}" exceeds character limit of ${field.characterLimit} (Current: ${String(answers[field.id]).length})`
        );
        return;
      }
    }

    onSubmit(answers, uploadedFiles);
  };

  // Group active visible fields by section
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <Alert type="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {sortedSections.map((sec) => {
        const sectionFields = sortedFields.filter(
          (f) => (f.sectionId === sec.id || (!f.sectionId && sec.order === 1)) && isFieldVisible(f)
        );

        if (sectionFields.length === 0) return null;

        return (
          <div key={sec.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{sec.title}</h2>
              {sec.description && <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>}
            </div>

            <div className="space-y-5">
              {sectionFields.map((q) => (
                <div key={q.id} className="space-y-1.5 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  {q.fieldType !== 'info_text' && (
                    <label className="block text-xs font-semibold text-slate-900">
                      {q.label} {q.required && <span className="text-rose-500">*</span>}
                    </label>
                  )}

                  {q.description && (
                    <p className="text-[11px] text-slate-500 mb-2">{q.description}</p>
                  )}

                  {/* 1. Short Text */}
                  {q.fieldType === 'text' && (
                    <Input
                      placeholder={q.placeholder || 'Your response...'}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  {/* 2. Long Text */}
                  {q.fieldType === 'textarea' && (
                    <div>
                      <textarea
                        rows={4}
                        placeholder={q.placeholder || 'Type your response...'}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                      {q.characterLimit && (
                        <p className="text-[10px] text-right text-slate-400 mt-1">
                          {String(answers[q.id] || '').length} / {q.characterLimit} characters
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Email */}
                  {q.fieldType === 'email' && (
                    <Input
                      type="email"
                      placeholder={q.placeholder || 'email@domain.com'}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      leftIcon={<Mail className="w-4 h-4" />}
                    />
                  )}

                  {/* 4. Phone */}
                  {q.fieldType === 'phone' && (
                    <Input
                      type="tel"
                      placeholder={q.placeholder || '+234 800 000 0000'}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      leftIcon={<Phone className="w-4 h-4" />}
                    />
                  )}

                  {/* 5. Number */}
                  {q.fieldType === 'number' && (
                    <Input
                      type="number"
                      placeholder={q.placeholder || '0'}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  {/* 6. Date */}
                  {q.fieldType === 'date' && (
                    <Input
                      type="date"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      leftIcon={<Calendar className="w-4 h-4" />}
                    />
                  )}

                  {/* 7. Yes / No */}
                  {q.fieldType === 'yes_no' && (
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value="Yes"
                          checked={answers[q.id] === 'Yes'}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value="No"
                          checked={answers[q.id] === 'No'}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        No
                      </label>
                    </div>
                  )}

                  {/* 8. Single Choice */}
                  {q.fieldType === 'single_choice' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* 9. Multiple Choice */}
                  {q.fieldType === 'multiple_choice' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, idx) => {
                        const isChecked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
                        return (
                          <label key={idx} className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              value={opt}
                              checked={isChecked}
                              onChange={(e) => handleMultipleChoiceChange(q.id, opt, e.target.checked)}
                              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 10. Dropdown */}
                  {q.fieldType === 'dropdown' && (
                    <Select
                      options={[
                        { value: '', label: '-- Select Option --' },
                        ...(q.options || []).map((opt) => ({ value: opt, label: opt })),
                      ]}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  {/* 11. Checkbox */}
                  {q.fieldType === 'checkbox' && (
                    <label className="flex items-start gap-3 text-xs font-medium text-slate-800 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={!!answers[q.id]}
                        onChange={(e) => handleAnswerChange(q.id, e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span>{q.label}</span>
                    </label>
                  )}

                  {/* 12. URL */}
                  {q.fieldType === 'url' && (
                    <Input
                      type="url"
                      placeholder={q.placeholder || 'https://example.com'}
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      leftIcon={<LinkIcon className="w-4 h-4" />}
                    />
                  )}

                  {/* 13. File Upload */}
                  {q.fieldType === 'file_upload' && (
                    <div className="space-y-3 pt-1">
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-white hover:bg-slate-50 transition relative">
                        <UploadCloud className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-800">
                          Click to select or drag document here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {q.fileConfig?.uploadInstructions || 'Allowed files: PDF, DOC, Images max 5MB'}
                        </p>

                        <input
                          type="file"
                          multiple={(q.fileConfig?.maxFiles || 1) > 1}
                          onChange={(e) => handleFileUpload(q, e)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>

                      {/* File Listing */}
                      {(uploadedFiles[q.id] || []).length > 0 && (
                        <div className="space-y-2">
                          {(uploadedFiles[q.id] || []).map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                                <span className="text-[10px] text-slate-500">
                                  ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(q.id, file.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 14. Info Text */}
                  {q.fieldType === 'info_text' && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-orange-900">{q.label}</h4>
                        {q.description && <p className="text-xs text-orange-800 mt-1 leading-relaxed">{q.description}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Submission Panel */}
      {!isPreviewMode && (
        <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
          <p className="text-xs text-slate-300">
            Please verify all answers before final submission.
          </p>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            className="bg-orange-600 hover:bg-orange-500 font-bold"
          >
            Submit Application
          </Button>
        </div>
      )}
    </form>
  );
};
