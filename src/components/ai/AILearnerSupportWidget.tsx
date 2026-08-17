import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { askAILearnerSupport } from '../../services/ai';
import { AISupportChatMessage, AISupportEscalationTicket } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import {
  HelpCircle,
  MessageSquare,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  LifeBuoy,
  FileQuestion,
  ChevronDown,
  Headphones,
  Clock,
} from 'lucide-react';

interface AILearnerSupportWidgetProps {
  isFloating?: boolean;
  programmeName?: string;
  cohortName?: string;
}

export const AILearnerSupportWidget: React.FC<AILearnerSupportWidgetProps> = ({
  isFloating = false,
  programmeName = 'NextGen Class Programme',
  cohortName = 'Active Cohort',
}) => {
  const { userProfile, activeRole } = useAuth();
  const [isOpen, setIsOpen] = useState(!isFloating);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<AISupportChatMessage[]>([
    {
      id: 'welcome-support',
      role: 'model',
      content: `👋 Hello **${userProfile?.displayName || 'there'}**! I am your **24/7 AI Learner Support Assistant**.\n\nI can answer questions regarding:\n- 📅 Class schedules, timetable & attendance rules (80% minimum policy)\n- 📝 Assignment guidelines & submission procedures\n- 🎓 Assessment scoring, pass benchmarks & re-attempt policies\n- 🏆 Capstone project requirements & certificate qualification criteria\n\nIf you have an urgent grievance or technical issue, I will immediately route an **Escalation Ticket** to your Programme Managers.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [activeTicket, setActiveTicket] = useState<AISupportEscalationTicket | null>(null);

  const handleSend = async (customQuery?: string) => {
    const textToSend = customQuery || query.trim();
    if (!textToSend || loading) return;

    setError(null);
    setQuery('');

    const userMsg: AISupportChatMessage = {
      id: `USER-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askAILearnerSupport({
        userRole: activeRole,
        programmeName,
        cohortName,
        query: textToSend,
        history,
        userId: userProfile?.uid || 'support-user',
        userName: userProfile?.displayName || 'Active Learner',
        userEmail: userProfile?.email || 'learner@nextgenpro.org',
      });

      const modelMsg: AISupportChatMessage = {
        id: `AI-${Date.now()}`,
        role: 'model',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };

      if (res.escalationTicket) {
        setActiveTicket(res.escalationTicket);
      }

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to communicate with Learner Support Assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  if (isFloating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-orange-600 hover:bg-orange-700 text-white p-3.5 rounded-full shadow-xl flex items-center gap-2.5 transition-all hover:scale-105"
        title="24/7 AI Learner Support"
      >
        <Headphones className="w-5 h-5" />
        <span className="text-xs font-bold pr-1">Need Help? AI Support</span>
      </button>
    );
  }

  return (
    <div className={isFloating ? 'fixed bottom-6 right-6 z-50 w-full max-w-md shadow-2xl' : 'w-full'}>
      <Card className="overflow-hidden border-slate-300 shadow-lg flex flex-col bg-white">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">24/7 AI Learner Support</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Programme logistics, policies, and ticketing</p>
            </div>
          </div>
          {isFloating && (
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick FAQ Prompts */}
        <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-slate-400 font-bold px-1 self-center">FAQ:</span>
          <button
            onClick={() => handleQuickQuestion('What is the minimum attendance requirement to receive my certificate?')}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 px-2.5 py-1 rounded-md transition-colors"
          >
            📋 Attendance Policy
          </button>
          <button
            onClick={() => handleQuickQuestion('How do I submit or resubmit my assignment?')}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 px-2.5 py-1 rounded-md transition-colors"
          >
            📝 Submissions
          </button>
          <button
            onClick={() => handleQuickQuestion('What are the passing criteria for the capstone final project?')}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 px-2.5 py-1 rounded-md transition-colors"
          >
            🏆 Capstone Rules
          </button>
        </div>

        {/* Active Escalation Ticket Banner (If triggered) */}
        {activeTicket && (
          <div className="bg-amber-500/10 border-b border-amber-300 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold flex items-center gap-2">
                Escalation Ticket #{activeTicket.id} Created
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  {activeTicket.priority} PRIORITY
                </span>
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Our Programme Management team has received your ticket and will follow up with you.
              </p>
            </div>
          </div>
        )}

        {/* Chat Stream */}
        <div className="p-4 overflow-y-auto space-y-3 max-h-[380px] min-h-[260px] bg-white">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isModel ? 'bg-orange-600 text-white' : 'bg-slate-800 text-white'
                  }`}
                >
                  {isModel ? <LifeBuoy className="w-3.5 h-3.5" /> : 'U'}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    isModel
                      ? 'bg-slate-100 text-slate-800 border border-slate-200'
                      : 'bg-orange-600 text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <span
                    className={`block text-[9px] mt-1 ${
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
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                <Spinner size="sm" />
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                Checking platform rules & answering...
              </div>
            </div>
          )}

          {error && (
            <Alert variant="danger" title="Support Error">
              {error}
            </Alert>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about classes, attendance, grading, deadlines..."
              disabled={loading}
              className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Button
              type="submit"
              disabled={!query.trim() || loading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2.5 rounded-lg text-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
            <span>🛡️ Learner Data Protected</span>
            <span>Escalation Routing Active</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
