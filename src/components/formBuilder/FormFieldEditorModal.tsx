import React, { useState } from 'react';
import {
  FormField,
  FormFieldType,
  FormSection,
  FileUploadConfig,
  ConditionalRule,
} from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  Plus,
  Trash2,
  X,
  Sliders,
  FileUp,
  GitBranch,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Award,
} from 'lucide-react';

interface FormFieldEditorModalProps {
  field: FormField | null;
  sections: FormSection[];
  allFields: FormField[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
}

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string; group: string }[] = [
  { value: 'text', label: 'Short Text (Single Line)', group: 'Text & Input' },
  { value: 'textarea', label: 'Long Text / Essay Paragraph', group: 'Text & Input' },
  { value: 'email', label: 'Email Address', group: 'Text & Input' },
  { value: 'phone', label: 'Phone / WhatsApp', group: 'Text & Input' },
  { value: 'number', label: 'Numeric Value', group: 'Text & Input' },
  { value: 'url', label: 'Website / Portfolio URL', group: 'Text & Input' },
  { value: 'date', label: 'Date Selector', group: 'Dates & Choices' },
  { value: 'yes_no', label: 'Yes / No Toggle', group: 'Dates & Choices' },
  { value: 'single_choice', label: 'Single Choice (Radio Buttons)', group: 'Dates & Choices' },
  { value: 'multiple_choice', label: 'Multiple Choice (Pick Options)', group: 'Dates & Choices' },
  { value: 'dropdown', label: 'Dropdown Selection', group: 'Dates & Choices' },
  { value: 'checkbox', label: 'Single Checkbox (Agreement)', group: 'Dates & Choices' },
  { value: 'file_upload', label: 'File Upload Document (PDF/DOC)', group: 'Attachments' },
  { value: 'info_text', label: 'Information Text / Instruction Block', group: 'Layout' },
];

