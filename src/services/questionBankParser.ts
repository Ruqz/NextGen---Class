import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  FormField,
  ParsedQuestionItem,
  QuestionBankUploadSummary,
  FormFieldType,
} from '../types';

export const CSV_TEMPLATE_HEADERS = [
  'question',
  'type',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'marks',
  'explanation',
  'section',
];

export const SAMPLE_CSV_ROWS = [
  {
    question: 'What is the primary function of an activation function in a deep neural network?',
    type: 'multiple_choice',
    option_a: 'To normalize the batch inputs',
    option_b: 'To introduce non-linearity into the model output',
    option_c: 'To calculate gradients during backpropagation',
    option_d: 'To reduce the number of parameters',
    correct_answer: 'To introduce non-linearity into the model output',
    marks: 10,
    explanation: 'Activation functions introduce non-linear properties to neural networks, enabling them to learn complex patterns.',
    section: 'Machine Learning Core',
  },
  {
    question: 'Supervised learning requires labeled training datasets for optimization.',
    type: 'true_false',
    option_a: 'True',
    option_b: 'False',
    option_c: '',
    option_d: '',
    correct_answer: 'True',
    marks: 5,
    explanation: 'Supervised algorithms learn a mapping function from input variables to an output label based on labeled training pairs.',
    section: 'Machine Learning Core',
  },
  {
    question: 'Explain the difference between overfitting and underfitting in predictive modeling.',
    type: 'long_text',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'NOT PROVIDED',
    marks: 15,
    explanation: 'Evaluates conceptual grasp of bias-variance tradeoff and model generalization capacity.',
    section: 'Model Evaluation',
  },
  {
    question: 'Which of the following are prompt engineering techniques for Large Language Models?',
    type: 'multiple_select',
    option_a: 'Few-Shot Prompting',
    option_b: 'Chain-of-Thought Prompting',
    option_c: 'ReAct Pattern',
    option_d: 'Gradient Descent',
    correct_answer: 'Few-Shot Prompting, Chain-of-Thought Prompting, ReAct Pattern',
    marks: 10,
    explanation: 'Gradient descent is an optimization algorithm for model training, not a prompt engineering technique.',
    section: 'Generative AI',
  },
];

/**
 * Generates and triggers the browser download of the Question Bank CSV Template
 */
