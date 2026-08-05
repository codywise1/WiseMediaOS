import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Play, Clock, Plus, X, CreditCard as Edit2, Trash2, Star, EyeOff, Eye, Search, Pencil } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

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
  level?: string;
}

const labelCls = 'block text-sm font-medium text-gray-300 mb-2';
const inputCls = 'form-input w-full px-4 py-3 rounded-xl text-sm';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'Growth', label: 'Growth' },
  { id: 'Creative', label: 'Creative' },
  { id: 'Marketing', label: 'Marketing' },
  { id: 'Strategy', label: 'Strategy' },
  { id: 'Operations', label: 'Operations' },
  { id: 'Sales', label: 'Sales' },
];

export default function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');

  const [form, setForm] = useState({ title: '', description: '', category: 'Growth', thumbnail_url: '', level: 'Intermediate' });

  useEffect(() => {
    fetchCourses();
    if (profile) setIsAdmin(profile.role === 'admin');
  }, [profile]);

  async function fetchCourses() {
    setLoading(true);
    try {
      const { data, error } = await supabase!.from('courses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCourses((data || []).map(c => ({ ...c, category: c.category || 'Growth', lessons_count: 0, progress: 0 })));
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCourse(null);
    setForm({ title: '', description: '', category: 'Growth', thumbnail_url: '', level: 'Intermediate' });
    setIsModalOpen(true);
  }

  function openEditModal(course: Course) {
    setEditingCourse(course);
    setForm({
      title: course.title, description: course.description || '',
      category: course.category || 'Growth', thumbnail_url: course.thumbnail_url || '',
      level: course.level || 'Intermediate',
    });
    setIsModalOpen(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        title: form.title, description: form.description, category: form.category,
        thumbnail_url: form.thumbnail_url || null, level: form.level,
        updated_at: new Date().toISOString(),
      };
      if (editingCourse) {
        const { error } = await supabase!.from('courses').update(payload).eq('id', editingCourse.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase!.from('courses')
          .insert([{ ...payload, creator_id: profile?.id }]).select().single();
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
    if (!deleteTarget) return;
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

  async function toggleFeatured(course: Course, e: React.MouseEvent) {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      const { error } = await supabase!.from('courses')
        .update({ is_featured: !course.is_featured, updated_at: new Date().toISOString() }).eq('id', course.id);
      if (error) throw error;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_featured: !c.is_featured } : c));
    } catch (err) { console.error(err); }
  }

  async function togglePublish(course: Course, e: React.MouseEvent) {
    e.stopPropagation();
    if (!isAdmin) return;
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase!.from('courses')
        .update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', course.id);
      if (error) throw error;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus } : c));
    } catch (err) { console.error(err); }
  }

  async function saveInlineTitle(course: Course) {
    if (!inlineTitle.trim()) { setInlineEditId(null); return; }
    try {
      const { error } = await supabase!.from('courses')
        .update({ title: inlineTitle.trim(), updated_at: new Date().toISOString() }).eq('id', course.id);
      if (error) throw error;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, title: inlineTitle.trim() } : c));
    } catch (err) { console.error(err); }
    setInlineEditId(null);
  }

  const filteredCourses = useMemo(() => {
    let result = selectedCategory === 'all' ? courses : courses.filter(c => c.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    return result;
  }, [courses, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Education"
        subtitle="Premium courses, playbooks, and internal knowledge to scale your creative business."
        action={isAdmin ? (
          <button onClick={openCreateModal} className="btn-wise">
            <Plus size={18} /> Create Course
          </button>
        ) : undefined}
      />

      {/* Search + Category filter */}
      <div className="glass-card neon-glow rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative sm:order-2 sm:ml-auto sm:w-56 flex-shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..." className="form-input w-full pl-9 pr-8 py-2 rounded-xl text-sm" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <div className="overflow-x-auto scrollbar-hide sm:order-1">
            <div className="ios-segmented inline-flex min-w-max">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`ios-segmented-btn flex-shrink-0 ${selectedCategory === cat.id ? 'active' : ''}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ios-card rounded-2xl overflow-hidden border border-white/10">
              <div className="animate-pulse">
                <div className="aspect-video bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-white/5 rounded-full w-3/4" />
                  <div className="h-3 bg-white/5 rounded-full w-1/2" />
                  <div className="h-8 bg-white/5 rounded-xl w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="ios-card rounded-2xl p-12 text-center border border-white/10">
          <Play className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">{searchQuery ? 'No courses match your search.' : 'No courses found in this category.'}</p>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#3AA3EB] text-sm mt-2 font-medium">Clear search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredCourses.map((course, idx) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                className="ios-card group relative rounded-2xl border border-white/10 overflow-hidden cursor-pointer active:scale-[0.99]"
                onClick={() => inlineEditId !== course.id && navigate(`/community/courses/${course.id}`)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800'}
                    alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white uppercase tracking-wider">
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
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <Play size={24} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    {/* Inline-editable title for admin */}
                    {inlineEditId === course.id ? (
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                        <input autoFocus type="text" value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          onBlur={() => saveInlineTitle(course)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveInlineTitle(course); if (e.key === 'Escape') setInlineEditId(null); }}
                          className="form-input flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white" />
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5">
                        <h3 className="text-white font-bold text-base leading-snug line-clamp-2 flex-1">{course.title}</h3>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); setInlineEditId(course.id); setInlineTitle(course.title); }}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0" title="Quick edit title">
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Play size={12} className="text-[#3AA3EB]" /> {course.lessons_count || 0} lessons
                      </div>
                      {course.level && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#3AA3EB]" /> {course.level}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Progress</span>
                      <span className="text-white font-medium">{course.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#3AA3EB] to-[#2a92da] h-full rounded-full transition-all duration-1000" style={{ width: `${course.progress || 0}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/community/courses/${course.id}`); }}
                      className={`flex-1 py-2.5 rounded-full transition-all font-bold text-xs uppercase tracking-widest ${
                        (course.progress || 0) === 0 ? 'bg-[#3AA3EB] hover:bg-[#2a92da] text-white shadow-lg shadow-[#3AA3EB]/20' : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}>
                      {(course.progress || 0) === 0 ? 'Start Course' : 'Continue'}
                    </button>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={(e) => toggleFeatured(course, e)}
                          className={`p-2 rounded-full transition-colors ${course.is_featured ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                          title={course.is_featured ? 'Unfeature' : 'Feature'}>
                          <Star size={16} />
                        </button>
                        <button onClick={(e) => togglePublish(course, e)}
                          className={`p-2 rounded-full transition-colors ${course.status === 'draft' ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-green-400 bg-green-400/10'}`}
                          title={course.status === 'draft' ? 'Publish' : 'Unpublish'}>
                          {course.status === 'draft' ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(course); }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Course Modal — base Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
        maxWidth="max-w-lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" form="course-form" disabled={isSaving} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        }
      >
        <form id="course-form" onSubmit={handleSaveCourse} className="space-y-5">
          <div>
            <label className={labelCls}>Course Title</label>
            <input required type="text" value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputCls} placeholder="e.g. Master Agency Scaling" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className={inputCls}>
                <option value="Growth">Growth</option>
                <option value="Creative">Creative</option>
                <option value="Marketing">Marketing</option>
                <option value="Strategy">Strategy</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Level</label>
              <select value={form.level} onChange={e => setForm(prev => ({ ...prev, level: e.target.value }))} className={inputCls}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Thumbnail URL</label>
            <input type="url" value={form.thumbnail_url}
              onChange={e => setForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
              className={inputCls} placeholder="https://images.unsplash.com/..." />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputCls} h-24 resize-none`} placeholder="What is this course about?" />
          </div>
        </form>
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteCourse}
          title="Delete Course"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
