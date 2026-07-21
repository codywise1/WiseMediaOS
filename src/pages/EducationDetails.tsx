import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Clock, BarChart3, CheckCircle2, Lock, Download, MessageSquare, CreditCard as Edit, Trash2, Award, ArrowRight, Plus, X, BookOpen, FileText, TrendingUp, Users, Settings, Save, ChevronRight, Sparkles, Video, Link2, UploadCloud } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DownloadUploader, { DownloadFile } from '../components/DownloadUploader';
import Modal from '../components/Modal';

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  creator_id: string;
  enrollment_count: number;
  level?: string;
  category?: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_published: boolean;
  completed?: boolean;
}

interface Resource {
  id: string;
  title: string;
  resource_type: string;
  url: string;
}

type TabId = 'overview' | 'lessons' | 'resources' | 'discussions' | 'progress';

export default function EducationDetails() {
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isCourseEditOpen, setIsCourseEditOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', video_url: '', duration_minutes: 0,
    order_index: 1, is_published: true, video_type: 'link' as 'link' | 'upload',
  });
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'Intermediate', category: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<DownloadFile[]>([]);
  const [isSavingResources, setIsSavingResources] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = id || '123';

  useEffect(() => {
    if (profile) { fetchCourseData(); checkEnrollment(); }
  }, [profile]);

  async function fetchCourseData() {
    try {
      const { data: courseData } = await supabase!
        .from('courses').select('*').eq('id', courseId).single();
      if (courseData) {
        setCourse(courseData);
        setIsAdmin(courseData.creator_id === profile?.id || profile?.role === 'admin');
        setCourseForm({
          title: courseData.title || '',
          description: courseData.description || '',
          level: courseData.level || 'Intermediate',
          category: courseData.category || '',
        });
      }
      const { data: lessonsData } = await supabase!
        .from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
      if (lessonsData) setLessons(lessonsData);
      const { data: resourcesData } = await supabase!
        .from('course_resources').select('*').eq('course_id', courseId);
      if (resourcesData) setResources(resourcesData);
      if (profile && lessonsData) {
        const { data: progressData } = await supabase!
          .from('lesson_progress').select('completed').eq('user_id', profile.id)
          .in('lesson_id', lessonsData.map(l => l.id));
        if (progressData) {
          const completed = progressData.filter(p => p.completed).length;
          setProgress(lessonsData.length ? Math.round((completed / lessonsData.length) * 100) : 0);
        }
      }
    } catch (error) { console.error('Error fetching course data:', error); }
    finally { setLoading(false); }
  }

  async function checkEnrollment() {
    if (!profile) return;
    const { data } = await supabase!
      .from('course_enrollments').select('id')
      .eq('user_id', profile.id).eq('course_id', courseId).single();
    setIsEnrolled(!!data);
  }

  async function handleEnroll() {
    if (!profile) return;
    const { error } = await supabase!.from('course_enrollments').insert({ user_id: profile.id, course_id: courseId });
    if (!error) setIsEnrolled(true);
  }

  async function handleUploadVideo(file: File) {
    if (!profile || !isSupabaseAvailable()) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}-${Date.now()}.${fileExt}`;
      const filePath = `videos/${fileName}`;
      const { error: uploadError } = await supabase!.storage.from('course-videos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase!.storage.from('course-videos').getPublicUrl(filePath);
      setLessonForm(prev => ({ ...prev, video_url: data.publicUrl }));
    } catch (error) { console.error('Error uploading video:', error); alert('Failed to upload video'); }
    finally { setIsUploading(false); }
  }

  async function handleSaveLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSaving(true);
    try {
      const payload = {
        course_id: courseId, title: lessonForm.title, description: lessonForm.description,
        video_url: lessonForm.video_url, duration_minutes: lessonForm.duration_minutes,
        order_index: lessonForm.order_index, is_published: lessonForm.is_published,
      };
      let error;
      if (editingLesson) {
        const { error: updateError } = await supabase!.from('lessons').update(payload).eq('id', editingLesson.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase!.from('lessons').insert([payload]);
        error = insertError;
      }
      if (error) throw error;
      setIsLessonModalOpen(false);
      fetchCourseData();
    } catch (error) { console.error('Error saving lesson:', error); alert('Failed to save lesson'); }
    finally { setIsSaving(false); }
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSavingCourse(true);
    try {
      const { error } = await supabase!.from('courses').update({
        title: courseForm.title, description: courseForm.description,
        level: courseForm.level, category: courseForm.category,
      }).eq('id', courseId);
      if (error) throw error;
      setIsCourseEditOpen(false);
      fetchCourseData();
    } catch (error) { console.error('Error saving course:', error); alert('Failed to save course'); }
    finally { setIsSavingCourse(false); }
  }

  async function handleDeleteLesson(id: string) {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    if (!isSupabaseAvailable()) return;
    try {
      const { error } = await supabase!.from('lessons').delete().eq('id', id);
      if (error) throw error;
      fetchCourseData();
    } catch (error) { console.error('Error deleting lesson:', error); alert('Failed to delete lesson'); }
  }

  async function handleSaveResources() {
    if (!isSupabaseAvailable()) return;
    setIsSavingResources(true);
    try {
      const existingIds = new Set(resources.map(r => r.id));
      const toDelete = resources.filter(r => !resourceFiles.some(f => f.id === r.id));
      for (const r of toDelete) {
        await supabase!.from('course_resources').delete().eq('id', r.id);
      }
      for (const file of resourceFiles) {
        const existing = resources.find(r => r.id === file.id);
        if (existing) {
          await supabase!.from('course_resources').update({
            title: file.name, url: file.url, resource_type: file.type === 'url' ? 'link' : 'file',
          }).eq('id', existing.id);
        } else {
          await supabase!.from('course_resources').insert({
            course_id: courseId, title: file.name, url: file.url,
            resource_type: file.type === 'url' ? 'link' : 'file',
          });
        }
      }
      setIsResourceModalOpen(false);
      fetchCourseData();
    } catch (e) { console.error('Error saving resources:', e); alert('Failed to save resources'); }
    finally { setIsSavingResources(false); }
  }

  function openResourceModal() {
    setResourceFiles(resources.map(r => ({
      id: r.id, name: r.title, url: r.url,
      type: (r.resource_type === 'link' ? 'url' : 'upload') as 'upload' | 'url',
    })));
    setIsResourceModalOpen(true);
  }

  async function handleDeleteResource(resourceId: string) {
    if (!window.confirm('Delete this resource?')) return;
    if (!isSupabaseAvailable()) return;
    try {
      const { error } = await supabase!.from('course_resources').delete().eq('id', resourceId);
      if (error) throw error;
      fetchCourseData();
    } catch (e) { console.error('Error deleting resource:', e); alert('Failed to delete resource'); }
  }

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'lessons', label: 'Lessons', icon: Play },
    { id: 'resources', label: 'Resources', icon: Download },
    { id: 'discussions', label: 'Discussions', icon: MessageSquare },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ];

  const totalMinutes = lessons.reduce((acc, l) => acc + l.duration_minutes, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 border-2 border-white/20 border-t-[#3AA3EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative h-[280px] sm:h-[340px] mb-6 overflow-hidden rounded-3xl border border-white/10">
        <img
          src={course?.thumbnail_url || 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=1200'}
          alt={course?.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-[#3AA3EB]/20 border border-[#3AA3EB]/30 text-[#3AA3EB] text-[10px] font-bold uppercase tracking-wider">
              {course?.category || 'Course'}
            </span>
            {course?.level && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                {course.level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Title + Actions */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-white text-3xl sm:text-4xl font-bold leading-tight mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
              {course?.title || 'Education Course'}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
              {course?.description || 'Master the fundamentals and grow your skills with this comprehensive course.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {isEnrolled ? (
              <button
                onClick={() => {
                  const firstIncomplete = lessons.find(l => !l.completed);
                  const target = firstIncomplete || lessons[0];
                  if (target) navigate(`/community/courses/${courseId}/lesson/${target.id}`);
                }}
                className="px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl transition-all font-semibold text-sm flex items-center gap-2"
              >
                Continue Learning <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={handleEnroll} className="px-5 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-2xl transition-all font-semibold text-sm flex items-center gap-2">
                Enroll <ArrowRight size={16} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={`p-3 rounded-2xl transition-all border ${adminMode
                  ? 'bg-[#3AA3EB]/20 border-[#3AA3EB]/40 text-[#3AA3EB]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Admin Settings"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Stats row - clean Apple-style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Play, label: 'Lessons', value: `${lessons.length}`, sub: 'modules' },
            { icon: Clock, label: 'Duration', value: `${totalMinutes}`, sub: 'minutes' },
            { icon: BarChart3, label: 'Level', value: course?.level || 'Intermediate', sub: 'difficulty' },
            { icon: TrendingUp, label: 'Progress', value: isEnrolled ? `${progress}%` : '—', sub: isEnrolled ? 'completed' : 'not enrolled' },
          ].map((stat, i) => (
            <div key={i} className="ios-card rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#3AA3EB]/15 flex items-center justify-center">
                  <stat.icon size={14} className="text-[#3AA3EB]" />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white font-bold text-xl tabular-nums font-display leading-none">{stat.value}</span>
                <span className="text-gray-500 text-[11px]">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin banner */}
      {adminMode && isAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-[#3AA3EB]/10 border border-[#3AA3EB]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings size={16} className="text-[#3AA3EB]" />
            <span className="text-[#3AA3EB] text-sm font-semibold">Admin Mode — edit anything in this course</span>
          </div>
          <button onClick={() => setIsCourseEditOpen(true)} className="px-3 py-1.5 bg-[#3AA3EB]/20 hover:bg-[#3AA3EB]/30 text-[#3AA3EB] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5">
            <Edit size={13} /> Edit Course
          </button>
        </div>
      )}

      {/* Tabs - iOS segmented style */}
      <div className="mb-8">
        <div className="ios-segmented w-full sm:w-auto inline-flex flex-wrap">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`ios-segmented-btn flex items-center gap-1.5 ${active ? 'active' : ''}`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="ios-card rounded-3xl p-6 sm:p-8 border border-white/10">
            <h2 className="text-white font-bold text-lg mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>About This Course</h2>
            <p className="text-gray-300 leading-relaxed text-sm mb-6">
              {course?.description || 'Master the fundamentals of digital marketing and grow your online presence. This comprehensive course covers everything from social media strategy to content creation and analytics.'}
            </p>
            <h3 className="text-white font-bold text-sm mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>What You'll Learn</h3>
            <div className="space-y-2.5">
              {['Build a comprehensive marketing strategy', 'Create engaging content that converts', 'Master social media algorithms', 'Track and analyze your performance'].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="text-[#3AA3EB] flex-shrink-0 mt-0.5" size={16} />
                  <span className="text-gray-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lessons */}
      {activeTab === 'lessons' && (
        <div className="space-y-2.5">
          {adminMode && (
            <button
              onClick={() => {
                setEditingLesson(null);
                setLessonForm({ title: '', description: '', video_url: '', duration_minutes: 0, order_index: lessons.length + 1, is_published: true, video_type: 'link' });
                setIsLessonModalOpen(true);
              }}
              className="w-full py-4 border border-dashed border-white/15 rounded-2xl text-gray-400 hover:text-white hover:border-[#3AA3EB]/40 hover:bg-[#3AA3EB]/5 transition-all font-medium text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add New Lesson
            </button>
          )}
          {lessons.length === 0 ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Play size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-semibold text-sm mb-1">No lessons yet</p>
              <p className="text-gray-500 text-xs">{adminMode ? 'Add your first lesson to get started.' : 'Lessons will appear here.'}</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => isEnrolled && !adminMode && navigate(`/community/courses/${courseId}/lesson/${lesson.id}`)}
                className="ios-card w-full rounded-2xl p-5 border border-white/10 text-left transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99] group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    lesson.completed ? 'bg-emerald-500/15' : isEnrolled ? 'bg-[#3AA3EB]/15' : 'bg-white/5'
                  }`}>
                    {lesson.completed ? <CheckCircle2 size={18} className="text-emerald-400" /> :
                     isEnrolled ? <Play size={16} className="text-[#3AA3EB]" /> :
                     <Lock size={16} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 text-[11px] font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <p className="text-white font-semibold text-sm truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>{lesson.title}</p>
                      {!lesson.is_published && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">Draft</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 text-xs">
                      <span className="flex items-center gap-1"><Clock size={11} /> {lesson.duration_minutes} min</span>
                      {lesson.completed && <span className="text-emerald-400">Completed</span>}
                    </div>
                  </div>
                  {adminMode ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setEditingLesson(lesson);
                        setLessonForm({
                          title: lesson.title, description: lesson.description || '', video_url: lesson.video_url || '',
                          duration_minutes: lesson.duration_minutes, order_index: lesson.order_index, is_published: lesson.is_published,
                          video_type: lesson.video_url && (lesson.video_url.includes('youtube.com') || lesson.video_url.includes('vimeo.com')) ? 'link' : 'upload',
                        });
                        setIsLessonModalOpen(true);
                      }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <Edit size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }} className="p-2 hover:bg-rose-500/15 rounded-xl transition-colors text-gray-400 hover:text-rose-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    isEnrolled && <ChevronRight size={16} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          {adminMode && isAdmin && (
            <button onClick={openResourceModal}
              className="w-full py-4 border border-dashed border-white/15 rounded-2xl text-gray-400 hover:text-white hover:border-[#3AA3EB]/40 hover:bg-[#3AA3EB]/5 transition-all font-medium text-sm flex items-center justify-center gap-2">
              <Plus size={16} /> Manage Resources
            </button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.length === 0 ? (
              <div className="col-span-full ios-card rounded-3xl p-12 text-center border border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Download size={24} className="text-gray-600" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">No resources yet</p>
                <p className="text-gray-500 text-xs">Resources will appear here when added.</p>
              </div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="ios-card rounded-2xl p-5 border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 group relative">
                  {adminMode && isAdmin && (
                    <button onClick={() => handleDeleteResource(resource.id)}
                      className="absolute top-3 right-3 p-2 hover:bg-rose-500/15 rounded-xl transition-colors text-gray-400 hover:text-rose-400 opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#3AA3EB]/15 flex items-center justify-center flex-shrink-0">
                        {resource.resource_type === 'link' ? <Link2 size={16} className="text-[#3AA3EB]" /> : <Download size={16} className="text-[#3AA3EB]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>{resource.title}</p>
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">{resource.resource_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#3AA3EB] text-xs font-semibold">
                      Download <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {isEnrolled ? (
            <div className="ios-card rounded-3xl p-6 sm:p-8 border border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-white font-bold text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Your Progress</h2>
                {progress === 100 && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all text-xs font-semibold">
                    <Award size={15} /> Claim Certificate
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="relative w-28 h-28 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="56" cy="56" r="52" fill="none" stroke="#3AA3EB" strokeWidth="6"
                        strokeDasharray={`${progress * 3.27} 327`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl tabular-nums font-display">{progress}%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs">Overall Progress</p>
                </div>
                <div className="text-center sm:border-l border-white/10 sm:pl-6">
                  <p className="text-white font-bold text-3xl tabular-nums font-display mb-2">{Math.round(lessons.length * progress / 100)}</p>
                  <p className="text-gray-400 text-xs">Lessons Completed</p>
                </div>
                <div className="text-center sm:border-l border-white/10 sm:pl-6">
                  <p className="text-white font-bold text-3xl tabular-nums font-display mb-2">{lessons.reduce((acc, l) => acc + l.duration_minutes, 0)}</p>
                  <p className="text-gray-400 text-xs">Total Minutes</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-semibold text-sm mb-1">Enroll to track progress</p>
              <p className="text-gray-500 text-xs mb-4">Start learning to see your progress here.</p>
              <button onClick={handleEnroll} className="px-5 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl text-sm font-semibold transition-colors">Enroll Now</button>
            </div>
          )}
        </div>
      )}

      {/* Discussions */}
      {activeTab === 'discussions' && (
        <div className="ios-card rounded-3xl p-6 sm:p-8 border border-white/10">
          <div className="flex items-center gap-2.5 mb-6">
            <MessageSquare size={18} className="text-[#3AA3EB]" />
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Discussions</h2>
          </div>
          <div className="mb-6">
            <textarea className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none h-28 resize-none text-sm" placeholder="Share your thoughts or ask a question..." />
            <button className="mt-3 px-5 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-colors text-sm font-semibold">Post Comment</button>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3AA3EB] to-[#2d8bc7] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">JD</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">John Doe</span>
                    <span className="text-gray-500 text-xs">2 hours ago</span>
                  </div>
                  <p className="text-gray-300 text-sm">Great course! The lessons on social media strategy were incredibly helpful.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal — base Modal */}
      <Modal isOpen={isLessonModalOpen} onClose={() => setIsLessonModalOpen(false)} title={editingLesson ? 'Edit Lesson' : 'New Lesson'} maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsLessonModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="lesson-form" disabled={isSaving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : 'Save Lesson'}
            </button>
          </div>
        }>
        <form id="lesson-form" onSubmit={handleSaveLesson} className="space-y-5">
          <div>
            <label className={labelCls}>Title</label>
            <input required type="text" value={lessonForm.title}
              onChange={e => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputCls} placeholder="e.g. Introduction to Scaling" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={lessonForm.description}
              onChange={e => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputCls} h-24 resize-none`} placeholder="What is this lesson about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Duration (min)</label>
              <input type="number" value={lessonForm.duration_minutes}
                onChange={e => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" value={lessonForm.order_index}
                onChange={e => setLessonForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                className={inputCls} />
            </div>
          </div>
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setLessonForm(prev => ({ ...prev, video_type: 'link' }))}
                className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${lessonForm.video_type === 'link' ? 'bg-[#3AA3EB]/15 border-[#3AA3EB]/40 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <Link2 size={15} /> Video Link
              </button>
              <button type="button" onClick={() => setLessonForm(prev => ({ ...prev, video_type: 'upload' }))}
                className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${lessonForm.video_type === 'upload' ? 'bg-[#3AA3EB]/15 border-[#3AA3EB]/40 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <UploadCloud size={15} /> Upload
              </button>
            </div>
            {lessonForm.video_type === 'link' ? (
              <input type="url" value={lessonForm.video_url}
                onChange={e => setLessonForm(prev => ({ ...prev, video_url: e.target.value }))}
                className={inputCls} placeholder="https://www.youtube.com/watch?v=..." />
            ) : (
              <div className="flex items-center gap-3">
                <input type="file" accept="video/*" className="hidden" id="video-upload"
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadVideo(file); }} />
                <label htmlFor="video-upload" className={`px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl cursor-pointer transition-all text-sm font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </label>
                {lessonForm.video_url && !isUploading && <span className="text-emerald-400 text-xs font-medium">Video uploaded</span>}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Resource Modal — base Modal */}
      <Modal isOpen={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)} title="Manage Resources" maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsResourceModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSaveResources} disabled={isSavingResources} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSavingResources ? 'Saving...' : 'Save Resources'}
            </button>
          </div>
        }>
        <DownloadUploader
          value={resourceFiles}
          onChange={setResourceFiles}
          bucket="files"
          folder={`courses/${courseId}`}
          label="Course Downloads"
          hint="Drag files here to upload, or paste an external URL to a resource (e.g. a PDF on another site)."
        />
      </Modal>

      {/* Course Edit Modal — base Modal */}
      <Modal isOpen={isCourseEditOpen} onClose={() => setIsCourseEditOpen(false)} title="Edit Course" maxWidth="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCourseEditOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="course-edit-form" disabled={isSavingCourse} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSavingCourse ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        }>
        <form id="course-edit-form" onSubmit={handleSaveCourse} className="space-y-5">
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={courseForm.title}
              onChange={e => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={courseForm.description}
              onChange={e => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputCls} h-28 resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Level</label>
              <select value={courseForm.level}
                onChange={e => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                className={inputCls}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input type="text" value={courseForm.category}
                onChange={e => setCourseForm(prev => ({ ...prev, category: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
