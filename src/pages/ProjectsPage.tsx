import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { FolderKanban, Plus, X, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  admin_id: string | null;
  client_id: string | null;
}

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'not_started' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [profile]);

  async function fetchProjects() {
    if (!profile || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile || !formData.title.trim() || !supabase) return;

    setSaving(true);
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
          })
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('projects').insert({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          admin_id: profile.id,
        });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingProject(null);
      setFormData({ title: '', description: '', status: 'active' });
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
    });
    setShowModal(true);
  }

  function openNewModal() {
    setEditingProject(null);
    setFormData({ title: '', description: '', status: 'not_started' });
    setShowModal(true);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-slate-500/20 text-slate-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'in_review': return 'bg-amber-500/20 text-amber-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Projects
          </h1>
          <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
            <Plus size={20} />
            New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Loading projects...</p>
            </GlassCard>
          ) : projects.length === 0 ? (
            <GlassCard>
              <p className="text-gray-400 text-center py-8" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>No projects yet. Click "New Project" to create one.</p>
            </GlassCard>
          ) : (
            projects.map((project) => (
              <GlassCard key={project.id}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <FolderKanban className="text-blue-400" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {project.title}
                      </h3>
                      <button onClick={() => openEditModal(project)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <Edit size={16} />
                      </button>
                    </div>
                    <p className="text-gray-400 mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{project.description || 'No description'}</p>
                    <span className={`px-3 py-1 rounded-full text-sm inline-block ${getStatusColor(project.status)}`} style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px' }}>
                      {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {editingProject ? 'Edit Project' : 'New Project'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Title</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="Enter project title" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none h-32" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="Enter project description" />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors font-medium" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                      {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                    </button>
                    <button onClick={() => setShowModal(false)} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Cancel</button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </>
  );
}