export const FormFieldEditorModal: React.FC<FormFieldEditorModalProps> = ({
  field,
  sections,
  allFields,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'basic' | 'options' | 'grading' | 'file' | 'logic'>('basic');

  // Form Field State
  const [label, setLabel] = useState(field?.label || '');
  const [fieldType, setFieldType] = useState<FormFieldType>(field?.fieldType || 'multiple_choice');
  const [sectionId, setSectionId] = useState(field?.sectionId || (sections[0]?.id || ''));
  const [description, setDescription] = useState(field?.description || '');
  const [placeholder, setPlaceholder] = useState(field?.placeholder || '');
  const [required, setRequired] = useState(field?.required ?? true);
  const [active, setActive] = useState(field?.active ?? true);
  const [characterLimit, setCharacterLimit] = useState<number | undefined>(field?.characterLimit);

  // Grading / Assessment State
  const [correctAnswer, setCorrectAnswer] = useState(field?.correctAnswer || '');
  const [points, setPoints] = useState<number>(field?.points ?? 10);
  const [explanation, setExplanation] = useState(field?.explanation || '');
  const [gradingMode, setGradingMode] = useState<'auto' | 'manual'>(field?.gradingMode || 'auto');

  // Options State for Choices
  const [options, setOptions] = useState<string[]>(
    field?.options || (['true_false', 'yes_no'].includes(fieldType) ? ['Yes', 'No'] : ['Option A', 'Option B', 'Option C', 'Option D'])
  );
  const [newOptionText, setNewOptionText] = useState('');

  // File Upload Config State
  const [fileTypes, setFileTypes] = useState<string[]>(
    field?.fileConfig?.allowedTypes || ['pdf', 'doc', 'docx']
  );
  const [maxSizeMB, setMaxSizeMB] = useState<number>(
    field?.fileConfig?.maxSizeBytes ? Math.round(field.fileConfig.maxSizeBytes / (1024 * 1024)) : 5
  );
  const [maxFiles, setMaxFiles] = useState<number>(field?.fileConfig?.maxFiles || 1);
  const [uploadInstructions, setUploadInstructions] = useState(
    field?.fileConfig?.uploadInstructions || 'Upload PDF or Word document up to 5MB'
  );

  // Conditional Logic State
  const [enableLogic, setEnableLogic] = useState<boolean>(!!field?.conditionalLogic);
  const [dependsOnFieldId, setDependsOnFieldId] = useState<string>(
    field?.conditionalLogic?.dependsOnFieldId || ''
  );
  const [logicOperator, setLogicOperator] = useState<
    'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty'
  >(field?.conditionalLogic?.operator || 'equals');
  const [logicValue, setLogicValue] = useState<string>(field?.conditionalLogic?.value || 'Yes');
  const [logicAction, setLogicAction] = useState<'show' | 'hide'>(
    field?.conditionalLogic?.action || 'show'
  );

  const isChoiceField = ['single_choice', 'multiple_choice', 'dropdown', 'yes_no', 'true_false'].includes(fieldType);
  const isFileField = fieldType === 'file_upload';

  const handleAddOption = () => {
    if (newOptionText.trim()) {
      setOptions([...options, newOptionText.trim()]);
      setNewOptionText('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const toggleFileType = (ext: string) => {
    if (fileTypes.includes(ext)) {
      setFileTypes(fileTypes.filter((t) => t !== ext));
    } else {
      setFileTypes([...fileTypes, ext]);
    }
  };

  const handleSave = () => {
    if (!label.trim()) return;

    let fileConfig: FileUploadConfig | undefined = undefined;
    if (isFileField) {
      fileConfig = {
        allowedTypes: fileTypes.length > 0 ? fileTypes : ['pdf'],
        maxSizeBytes: maxSizeMB * 1024 * 1024,
        maxFiles,
        uploadInstructions,
      };
    }

    let conditionalLogic: ConditionalRule | undefined = undefined;
    if (enableLogic && dependsOnFieldId) {
      conditionalLogic = {
        dependsOnFieldId,
        operator: logicOperator,
        value: logicValue,
        action: logicAction,
      };
    }

    const updatedField: FormField = {
      id: field?.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId,
      label: label.trim(),
      fieldType,
      description: description.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      required,
      active,
      order: field?.order || 99,
      options: isChoiceField ? options : undefined,
      characterLimit: ['text', 'textarea'].includes(fieldType) && characterLimit ? Number(characterLimit) : undefined,
      fileConfig,
      conditionalLogic,
      // Grading & Assessment fields
      correctAnswer: correctAnswer.trim() || undefined,
      points: Number(points) || 10,
      explanation: explanation.trim() || undefined,
      gradingMode,
    };

    onSave(updatedField);
    onClose();
  };

  const otherFields = allFields.filter((f) => f.id !== field?.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              {field ? 'Configure Question / Assessment Item' : 'Add New Question / Field'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize field properties, answer keys, marks, and conditional display logic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'basic'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            General Settings
          </button>

          {isChoiceField && (
            <button
              type="button"
              onClick={() => setActiveTab('options')}
              className={`py-3 px-3 border-b-2 cursor-pointer transition whitespace-nowrap ${
                activeTab === 'options'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Option List ({options.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'grading'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Grading & Marks ({points} pts)
          </button>

          {isFileField && (
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`py-3 px-3 border-b-2 cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'file'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" /> File Upload Rules
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('logic')}
            className={`py-3 px-3 border-b-2 cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logic'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Conditional Logic {enableLogic && '•'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Field / Input Type"
                  value={fieldType}
                  onChange={(e) => {
                    const newType = e.target.value as FormFieldType;
                    setFieldType(newType);
                    if (newType === 'true_false' && options.length === 0) {
                      setOptions(['True', 'False']);
                    } else if (newType === 'yes_no' && options.length === 0) {
                      setOptions(['Yes', 'No']);
                    }
                  }}
                  options={FIELD_TYPE_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: `${opt.label} (${opt.group})`,
                  }))}
                />

                <Select
                  label="Form Section"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  options={sections.map((sec) => ({
                    value: sec.id,
                    label: sec.title,
                  }))}
                />
              </div>

              <Input
                label="Question Label / Verbatim Prompt"
                placeholder="e.g. What is the difference between supervised and unsupervised learning?"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />

              <Input
                label="Help Text / Instructions (Optional)"
                placeholder="e.g. Select the single best answer or provide key differences"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {!['file_upload', 'yes_no', 'checkbox', 'info_text', 'true_false'].includes(fieldType) && (
                <Input
                  label="Input Placeholder (Optional)"
                  placeholder="e.g. Type your response..."
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                />
              )}

              {['text', 'textarea'].includes(fieldType) && (
                <Input
                  label="Maximum Character Limit (Optional)"
                  type="number"
                  placeholder="e.g. 500"
                  value={characterLimit || ''}
                  onChange={(e) => setCharacterLimit(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}

              <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  Required Field (Must be answered)
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  Active (Visible on Form)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Configure the choices available to candidates for this question.
              </p>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-6">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt)}
                      title="Set as correct answer"
                      className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                        correctAnswer === opt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {correctAnswer === opt ? 'Correct Key' : 'Make Key'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Add new choice option..."
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  className="text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleAddOption} type="button">
                  <Plus className="w-4 h-4" /> Add Option
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  Psychometric Assessment & Scoring Rules
                </div>
                <p className="text-slate-600">
                  Set correct answers and points for automatic grading or reviewer marking. If no answer is provided, leave blank for manual assessment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Marks / Points Awarded"
                  type="number"
                  min={1}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value) || 10)}
                  required
                />

                <Select
                  label="Grading Mode"
                  value={gradingMode}
                  onChange={(e) => setGradingMode(e.target.value as any)}
                  options={[
                    { value: 'auto', label: 'Auto-Graded (Matches Correct Answer)' },
                    { value: 'manual', label: 'Manual Reviewer Grading' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Correct Answer Key
                </label>
                {isChoiceField && options.length > 0 ? (
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">-- No Answer Key Specified (Manual / Ungraded) --</option>
                    {options.map((opt, idx) => (
                      <option key={idx} value={opt}>
                        Option {String.fromCharCode(65 + idx)}: {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="Enter expected answer key..."
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Pedagogical Explanation / Marking Guide
                </label>
                <textarea
                  placeholder="Explain why this answer is correct to aid candidate feedback or reviewer consistency..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-2">
                  Allowed Document Extensions
                </label>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip', 'csv', 'xlsx'].map((ext) => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => toggleFileType(ext)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        fileTypes.includes(ext)
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      .{ext}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Maximum File Size (MB)"
                  type="number"
                  min={1}
                  max={50}
                  value={maxSizeMB}
                  onChange={(e) => setMaxSizeMB(Number(e.target.value) || 5)}
                />

                <Input
                  label="Maximum Allowed Files"
                  type="number"
                  min={1}
                  max={5}
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(Number(e.target.value) || 1)}
                />
              </div>

              <Input
                label="Custom Upload Instructions"
                placeholder="e.g. Please combine multi-page certificates into a single PDF document"
                value={uploadInstructions}
                onChange={(e) => setUploadInstructions(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'logic' && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLogic}
                  onChange={(e) => setEnableLogic(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                Enable Conditional Display Rule
              </label>

              {enableLogic && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="IF Question / Field..."
                      value={dependsOnFieldId}
                      onChange={(e) => setDependsOnFieldId(e.target.value)}
                      options={[
                        { value: '', label: '-- Select Question --' },
                        ...otherFields.map((f) => ({
                          value: f.id,
                          label: `${f.label} (${f.fieldType})`,
                        })),
                      ]}
                    />

                    <Select
                      label="Operator"
                      value={logicOperator}
                      onChange={(e) =>
                        setLogicOperator(e.target.value as any)
                      }
                      options={[
                        { value: 'equals', label: 'Equals (=)' },
                        { value: 'not_equals', label: 'Does Not Equal (!=)' },
                        { value: 'contains', label: 'Contains' },
                        { value: 'is_empty', label: 'Is Empty / Blank' },
                        { value: 'is_not_empty', label: 'Is Answered / Not Empty' },
                      ]}
                    />
                  </div>

                  {!['is_empty', 'is_not_empty'].includes(logicOperator) && (
                    <Input
                      label="Target Expected Answer Value"
                      placeholder="e.g. Yes"
                      value={logicValue}
                      onChange={(e) => setLogicValue(e.target.value)}
                    />
                  )}

                  <Select
                    label="THEN Action"
                    value={logicAction}
                    onChange={(e) => setLogicAction(e.target.value as any)}
                    options={[
                      { value: 'show', label: 'THEN Show this question' },
                      { value: 'hide', label: 'THEN Hide this question' },
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} type="button" className="bg-orange-600 hover:bg-orange-500 font-bold">
            Save Question Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};
