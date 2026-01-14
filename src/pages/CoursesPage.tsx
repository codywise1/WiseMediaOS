import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { Play, Clock, Plus, X } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  lessons_count?: number;
  duration?: string;
  progress?: number;
}

export default function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Growth',
    thumbnail_url: ''
  });

  useEffect(() => {
    fetchCourses();
    if (profile) {
      setIsAdmin(profile.role === 'admin');
    }
  }, [profile]);

  async function fetchCourses() {
    if (!isSupabaseAvailable()) {
      setCourses([
        { id: '1', title: 'Agency Scaling', category: 'Growth', progress: 65, lessons_count: 24, duration: '8 hours', thumbnail_url: '/src/media/course_agency_scaling.png', description: '' },
        { id: '2', title: 'Content Creation 101', category: 'Creative', progress: 30, lessons_count: 18, duration: '6 hours', thumbnail_url: '/src/media/course_content_creation.png', description: '' },
        { id: '3', title: 'Social Media Strategy', category: 'Marketing', progress: 90, lessons_count: 15, duration: '5 hours', thumbnail_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800', description: '' },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase!
        .from('courses')
        .select('*');

      if (error) throw error;

      const mapped = (data || []).map(c => ({
        ...c,
        category: c.category || 'Growth',
        lessons_count: 0,
        progress: 0
      }));

      setCourses(mapped);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      // Done
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSaving(true);

    try {
      const { data, error } = await supabase!
        .from('courses')
        .insert([{
          title: form.title,
          description: form.description,
          category: form.category,
          thumbnail_url: form.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800',
          creator_id: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setIsModalOpen(false);
      fetchCourses();
      navigate(`/community/courses/${data.id}`);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-bold gradient-text text-[40px]" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Education
            </h1>
            <p className="text-gray-400 mt-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Premium courses, playbooks, and internal knowledge to scale your creative business.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#3AA3EB]/20"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <Plus size={18} />
              Create Course
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, i) => (
          <GlassCard key={course.id || i} className="group overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                <img
                  src={course.thumbnail_url || '/src/media/course_agency_scaling.png'}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold uppercase tracking-wider">
                  {course.category}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg leading-tight truncate" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Play size={14} className="text-[#3AA3EB]" />
                      {course.lessons_count || 0} lessons
                    </div>
                    {course.duration && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-[#3AA3EB]" />
                        {course.duration}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <span>Progress</span>
                  <span className="text-white font-medium">{course.progress || 0}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#3AA3EB] to-[#2a92da] h-full rounded-full transition-all duration-1000" style={{ width: `${course.progress || 0}%` }}></div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/community/courses/${course.id}`)}
                className={`w-full py-3 rounded-lg transition-all font-bold text-sm uppercase tracking-wider ${(course.progress || 0) === 0
                  ? 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white shadow-lg shadow-[#3AA3EB]/20'
                  : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {(course.progress || 0) === 0 ? 'Start Course' : 'Continue Learning'}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <GlassCard className="relative w-full max-w-lg bg-slate-900 border-white/10 p-0 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold text-xl uppercase tracking-wider" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                Create New Course
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Course Title</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                  placeholder="e.g. Master Agency Scaling"
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                >
                  <option value="Growth">Growth</option>
                  <option value="Creative">Creative</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Thumbnail URL</label>
                <input
                  type="url"
                  value={form.thumbnail_url}
                  onChange={e => setForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#3AA3EB] outline-none transition-all h-24"
                  placeholder="What is this course about?"
                />
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#3AA3EB]/20 uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
