import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import {
  CheckCircle2, ChevronLeft, ChevronRight, List, Download,
  MessageSquare, X, Clock, Play, Lock, FileText, Sparkles,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_published: boolean;
}

interface LessonResource {
  id: string;
  title: string;
  resource_type: string;
  url: string;
}

export default function LessonPage() {
  const { profile } = useAuth();
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [autoCompleteOn90, setAutoCompleteOn90] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [autoCompleted, setAutoCompleted] = useState(false);

  const currentIndex = useMemo(() => {
    const idx = lessons.findIndex(l => l.id === currentLesson?.id);
    return idx >= 0 ? idx : 0;
  }, [lessons, currentLesson]);

  const prevLesson = useMemo(() => lessons[currentIndex - 1] || null, [lessons, currentIndex]);
  const nextLesson = useMemo(() => lessons[currentIndex + 1] || null, [lessons, currentIndex]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);

        if (!isSupabaseAvailable()) {
          const mockCourse: Course = { id: courseId || 'demo', title: 'Demo Course', description: null };
          const mockLessons: Lesson[] = [
            { id: 'l1', title: 'Introduction', description: 'Welcome', video_url: null, duration_minutes: 3, order_index: 1, is_published: true },
            { id: 'l2', title: 'Getting Started', description: 'Basics', video_url: null, duration_minutes: 8, order_index: 2, is_published: true },
          ];
          setCourse(mockCourse);
          setLessons(mockLessons);
          const found = mockLessons.find(l => l.id === lessonId) || mockLessons[0];
          setCurrentLesson(found);
          setResources([]);
          setCompletedMap({});
          return;
        }

        const [{ data: courseData }, { data: lessonsData }] = await Promise.all([
          supabase!.from('courses').select('*').eq('id', courseId).single(),
          supabase!.from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true })
        ]);

        if (mounted) {
          setCourse(courseData || null);
          setLessons(lessonsData || []);
          const found = (lessonsData || []).find((l: Lesson) => l.id === lessonId) || (lessonsData || [])[0] || null;
          setCurrentLesson(found);
        }

        if (mounted && lessonId) {
          const { data: res } = await supabase!
            .from('lesson_resources')
            .select('*')
            .eq('lesson_id', lessonId);
          setResources(res || []);
        }

        if (mounted && profile?.id) {
          const { data: progress } = await supabase!
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', profile.id)
            .in('lesson_id', (lessonsData || []).map((l: Lesson) => l.id));
          const map: Record<string, boolean> = {};
          (progress || []).forEach((p: any) => { map[p.lesson_id] = !!p.completed; });
          setCompletedMap(map);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [courseId, lessonId, profile?.id]);

  const isCompleted = currentLesson ? !!completedMap[currentLesson.id] : false;

  const markCompleted = async () => {
    if (!profile?.id || !currentLesson || !isSupabaseAvailable()) return;
    setMarking(true);
    try {
      await supabase!.from('lesson_progress').upsert({
        user_id: profile.id,
        lesson_id: currentLesson.id,
        completed: true
      });
      setCompletedMap(prev => ({ ...prev, [currentLesson.id]: true }));
    } finally {
      setMarking(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!autoCompleteOn90 || autoCompleted || isCompleted) return;
    const el = videoRef.current;
    if (!el || !el.duration || el.duration < 5) return;
    const ratio = el.currentTime / el.duration;
    if (ratio >= 0.9) {
      setAutoCompleted(true);
      markCompleted();
    }
  };

  const toPrev = () => {
    if (prevLesson) navigate(`/community/courses/${courseId}/lesson/${prevLesson.id}`);
  };

  const toNext = () => {
    if (nextLesson) navigate(`/community/courses/${courseId}/lesson/${nextLesson.id}`);
  };

  const [outlineOpen, setOutlineOpen] = useState(false);

  const renderPlayer = () => {
    const url = currentLesson?.video_url || '';
    if (!url) {
      return (
        <div className="aspect-video w-full bg-black/40 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-gray-500">
          <Play size={32} className="mb-3 opacity-40" />
          <p className="text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>No video available</p>
          <p className="text-xs text-gray-600 mt-1">Check back soon for the video.</p>
        </div>
      );
    }

    const getYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const getVimeoId = (url: string) => {
      const match = url.match(/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/);
      return match ? match[1] : null;
    };

    const youtubeId = getYoutubeId(url);
    if (youtubeId) {
      return (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full rounded-2xl border border-white/10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      return (
        <div className="aspect-video w-full">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full h-full rounded-2xl border border-white/10"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="w-full aspect-video rounded-2xl border border-white/10 bg-black"
        src={url}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 border-2 border-white/20 border-t-[#3AA3EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-5">
        {/* Mobile header */}
        <div className="flex items-center justify-between lg:hidden">
          <button onClick={() => setOutlineOpen(true)} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 flex items-center gap-2 text-sm">
            <List size={16} /> Outline
          </button>
          <div className="flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="text-emerald-400" size={16} />}
            <span className="text-gray-300 text-sm font-medium truncate max-w-[200px]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{course?.title}</span>
          </div>
        </div>

        {/* Video player card */}
        <div className="ios-card rounded-3xl p-3 sm:p-4 border border-white/10 overflow-hidden">
          {renderPlayer()}
        </div>

        {/* Lesson info */}
        <div className="ios-card rounded-3xl p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-500 text-xs font-semibold tabular-nums">LESSON {String(currentIndex + 1).padStart(2, '0')}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 text-xs flex items-center gap-1"><Clock size={11} /> {currentLesson?.duration_minutes || 0} min</span>
          </div>
          <h1 className="text-white font-bold text-2xl sm:text-3xl mb-3 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {currentLesson?.title}
          </h1>
          {currentLesson?.description && (
            <p className="text-gray-300 text-sm leading-relaxed mb-6">{currentLesson.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              disabled={marking || isCompleted}
              onClick={markCompleted}
              className={`px-5 py-2.5 rounded-xl transition-all font-semibold text-sm flex items-center gap-2 ${
                isCompleted
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                  : 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white'
              }`}
            >
              {isCompleted ? <><CheckCircle2 size={16} /> Completed</> : 'Mark as Completed'}
            </button>

            <label className="flex items-center gap-2 text-gray-400 text-xs select-none cursor-pointer">
              <input type="checkbox" checked={autoCompleteOn90} onChange={(e) => setAutoCompleteOn90(e.target.checked)} className="accent-[#3AA3EB]" />
              Auto-complete at 90% video
            </label>
          </div>
        </div>

        {/* Transcript + Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="ios-card rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#3AA3EB]" />
              <h2 className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Transcript</h2>
            </div>
            <p className="text-gray-400 leading-relaxed text-sm">
              {(currentLesson as any)?.transcript || 'Transcript coming soon.'}
            </p>
          </div>

          <div className="ios-card rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Download size={16} className="text-[#3AA3EB]" />
              <h2 className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Resources</h2>
            </div>
            {resources.length === 0 ? (
              <p className="text-gray-500 text-sm">No resources for this lesson.</p>
            ) : (
              <div className="space-y-2.5">
                {resources.map(r => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#3AA3EB]/15 rounded-lg"><Download className="text-[#3AA3EB]" size={14} /></div>
                      <div>
                        <div className="text-white font-medium text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{r.title}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{r.resource_type}</div>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="ios-card rounded-3xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-[#3AA3EB]" />
            <h2 className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Comments</h2>
          </div>
          <p className="text-gray-500 text-sm">Comments coming soon.</p>
        </div>

        {/* Prev/Next nav */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={toPrev} disabled={!prevLesson} className="flex-1 sm:flex-initial px-5 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all">
            <ChevronLeft size={17} /> Previous
          </button>
          <button onClick={toNext} disabled={!nextLesson} className="flex-1 sm:flex-initial px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/40 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all">
            Next <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* Sidebar - Course Outline */}
      <div className="lg:col-span-4 hidden lg:block">
        <div className="sticky top-24">
          <div className="ios-card rounded-3xl p-6 border border-white/10">
            <h3 className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Course Outline</h3>
            <p className="text-gray-500 text-xs mb-5">{course?.title}</p>
            <div className="space-y-1.5">
              {lessons.map((l, idx) => {
                const done = !!completedMap[l.id];
                const isActive = l.id === currentLesson?.id;
                return (
                  <Link
                    key={l.id}
                    to={`/community/courses/${courseId}/lesson/${l.id}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-[#3AA3EB]/10 border-[#3AA3EB]/30'
                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-emerald-500/15' : isActive ? 'bg-[#3AA3EB]/20' : 'bg-white/5'
                    }`}>
                      {done ? <CheckCircle2 className="text-emerald-400" size={15} /> :
                       <span className="text-gray-400 text-xs font-semibold tabular-nums">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>{l.title}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> {l.duration_minutes} min
                      </div>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#3AA3EB] flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile outline drawer */}
      {outlineOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOutlineOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] p-4 overflow-y-auto bg-[#1c1c1e] border-l border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>Outline</h3>
              <button onClick={() => setOutlineOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {lessons.map((l, idx) => {
                const done = !!completedMap[l.id];
                const isActive = l.id === currentLesson?.id;
                return (
                  <Link
                    key={l.id}
                    to={`/community/courses/${courseId}/lesson/${l.id}`}
                    onClick={() => setOutlineOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-[#3AA3EB]/10 border-[#3AA3EB]/30'
                        : 'bg-transparent border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-emerald-500/15' : isActive ? 'bg-[#3AA3EB]/20' : 'bg-white/5'
                    }`}>
                      {done ? <CheckCircle2 className="text-emerald-400" size={15} /> :
                       <span className="text-gray-400 text-xs font-semibold tabular-nums">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>{l.title}</div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> {l.duration_minutes} min
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
