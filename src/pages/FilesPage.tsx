import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileRecord, FileStatus, filesService, Client, Project, Appointment, clientService, projectService, appointmentService } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import UploadFileModal from '../components/UploadFileModal';
import { fileStatusColors } from '../lib/statusColors';

function getFileType(file: FileRecord) {
  if (file.content_type && file.content_type.includes('/')) {
    return file.content_type.split('/')[1]?.toUpperCase() || 'FILE';
  }
  const ext = file.filename.split('.').pop();
  return (ext ? ext.toUpperCase() : 'FILE');
}

export default function FilesPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<FileStatus | ''>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

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
      const matchesType = !selectedType || file.content_type?.includes(selectedType);
      const matchesStatus = !selectedStatus || file.status === selectedStatus;

      let matchesFilter = true;
      if (activeFilter === 'deliverables') matchesFilter = file.status === 'approved';
      if (activeFilter === 'internal') matchesFilter = !file.client_id;
      if (activeFilter === 'meetings') matchesFilter = !!file.meeting_id;
      if (activeFilter === 'recent') matchesFilter = new Date(file.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (activeFilter === 'shared') matchesFilter = file.visibility === 'shared';

      return matchesSearch && matchesClient && matchesProject && matchesType && matchesStatus && matchesFilter;
    });
  }, [files, searchQuery, selectedClient, selectedProject, selectedType, selectedStatus, activeFilter]);

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
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              Files
            </h1>
            <p className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Deliverables, assets, and working files
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
          >
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card rounded-2xl p-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search files, clients, or projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Smart Filters */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          >
            <option value="">All Clients</option>
            {linkedClients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          >
            <option value="">All Projects</option>
            {linkedProjects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="pdf">PDFs</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as FileStatus)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="awaiting_client">Awaiting Client</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="date"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          />
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {['all', 'deliverables', 'internal', 'meetings', 'recent', 'shared'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeFilter === filter
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
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
          <div className="col-span-3">File Name</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Linked To</div>
          <div className="col-span-2">Owner</div>
          <div className="col-span-2">Last Updated</div>
          <div className="col-span-1">Status</div>
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
                <div className="flex items-center gap-3 min-w-0 sm:col-span-3">
                  <span className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    📄
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{file.filename}</div>
                    <span className="text-sm sm:text-gray-300">{formatFileSize(file.size_bytes ?? undefined)}</span>
                  </div>
                </div>

                <div className="sm:col-span-1 text-xs text-gray-300">{getFileType(file)}</div>

                <div className="sm:col-span-2 text-xs text-gray-300">
                  {file.client?.name || file.project?.name || file.meeting?.title || '—'}
                </div>

                <div className="sm:col-span-2 text-xs text-gray-300">{file.owner_id}</div>

                <div className="sm:col-span-2 text-xs text-gray-300">{formatAppDate(file.updated_at)}</div>

                <div className="sm:col-span-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fileStatusColors[file.status]}`}>
                    {file.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="sm:col-span-1 flex gap-2">
                  <button className="text-blue-300 hover:text-blue-200">⬇️</button>
                  <button className="text-green-300 hover:text-green-200">📤</button>
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
