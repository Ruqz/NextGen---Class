import React, { useState, useEffect } from 'react';
import {
  CurriculumModuleItem,
  CurriculumWeek,
  CurriculumLesson,
  CurriculumResource,
  CurriculumResourceType,
  Programme,
} from '../types';
import { getProgrammes } from '../services/programmes';
import {
  subscribeToCurriculumModules,
  createCurriculumModule,
  updateCurriculumModule,
  publishCurriculumModule,
  unpublishCurriculumModule,
  deleteCurriculumModule,
  seedInitialCurriculumIfEmpty,
} from '../services/curriculum';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Video,
  Link as LinkIcon,
  Download,
  File,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  FolderTree,
} from 'lucide-react';

export const CurriculumManagementPage: React.FC = () => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>('');
  const [modules, setModules] = useState<CurriculumModuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Expanded Modules State (array of module IDs)
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

  // Modal / Form States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState<boolean>(false);
  const [editingModule, setEditingModule] = useState<CurriculumModuleItem | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [moduleCode, setModuleCode] = useState<string>('');
  const [moduleDesc, setModuleDesc] = useState<string>('');
  const [moduleOrder, setModuleOrder] = useState<number>(1);
  const [modulePublished, setModulePublished] = useState<boolean>(true);

  // Week Modal / Form State
  const [isWeekModalOpen, setIsWeekModalOpen] = useState<boolean>(false);
  const [targetModuleForWeek, setTargetModuleForWeek] = useState<CurriculumModuleItem | null>(null);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [weekTitle, setWeekTitle] = useState<string>('');
  const [weekDesc, setWeekDesc] = useState<string>('');

  // Lesson Modal / Form State
  const [isLessonModalOpen, setIsLessonModalOpen] = useState<boolean>(false);
  const [targetModuleForLesson, setTargetModuleForLesson] = useState<CurriculumModuleItem | null>(null);
  const [targetWeekIdForLesson, setTargetWeekIdForLesson] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [lessonDesc, setLessonDesc] = useState<string>('');
  const [lessonDuration, setLessonDuration] = useState<number>(45);

  // Resource Modal / Form State
  const [isResourceModalOpen, setIsResourceModalOpen] = useState<boolean>(false);
  const [targetModuleForResource, setTargetModuleForResource] = useState<CurriculumModuleItem | null>(null);
  const [targetWeekIdForResource, setTargetWeekIdForResource] = useState<string | null>(null);
  const [targetLessonIdForResource, setTargetLessonIdForResource] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState<string>('');
  const [resourceType, setResourceType] = useState<CurriculumResourceType>('PDF');
  const [resourceUrl, setResourceUrl] = useState<string>('');
  const [resourceDesc, setResourceDesc] = useState<string>('');
  const [resourceFileSize, setResourceFileSize] = useState<string>('2.5 MB');
  const [resourceDownloadable, setResourceDownloadable] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);

  // Fetch Programmes on mount
  useEffect(() => {
    getProgrammes()
      .then((progs) => {
        setProgrammes(progs);
        if (progs.length > 0) {
          setSelectedProgrammeId(progs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Subscribe to Curriculum Modules when selected programme changes
  useEffect(() => {
    if (!selectedProgrammeId) return;

    setLoading(true);
    const selectedProgObj = programmes.find((p) => p.id === selectedProgrammeId);
    const progName = selectedProgObj?.name || 'Accredited Programme';

    // Seed initial curriculum if empty so real data exists
    seedInitialCurriculumIfEmpty(selectedProgrammeId, progName);

    const unsub = subscribeToCurriculumModules((modList) => {
      setModules(modList);
      setLoading(false);
      // Auto-expand all module IDs
      setExpandedModuleIds(modList.map((m) => m.id));
    }, selectedProgrammeId);

    return () => unsub();
  }, [selectedProgrammeId, programmes]);

  const toggleExpandModule = (modId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  // --- MODULE ACTIONS ---
  const handleOpenNewModuleModal = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleCode(`MOD-${(modules.length + 1) * 101}`);
    setModuleDesc('');
    setModuleOrder(modules.length + 1);
    setModulePublished(true);
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModuleModal = (mod: CurriculumModuleItem) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleCode(mod.code || '');
    setModuleDesc(mod.description || '');
    setModuleOrder(mod.order || 1);
    setModulePublished(mod.published ?? true);
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgrammeId || !moduleTitle.trim()) return;

    setSaving(true);
    const selectedProgObj = programmes.find((p) => p.id === selectedProgrammeId);
    const progName = selectedProgObj?.name || 'Programme';

    try {
      if (editingModule) {
        await updateCurriculumModule(editingModule.id, {
          title: moduleTitle,
          code: moduleCode,
          description: moduleDesc,
          order: Number(moduleOrder),
          published: modulePublished,
        });
      } else {
        await createCurriculumModule({
          programmeId: selectedProgrammeId,
          programmeName: progName,
          title: moduleTitle,
          code: moduleCode,
          description: moduleDesc,
          order: Number(moduleOrder),
          weeks: [],
          published: modulePublished,
        });
      }
      setIsModuleModalOpen(false);
    } catch (err) {
      console.error('Error saving module:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (mod: CurriculumModuleItem) => {
    try {
      if (mod.published) {
        await unpublishCurriculumModule(mod.id);
      } else {
        await publishCurriculumModule(mod.id);
      }
    } catch (err) {
      console.error('Error toggling publish state:', err);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module and all nested content?')) return;
    try {
      await deleteCurriculumModule(id);
    } catch (err) {
      console.error('Error deleting module:', err);
    }
  };

  // --- WEEK ACTIONS ---
  const handleOpenNewWeekModal = (mod: CurriculumModuleItem) => {
    setTargetModuleForWeek(mod);
    setEditingWeekId(null);
    setWeekNumber((mod.weeks?.length || 0) + 1);
    setWeekTitle(`Week ${(mod.weeks?.length || 0) + 1}: Key Objectives`);
    setWeekDesc('');
    setIsWeekModalOpen(true);
  };

  const handleSaveWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModuleForWeek || !weekTitle.trim()) return;

    setSaving(true);
    try {
      const currentWeeks = [...(targetModuleForWeek.weeks || [])];
      if (editingWeekId) {
        const idx = currentWeeks.findIndex((w) => w.id === editingWeekId);
        if (idx !== -1) {
          currentWeeks[idx] = {
            ...currentWeeks[idx],
            weekNumber: Number(weekNumber),
            title: weekTitle,
            description: weekDesc,
          };
        }
      } else {
        const newWeek: CurriculumWeek = {
          id: `wk-${Date.now()}`,
          weekNumber: Number(weekNumber),
          title: weekTitle,
          description: weekDesc,
          lessons: [],
        };
        currentWeeks.push(newWeek);
      }

      await updateCurriculumModule(targetModuleForWeek.id, {
        weeks: currentWeeks,
      });
      setIsWeekModalOpen(false);
    } catch (err) {
      console.error('Error saving week:', err);
    } finally {
      setSaving(false);
    }
  };

  // --- LESSON ACTIONS ---
  const handleOpenNewLessonModal = (mod: CurriculumModuleItem, weekId: string) => {
    setTargetModuleForLesson(mod);
    setTargetWeekIdForLesson(weekId);
    setEditingLessonId(null);

    const weekObj = mod.weeks?.find((w) => w.id === weekId);
    setLessonTitle(`Lesson ${(weekObj?.lessons?.length || 0) + 1}: Topic Overview`);
    setLessonDesc('');
    setLessonDuration(45);
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModuleForLesson || !targetWeekIdForLesson || !lessonTitle.trim()) return;

    setSaving(true);
    try {
      const updatedWeeks = (targetModuleForLesson.weeks || []).map((week) => {
        if (week.id !== targetWeekIdForLesson) return week;

        const currentLessons = [...(week.lessons || [])];
        if (editingLessonId) {
          const lIdx = currentLessons.findIndex((l) => l.id === editingLessonId);
          if (lIdx !== -1) {
            currentLessons[lIdx] = {
              ...currentLessons[lIdx],
              title: lessonTitle,
              description: lessonDesc,
              durationMinutes: Number(lessonDuration),
            };
          }
        } else {
          const newLesson: CurriculumLesson = {
            id: `les-${Date.now()}`,
            title: lessonTitle,
            description: lessonDesc,
            durationMinutes: Number(lessonDuration),
            order: currentLessons.length + 1,
            resources: [],
          };
          currentLessons.push(newLesson);
        }
        return { ...week, lessons: currentLessons };
      });

      await updateCurriculumModule(targetModuleForLesson.id, { weeks: updatedWeeks });
      setIsLessonModalOpen(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
    } finally {
      setSaving(false);
    }
  };

  // --- RESOURCE ACTIONS ---
  const handleOpenNewResourceModal = (
    mod: CurriculumModuleItem,
    weekId: string,
    lessonId: string
  ) => {
    setTargetModuleForResource(mod);
    setTargetWeekIdForResource(weekId);
    setTargetLessonIdForResource(lessonId);
    setEditingResourceId(null);

    setResourceTitle('Curriculum Reference Guide');
    setResourceType('PDF');
    setResourceUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    setResourceDesc('Official lecture documentation and reference material.');
    setResourceFileSize('2.5 MB');
    setResourceDownloadable(true);
    setIsResourceModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !targetModuleForResource ||
      !targetWeekIdForResource ||
      !targetLessonIdForResource ||
      !resourceTitle.trim()
    )
      return;

    setSaving(true);
    try {
      const updatedWeeks = (targetModuleForResource.weeks || []).map((week) => {
        if (week.id !== targetWeekIdForResource) return week;

        const updatedLessons = (week.lessons || []).map((lesson) => {
          if (lesson.id !== targetLessonIdForResource) return lesson;

          const currentResources = [...(lesson.resources || [])];
          if (editingResourceId) {
            const rIdx = currentResources.findIndex((r) => r.id === editingResourceId);
            if (rIdx !== -1) {
              currentResources[rIdx] = {
                ...currentResources[rIdx],
                title: resourceTitle,
                type: resourceType,
                url: resourceUrl,
                description: resourceDesc,
                fileSize: resourceFileSize,
                downloadable: resourceDownloadable,
              };
            }
          } else {
            const newRes: CurriculumResource = {
              id: `res-${Date.now()}`,
              title: resourceTitle,
              type: resourceType,
              url: resourceUrl,
              description: resourceDesc,
              fileSize: resourceFileSize,
              downloadable: resourceDownloadable,
            };
            currentResources.push(newRes);
          }
          return { ...lesson, resources: currentResources };
        });

        return { ...week, lessons: updatedLessons };
      });

      await updateCurriculumModule(targetModuleForResource.id, { weeks: updatedWeeks });
      setIsResourceModalOpen(false);
    } catch (err) {
      console.error('Error saving resource:', err);
    } finally {
      setSaving(false);
    }
  };

  // Helper icon for resource types
  const getResourceTypeIcon = (type: CurriculumResourceType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'document':
        return <File className="w-4 h-4 text-blue-600" />;
      case 'link':
        return <LinkIcon className="w-4 h-4 text-emerald-600" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'download':
        return <Download className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const selectedProgrammeObj = programmes.find((p) => p.id === selectedProgrammeId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1 text-xs py-0.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                Module 11 Curriculum Management
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs py-0.5">
                PM Authoring Engine
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Curriculum & Syllabus Builder
            </h1>
            <p className="text-xs text-slate-300">
              Construct hierarchical learning structures: <strong>Programme → Module → Week → Lesson → Resource</strong> (PDF, document, link, video, download).
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenNewModuleModal}
            className="flex items-center gap-2 shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Curriculum Module
          </Button>
        </div>
      </div>

      {/* Programme Selection Bar */}
      <Card variant="bordered" className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FolderTree className="w-6 h-6 text-orange-600" />
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Programme</label>
            <select
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}
              className="mt-0.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code || 'PROG'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500">Total Modules: </span>
            <strong className="text-slate-900 font-bold">{modules.length}</strong>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800">
            <span>Published: </span>
            <strong className="font-bold">{modules.filter((m) => m.published).length}</strong>
          </div>
          <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800">
            <span>Draft / Unpublished: </span>
            <strong className="font-bold">{modules.filter((m) => !m.published).length}</strong>
          </div>
        </div>
      </Card>

      {/* Hierriculum Modules Tree View */}
      {loading ? (
        <Card variant="bordered" className="p-12 text-center text-slate-500 bg-white">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-3" />
          <p className="text-xs font-semibold">Loading curriculum data from Firestore...</p>
        </Card>
      ) : modules.length === 0 ? (
        <Card variant="bordered" className="p-12 text-center bg-white space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Curriculum Modules Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Add Curriculum Module" above to build the learning pathway for {selectedProgrammeObj?.name}.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenNewModuleModal}>
            Create First Module
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {modules.map((moduleItem) => {
            const isExpanded = expandedModuleIds.includes(moduleItem.id);

            return (
              <Card
                key={moduleItem.id}
                variant="bordered"
                className={`bg-white transition-all overflow-hidden ${
                  moduleItem.published ? 'border-slate-200' : 'border-amber-300 bg-amber-50/20'
                }`}
              >
                {/* LEVEL 1: MODULE HEADER */}
                <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpandModule(moduleItem.id)}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 transition-all cursor-pointer mt-0.5"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="orange" size="sm" className="font-mono">
                          {moduleItem.code || `MOD-0${moduleItem.order}`}
                        </Badge>
                        <Badge
                          variant={moduleItem.published ? 'success' : 'warning'}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          {moduleItem.published ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" /> PUBLISHED
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-600" /> DRAFT (UNPUBLISHED)
                            </>
                          )}
                        </Badge>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 mt-1">{moduleItem.title}</h2>
                      <p className="text-xs text-slate-600 mt-0.5">{moduleItem.description}</p>
                    </div>
                  </div>

                  {/* Module Control Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={moduleItem.published ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleTogglePublish(moduleItem)}
                      className="text-xs"
                    >
                      {moduleItem.published ? 'Unpublish' : 'Publish Module'}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenNewWeekModal(moduleItem)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Week
                    </Button>

                    <button
                      onClick={() => handleOpenEditModuleModal(moduleItem)}
                      className="p-2 text-slate-600 hover:text-orange-600 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                      title="Edit Module"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteModule(moduleItem.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* LEVEL 2: WEEKS BODY */}
                {isExpanded && (
                  <div className="p-6 space-y-6 bg-white">
                    {(!moduleItem.weeks || moduleItem.weeks.length === 0) ? (
                      <div className="text-center py-6 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        No weeks added to this module yet. Click "Add Week" to configure the weekly syllabus.
                      </div>
                    ) : (
                      (moduleItem.weeks || []).map((week) => (
                        <div key={week.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          {/* WEEK HEADER */}
                          <div className="p-4 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-orange-600" />
                              <div>
                                <h3 className="text-sm font-bold text-slate-900">{week.title}</h3>
                                {week.description && (
                                  <p className="text-[11px] text-slate-500">{week.description}</p>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenNewLessonModal(moduleItem, week.id)}
                              className="text-xs bg-white flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Lesson
                            </Button>
                          </div>

                          {/* LEVEL 3: LESSONS BODY */}
                          <div className="p-4 space-y-4 bg-slate-50/50">
                            {(!week.lessons || week.lessons.length === 0) ? (
                              <div className="text-center py-4 text-xs text-slate-400">
                                No lessons configured for this week yet. Click "Add Lesson" above.
                              </div>
                            ) : (
                              (week.lessons || []).map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-2xs"
                                >
                                  {/* LESSON HEADER */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="w-4 h-4 text-blue-600" />
                                      <h4 className="text-xs font-bold text-slate-900">{lesson.title}</h4>
                                      {lesson.durationMinutes && (
                                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                          <Clock className="w-3 h-3" /> {lesson.durationMinutes} mins
                                        </span>
                                      )}
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenNewResourceModal(moduleItem, week.id, lesson.id)
                                      }
                                      className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Attach Resource
                                    </Button>
                                  </div>

                                  {lesson.description && (
                                    <p className="text-xs text-slate-600 pl-6">{lesson.description}</p>
                                  )}

                                  {/* LEVEL 4: RESOURCES GRID */}
                                  <div className="pl-6 pt-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                      Attached Learning Resources ({lesson.resources?.length || 0})
                                    </p>

                                    {(!lesson.resources || lesson.resources.length === 0) ? (
                                      <div className="text-[11px] text-slate-400 italic">
                                        No resources attached yet. Supported: PDF, document, link, video, download.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(lesson.resources || []).map((res) => (
                                          <div
                                            key={res.id}
                                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-2"
                                          >
                                            <div className="flex items-start gap-2 overflow-hidden">
                                              <div className="p-1.5 bg-white rounded border border-slate-200 shrink-0">
                                                {getResourceTypeIcon(res.type)}
                                              </div>
                                              <div className="overflow-hidden">
                                                <Badge
                                                  size="sm"
                                                  className="text-[9px] uppercase font-bold py-0 px-1 bg-slate-200 text-slate-700"
                                                >
                                                  {res.type}
                                                </Badge>
                                                <h5 className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                                  {res.title}
                                                </h5>
                                                <p className="text-[10px] text-slate-500 truncate">{res.description}</p>
                                              </div>
                                            </div>

                                            <a
                                              href={res.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-1 text-slate-400 hover:text-orange-600 shrink-0 cursor-pointer"
                                              title="Open Resource"
                                            >
                                              <LinkIcon className="w-3.5 h-3.5" />
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: CREATE / EDIT MODULE --- */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingModule ? 'Edit Curriculum Module' : 'Create New Curriculum Module'}
            </h3>

            <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Module Title *</label>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: System Architecture & Data Flows"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Module Code</label>
                  <input
                    type="text"
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value)}
                    placeholder="e.g. MOD-101"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={moduleOrder}
                    onChange={(e) => setModuleOrder(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Module Description</label>
                <textarea
                  rows={3}
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="Overview of learning outcomes, prerequisites, and goals..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="publishedCheck"
                  checked={modulePublished}
                  onChange={(e) => setModulePublished(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="publishedCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Publish Module (Immediately accessible by enrolled learners)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModuleModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD / EDIT WEEK --- */}
      {isWeekModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Week to {targetModuleForWeek?.title}</h3>

            <form onSubmit={handleSaveWeek} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Week #</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Week Title *</label>
                  <input
                    type="text"
                    required
                    value={weekTitle}
                    onChange={(e) => setWeekTitle(e.target.value)}
                    placeholder="e.g. Week 1: Core System Concepts"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Week Description</label>
                <textarea
                  rows={2}
                  value={weekDesc}
                  onChange={(e) => setWeekDesc(e.target.value)}
                  placeholder="Overview of weekly milestones..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsWeekModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Week'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD / EDIT LESSON --- */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Lesson to Week</h3>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lesson Title *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Lesson 1: Transformer Models & Vectors"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lesson Description</label>
                <textarea
                  rows={3}
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                  placeholder="Specific topics covered..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsLessonModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Lesson'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: ATTACH / EDIT RESOURCE --- */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Attach Resource to Lesson</h3>

            <form onSubmit={handleSaveResource} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="e.g. Architecture Blueprint PDF"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resource Type *</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as CurriculumResourceType)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="document">Text Document</option>
                    <option value="link">Web Link / URL</option>
                    <option value="video">Video Recording</option>
                    <option value="download">Download Package (.zip)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">File Size / Format</label>
                  <input
                    type="text"
                    value={resourceFileSize}
                    onChange={(e) => setResourceFileSize(e.target.value)}
                    placeholder="e.g. 3.2 MB"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resource URL / Link *</label>
                <input
                  type="url"
                  required
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="https://example.com/file.pdf"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={resourceDesc}
                  onChange={(e) => setResourceDesc(e.target.value)}
                  placeholder="Brief note about this resource..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsResourceModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Attach Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
