import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// ----------------------------------------------------
// PRODUCTION SECURITY HEADERS & SANITIZATION
// ----------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

// JSON body parser with strict payload size limit (max 5MB to prevent memory exhaustion)
app.use(express.json({ limit: '5mb' }));

// ----------------------------------------------------
// IN-MEMORY RATE LIMITING MIDDLEWARE
// ----------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function apiRateLimiter(limit: number = 60, windowMs: number = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - 1);
      return next();
    }

    if (record.count >= limit) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: 'Too Many Requests: Rate limit exceeded. Please slow down and try again.',
        retryAfterSeconds,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count));
    next();
  };
}

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Apply rate limiter to all /api routes
app.use('/api/', apiRateLimiter(80, 60 * 1000));

// Input sanitization helper to strip dangerous script tags and limit string length
function sanitizeInput(str: any, maxLen: number = 10000): string {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLen)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .trim();
}

// PII Redactor for AI prompt safety (masks credit cards, social security, and passwords)
function redactSensitivePII(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/(?:password|secret|token)\s*[:=]\s*["']?[^"'\s,]+["']?/gi, '$1: "[REDACTED]"');
}

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// AI ENDPOINTS
// ----------------------------------------------------

// Health Check
app.get('/api/ai/health', (req, res) => {
  const isKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    aiService: 'Google Gemini AI',
    model: 'gemini-3.7-flash',
    apiKeyConfigured: isKeyConfigured,
    security: {
      rateLimiting: 'ACTIVE',
      inputSanitization: 'ACTIVE',
      piiRedaction: 'ACTIVE',
      headersHardened: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// 1. AI Assessment Question Generation (From Approved Resources Only)
app.post('/api/ai/assessment/generate-questions', async (req, res) => {
  try {
    const {
      programmeName,
      moduleName,
      topics,
      approvedResourceContent,
      questionCount = 5,
      difficulty = 'MEDIUM',
      questionType = 'MULTIPLE_CHOICE',
    } = req.body;

    const safeProgramme = sanitizeInput(programmeName, 150);
    const safeModule = sanitizeInput(moduleName, 150);
    const safeTopics = sanitizeInput(topics, 2000);
    const safeApprovedContent = redactSensitivePII(sanitizeInput(approvedResourceContent, 30000));

    if (!safeApprovedContent && !safeTopics) {
      return res.status(400).json({
        error: 'Approved curriculum content or topics are required to generate grounded assessment questions.',
      });
    }

    const safeCount = Math.min(Math.max(1, Number(questionCount) || 5), 20);
    const ai = getGenAI();

    const systemPrompt = `You are a certified educational psychometrician and curriculum assessor for NextGen Class.
CRITICAL SAFETY & GOVERNANCE DIRECTIVES:
1. You MUST generate assessment questions ONLY and strictly derived from the provided approved curriculum text and syllabus topics.
2. DO NOT hallucinate, invent concepts, or test trivia outside the provided approved curriculum scope.
3. Every objective question MUST have DETERMINISTIC SCORING with an unambiguous single correct answer key and clear rationale.
4. Output MUST be valid JSON conforming to the schema below.
5. All generated questions will initially be flagged as 'DRAFT_AI_GENERATED' and require human administrator approval before activation.

Schema:
{
  "questions": [
    {
      "text": "Clear, objective question prompt based on approved resources",
      "type": "MULTIPLE_CHOICE" | "TRUE_FALSE",
      "choices": [
        { "id": "c1", "text": "Option 1" },
        { "id": "c2", "text": "Option 2" },
        { "id": "c3", "text": "Option 3" },
        { "id": "c4", "text": "Option 4" }
      ],
      "correctAnswerId": "c1",
      "explanation": "Detailed explanation citing the specific concept from approved curriculum",
      "points": 10,
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topic": "Specific topic from approved resources"
    }
  ],
  "curriculumCoverageSummary": "Brief overview of topics covered from the provided approved materials"
}`;

    const userPrompt = `Generate ${safeCount} ${difficulty} level assessment questions of type ${questionType} for programme "${safeProgramme || 'General'}" and module "${safeModule || 'Curriculum Module'}".

Approved Syllabus Topics:
${safeTopics || 'Provided curriculum reference materials'}

Approved Resource / Syllabus Reference Material:
"""
${safeApprovedContent || 'Standard accredited curriculum syllabus'}
"""

Ensure every multiple choice question has 4 distinct choices, exactly one verified correct answer ID, points (10 per question), and pedagogical explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsedData,
      meta: {
        model: 'gemini-3.7-flash',
        generatedAt: new Date().toISOString(),
        requiresHumanApproval: true,
        status: 'DRAFT_AI_GENERATED',
      },
    });
  } catch (error: any) {
    console.error('[API Error] AI Assessment Generation:', error?.message);
    return res.status(500).json({
      error: 'Failed to generate assessment questions securely. Please verify input parameters.',
    });
  }
});

// 2. AI Study Assistant (Context-grounded learner tutor)
app.post('/api/ai/study-assistant/chat', async (req, res) => {
  try {
    const {
      programmeName,
      cohortName,
      syllabusContext,
      mode = 'explain',
      message,
      history = [],
    } = req.body;

    const safeMessage = sanitizeInput(message, 3000);
    if (!safeMessage) {
      return res.status(400).json({ error: 'Message prompt is required' });
    }

    const safeProgramme = sanitizeInput(programmeName, 150);
    const safeCohort = sanitizeInput(cohortName, 150);
    const safeSyllabus = redactSensitivePII(sanitizeInput(syllabusContext, 20000));
    const safeMode = ['explain', 'quiz', 'flashcards', 'plan', 'general'].includes(mode) ? mode : 'explain';

    const ai = getGenAI();

    const systemPrompt = `You are the AI Study Assistant for "${safeProgramme || 'NextGen Class Programme'}" (${safeCohort || 'Active Cohort'}).
PRIMARY OBJECTIVES:
- Provide friendly, patient, clear, and pedagogically rigorous guidance to enrolled learners.
- STRICT GROUNDING: Stay anchored to the programme curriculum and syllabus context provided below. If a learner asks about something completely unrelated to the course, gently steer them back to their learning objectives.
- MODES:
  1. 'explain': Break complex concepts down using real-world analogies, step-by-step logic, clean code snippets or diagrams when appropriate.
  2. 'quiz': Offer quick 1-2 question interactive formative checks with deterministic correct answers and instant feedback.
  3. 'flashcards': Provide concise summary cards for quick revision.
  4. 'plan': Offer structured revision schedules and study recommendations tailored to the curriculum milestones.
- TONE: Encouraging, supportive, concise, and structured with markdown headings and bullet points.
- PRIVACY & INTEGRITY: Do not reveal unreleased exam answers, grading rubrics before release, or sensitive personal records.

Programme Syllabus & Module Context:
"""
${safeSyllabus || 'NextGen Professional Programme Curriculum'}
"""`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-8)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: sanitizeInput(msg.text || msg.content || '', 2000) }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: `[Mode: ${safeMode.toUpperCase()}] ${safeMessage}` }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    return res.json({
      success: true,
      reply: response.text || 'I am ready to help you with your studies.',
      model: 'gemini-3.7-flash',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API Error] AI Study Assistant:', error?.message);
    return res.status(500).json({
      error: 'Failed to process study assistance securely.',
    });
  }
});

// 3. AI Learner Support Assistant (24/7 Logistics, FAQ & Escalation)
app.post('/api/ai/learner-support/chat', async (req, res) => {
  try {
    const {
      userRole = 'Learner',
      programmeName = 'NextGen Class',
      cohortName = 'Active Cohort',
      query,
      history = [],
    } = req.body;

    const safeQuery = sanitizeInput(query, 3000);
    if (!safeQuery) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const safeRole = sanitizeInput(userRole, 50);
    const safeProgramme = sanitizeInput(programmeName, 150);
    const safeCohort = sanitizeInput(cohortName, 150);

    const ai = getGenAI();

    const systemPrompt = `You are the 24/7 AI Learner Support Assistant for NextGen Class Programme Platform.
Your purpose is to assist candidates, applicants, and enrolled learners with onboarding, programme guidelines, class attendance thresholds, assignment submission processes, certificate criteria, and portal navigation.

Key Platform Policies to Guide Learners:
- Attendance Policy: Minimum 80% attendance required for certificate qualification; late attendance gives 50% credit.
- Assessment & Assignments: Pass benchmark is typically 70%. Resubmissions are allowed if enabled by the facilitator.
- Capstone Final Project: Must be submitted and approved by an evaluator before graduation certificate is released.
- Certificates: Deterministically unlocked upon meeting all graduation criteria. AI does not autonomously issue certificates or admission decisions.
- Privacy: Never disclose private grades, contact details, or info about other learners.

ESCALATION PROTOCOL:
If the user's issue cannot be resolved by standard FAQ (e.g. system access failure, payment/allowance dispute, medical emergency leave, severe grade discrepancy, harassment grievance), you MUST include an escalation proposal at the bottom of your response in the following JSON format:
[ESCALATION_TRIGGER: {"needed": true, "category": "TECHNICAL | ACADEMIC | ATTENDANCE | GRIEVANCE | ADMINISTRATIVE", "priority": "LOW | MEDIUM | HIGH", "summary": "Brief summary of issue"}]`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-8)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: sanitizeInput(msg.text || msg.content || '', 2000) }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: `User Role: ${safeRole}. Programme: ${safeProgramme} (${safeCohort}). Query: ${safeQuery}` }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    const fullText = response.text || '';
    let escalationNeeded = false;
    let escalationData: any = null;
    let cleanedReply = fullText;

    const match = fullText.match(/\[ESCALATION_TRIGGER:\s*(\{.*?\})\]/s);
    if (match && match[1]) {
      try {
        escalationData = JSON.parse(match[1]);
        escalationNeeded = Boolean(escalationData.needed);
        cleanedReply = fullText.replace(match[0], '').trim();
      } catch (e) {
        console.warn('Could not parse escalation trigger', e);
      }
    }

    return res.json({
      success: true,
      reply: cleanedReply,
      escalation: escalationNeeded ? escalationData : null,
      model: 'gemini-3.7-flash',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API Error] AI Learner Support:', error?.message);
    return res.status(500).json({
      error: 'Failed to process support request securely.',
    });
  }
});

// 4. AI-Assisted Feedback (Facilitator Co-Pilot for Submissions & Projects)
app.post('/api/ai/feedback/assist', async (req, res) => {
  try {
    const {
      assignmentTitle,
      assignmentInstructions,
      submissionText,
      submissionUrl,
      maxScore = 100,
      rubricCriteria = [
        'Accuracy & Technical Rigor',
        'Structure & Clarity',
        'Completeness of Requirements',
        'Actionable Application & Craft',
      ],
    } = req.body;

    const safeTitle = sanitizeInput(assignmentTitle, 200);
    const safeInstructions = sanitizeInput(assignmentInstructions, 5000);
    const safeSubmission = redactSensitivePII(sanitizeInput(submissionText, 25000));
    const safeUrl = sanitizeInput(submissionUrl, 500);

    if (!safeSubmission && !safeUrl) {
      return res.status(400).json({ error: 'Submission content is required for evaluation co-pilot.' });
    }

    const ai = getGenAI();

    const systemPrompt = `You are an expert pedagogical evaluator and facilitator co-pilot.
MANDATORY SAFETY CONSTRAINT:
- Your feedback is STRICTLY AN ADVISORY DRAFT FOR THE HUMAN FACILITATOR.
- A human instructor must review, edit, and confirm all final grades and feedback.
- Provide objective, highly encouraging, constructive, and actionable feedback highlighting specific strengths and concrete areas for growth.
- Output MUST be valid JSON adhering to the specified schema.

Schema:
{
  "draftFeedback": "Full constructive feedback message addressed to the learner",
  "strengths": ["Key strength 1", "Key strength 2"],
  "growthAreas": ["Specific recommendation 1", "Specific recommendation 2"],
  "suggestedScore": 85,
  "rubricBreakdown": [
    {
      "criterion": "Criterion Name",
      "score": 22,
      "maxScore": 25,
      "comments": "Specific comment on this criterion"
    }
  ],
  "disclaimer": "AI Advisory Draft - Requires Human Facilitator Review and Final Approval."
}`;

    const userPrompt = `Evaluate the following learner assignment submission:

Assignment Title: "${safeTitle || 'Coursework Assignment'}"
Instructions & Requirements:
${safeInstructions || 'Complete the assigned practical exercises and meet quality criteria.'}

Rubric Criteria:
${Array.isArray(rubricCriteria) ? rubricCriteria.map((r) => sanitizeInput(r, 100)).join(', ') : 'Standard Quality Rubric'}

Total Max Score: ${Math.min(Math.max(1, Number(maxScore) || 100), 500)}

Learner Submission Text:
"""
${safeSubmission || 'Submission repository/link: ' + safeUrl}
"""
${safeUrl ? `Attachment / Repository URL: ${safeUrl}` : ''}

Generate a balanced evaluation draft with specific strengths, improvement tips, and rubric scoring.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return res.json({
      success: true,
      data: parsed,
      meta: {
        model: 'gemini-3.7-flash',
        evaluatedAt: new Date().toISOString(),
        isAdvisoryDraft: true,
      },
    });
  } catch (error: any) {
    console.error('[API Error] AI Feedback Assistant:', error?.message);
    return res.status(500).json({
      error: 'Failed to generate advisory feedback securely.',
    });
  }
});

// 5. AI-Assisted Reporting (Executive Synthesis & Impact Narratives)
app.post('/api/ai/reporting/synthesize', async (req, res) => {
  try {
    const {
      reportType,
      reportTitle,
      filterContext,
      kpis = [],
      summaryMetrics = {},
      audience = 'leadership',
    } = req.body;

    const safeReportType = sanitizeInput(reportType, 100);
    const safeReportTitle = sanitizeInput(reportTitle, 200);
    const safeAudience = sanitizeInput(audience, 50);

    const ai = getGenAI();

    const systemPrompt = `You are a Senior Strategic Analyst and Monitoring & Evaluation (M&E) Specialist for NextGen Class.
Your task is to analyze aggregated, anonymized institutional report data and generate high-caliber executive syntheses, trend detections, donor impact narratives, and actionable operational recommendations.

OUTPUT SCHEMA (JSON):
{
  "executiveSummary": "Concise 2-3 paragraph strategic summary of cohort/programme health",
  "keyStrengths": ["Strength 1 with quantitative backing", "Strength 2"],
  "detectedAnomaliesOrRisks": ["Risk or drop-off point 1", "Risk 2"],
  "donorImpactNarrative": "Compelling narrative for funders/donors highlighting empowerment, skill acquisition, gender equity and social mobility",
  "pedagogicalRecommendations": ["Actionable curriculum recommendation 1", "Recommendation 2"],
  "operationalNextSteps": ["Next operational step 1", "Next step 2"]
}`;

    const userPrompt = `Analyze the following report dataset and generate an AI executive synthesis:

Report Type: ${safeReportType || 'GENERAL_REPORT'}
Report Title: ${safeReportTitle || 'Programme Progress Report'}
Audience Focus: ${safeAudience.toUpperCase()}
Applied Filter Context: ${JSON.stringify(filterContext || {})}

KPI Summary:
${JSON.stringify(kpis, null, 2).slice(0, 5000)}

Aggregated Metrics:
${JSON.stringify(summaryMetrics, null, 2).slice(0, 5000)}

Provide rigorous, data-grounded insights and forward-looking recommendations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return res.json({
      success: true,
      data: parsed,
      meta: {
        model: 'gemini-3.7-flash',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API Error] AI Report Synthesis:', error?.message);
    return res.status(500).json({
      error: 'Failed to synthesize report securely.',
    });
  }
});

// 6. AI Question Bank Bulk Parser (PDF, DOCX, XLSX, CSV, TXT)
app.post('/api/ai/parse-question-bank', async (req, res) => {
  try {
    const { rawText, fileName, fileType, expectedSection = 'General' } = req.body;

    const safeText = redactSensitivePII(sanitizeInput(rawText, 50000));
    const safeFileName = sanitizeInput(fileName, 100);
    const safeFileType = sanitizeInput(fileType, 50);

    if (!safeText || safeText.trim().length < 10) {
      return res.status(400).json({
        error: 'Question bank text content is required for parsing.',
      });
    }

    const ai = getGenAI();

    const systemPrompt = `You are a certified psychometric examination parser and structured data extractor for NextGen Class.
CRITICAL PARSING & FIDELITY RULES:
1. Extract ALL questions from the provided raw text exactly as written.
2. DO NOT rewrite, simplify, summarize, reword, or invent question prompts or options!
3. If an answer key or correct answer is explicitly marked in the text (e.g. marked with *, bold, "Ans: A", "Correct: C", "(Key: True)"), identify and extract it.
4. If NO correct answer is stated in the document, you MUST set "correctAnswer": "NOT PROVIDED". DO NOT guess or hallucinate answers.
5. Identify the question type strictly as one of:
   - "multiple_choice" (single correct option among multiple)
   - "multiple_select" (one or more correct options among multiple)
   - "true_false" (True/False statement)
   - "yes_no" (Yes/No prompt)
   - "short_text" (short text answer / fill in the blank)
   - "long_text" (essay, paragraph, or descriptive response)
   - "number" (numerical answer)
   - "dropdown" (dropdown selection)
   - "rating" (scale rating)
6. Extract marks/points if stated (e.g. "[5 marks]", "(10 pts)"), otherwise default to 10.
7. Extract section/category if indicated in headings, otherwise use "${safeSectionName(expectedSection)}".
8. Extract any pedagogical explanation if present.
9. Flag questions that might be ambiguous, truncated, or missing options with status "NEEDS_REVIEW". Fully complete questions get "APPROVED".

OUTPUT JSON SCHEMA:
{
  "summary": {
    "totalDetected": 10,
    "parsedSuccessfully": 9,
    "needsReview": 1,
    "couldNotParseCount": 0
  },
  "questions": [
    {
      "id": "q_parsed_1",
      "text": "Exact verbatim question text",
      "type": "multiple_choice",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "Option A text",
      "marks": 10,
      "explanation": "Explanation text or empty",
      "section": "Section Name",
      "status": "APPROVED",
      "confidence": 0.95
    }
  ]
}`;

    const userPrompt = `Parse and extract all questions from this uploaded document file ("${safeFileName || 'question_bank'}").
File Content:
"""
${safeText}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || '{}');

    return res.json({
      success: true,
      data: parsedData,
      meta: {
        model: 'gemini-3.7-flash',
        fileName: safeFileName,
        fileType: safeFileType,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API Error] AI Question Bank Parsing:', error?.message);
    return res.status(500).json({
      error: 'Failed to parse question bank with AI. Please check file format.',
    });
  }
});

function safeSectionName(sec: any): string {
  if (typeof sec !== 'string' || !sec.trim()) return 'General Knowledge';
  return sec.slice(0, 80).trim();
}

// ----------------------------------------------------
// VITE SPA MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NextGen PRO Server running on http://0.0.0.0:${PORT} [Production Hardened]`);
  });
}

startServer();

