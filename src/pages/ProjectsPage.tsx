import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { formatAppDate } from '../lib/dateFormat';
import {
  Plus, X, FolderKanban, ChevronRight, CheckCircle2, Clock,
  Pause, CircleDot, Play, FileText,
} from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string; icon: typeof Clock }> = {
  not_started: { label: 'Not Started', dot: 'bg-slate-400', text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: CircleDot },
  planning: { label: 'Planning', dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: FileText },
  active: { label: 'Active', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Play },
  in_progress: { label: 'In Progress', dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Play },
  in_review: { label: 'In Review', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
  on_hold: { label: 'On Hold', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Pause },
  completed: { label: 'Completed', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: typeof Clock; accent: string;
}) {
  return (
    <div className="ios-card rounded-3xl p-6 border border-white/10">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">{label}</p>
      <p className="text-white font-bold text-3xl tabular-nums font-display leading-none">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-2">{sub}</p>}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'not_started' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProjects(); }, [profile]);

  async function fetchProjects() {
    if (!profile || !supabase) { setLoading(false); return; }
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(`admin_id.eq.${profile.id},client_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (e) {
      console.error('Error fetching projects:', e);
      setError('Unable to load projects. Please try again.');
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
          .update({ title: formData.title, description: formData.description, status: formData.status })
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
      setFormData({ title: '', description: '', status: 'not_started' });
      fetchProjects();
    } catch (e) {
      console.error('Error saving project:', e);
      alert('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setFormData({ title: project.title, description: project.description || '', status: project.status });
    setShowModal(true);
  }

  function openNewModal() {
    setEditingProject(null);
    setFormData({ title: '', description: '', status: 'not_started' });
    setShowModal(true);
  }

  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const onHold = projects.filter(p => p.status === 'on_hold').length;
    return { total: projects.length, active, completed, onHold };
  }, [projects]);

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Projects"
          subtitle="Track project status, deadlines, and deliverables."
          action={
            <button onClick={openNewModal} className="btn-header-glass space-x-2 w-full sm:w-auto">
              <Plus size={18} className="text-[#3AA3EB]" />
              <span className="btn-text-glow">New Project</span>
            </button>
          }
        />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard label="Total Projects" value={String(stats.total)} sub="All projects" icon={FolderKanban} accent="bg-blue-500/15 text-blue-300" />
          <StatCard label="Active" value={String(stats.active)} sub="Currently in progress" icon={Play} accent="bg-emerald-500/15 text-emerald-300" />
          <StatCard label="Completed" value={String(stats.completed)} sub="Finished projects" icon={CheckCircle2} accent="bg-emerald-500/15 text-emerald-300" />
        </div>

        {/* Projects list */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-white font-bold text-base" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
              All Projects
            </h2>
            <span className="text-gray-500 text-xs">{projects.length} total</span>
          </div>

          {loading ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-[#3AA3EB] rounded-full animate-spin" />
              <p className="text-gray-500 text-sm mt-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Loading projects...</p>
            </div>
          ) : error ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-red-400" />
              </div>
              <p className="text-white font-semibold text-sm mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>Something went wrong</p>
              <p className="text-gray-500 text-xs mb-4">{error}</p>
              <button onClick={fetchProjects} className="px-5 py-2.5 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-full text-sm font-semibold transition-colors">
                Try Again
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="ios-card rounded-3xl p-12 text-center border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FolderKanban size={24} className="text-gray-600" />
              </div>
              <p className="text-white font-semibold text-sm mb-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>No projects yet</p>
              <p className="text-gray-500 text-xs">Create your first project to start tracking progress.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {projects.map((project) => {
                const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.not_started;
                const StatusIcon = cfg.icon;
                return (
                  <button
                    key={project.id}
                    onClick={() => openEditModal(project)}
                    className="ios-card w-full rounded-3xl p-5 sm:p-6 border border-white/10 text-left transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <StatusIcon size={20} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <p className="text-white font-semibold text-[15px] truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
                            {project.title}
                          </p>
                          <StatusPill status={project.status} />
                        </div>
                        {project.description && (
                          <p className="text-gray-500 text-xs truncate">{project.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-gray-500 text-xs mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatAppDate(project.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <ChevronRight size={18} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <div className="ios-card rounded-3xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h3 className="text-white font-bold text-lg font-display">
                    {editingProject ? 'Edit Project' : 'New Project'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
                      placeholder="Enter project title"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all h-32 resize-none"
                      placeholder="Enter project description"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3.5 bg-black/30 border border-white/10 rounded-2xl text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 p-6 border-t border-white/10">
                  <button onClick={handleSave} disabled={saving || !formData.title.trim()} className="flex-1 py-3.5 bg-[#3AA3EB] hover:bg-[#2a92da] disabled:bg-[#3AA3EB]/40 text-white rounded-2xl transition-all font-semibold flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                    {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                  </button>
                  <button onClick={() => setShowModal(false)} className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
