import React, { useState, useEffect } from 'react';
import { Programme, Cohort } from '../types';
import {
  getProgrammes,
  getCohorts,
  seedInitialDataIfEmpty,
} from '../services/programmes';
import { getProgrammeConfig } from '../services/applications';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Award,
  ArrowRight,
  BookOpen,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface PublicProgrammePageProps {
  slug?: string;
  onNavigate: (path: string) => void;
}

export const PublicProgrammePage: React.FC<PublicProgrammePageProps> = ({
  slug = 'generative-ai-cohort-2',
  onNavigate,
}) => {
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [eligibilityRules, setEligibilityRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await seedInitialDataIfEmpty();
        const progs = await getProgrammes();
        const targetProg =
          progs.find((p) => p.slug === slug || p.id === slug) || progs[0];

        if (targetProg) {
          setProgramme(targetProg);
          const allCohorts = await getCohorts(targetProg.id);
          setCohorts(allCohorts);

          const config = await getProgrammeConfig(targetProg.id);
          setEligibilityRules(config.eligibilityRequirements || []);
        }
      } catch (err) {
        console.error('Error loading public programme page:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" label="Loading programme details..." />
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Programme Not Found</h2>
        <Button variant="primary" onClick={() => onNavigate('/')}>
          Return to Home Page
        </Button>
      </div>
    );
  }

  const activeCohort =
    cohorts.find((c) => c.status === 'APPLICATION_OPEN') ||
    cohorts.find((c) => c.status === 'ACTIVE') ||
    cohorts[0];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> NextGen Class Flagship Initiative
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {programme.name}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            {programme.description}
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Duration: <strong className="text-white">{programme.duration}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>Format: <strong className="text-white">{programme.deliveryFormat}</strong></span>
            </div>

            {activeCohort && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <GraduationCap className="w-4 h-4 text-orange-400" />
                <span>Enrolling: <strong className="text-white">{activeCohort.name} ({activeCohort.code})</strong></span>
              </div>
            )}
          </div>

          {activeCohort && activeCohort.status === 'APPLICATION_OPEN' && (
            <div className="pt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onNavigate(`/apply/${activeCohort.id}`)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg cursor-pointer"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Apply for {activeCohort.name}
              </Button>
              <span className="text-xs text-orange-300 font-semibold">
                Applications close on {activeCohort.applicationCloseDate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cohorts & Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Cohorts List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-orange-600" /> Cohort Schedule & Status
          </h2>

          <div className="space-y-4">
            {cohorts.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-500">
                No active cohorts currently configured for this programme.
              </Card>
            ) : (
              cohorts.map((cohort) => (
                <Card
                  key={cohort.id}
                  className={`p-5 transition-all ${
                    cohort.id === activeCohort?.id
                      ? 'border-2 border-orange-500 bg-orange-50/20 shadow-sm'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{cohort.name}</h3>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
                          {cohort.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Capacity: {cohort.capacity} Learners
                      </p>
                    </div>

                    <Badge
                      variant={
                        cohort.status === 'APPLICATION_OPEN'
                          ? 'success'
                          : cohort.status === 'ACTIVE'
                          ? 'primary'
                          : 'neutral'
                      }
                    >
                      {cohort.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Application Window</span>
                      <span className="font-semibold text-slate-800">
                        {cohort.applicationOpenDate} to {cohort.applicationCloseDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Cohort Duration</span>
                      <span className="font-semibold text-slate-800">
                        {cohort.startDate} to {cohort.endDate}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      {cohort.status === 'APPLICATION_OPEN' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate(`/apply/${cohort.id}`)}
                        >
                          Apply Now
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Eligibility Requirements */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-600" /> Eligibility Criteria
          </h2>

          <Card className="p-5 space-y-3 bg-white border-slate-200">
            <p className="text-xs text-slate-600">
              Applicants must satisfy the following baseline criteria:
            </p>

            <div className="space-y-2.5 pt-1">
              {eligibilityRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 italic">
                Selection is merit-based depending on application answers and commitment level.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
