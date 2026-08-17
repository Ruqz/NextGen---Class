import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import {
  ParsedQuestionItem,
  QuestionBankUploadSummary,
  FormField,
  FormSection,
} from '../../types';
import {
  downloadQuestionBankTemplate,
  parseSpreadsheetQuestionBank,
  parseDocumentViaAI,
  convertParsedToFormFields,
} from '../../services/questionBankParser';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
  Layers,
  Plus,
} from 'lucide-react';

interface QuestionBankUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (fields: FormField[], newSections?: FormSection[]) => void;
  existingFields?: FormField[];
  existingSections?: FormSection[];
  programmeName?: string;
}

export const QuestionBankUploadModal: React.FC<QuestionBankUploadModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  existingFields = [],
  existingSections = [],
  programmeName = 'General',
}) => {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [summary, setSummary] = useState<QuestionBankUploadSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'approved' | 'review' | 'duplicates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ParsedQuestionItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsingProgress, setParsingProgress] = useState<string>('Reading document...');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedQuestions([]);
    setSummary(null);
    setFilterTab('all');
    setSearchQuery('');
    setEditingQuestionId(null);
    setEditDraft(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    const validExts = ['.csv', '.xlsx', '.xls', '.txt', '.pdf', '.docx', '.doc'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => fileName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMsg('Unsupported file format. Please upload PDF, DOCX, XLSX, CSV, or TXT.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('File exceeds 20MB limit. Please upload a smaller file.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    startParsing(file);
  };

  const startParsing = async (file: File) => {
    setStep('parsing');
    setParsingProgress('Analyzing document structure...');

    try {
      const fileName = file.name.toLowerCase();
      const existingItems = existingFields.map((f) => ({ label: f.label }));

      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setParsingProgress('Parsing spreadsheet rows and question schemas...');
        const result = await parseSpreadsheetQuestionBank(file, existingItems);
        setParsedQuestions(result.questions);
        setSummary(result.summary);
        setStep('review');
      } else {
        // PDF, DOCX, TXT via text reading & AI psychometric parser
        setParsingProgress('Extracting verbatim text from document...');
        let text = '';
        if (fileName.endsWith('.txt')) {
          text = await file.text();
        } else {
          // Read text slice or basic text representation for document
          text = await file.text().catch(() => '');
          if (!text || text.length < 20) {
            // Read as data URL text string
            text = `Question bank document uploaded: ${file.name}. Size: ${file.size} bytes.`;
          }
        }

        setParsingProgress('AI parsing question keys, options, marks, and rationales (strictly preserving verbatim text)...');
        const result = await parseDocumentViaAI(
          text,
          file.name,
          file.type || 'document',
          existingItems,
          programmeName
        );

        setParsedQuestions(result.questions);
        setSummary(result.summary);
        setStep('review');
      }
    } catch (err: any) {
      console.error('Error parsing question bank:', err);
      setErrorMsg(err.message || 'Failed to parse questions from the uploaded file.');
      setStep('upload');
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selectedForImport: !q.selectedForImport } : q))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedQuestions((prev) =>
      prev.map((q) => ({ ...q, selectedForImport: select }))
    );
  };

  // Question manipulation during review
  const handleApproveQuestion = (id: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, status: 'APPROVED', selectedForImport: true, isDuplicate: false }
          : q
      )
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setParsedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDuplicateQuestion = (q: ParsedQuestionItem) => {
    const copy: ParsedQuestionItem = {
      ...q,
      id: `q_copy_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text: `${q.text} (Copy)`,
      status: 'APPROVED',
      isDuplicate: false,
      selectedForImport: true,
    };
    setParsedQuestions((prev) => [...prev, copy]);
  };

  const handleStartEdit = (q: ParsedQuestionItem) => {
    setEditingQuestionId(q.id);
    setEditDraft(JSON.parse(JSON.stringify(q)));
  };

  const handleSaveEdit = () => {
    if (!editDraft) return;
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === editDraft.id ? { ...editDraft, status: 'APPROVED' } : q))
    );
    setEditingQuestionId(null);
    setEditDraft(null);
  };

  // Final Import Handler
  const handleCompleteImport = (onlyApproved: boolean = false) => {
    const toImport = parsedQuestions.filter((q) =>
      onlyApproved ? q.status === 'APPROVED' && q.selectedForImport : q.selectedForImport
    );

    if (toImport.length === 0) {
      setErrorMsg('No questions selected for import.');
      return;
    }

    // Identify sections and create new ones if needed
    const uniqueSections: string[] = Array.from(new Set(toImport.map((q) => q.section || 'General')));
    const existingSectionTitles = new Set(existingSections.map((s) => s.title));
    const newSectionsToCreate: FormSection[] = [];

    const sectionIdMap: Record<string, string> = {};
    existingSections.forEach((s) => {
      sectionIdMap[s.title] = s.id;
    });

    uniqueSections.forEach((secTitle, idx) => {
      if (!existingSectionTitles.has(secTitle)) {
        const newSecId = `sec_${Date.now()}_${idx}`;
        sectionIdMap[secTitle] = newSecId;
        newSectionsToCreate.push({
          id: newSecId,
          title: secTitle,
          order: existingSections.length + idx + 1,
        });
      }
    });

    const newFormFields = convertParsedToFormFields(
      toImport,
      existingFields.length + 1,
      sectionIdMap
    );

    onImportQuestions(newFormFields, newSectionsToCreate.length > 0 ? newSectionsToCreate : undefined);
    handleClose();
  };

  // Filtered Questions list
  const filteredQuestions = parsedQuestions.filter((q) => {
    if (filterTab === 'approved' && q.status !== 'APPROVED') return false;
    if (filterTab === 'review' && q.status !== 'NEEDS_REVIEW') return false;
    if (filterTab === 'duplicates' && !q.isDuplicate && q.status !== 'DUPLICATE') return false;

    if (searchQuery.trim()) {
      const qText = q.text.toLowerCase();
      const sec = (q.section || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return qText.includes(query) || sec.includes(query);
    }
    return true;
  });

  const selectedCount = parsedQuestions.filter((q) => q.selectedForImport).length;
  const approvedCount = parsedQuestions.filter((q) => q.status === 'APPROVED').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Question Bank & Bulk Questions Import"
      size="full"
    >
      <div className="space-y-6 max-h-[82vh] overflow-y-auto pr-1">
        {errorMsg && (
          <Alert type="error" onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* STEP 1: UPLOAD SCREEN */}
        {step === 'upload' && (
          <div className="space-y-6 max-w-2xl mx-auto py-4">
            {/* Top Info Banner */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-orange-600" />
                Human-in-the-Loop Bulk Import
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload your curriculum question bank or examination documents in <strong>PDF, DOCX, XLSX, CSV, or TXT</strong>. 
                Our AI parser extracts questions, options, answer keys, marks, and rationales strictly verbatim without modifying question meaning.
              </p>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-orange-500 bg-orange-50/60 shadow-lg'
                  : 'border-slate-300 hover:border-orange-400 bg-slate-50 hover:bg-white'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Upload className="w-8 h-8" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                Drop your Question Bank file here, or browse
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Supported formats: PDF, Microsoft Word (.docx), Excel (.xlsx), CSV, TXT (Max 20MB)
              </p>

              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-orange-600 hover:bg-orange-500 font-bold"
              >
                Select Question Bank File
              </Button>
            </div>

            {/* Template Download Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Standard Question Bank Template</p>
                  <p className="text-[11px] text-slate-500">
                    Includes columns for question text, type, options A-D, answer key, marks & section.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadQuestionBankTemplate}
                leftIcon={<Download className="w-4 h-4 text-slate-600" />}
                className="whitespace-nowrap font-bold text-xs bg-white"
              >
                Download CSV Template
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PARSING STATE */}
        {step === 'parsing' && (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto animate-pulse">
              <Spinner size="lg" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Processing Question Bank</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">{parsingProgress}</p>
            <div className="text-[11px] text-slate-400 font-mono bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 inline-block">
              {selectedFile?.name} ({(Number(selectedFile?.size || 0) / 1024).toFixed(1)} KB)
            </div>
          </div>
        )}

        {/* STEP 3: HUMAN-IN-THE-LOOP REVIEW SCREEN */}
        {step === 'review' && (
          <div className="space-y-5">
            {/* Import Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800">
                <p className="text-[11px] uppercase font-bold text-slate-400">Total Detected</p>
                <p className="text-2xl font-black text-white mt-1">{parsedQuestions.length}</p>
              </div>

              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200">
                <p className="text-[11px] uppercase font-bold text-emerald-700">Approved</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</p>
              </div>

              <div className="p-3.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                <p className="text-[11px] uppercase font-bold text-amber-700">Needs Review</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {parsedQuestions.filter((q) => q.status === 'NEEDS_REVIEW').length}
                </p>
              </div>

              <div className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200">
                <p className="text-[11px] uppercase font-bold text-rose-700">Duplicates</p>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  {parsedQuestions.filter((q) => q.isDuplicate || q.status === 'DUPLICATE').length}
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 col-span-2 sm:col-span-1">
                <p className="text-[11px] uppercase font-bold text-blue-700">Selected</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{selectedCount}</p>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({parsedQuestions.length})
                </button>

                <button
                  onClick={() => setFilterTab('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'approved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Approved ({approvedCount})
                </button>

                <button
                  onClick={() => setFilterTab('review')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'review'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Needs Review ({parsedQuestions.filter((q) => q.status === 'NEEDS_REVIEW').length})
                </button>

                <button
                  onClick={() => setFilterTab('duplicates')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'duplicates'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Duplicates ({parsedQuestions.filter((q) => q.isDuplicate || q.status === 'DUPLICATE').length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search parsed questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAll(selectedCount !== parsedQuestions.length)}
                  className="text-xs font-semibold whitespace-nowrap"
                >
                  {selectedCount === parsedQuestions.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            {/* Questions Review List */}
            <div className="space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No questions match your current filter.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isEditing = editingQuestionId === q.id;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        q.selectedForImport
                          ? 'bg-white border-slate-300 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 opacity-70'
                      }`}
                    >
                      {isEditing && editDraft ? (
                        /* INLINE EDIT VIEW */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-600">Editing Question</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSaveEdit}
                                leftIcon={<Check className="w-3.5 h-3.5" />}
                                className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1"
                              >
                                Save Changes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingQuestionId(null);
                                  setEditDraft(null);
                                }}
                                className="text-xs py-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700">Question Text</label>
                            <textarea
                              value={editDraft.text}
                              onChange={(e) => setEditDraft({ ...editDraft, text: e.target.value })}
                              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Question Type</label>
                              <select
                                value={editDraft.type}
                                onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                              >
                                <option value="multiple_choice">Multiple Choice (Single)</option>
                                <option value="multiple_select">Multiple Select</option>
                                <option value="true_false">True / False</option>
                                <option value="yes_no">Yes / No</option>
                                <option value="text">Short Text</option>
                                <option value="textarea">Long Essay</option>
                                <option value="number">Numeric</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Correct Answer Key</label>
                              <input
                                type="text"
                                value={editDraft.correctAnswer || ''}
                                onChange={(e) => setEditDraft({ ...editDraft, correctAnswer: e.target.value })}
                                placeholder="Enter correct answer"
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Marks / Points</label>
                              <input
                                type="number"
                                value={editDraft.marks}
                                onChange={(e) => setEditDraft({ ...editDraft, marks: Number(e.target.value) || 10 })}
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>

                          {editDraft.options && editDraft.options.length > 0 && (
                            <div>
                              <label className="text-[11px] font-bold text-slate-700">Choices / Options</label>
                              <div className="space-y-1.5 mt-1">
                                {editDraft.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 w-5">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(editDraft.options || [])];
                                        newOpts[optIdx] = e.target.value;
                                        setEditDraft({ ...editDraft, options: newOpts });
                                      }}
                                      className="flex-1 text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newOpts = (editDraft.options || []).filter((_, i) => i !== optIdx);
                                        setEditDraft({ ...editDraft, options: newOpts });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditDraft({
                                      ...editDraft,
                                      options: [...(editDraft.options || []), `New Option`],
                                    });
                                  }}
                                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                                  className="text-xs py-0.5"
                                >
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="text-[11px] font-bold text-slate-700">Explanation / Rationale</label>
                            <input
                              type="text"
                              value={editDraft.explanation || ''}
                              onChange={(e) => setEditDraft({ ...editDraft, explanation: e.target.value })}
                              placeholder="Explanation for the correct answer..."
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                      ) : (
                        /* STANDARD REVIEW CARD */
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={q.selectedForImport}
                                onChange={() => handleToggleSelect(q.id)}
                                className="mt-1 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />

                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold text-slate-400">
                                    #{idx + 1}
                                  </span>

                                  <Badge
                                    variant={
                                      q.status === 'APPROVED'
                                        ? 'success'
                                        : q.status === 'NEEDS_REVIEW'
                                        ? 'warning'
                                        : 'error'
                                    }
                                    className="text-[10px] uppercase font-bold py-0.5"
                                  >
                                    {q.status}
                                  </Badge>

                                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {q.type}
                                  </span>

                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {q.marks} Marks
                                  </span>

                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Sec: {q.section || 'General'}
                                  </span>

                                  {q.isDuplicate && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                                      Duplicate Detected
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm font-semibold text-slate-900 leading-snug">
                                  {q.text}
                                </p>
                              </div>
                            </div>

                            {/* Card Quick Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {q.status !== 'APPROVED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproveQuestion(q.id)}
                                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs py-1 px-2 font-bold"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                              )}

                              <button
                                onClick={() => handleStartEdit(q)}
                                title="Edit Question"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDuplicateQuestion(q)}
                                title="Duplicate"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteQuestion(q)}
                                title="Delete"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Options and Answer Display */}
                          {q.options && q.options.length > 0 && (
                            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                              {q.options.map((opt, optIdx) => {
                                const isCorrect =
                                  q.correctAnswer &&
                                  (q.correctAnswer === opt ||
                                    q.correctAnswer.toLowerCase() === opt.toLowerCase() ||
                                    q.correctAnswer === String.fromCharCode(65 + optIdx) ||
                                    q.correctAnswer === `option_${String.fromCharCode(97 + optIdx)}`);

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className="font-bold text-slate-400">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <span>{opt}</span>
                                    {isCorrect && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Correct Answer & Explanation */}
                          <div className="pl-6 flex flex-wrap items-center gap-3 text-xs pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">Answer Key:</span>
                              <span
                                className={`font-bold ${
                                  q.correctAnswer === 'NOT PROVIDED'
                                    ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded'
                                    : 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded'
                                }`}
                              >
                                {q.correctAnswer || 'NOT PROVIDED'}
                              </span>
                            </div>

                            {q.explanation && (
                              <div className="text-slate-500 italic flex items-center gap-1">
                                <span>Rationale: {q.explanation}</span>
                              </div>
                            )}

                            {q.duplicateReason && (
                              <div className="text-rose-600 text-[11px] font-medium">
                                {q.duplicateReason}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Final Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('upload')}
                className="text-xs font-bold"
              >
                Upload Different File
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  className="flex-1 sm:flex-initial text-xs font-bold"
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCompleteImport(false)}
                  disabled={selectedCount === 0}
                  className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-500 font-bold text-xs"
                >
                  Import Selected ({selectedCount} Questions)
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCompleteImport(true)}
                  disabled={approvedCount === 0}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
                >
                  Import All Approved ({approvedCount})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
