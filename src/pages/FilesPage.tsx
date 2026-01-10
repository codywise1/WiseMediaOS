import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { FileRecord, FileStatus, filesService, Client, Project, Appointment, clientService, projectService, appointmentService } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import UploadFileModal from '../components/UploadFileModal';
import { useAuth } from '../contexts/AuthContext';

function getFileType(file: FileRecord) {
  if (file.content_type && file.content_type.includes('/')) {
    return file.content_type.split('/')[1]?.toUpperCase() || 'FILE';
  }
  const ext = file.filename.split('.').pop();
  return (ext ? ext.toUpperCase() : 'FILE');
}

export default function FilesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<FileStatus | ''>('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Appointment[]>([]);

  useEffect(() => {
    loadFiles();
    loadClients();
    loadProjects();
    loadMeetings();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      const data = await appointmentService.getAll();
      setMeetings(data);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const handleUpload = (_file: FileRecord) => {
    loadFiles();
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await filesService.list();
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = !searchQuery ||
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.project?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.meeting?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.visibility.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getFileType(file).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClient = !selectedClient || file.client_id === selectedClient;
      const matchesProject = !selectedProject || file.project_id === selectedProject;
      const matchesStatus = !selectedStatus || file.status === selectedStatus;

      return matchesSearch && matchesClient && matchesProject && matchesStatus;
    });
  }, [files, searchQuery, selectedClient, selectedProject, selectedStatus]);

  const stats = useMemo(() => {
    const total = files.length;
    const pending = files.filter(f => f.status === 'in_review').length;
    const awaiting = files.filter(f => f.status === 'awaiting_client').length;
    const approved = files.filter(f => f.status === 'approved').length;
    const expiring = files.filter(f => f.status === 'archived').length; // Simplified
    return { total, pending, awaiting, approved, expiring };
  }, [files]);

  // Filter clients and projects to only show those linked to files
  const linkedClients = useMemo(() => {
    const clientIds = new Set(files.map(f => f.client_id).filter(Boolean));
    return clients.filter(client => clientIds.has(client.id));
  }, [files, clients]);

  const linkedProjects = useMemo(() => {
    const projectIds = new Set(files.map(f => f.project_id).filter(Boolean));
    return projects.filter(project => projectIds.has(project.id));
  }, [files, projects]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const handleFileClick = (file: FileRecord) => {
    navigate(`/files/${file.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header and Filters Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              FILES
            </h1>
            <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {profile?.role === 'admin'
                ? 'Store and manage deliverables, assets, and working files.'
                : 'Access finalized files, assets, and project outputs.'}
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-header-glass space-x-2 shrink-0 w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="btn-text-glow">Upload File</span>
          </button>
        </div>

        {/* Search & Filters Inside Header Container */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Search Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as FileStatus)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="awaiting_client">Awaiting Client</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Client Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
              >
                <option value="">All Clients</option>
                {linkedClients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
              >
                <option value="">All Projects</option>
                {linkedProjects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Files</div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl font-bold text-amber-300">{stats.pending}</div>
          <div className="text-sm text-gray-400">Pending Review</div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl font-bold text-blue-300">{stats.awaiting}</div>
          <div className="text-sm text-gray-400">Awaiting Client</div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl font-bold text-emerald-300">{stats.approved}</div>
          <div className="text-sm text-gray-400">Approved</div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="text-2xl font-bold text-slate-300">{stats.expiring}</div>
          <div className="text-sm text-gray-400">Expiring Soon</div>
        </div>
      </div>

      {/* File List Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-white/5 border-b border-white/10">
          <div className="col-span-4">File Name</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-3">Linked To</div>
          <div className="col-span-2">Last Updated</div>
          <div className="col-span-1 text-left">Status</div>
          <div className="col-span-1">Actions</div>
        </div>
        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-400">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400">No files found.</div>
          ) : (
            filteredFiles.map(file => (
              <div
                key={file.id}
                className="flex flex-col gap-3 px-4 py-4 text-sm text-white/90 hover:bg-white/5 transition sm:grid sm:grid-cols-12 sm:gap-0 sm:items-center cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <div className="flex items-center gap-3 min-w-0 sm:col-span-4">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{file.filename}</div>
                    <span className="text-sm sm:text-gray-300">{formatFileSize(file.size_bytes ?? undefined)}</span>
                  </div>
                </div>

                <div className="sm:col-span-1 text-xs text-gray-300">{getFileType(file)}</div>

                <div className="sm:col-span-3 text-xs text-gray-300">
                  {file.client?.name || file.project?.name || file.meeting?.title || '—'}
                </div>

                <div className="sm:col-span-2 text-xs text-gray-300">{formatAppDate(file.updated_at)}</div>

                <div className="sm:col-span-1 flex items-center justify-start">
                  {(() => {
                    const statusStyles: Record<string, { bg: string, border: string, text: string }> = {
                      draft: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff' },
                      in_review: { bg: 'rgba(234, 179, 8, 0.33)', border: 'rgba(234, 179, 8, 1)', text: '#ffffff' },
                      awaiting_client: { bg: 'rgba(239, 68, 68, 0.33)', border: 'rgba(239, 68, 68, 1)', text: '#ffffff' },
                      approved: { bg: 'rgba(34, 197, 94, 0.33)', border: 'rgba(34, 197, 94, 1)', text: '#ffffff' },
                      archived: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' },
                      default: { bg: 'rgba(148, 163, 184, 0.33)', border: 'rgba(148, 163, 184, 1)', text: '#ffffff' }
                    };

                    const style = statusStyles[file.status.toLowerCase()] || statusStyles.default;

                    return (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                          color: style.text
                        }}
                      >
                        {file.status.replace('_', ' ').charAt(0).toUpperCase() + file.status.replace('_', ' ').slice(1)}
                      </span>
                    );
                  })()}
                </div>

                <div className="sm:col-span-1 flex gap-2">
                  <button
                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-[#3aa3eb] hover:bg-[#3aa3eb]/10 transition-all"
                    title="Share"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        clients={clients}
        projects={projects}
        meetings={meetings}
      />
    </div>
  );
}
