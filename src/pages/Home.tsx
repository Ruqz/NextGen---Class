import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  Calendar,
  Clock,
  Briefcase,
  Zap,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { demoLoginAs } = useAuth();

  return (
    <div className="space-y-12">
      {/* Platform Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-8 md:p-12 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> NextGen PRO Platform Architecture
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Education & Skills Development <span className="text-orange-500">Empowerment Engine</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            A reusable, cohort-driven digital platform designed to orchestrate end-to-end learner lifecycles—from application and pre-qualification through active classes, interventions, and verified certification.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onNavigate('/programmes/generative-ai-cohort-2')}
            >
              Explore Cohort 2 Programme
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-white border-slate-700 hover:bg-slate-800 hover:text-white"
              onClick={() => onNavigate('/portal')}
            >
              Access Role Portal
            </Button>
          </div>
        </div>

        {/* Quick Metrics Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 mt-8 border-t border-slate-800 text-center sm:text-left">
          <div>
            <p className="text-2xl font-bold text-white">Cohort 2</p>
            <p className="text-xs text-slate-400 mt-0.5">Generative AI & Automation</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">6 Roles</p>
            <p className="text-xs text-slate-400 mt-0.5">Role-Based Access Control</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">100% Secure</p>
            <p className="text-xs text-slate-400 mt-0.5">Firebase & Security Rules</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">Multi-Cohort</p>
            <p className="text-xs text-slate-400 mt-0.5">Reusable Architecture</p>
          </div>
        </div>
      </section>

      {/* Featured Deployment: Generative AI & AI Automation — Cohort 2 */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">Active Deployment</Badge>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Featured Programme</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Generative AI & AI Automation
            </h2>
          </div>
          <p className="text-xs text-slate-500">Code: <span className="font-mono text-slate-800 font-semibold">GENAI-COHORT-02</span></p>
        </div>

        <Card variant="bordered-orange" className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Cohort 2 — Masterclass & Hands-on Lab</h3>
                  <p className="text-xs text-slate-500">12 Weeks • Hybrid Delivery • Practical Projects</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                Empowering learners with practical capabilities in Large Language Models, prompt engineering, AI agent architectures, automation workflows, and vibe coding. Designed for high-impact skills application with continuous facilitator mentoring.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Interactive Pre-Admission Assessment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time Class Attendance & Lab Grading</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>At-Risk Learner Early Intervention System</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cryptographically Verifiable Certificates</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cohort Key Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Status</span>
                    <Badge variant="success">APPLICATION_OPEN</Badge>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Capacity</span>
                    <span className="font-semibold text-slate-900">150 Learners</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-semibold text-slate-900">Sept 1, 2026</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Delivery</span>
                    <span className="font-semibold text-slate-900">Hybrid (Online + Labs)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => onNavigate('/auth?mode=register')}
                >
                  Apply for Cohort 2
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => onNavigate('/programmes/generative-ai-cohort-2')}
                >
                  View Full Syllabus
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Reusable Platform Capabilities (Future Programme Ready) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="primary">Future-Proof Architecture</Badge>
          <h2 className="text-2xl font-bold text-slate-900">
            Multi-Programme & Multi-Cohort Support
          </h2>
          <p className="text-xs text-slate-600">
            NextGen PRO supports adding future skills initiatives seamlessly without code modifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-slate-300 transition-all">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg w-fit mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Modern Digital Literacy</CardTitle>
            <CardDescription className="text-xs mt-1">
              Foundational digital workforce skills, cloud tools, and safe internet productivity.
            </CardDescription>
            <CardFooter className="text-xs text-slate-400 font-medium pt-3">Configurable Pipeline</CardFooter>
          </Card>

          <Card className="hover:border-slate-300 transition-all">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg w-fit mb-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">SME Digital Transformation</CardTitle>
            <CardDescription className="text-xs mt-1">
              Empowering small enterprise owners with modern business automation tools.
            </CardDescription>
            <CardFooter className="text-xs text-slate-400 font-medium pt-3">Configurable Pipeline</CardFooter>
          </Card>

          <Card className="hover:border-slate-300 transition-all">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg w-fit mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <CardTitle className="text-base">Vibe Coding & Full-Stack AI</CardTitle>
            <CardDescription className="text-xs mt-1">
              Building next-gen software with natural language AI agents and rapid prototyping.
            </CardDescription>
            <CardFooter className="text-xs text-slate-400 font-medium pt-3">Configurable Pipeline</CardFooter>
          </Card>
        </div>
      </section>

      {/* Role Playground Entry Points */}
      <section className="bg-slate-900 text-white p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Role-Based Platform Testing</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select any stakeholder persona to test security boundaries and access permissions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { role: 'Applicant' as const, desc: 'Apply & Qualification' },
            { role: 'Learner' as const, desc: 'Classes & Submissions' },
            { role: 'Facilitator' as const, desc: 'Grading & Attendance' },
            { role: 'Programme Manager' as const, desc: 'Cohort Administration' },
            { role: 'M&E Manager' as const, desc: 'Outcome Indicators' },
            { role: 'Super Admin' as const, desc: 'Platform Audit & Users' },
          ].map((item) => (
            <button
              key={item.role}
              onClick={() => {
                demoLoginAs(item.role);
                onNavigate('/portal');
              }}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition-all group cursor-pointer"
            >
              <Badge variant="role" roleName={item.role} size="sm" />
              <p className="text-[11px] text-slate-400 mt-2 group-hover:text-white transition-colors">
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
