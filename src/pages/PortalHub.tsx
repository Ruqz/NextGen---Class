import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import {
  FileCheck,
  GraduationCap,
  Calendar,
  ClipboardList,
  BarChart3,
  Award,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Layers,
} from 'lucide-react';

interface PortalHubProps {
  onNavigate: (path: string) => void;
}

export const PortalHub: React.FC<PortalHubProps> = ({ onNavigate }) => {
  const { activeRole, userProfile } = useAuth();

  return (
    <div className="space-y-6">
      {/* Role Banner Notification */}
      <Alert type="info" title={`NextGen PRO — ${activeRole} Workspace Active`}>
        You are currently viewing the platform from the perspective of a <span className="font-semibold">{activeRole}</span>.
        All data access and view states comply with Firestore security rules and Role-Based Access Control (RBAC).
      </Alert>

      {/* Role Specific Overview Panel */}
      {activeRole === 'Applicant' && (
        <div className="space-y-6">
          <Card variant="bordered-orange" className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Badge variant="warning" className="mb-2">Application In Progress</Badge>
                <h2 className="text-xl font-bold text-slate-900">
                  Cohort 2 — Generative AI & AI Automation
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Application Reference: <span className="font-mono text-slate-800">APP-2026-GAI-0089</span>
                </p>
              </div>
              <Button variant="primary" onClick={() => onNavigate('/portal/applicant/assessment')}>
                Take Pre-Admission Test
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Step 1: Interest Form</p>
                  <p className="text-sm font-bold text-slate-900">Completed</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Step 2: Skills Quiz</p>
                  <p className="text-sm font-bold text-slate-900">Pending Attempt</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Step 3: Decision</p>
                  <p className="text-sm font-bold text-slate-900">Awaiting Assessment</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeRole === 'Learner' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-medium">Enrolled Cohort</p>
              <p className="text-lg font-bold text-slate-900 mt-1">Gen AI Cohort 2</p>
              <Badge variant="success" size="sm" className="mt-2">ACTIVE</Badge>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-medium">Class Attendance</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">94% (15/16)</p>
              <span className="text-[11px] text-slate-400">On Track</span>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-medium">Assignment Score</p>
              <p className="text-lg font-bold text-orange-600 mt-1">92 / 100</p>
              <span className="text-[11px] text-slate-400">Above Benchmark</span>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-medium">Intervention Flag</p>
              <p className="text-lg font-bold text-slate-900 mt-1">None</p>
              <span className="text-[11px] text-emerald-600 font-medium">Clear Status</span>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Learning Module</CardTitle>
              <CardDescription>Module 3: Autonomous AI Agents & Function Calling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-600 h-full w-[65%]" />
              </div>
              <p className="text-xs text-slate-500">Overall Cohort Progress: 65% Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeRole === 'Facilitator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-slate-500">Assigned Cohort</p>
              <p className="text-base font-bold text-slate-900">Gen AI & Automation Cohort 2</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500">Active Learners</p>
              <p className="text-xl font-bold text-orange-600">45 Assigned</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-medium">Ungraded Submissions</p>
              <p className="text-xl font-bold text-amber-600">5 Submissions</p>
            </Card>
          </div>
        </div>
      )}

      {(activeRole === 'Programme Manager' || activeRole === 'PROGRAMME_MANAGER') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Master Specifications</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Programme Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create, edit, view, and archive master programmes.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/programmes')}>
                  Manage Programmes
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Cohort Lifecycle</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Cohort Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch cohorts, configure dates, capacity, and application windows.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/cohorts')}>
                  Manage Cohorts
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Form Customization</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Application Form Builder</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Build dynamic application forms, configure 14 question types, file upload rules, and publish versioned templates.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/form-builder')}>
                  Open Form Builder
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Selection & Admissions</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Application Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review applications, filter, evaluate eligibility answers, view attachments, and update status.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/applications')}>
                  Manage Applications
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Testing & Scoring</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Assessment Engine</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure question banks, multiple choice / True-False tests, timers, pass thresholds, and review scores.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/assessments')}>
                  Open Assessment Engine
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Automated Workflow</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Admission Workflow Engine</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Issue assessment invitations, unique link access, score calculation against pass benchmarks, acceptances, waitlists, and rejections.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/pm/admissions')}>
                  Open Admissions Engine
                </Button>
              </div>
            </Card>

            <Card variant="bordered-orange" className="p-5">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Learner Enrolment</p>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Activated Learner Workspace</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View active learner profiles, assigned Learner IDs, multi-enrolment programme switchers, and linked cohort schedules.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/portal/learner/dashboard')}>
                  Open Learner Workspace
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeRole === 'M&E Manager' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-slate-500">Overall Attendance Rate</p>
              <p className="text-2xl font-bold text-emerald-600">91.8%</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500">Completion Target</p>
              <p className="text-2xl font-bold text-slate-900">85.0%</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500">M&E Indicators Tracked</p>
              <p className="text-2xl font-bold text-orange-600">12 Key Indicators</p>
            </Card>
          </div>
        </div>
      )}

      {activeRole === 'Super Admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-slate-500">Firestore Rules</p>
              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-4 h-4" /> Deployed & Enforced
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500">Database ID</p>
              <p className="text-xs font-mono font-bold text-slate-800 truncate mt-1">
                ai-studio-21e06f...
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500">System Audit Trail</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Immutable Logging Active</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
