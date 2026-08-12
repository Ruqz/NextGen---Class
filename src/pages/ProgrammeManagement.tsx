import React, { useState } from 'react';
import { ProgrammeList } from '../components/programmes/ProgrammeList';
import { CohortList } from '../components/programmes/CohortList';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { BookOpen, GraduationCap, Layers } from 'lucide-react';

interface ProgrammeManagementProps {
  initialTab?: 'programmes' | 'cohorts';
}

export const ProgrammeManagement: React.FC<ProgrammeManagementProps> = ({
  initialTab = 'programmes',
}) => {
  const [activeTab, setActiveTab] = useState<'programmes' | 'cohorts'>(initialTab);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Programme Manager Operations
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Programme & Cohort Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure master programme specifications, launch cohorts, manage application windows and lifecycle states.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('programmes')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'programmes'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Programmes
          </button>
          <button
            onClick={() => setActiveTab('cohorts')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'cohorts'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Cohorts
          </button>
        </div>
      </div>

      {/* Render Active Management View */}
      {activeTab === 'programmes' ? <ProgrammeList /> : <CohortList />}
    </div>
  );
};
