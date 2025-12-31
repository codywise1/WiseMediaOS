import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { CheckCircle2, ChevronLeft, ChevronRight, List, Download, MessageSquare } from 'lucide-react';

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
        <div className="aspect-video w-full bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          No video available
        </div>
      );
    }

    const lower = url.toLowerCase();
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be')) {
      const embed = lower.includes('watch') ? url.replace('watch?v=', 'embed/') : url.replace('youtu.be/', 'www.youtube.com/embed/');
      return (
        <div className="aspect-video w-full">
          <iframe
            src={embed}
            className="w-full h-full rounded-xl border border-white/10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (lower.includes('vimeo.com')) {
      const id = url.split('/').pop();
      return (
        <div className="aspect-video w-full">
          <iframe
            src={`https://player.vimeo.com/video/${id}`}
            className="w-full h-full rounded-xl border border-white/10"
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
        className="w-full aspect-video rounded-xl border border-white/10"
        src={url}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="glass-card neon-glow rounded-2xl p-6">
          <p className="text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-3 border-b border-white/10 flex items-center justify-between lg:hidden">
            <button onClick={() => setOutlineOpen(true)} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2">
              <List size={18} />
              Outline
            </button>
            <div className="flex items-center gap-2">
              {isCompleted && <CheckCircle2 className="text-green-400" size={18} />}
              <span className="text-gray-300 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{course?.title}</span>
            </div>
          </div>
          <div className="p-3 lg:p-4">
            {renderPlayer()}
          </div>
        </GlassCard>

        <GlassCard>
          <h1 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {currentLesson?.title}
          </h1>
          {currentLesson?.description && (
            <p className="text-gray-300 mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{currentLesson.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={marking || isCompleted}
              onClick={markCompleted}
              className={`px-5 py-2 rounded-lg transition-colors font-medium ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white'}`}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {isCompleted ? 'Completed' : 'Mark as Completed'}
            </button>

            <label className="flex items-center gap-2 text-gray-300 text-sm select-none">
              <input type="checkbox" checked={autoCompleteOn90} onChange={(e) => setAutoCompleteOn90(e.target.checked)} />
              Auto-complete at 90% video
            </label>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard>
            <h2 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>Transcript</h2>
            <p className="text-gray-300 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
              {(currentLesson as any)?.transcript || 'Transcript coming soon.'}
            </p>
          </GlassCard>

          <GlassCard>
            <h2 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>Resources</h2>
            {resources.length === 0 ? (
              <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>No resources for this lesson.</p>
            ) : (
              <div className="space-y-3">
                {resources.map(r => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#3AA3EB]/20 rounded-lg"><Download className="text-[#3AA3EB]" size={18} /></div>
                      <div>
                        <div className="text-white font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>{r.title}</div>
                        <div className="text-xs text-gray-400 uppercase">{r.resource_type}</div>
                      </div>
                    </div>
                    <span className="text-sm text-[#3AA3EB]">Download</span>
                  </a>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-[#3AA3EB]" size={20} />
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>Comments</h2>
          </div>
          <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Comments coming soon.</p>
        </GlassCard>

        <div className="flex items-center justify-between">
          <button onClick={toPrev} disabled={!prevLesson} className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 rounded-lg flex items-center gap-2">
            <ChevronLeft size={18} />
            Previous Lesson
          </button>
          <button onClick={toNext} disabled={!nextLesson} className="px-4 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/40 text-white rounded-lg flex items-center gap-2">
            Next Lesson
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-4">
          <GlassCard>
            <h3 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>Course Outline</h3>
            <div className="space-y-2">
              {lessons.map((l, idx) => {
                const done = !!completedMap[l.id];
                const isActive = l.id === currentLesson?.id;
                return (
                  <Link
                    key={l.id}
                    to={`/community/courses/${courseId}/lesson/${l.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isActive ? 'bg-[#3AA3EB]/10 border-[#3AA3EB]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-green-500/20' : 'bg-white/10'}`}>
                      {done ? <CheckCircle2 className="text-green-400" size={18} /> : <span className="text-gray-400 text-sm">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{l.title}</div>
                      <div className="text-xs text-gray-400">
                        {l.duration_minutes} min
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {outlineOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOutlineOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] p-4 glass-card overflow-y-auto">
            <h3 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase' }}>Outline</h3>
            <div className="space-y-2">
              {lessons.map((l, idx) => {
                const done = !!completedMap[l.id];
                const isActive = l.id === currentLesson?.id;
                return (
                  <Link
                    key={l.id}
                    to={`/community/courses/${courseId}/lesson/${l.id}`}
                    onClick={() => setOutlineOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isActive ? 'bg-[#3AA3EB]/10 border-[#3AA3EB]/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-green-500/20' : 'bg-white/10'}`}>
                      {done ? <CheckCircle2 className="text-green-400" size={18} /> : <span className="text-gray-400 text-sm">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>{l.title}</div>
                      <div className="text-xs text-gray-400">
                        {l.duration_minutes} min
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
