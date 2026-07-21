import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { Play, Clock, Plus, X, CreditCard as Edit2, Trash2, Star, EyeOff, Eye } from 'lucide-react';
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
  is_featured?: boolean;
  status?: string;
}

export default function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

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
    }
  }

  function openCreateModal() {
    setEditingCourse(null);
    setForm({ title: '', description: '', category: 'Growth', thumbnail_url: '' });
    setIsModalOpen(true);
  }

  function openEditModal(course: Course) {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description || '',
      category: course.category || 'Growth',
      thumbnail_url: course.thumbnail_url || ''
    });
    setIsModalOpen(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseAvailable()) return;
    setIsSaving(true);

    try {
      if (editingCourse) {
        const { error } = await supabase!
          .from('courses')
          .update({
            title: form.title,
            description: form.description,
            category: form.category,
            thumbnail_url: form.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCourse.id);

        if (error) throw error;
      } else {
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
        return;
      }

      setIsModalOpen(false);
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCourse() {
    if (!deleteTarget || !isSupabaseAvailable()) return;
    try {
      const { error } = await supabase!.from('courses').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function toggleFeatured(course: Course) {
    if (!isSupabaseAvailable() || !isAdmin) return;
    try {
      const { error } = await supabase!
        .from('courses')
        .update({ is_featured: !course.is_featured, updated_at: new Date().toISOString() })
        .eq('id', course.id);
      if (error) throw error;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_featured: !c.is_featured } : c));
    } catch (e) {
      console.error('Error toggling featured:', e);
    }
  }

  async function togglePublish(course: Course) {
    if (!isSupabaseAvailable() || !isAdmin) return;
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase!
        .from('courses')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', course.id);
      if (error) throw error;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus } : c));
    } catch (e) {
      console.error('Error toggling publish:', e);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Education"
        subtitle="Premium courses, playbooks, and internal knowledge to scale your creative business."
        action={isAdmin ? (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#3AA3EB]/20"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <Plus size={18} />
            Create Course
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course, i) => (
          <div
            key={course.id || i}
            className="ios-card group relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:bg-white/[0.06] hover:border-white/15 hover:shadow-2xl hover:shadow-black/20"
          >
            {/* Flush thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={course.thumbnail_url || '/src/media/course_agency_scaling.png'}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Badge pills */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white uppercase tracking-wider">
                  {course.category}
                </span>
                <div className="flex flex-col gap-1.5 items-end">
                  {course.is_featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/80 backdrop-blur-md text-white uppercase tracking-wider">
                      <Star size={10} className="fill-white text-white" /> Featured
                    </span>
                  )}
                  {isAdmin && course.status === 'draft' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-700/80 backdrop-blur-md text-white uppercase tracking-wider">
                      <EyeOff size={10} /> Draft
                    </span>
                  )}
                </div>
              </div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Play size={24} className="text-white ml-1" fill="white" />
                </div>
              </div>
            </div>

            {/* Padded content */}
            <div className="p-5 space-y-4">
              {/* Title + meta */}
              <div>
                <h3 className="text-white font-bold text-base leading-snug line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {course.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <div className="flex items-center gap-1.5">
                    <Play size={12} className="text-[#3AA3EB]" />
                    {course.lessons_count || 0} lessons
                  </div>
                  {course.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[#3AA3EB]" />
                      {course.duration}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  <span>Progress</span>
                  <span className="text-white font-medium">{course.progress || 0}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#3AA3EB] to-[#2a92da] h-full rounded-full transition-all duration-1000" style={{ width: `${course.progress || 0}%` }}></div>
                </div>
              </div>

              {/* CTA + admin actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/community/courses/${course.id}`)}
                  className={`flex-1 py-2.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${(course.progress || 0) === 0
                    ? 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white shadow-lg shadow-[#3AA3EB]/20'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {(course.progress || 0) === 0 ? 'Start Course' : 'Continue'}
                </button>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => toggleFeatured(course)}
                      className={`p-2 rounded-lg transition-colors ${course.is_featured ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                      title={course.is_featured ? 'Unfeature' : 'Feature'}
                    >
                      <Star size={16} />
                    </button>
                    <button
                      onClick={() => togglePublish(course)}
                      className={`p-2 rounded-lg transition-colors ${course.status === 'draft' ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-green-400 bg-green-400/10'}`}
                      title={course.status === 'draft' ? 'Publish' : 'Unpublish'}
                    >
                      {course.status === 'draft' ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => openEditModal(course)}
                      className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(course)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <GlassCard className="relative w-full max-w-lg bg-slate-900 border-white/10 p-0 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold text-xl uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
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
                  {isSaving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteCourse}
          title="Delete Course"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
