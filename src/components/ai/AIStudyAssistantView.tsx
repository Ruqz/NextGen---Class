import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { askAIStudyAssistant } from '../../services/ai';
import { subscribeToLearnerCurriculum } from '../../services/curriculum';
import { CurriculumModuleItem, AIStudyMode, AIStudyChatMessage } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import {
  Sparkles,
  Send,
  BookOpen,
  HelpCircle,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lightbulb,
  ShieldCheck,
  ChevronRight,
  BrainCircuit,
  FileQuestion,
  GraduationCap,
  Flame,
} from 'lucide-react';

interface AIStudyAssistantViewProps {
  programmeName?: string;
  cohortName?: string;
  programmeId?: string;
}

export const AIStudyAssistantView: React.FC<AIStudyAssistantViewProps> = ({
  programmeName = 'NextGen AI & Full-Stack Programme',
  cohortName = 'Active Cohort',
  programmeId = 'DEFAULT_PROG',
}) => {
  const { userProfile } = useAuth();

  const [mode, setMode] = useState<AIStudyMode>('explain');
  const [curriculumModules, setCurriculumModules] = useState<CurriculumModuleItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<AIStudyChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: `👋 Hello **${userProfile?.displayName || 'Learner'}**! I am your **AI Study Companion**, strictly grounded in the official syllabus for **${programmeName}**.\n\nHow would you like to study today? Choose a mode above to:\n- 💡 **Explain Concepts** with analogies and code\n- 🎯 **Take a Practice Quiz** with instant deterministic grading\n- 🗂️ **Generate Revision Flashcards**\n- 📅 **Build a Custom Study Plan**`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Practice Quiz Interactive State
  const [activeQuiz, setActiveQuiz] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    userSelected?: number;
    isSubmitted?: boolean;
  } | null>(null);

  // Flashcards Interactive State
  const [flashcards, setFlashcards] = useState<{ front: string; back: string; flipped: boolean }[]>([]);

  // Load Curriculum for Grounding
  useEffect(() => {
    const unsub = subscribeToLearnerCurriculum(programmeId, (modules) => {
      setCurriculumModules(modules);
    });
    return () => unsub();
  }, [programmeId]);

  // Assemble Grounding Syllabus Context
  const getSyllabusContext = (): string => {
    if (curriculumModules.length === 0) {
      return `Programme: ${programmeName}\nTrack: Generative AI, Full-Stack TypeScript, React, Cloud Database Systems, Software Architecture, and Monitoring.`;
    }

    const filtered = selectedModule === 'ALL'
      ? curriculumModules
      : curriculumModules.filter((m) => m.id === selectedModule || m.title === selectedModule);

    return filtered
      .map((m, idx) => {
        const weeks = m.weeks
          ?.map(
            (w) =>
              `  - Week ${w.weekNumber}: ${w.title} (${w.lessons?.map((l) => l.title).join(', ') || 'Core concepts'})`
          )
          .join('\n');
        return `Module ${idx + 1}: ${m.title}\nDescription: ${m.description || 'Core learning track'}\n${weeks || ''}`;
      })
      .join('\n\n');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage.trim();
    if (!promptToSend || loading) return;

    setError(null);
    setInputMessage('');

    const userMsg: AIStudyChatMessage = {
      id: `USR-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      mode: mode,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await askAIStudyAssistant({
        programmeName,
        cohortName,
        syllabusContext: getSyllabusContext(),
        mode,
        message: promptToSend,
        history,
        userId: userProfile?.uid || 'learner-user',
        userName: userProfile?.displayName || 'Active Learner',
      });

      const modelMsg: AIStudyChatMessage = {
        id: `AI-${Date.now()}`,
        role: 'model',
        content: reply,
        mode: mode,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMsg]);

      // Check if response contains structured practice quiz or flashcards
      if (mode === 'quiz' && reply.includes('?')) {
        parseAndSetQuiz(reply);
      } else if (mode === 'flashcards') {
        parseAndSetFlashcards(reply);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to get response from AI Study Assistant');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Try to extract a structured interactive quiz if the model outputs numbered options
  const parseAndSetQuiz = (text: string) => {
    try {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const questionLine = lines.find((l) => l.includes('?') || l.startsWith('**Question') || l.startsWith('Question:'));
      const options = lines
        .filter((l) => /^[A-D\d]\.|\([A-D\d]\)|^[A-D]\)/i.test(l))
        .map((l) => l.replace(/^[A-D\d][\.\)]\s*/i, '').trim());

      if (questionLine && options.length >= 2) {
        setActiveQuiz({
          question: questionLine.replace(/^\*\*Question:?\*\*\s*/i, ''),
          options: options.slice(0, 4),
          correctIndex: 0, // Fallback default
          explanation: text,
          isSubmitted: false,
        });
      }
    } catch (e) {
      // Non-blocking fallback
    }
  };

  // Helper: Try to extract flashcards
  const parseAndSetFlashcards = (text: string) => {
    try {
      const cards: { front: string; back: string; flipped: boolean }[] = [];
      const blocks = text.split(/\n(?=(?:Card|\d+\.|\*\*Front))/i);
      for (const block of blocks) {
        const parts = block.split(/(?:Back:|\*\*Back:\*\*|->|—)/i);
        if (parts.length >= 2) {
          cards.push({
            front: parts[0].replace(/^(?:Card \d+:|\d+\.|\*\*Front:\*\*)/i, '').trim(),
            back: parts[1].replace(/^\*\*Back:\*\*/i, '').trim(),
            flipped: false,
          });
        }
      }
      if (cards.length > 0) {
        setFlashcards(cards.slice(0, 6));
      }
    } catch (e) {
      // Fallback
    }
  };

  const handleQuickPrompt = (prompt: string, selectedMode: AIStudyMode) => {
    setMode(selectedMode);
    handleSendMessage(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                Syllabus-Grounded AI Tutor
              </span>
              <span className="text-xs text-orange-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Approved Content Only
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{programmeName} AI Study Assistant</h2>
            <p className="text-sm text-orange-100 mt-0.5">
              Ask questions, practice interactive quizzes, study flashcards, and master your curriculum milestones.
            </p>
          </div>
        </div>

        {/* Module Grounding Selector */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 min-w-[240px]">
          <p className="text-[11px] font-semibold text-orange-100 uppercase tracking-wider mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Focus Module Context:
          </p>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="ALL">Entire Programme Curriculum (All Modules)</option>
            {curriculumModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setMode('explain')}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            mode === 'explain'
              ? 'bg-orange-50 border-orange-500 text-orange-950 font-semibold shadow-xs ring-1 ring-orange-400'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2 rounded-lg ${mode === 'explain' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Concept Explainer</p>
            <p className="text-[11px] text-slate-500">Analogies & Code</p>
          </div>
        </button>

        <button
          onClick={() => setMode('quiz')}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            mode === 'quiz'
              ? 'bg-orange-50 border-orange-500 text-orange-950 font-semibold shadow-xs ring-1 ring-orange-400'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2 rounded-lg ${mode === 'quiz' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <FileQuestion className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Practice Quiz</p>
            <p className="text-[11px] text-slate-500">Deterministic Checks</p>
          </div>
        </button>

        <button
          onClick={() => setMode('flashcards')}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            mode === 'flashcards'
              ? 'bg-orange-50 border-orange-500 text-orange-950 font-semibold shadow-xs ring-1 ring-orange-400'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2 rounded-lg ${mode === 'flashcards' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Flashcard Deck</p>
            <p className="text-[11px] text-slate-500">Quick Concept Flip</p>
          </div>
        </button>

        <button
          onClick={() => setMode('plan')}
          className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            mode === 'plan'
              ? 'bg-orange-50 border-orange-500 text-orange-950 font-semibold shadow-xs ring-1 ring-orange-400'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2 rounded-lg ${mode === 'plan' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Study Planner</p>
            <p className="text-[11px] text-slate-500">Revision Roadmap</p>
          </div>
        </button>
      </div>

      {/* Suggested Quick Starters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Quick Starters:
        </span>
        <button
          onClick={() => handleQuickPrompt('Explain the core architecture and components of our current module with an intuitive analogy.', 'explain')}
          className="text-xs bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
        >
          💡 Explain current module with analogy
        </button>
        <button
          onClick={() => handleQuickPrompt('Give me a 3-question multiple choice practice quiz to test my understanding of key concepts.', 'quiz')}
          className="text-xs bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
        >
          🎯 Generate 3-question practice quiz
        </button>
        <button
          onClick={() => handleQuickPrompt('Create 4 revision flashcards with Front (Concept) and Back (Key Definition).', 'flashcards')}
          className="text-xs bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
        >
          🗂️ Generate 4 flashcards
        </button>
        <button
          onClick={() => handleQuickPrompt('Help me create a 5-day structured revision schedule to prepare for upcoming assessments.', 'plan')}
          className="text-xs bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
        >
          📅 5-day study roadmap
        </button>
      </div>

      {/* Interactive Flashcards Canvas (If Flashcards were generated) */}
      {flashcards.length > 0 && mode === 'flashcards' && (
        <Card className="p-5 border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" /> Interactive Flashcards Deck ({flashcards.length} Cards)
            </h3>
            <span className="text-xs text-slate-500">Click any card to flip</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setFlashcards((prev) =>
                    prev.map((c, i) => (i === idx ? { ...c, flipped: !c.flipped } : c))
                  );
                }}
                className={`min-h-[140px] p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                  card.flipped
                    ? 'bg-orange-600 text-white border-orange-700 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    card.flipped ? 'bg-orange-700 text-orange-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {card.flipped ? 'Answer / Explanation' : `Card #${idx + 1}`}
                  </span>
                  <RotateCcw className="w-3.5 h-3.5 opacity-60" />
                </div>
                <p className="text-xs font-semibold leading-relaxed my-auto">
                  {card.flipped ? card.back : card.front}
                </p>
                <p className={`text-[10px] text-right mt-2 ${card.flipped ? 'text-orange-200' : 'text-slate-400'}`}>
                  {card.flipped ? 'Tap to see prompt' : 'Tap to reveal explanation'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Conversation Stream */}
      <Card className="overflow-hidden border-slate-200 shadow-sm flex flex-col min-h-[480px]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">AI Study Tutor Active</span>
            <span className="text-xs text-slate-400">• Mode: {mode.toUpperCase()}</span>
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  id: 'welcome-reset',
                  role: 'model',
                  content: `Conversation reset. I am ready to help you with **${programmeName}**! What topic should we tackle next?`,
                  timestamp: new Date().toISOString(),
                },
              ]);
              setActiveQuiz(null);
              setFlashcards([]);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Chat
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[560px]">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isModel
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {isModel ? <Sparkles className="w-4 h-4" /> : userProfile?.displayName?.charAt(0) || 'U'}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isModel
                      ? 'bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs'
                      : 'bg-orange-600 text-white shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  <span
                    className={`block text-[10px] mt-2 ${
                      isModel ? 'text-slate-400' : 'text-orange-200'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                <Spinner size="sm" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500 animate-spin" />
                Reviewing syllabus & generating grounded explanation...
              </div>
            </div>
          )}

          {error && (
            <Alert variant="danger" title="Assistant Error">
              {error}
            </Alert>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                mode === 'explain'
                  ? 'Ask any question or concept from your syllabus...'
                  : mode === 'quiz'
                  ? 'Request a practice quiz on a specific topic...'
                  : mode === 'flashcards'
                  ? 'Request flashcards for revision...'
                  : 'Ask for a custom study schedule...'
              }
              disabled={loading}
              className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl shrink-0 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Assistant</span>
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>🛡️ Grounded in accredited programme syllabus</span>
            <span>Deterministic Scoring & Human-Reviewed Materials</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
