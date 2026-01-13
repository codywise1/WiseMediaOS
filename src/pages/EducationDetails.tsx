import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import {
  Play,
  Clock,
  BarChart3,
  CheckCircle2,
  Lock,
  Download,
  MessageSquare,
  Edit,
  Trash2,
  Award,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  creator_id: string;
  enrollment_count: number;
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

export default function EducationDetails() {
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = id || '123';

  useEffect(() => {
    if (profile) {
      fetchCourseData();
      checkEnrollment();
    }
  }, [profile]);

  async function fetchCourseData() {
    try {
      // Fetch course
      const { data: courseData } = await supabase!
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseData) {
        setCourse(courseData);
        setIsAdmin(courseData.creator_id === profile?.id || profile?.role === 'admin');
      }

      // Fetch lessons
      const { data: lessonsData } = await supabase!
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
      }

      // Fetch resources
      const { data: resourcesData } = await supabase!
        .from('course_resources')
        .select('*')
        .eq('course_id', courseId);

      if (resourcesData) {
        setResources(resourcesData);
      }

      // Calculate progress if enrolled
      if (profile) {
        const { data: progressData } = await supabase!
          .from('lesson_progress')
          .select('completed')
          .eq('user_id', profile.id)
          .in('lesson_id', lessonsData?.map(l => l.id) || []);

        if (progressData && lessonsData) {
          const completed = progressData.filter(p => p.completed).length;
          setProgress(Math.round((completed / lessonsData.length) * 100));
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkEnrollment() {
    if (!profile) return;

    const { data } = await supabase!
      .from('course_enrollments')
      .select('id')
      .eq('user_id', profile.id)
      .eq('course_id', courseId)
      .single();

    setIsEnrolled(!!data);
  }

  async function handleEnroll() {
    if (!profile) return;

    try {
      const { error } = await supabase!.from('course_enrollments').insert({
        user_id: profile.id,
        course_id: courseId,
      });

      if (!error) {
        setIsEnrolled(true);
      }
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  }

  async function markLessonComplete(lessonId: string) {
    if (!profile) return;

    try {
      const { error } = await supabase!
        .from('lesson_progress')
        .upsert({
          user_id: profile.id,
          lesson_id: lessonId,
          completed: true,
        });

      if (!error) {
        fetchCourseData();
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'resources', label: 'Resources' },
    { id: 'discussions', label: 'Discussions' },
    { id: 'progress', label: 'Progress' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading course...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] mb-8 overflow-hidden rounded-3xl">
        <img
          src={course?.thumbnail_url || 'https://wisemedia.io/wp-content/uploads/2025/10/IMG-5-Wise-Media.webp'}
          alt={course?.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Header Info Section */}
      <div className="glass-card neon-glow rounded-3xl p-6 sm:p-8 lg:p-10 mb-8 border border-white/10">
        <div className="flex flex-col gap-6">
          <div className="mb-2">
            <img
              src="https://wisemedia.io/wp-content/uploads/2025/09/Wise-Media-Logo.svg"
              alt="Creator Club"
              className="h-10"
            />
          </div>
          <h1 className="text-white text-[48px] font-bold leading-tight" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            {course?.title || 'Education Course'}
          </h1>

          <div className="flex flex-wrap items-center gap-8 text-white mt-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3AA3EB]/20 rounded-lg">
                <Clock size={20} className="text-[#3AA3EB]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Duration</p>
                <div className="flex items-baseline gap-1">
                  <span className="number font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{lessons.length}</span>
                  <span className="text-sm font-medium text-gray-400">Lessons</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3AA3EB]/20 rounded-lg">
                <BarChart3 size={20} className="text-[#3AA3EB]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Level</p>
                <span className="text-sm font-bold text-white uppercase tracking-wide">Intermediate</span>
              </div>
            </div>

            {isEnrolled && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/20 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Completion</p>
                  <div className="flex items-baseline gap-1">
                    <span className="number font-bold text-lg text-green-400" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{progress}%</span>
                    <span className="text-sm font-medium text-gray-400">Done</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            {isEnrolled ? (
              <button
                onClick={() => {
                  const firstIncomplete = lessons.find(l => !l.completed);
                  const target = firstIncomplete || lessons[0];
                  if (target) navigate(`/community/courses/${courseId}/lesson/${target.id}`);
                }}
                className="btn-header-glass py-4 px-8 min-w-[220px]"
              >
                <span className="btn-text-glow flex items-center justify-center gap-2">
                  Continue Learning
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                className="btn-header-glass py-4 px-8 min-w-[220px]"
              >
                <span className="btn-text-glow flex items-center justify-center gap-2">
                  Enroll in Course
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={`flex items-center gap-2 px-6 py-4 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border-2 ${adminMode
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {adminMode ? 'Exit Admin Mode' : 'Admin Settings'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-20 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-[#3AA3EB] text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: activeTab === tab.id ? 600 : 400 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <GlassCard>
              <h2 className="text-white font-bold text-2xl mb-4" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>About This Course</h2>
              <p className="text-gray-300 leading-relaxed mb-6" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                {course?.description || 'Master the fundamentals of digital marketing and grow your online presence. This comprehensive course covers everything from social media strategy to content creation and analytics.'}
              </p>
              <div className="space-y-3">
                <h3 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What You\'ll Learn</h3>
                {['Build a comprehensive marketing strategy', 'Create engaging content that converts', 'Master social media algorithms', 'Track and analyze your performance'].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#3AA3EB] flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <GlassCard key={lesson.id} className="hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#3AA3EB]/20 flex items-center justify-center flex-shrink-0">
                    {lesson.completed ? (
                      <CheckCircle2 className="text-green-400" size={24} />
                    ) : isEnrolled ? (
                      <Play className="text-[#3AA3EB]" size={24} />
                    ) : (
                      <Lock className="text-gray-500" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Lesson <span className="number">{index + 1}</span>: {lesson.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        <span className="number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{lesson.duration_minutes}</span> min
                      </span>
                      {lesson.completed && (
                        <span className="text-green-400 font-medium">Completed</span>
                      )}
                    </div>
                  </div>
                  {adminMode && (
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  {isEnrolled && !adminMode && (
                    <Link to={`/community/courses/${courseId}/lesson/${lesson.id}`} className="px-4 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors text-sm font-medium">
                      {lesson.completed ? 'Review' : 'Start Lesson'}
                    </Link>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <GlassCard key={resource.id} className="hover:scale-105 transition-transform">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
                    <Download className="text-[#3AA3EB]" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{resource.title}</h3>
                    <span className="text-xs text-gray-400 uppercase">{resource.resource_type}</span>
                  </div>
                </div>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block mt-4 px-4 py-2 bg-[#3AA3EB]/20 hover:bg-[#3AA3EB]/30 text-[#3AA3EB] rounded-lg transition-colors text-center text-sm font-medium">
                  Download
                </a>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && isEnrolled && (
          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Progress</h2>
                {progress === 100 && (
                  <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all font-medium shadow-lg">
                    <Award size={20} />
                    Claim Certificate
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="60" fill="none" stroke="#ffffff20" strokeWidth="8" />
                      <circle cx="64" cy="64" r="60" fill="none" stroke="#3AA3EB" strokeWidth="8" strokeDasharray={`${progress * 3.77} 377`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '32px' }}>{progress}%</span>
                    </div>
                  </div>
                  <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Overall Progress</p>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold number mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '40px' }}>{Math.round(lessons.length * progress / 100)}</div>
                  <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Lessons Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold number mb-2" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '40px' }}>{lessons.reduce((acc, l) => acc + l.duration_minutes, 0)}</div>
                  <p className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Minutes Watched</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="text-[#3AA3EB]" size={24} />
              <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discussions</h2>
            </div>
            <div className="mb-6">
              <textarea className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none h-32" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="Share your thoughts or ask a question..." />
              <button className="mt-3 px-6 py-2 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium">
                Post Comment
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">JD</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>John Doe</span>
                      <span className="text-gray-500 text-sm">2 hours ago</span>
                    </div>
                    <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Great course! The lessons on social media strategy were incredibly helpful.</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