export const downloadQuestionBankTemplate = () => {
  const csv = Papa.unparse({
    fields: CSV_TEMPLATE_HEADERS,
    data: SAMPLE_CSV_ROWS.map((row) => [
      row.question,
      row.type,
      row.option_a,
      row.option_b,
      row.option_c,
      row.option_d,
      row.correct_answer,
      row.marks,
      row.explanation,
      row.section,
    ]),
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'NextGenClass_Question_Bank_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Normalizes text to assist in finding duplicate questions
 */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks for similarity / duplicate between a new question and existing questions
 */
export function detectDuplicateQuestion(
  newText: string,
  existingQuestions: { text?: string; label?: string }[]
): { isDuplicate: boolean; matchedText?: string } {
  const normNew = normalizeQuestionText(newText);
  if (!normNew || normNew.length < 5) return { isDuplicate: false };

  for (const item of existingQuestions) {
    const existingStr = item.text || item.label || '';
    const normExisting = normalizeQuestionText(existingStr);
    if (!normExisting) continue;

    if (normNew === normExisting) {
      return { isDuplicate: true, matchedText: existingStr };
    }

    // Substring containment or high overlap check
    if (
      normNew.length > 25 &&
      normExisting.length > 25 &&
      (normNew.includes(normExisting) || normExisting.includes(normNew))
    ) {
      return { isDuplicate: true, matchedText: existingStr };
    }
  }

  return { isDuplicate: false };
}

/**
 * Parse CSV or XLSX spreadsheet directly in client
 */
export async function parseSpreadsheetQuestionBank(
  file: File,
  existingQuestions: { label?: string; text?: string }[] = []
): Promise<{ questions: ParsedQuestionItem[]; summary: QuestionBankUploadSummary }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          throw new Error('Spreadsheet appears to be empty.');
        }

        const parsedItems: ParsedQuestionItem[] = [];
        let needsReviewCount = 0;
        let dupCount = 0;

        rows.forEach((row, index) => {
          // Normalize column keys
          const normalizedRow: Record<string, string> = {};
          Object.keys(row).forEach((k) => {
            normalizedRow[k.toLowerCase().trim().replace(/[\s_-]+/g, '')] = String(row[k]).trim();
          });

          const qText =
            normalizedRow['question'] ||
            normalizedRow['questiontext'] ||
            normalizedRow['prompt'] ||
            normalizedRow['text'] ||
            `Question ${index + 1}`;

          const rawType = (
            normalizedRow['type'] ||
            normalizedRow['questiontype'] ||
            'multiple_choice'
          ).toLowerCase();

          let qType: FormFieldType = 'multiple_choice';
          if (rawType.includes('true') || rawType.includes('tf') || rawType === 'boolean') {
            qType = 'true_false';
          } else if (rawType.includes('yes')) {
            qType = 'yes_no';
          } else if (rawType.includes('select') || rawType.includes('multipleselect') || rawType.includes('checkbox')) {
            qType = 'multiple_choice'; // or multiple select
          } else if (rawType.includes('essay') || rawType.includes('long') || rawType.includes('textarea')) {
            qType = 'textarea';
          } else if (rawType.includes('short') || rawType.includes('text')) {
            qType = 'text';
          } else if (rawType.includes('number') || rawType.includes('num')) {
            qType = 'number';
          } else if (rawType.includes('rating') || rawType.includes('scale')) {
            qType = 'rating' as any;
          }

          // Options extraction
          const rawOptions: string[] = [];
          ['optiona', 'optionb', 'optionc', 'optiond', 'optione', 'choice1', 'choice2', 'choice3', 'choice4'].forEach((optKey) => {
            if (normalizedRow[optKey]) {
              rawOptions.push(normalizedRow[optKey]);
            }
          });

          // Check options column if pipe or comma separated
          if (rawOptions.length === 0 && normalizedRow['options']) {
            const splitOpts = normalizedRow['options'].split(/[|;,]/).map((s) => s.trim()).filter(Boolean);
            rawOptions.push(...splitOpts);
          }

          if (qType === 'true_false' && rawOptions.length === 0) {
            rawOptions.push('True', 'False');
          } else if (qType === 'yes_no' && rawOptions.length === 0) {
            rawOptions.push('Yes', 'No');
          }

          const rawCorrect =
            normalizedRow['correctanswer'] ||
            normalizedRow['answer'] ||
            normalizedRow['key'] ||
            normalizedRow['correct'] ||
            'NOT PROVIDED';

          const rawMarks = Number(normalizedRow['marks'] || normalizedRow['points'] || normalizedRow['score']) || 10;
          const explanation = normalizedRow['explanation'] || normalizedRow['rationale'] || normalizedRow['notes'] || '';
          const section = normalizedRow['section'] || normalizedRow['category'] || normalizedRow['module'] || 'General';

          const dupCheck = detectDuplicateQuestion(qText, [
            ...existingQuestions,
            ...parsedItems.map((p) => ({ text: p.text })),
          ]);

          let status: 'APPROVED' | 'NEEDS_REVIEW' | 'FLAGGED' | 'DUPLICATE' = 'APPROVED';
          if (dupCheck.isDuplicate) {
            status = 'DUPLICATE';
            dupCount++;
          } else if (
            (qType === 'multiple_choice' && rawOptions.length < 2) ||
            rawCorrect === 'NOT PROVIDED'
          ) {
            status = 'NEEDS_REVIEW';
            needsReviewCount++;
          }

          parsedItems.push({
            id: `q_parsed_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
            text: qText,
            type: qType,
            options: rawOptions.length > 0 ? rawOptions : undefined,
            correctAnswer: rawCorrect,
            marks: rawMarks,
            explanation,
            section,
            status,
            confidence: dupCheck.isDuplicate ? 0.6 : 0.95,
            isDuplicate: dupCheck.isDuplicate,
            duplicateReason: dupCheck.isDuplicate ? `Matches existing: "${dupCheck.matchedText}"` : undefined,
            selectedForImport: status !== 'DUPLICATE',
          });
        });

        const summary: QuestionBankUploadSummary = {
          totalDetected: parsedItems.length,
          parsedSuccessfully: parsedItems.filter((p) => p.status === 'APPROVED').length,
          needsReview: needsReviewCount,
          couldNotParseCount: 0,
          duplicateCount: dupCount,
        };

        resolve({ questions: parsedItems, summary });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse text or document file (PDF, DOCX, TXT, or fallback) via backend AI endpoint
 */
export async function parseDocumentViaAI(
  rawText: string,
  fileName: string,
  fileType: string,
  existingQuestions: { label?: string; text?: string }[] = [],
  expectedSection: string = 'General'
): Promise<{ questions: ParsedQuestionItem[]; summary: QuestionBankUploadSummary }> {
  const response = await fetch('/api/ai/parse-question-bank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText,
      fileName,
      fileType,
      expectedSection,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to parse question bank with AI service.');
  }

  const result = await response.json();
  const rawQuestions: any[] = result.data?.questions || [];

  let dupCount = 0;
  let needsReviewCount = 0;

  const parsedItems: ParsedQuestionItem[] = rawQuestions.map((q: any, idx: number) => {
    const qText = q.text || `Question ${idx + 1}`;
    const dupCheck = detectDuplicateQuestion(qText, [
      ...existingQuestions,
      ...rawQuestions.slice(0, idx).map((rq: any) => ({ text: rq.text })),
    ]);

    let status: 'APPROVED' | 'NEEDS_REVIEW' | 'FLAGGED' | 'DUPLICATE' =
      q.status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'APPROVED';

    if (dupCheck.isDuplicate) {
      status = 'DUPLICATE';
      dupCount++;
    } else if (status === 'NEEDS_REVIEW' || q.correctAnswer === 'NOT PROVIDED') {
      needsReviewCount++;
    }

    let fieldType: FormFieldType = 'multiple_choice';
    const rawType = (q.type || '').toLowerCase();
    if (rawType.includes('true') || rawType.includes('tf')) fieldType = 'true_false';
    else if (rawType.includes('yes')) fieldType = 'yes_no';
    else if (rawType.includes('essay') || rawType.includes('long')) fieldType = 'textarea';
    else if (rawType.includes('short')) fieldType = 'text';
    else if (rawType.includes('number')) fieldType = 'number';
    else if (rawType.includes('rating')) fieldType = 'rating' as any;
    else if (rawType.includes('select')) fieldType = 'multiple_choice';

    return {
      id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      text: qText,
      type: fieldType,
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : undefined,
      correctAnswer: q.correctAnswer || 'NOT PROVIDED',
      marks: Number(q.marks) || 10,
      explanation: q.explanation || '',
      section: q.section || expectedSection,
      status,
      confidence: q.confidence || (dupCheck.isDuplicate ? 0.5 : 0.9),
      isDuplicate: dupCheck.isDuplicate,
      duplicateReason: dupCheck.isDuplicate ? `Matches: "${dupCheck.matchedText}"` : undefined,
      selectedForImport: status !== 'DUPLICATE',
    };
  });

  const summary: QuestionBankUploadSummary = {
    totalDetected: parsedItems.length,
    parsedSuccessfully: parsedItems.filter((p) => p.status === 'APPROVED').length,
    needsReview: needsReviewCount,
    couldNotParseCount: result.data?.summary?.couldNotParseCount || 0,
    duplicateCount: dupCount,
  };

  return { questions: parsedItems, summary };
}

/**
 * Converts approved parsed question items into FormField models for FormBuilder
 */
export function convertParsedToFormFields(
  parsedList: ParsedQuestionItem[],
  startingOrder: number = 1,
  sectionIdMap: Record<string, string> = {}
): FormField[] {
  return parsedList.map((item, idx) => {
    const secId = item.section ? sectionIdMap[item.section] : undefined;

    let fieldType: FormFieldType = (item.type as FormFieldType) || 'multiple_choice';
    let options = item.options;

    if (fieldType === 'true_false' && (!options || options.length === 0)) {
      options = ['True', 'False'];
    } else if (fieldType === 'yes_no' && (!options || options.length === 0)) {
      options = ['Yes', 'No'];
    }

    return {
      id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId: secId,
      label: item.text,
      fieldType,
      description: item.explanation || undefined,
      required: true,
      options: options && options.length > 0 ? options : undefined,
      order: startingOrder + idx,
      active: true,
      correctAnswer: item.correctAnswer !== 'NOT PROVIDED' ? item.correctAnswer : undefined,
      points: item.marks || 10,
      explanation: item.explanation || undefined,
      gradingMode: item.correctAnswer && item.correctAnswer !== 'NOT PROVIDED' ? 'auto' : 'manual',
    };
  });
}
