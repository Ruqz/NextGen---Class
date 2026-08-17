import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AssessmentResourceItem } from '../staff/StaffAssessmentResourcesView';

interface ApplicantAssessmentResourcesViewProps {
  onNavigate?: (path: string) => void;
}

export const ApplicantAssessmentResourcesView: React.FC<ApplicantAssessmentResourcesViewProps> = ({
  onNavigate,
}) => {
  const [resources, setResources] = useState<AssessmentResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'assessmentStudyResources'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AssessmentResourceItem[];
        setResources(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching applicant resources:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="p-6 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white border-0 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
                <BookOpen className="w-5 h-5 text-white" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">Application & Assessment Study Resources</h2>
            </div>
            <p className="text-xs sm:text-sm text-orange-100 max-w-2xl">
              Official syllabus documents, sample problem-solving question sets, and technical guides provided by NextGen Class Programme Managers to help you succeed.
            </p>
          </div>

          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/applicant/assessment')}
              className="bg-white text-orange-700 hover:bg-orange-50 border-0 font-bold shrink-0 shadow-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Take Assessment
            </Button>
          )}
        </div>
      </Card>

      {/* Resource List */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 bg-white rounded-2xl border border-slate-200">
          <Spinner size="md" />
          <p className="text-xs font-medium">Loading study resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="No Study Resources Uploaded Yet"
          description="Your programme manager has not published specific assessment prep guides for this cohort yet. You can proceed directly to your application or assessment."
          actionLabel="Go to My Application"
          onAction={() => onNavigate && onNavigate('/applicant/application')}
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(resources || []).map((res) => (
            <Card
              key={res.id}
              className="p-5 bg-white border-slate-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <Badge variant={res.isRequired ? 'warning' : 'info'} className="text-[9px]">
                      {res.isRequired ? 'Mandatory Preparation' : 'Recommended'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{res.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3">{res.description}</p>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-slate-700">{res.programmeName || 'General Track'}</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">{res.fileSize || 'PDF Doc'}</span>
                <a
                  href={res.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / View</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
