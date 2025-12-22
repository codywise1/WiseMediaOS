import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService, clientService, Project as SbProject } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import { useToast } from '../contexts/ToastContext';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
  id?: string;
}

interface ProjectsProps {
  currentUser: User | null;
}

type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold';

interface Project extends Omit<SbProject, 'budget' | 'due_date' | 'team_size' | 'client' | 'status'> {
  id: string;
  budget: string;
  dueDate: string;
  team: number;
  color: string;
  client: string;
  status: ProjectStatus;
  income_balance: number;
}

const kanbanColumns = [
  { id: 'planning', title: 'Planning', color: 'bg-[#3aa3eb]' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-[#3aa3eb]' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
  { id: 'on_hold', title: 'On Hold', color: 'bg-red-500' }
];

const ScrollbarStyles = () => (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(58, 163, 235, 0.2);
      border-radius: 20px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(58, 163, 235, 0.4);
    }
  `}</style>
);

export default function Projects({ currentUser }: ProjectsProps) {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useLoadingGuard(loading, setLoading);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planning': return 'bg-[#3aa3eb]';
      case 'in_progress': return 'bg-[#3aa3eb]';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-red-500';
      default: return 'bg-[#3aa3eb]';
    }
  };

  React.useEffect(() => {
    loadProjects();
    if (currentUser?.role === 'admin') {
      loadClients();
    }
  }, [currentUser?.id, currentUser?.role]);

  const loadClients = async () => {
    try {
      const clientData = await clientService.getAll();
      setClients(clientData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProjects = async () => {
    // Only set loading true if we have no projects yet
    if (projects.length === 0) {
      setLoading(true);
    }

    try {
      let data: SbProject[] = [];

      if (!currentUser) {
        setLoading(false);
        return;
      }

      if (currentUser.role === 'admin') {
        data = await projectService.getAll();
      } else if (currentUser.id) {
        // For clients, resolve the clients.id by email (schema uses projects.client_id -> clients.id)
        // Fallback to auth user id for legacy schemas using profiles.id
        const clientRecord = await clientService.getByEmail(currentUser.email).catch(() => null);
        const effectiveClientId = clientRecord?.id || currentUser.id;
        data = await projectService.getByClientId(effectiveClientId);
      } else {
        setLoading(false);
        return;
      }

      // Transform data to match component interface
      const normalized = (status: string | null | undefined): ProjectStatus => {
        if (status === 'planning' || status === 'in_progress' || status === 'completed' || status === 'on_hold') {
          return status;
        }
        return 'planning';
      };

      const transformedProjects: Project[] = data.map(project => {
        const status = normalized(project.status);
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status,
          progress: project.progress,
          start_date: project.start_date,
          due_date: project.due_date,
          team_size: project.team_size,
          project_type: project.project_type,
          priority: project.priority,
          billing_type: project.billing_type,
          invoice_link: project.invoice_link,
          owner: project.owner,
          assigned_members: project.assigned_members,
          deliverables: project.deliverables,
          internal_tags: project.internal_tags,
          milestones: project.milestones,
          asset_count: project.asset_count,
          created_at: project.created_at,
          updated_at: project.updated_at,
          client_id: project.client_id,
          client: project.client?.name || 'Unknown Client',
          budget: project.budget ? `$${project.budget.toLocaleString()}` : '$0',
          dueDate: project.due_date || '',
          team: project.team_size || 1,
          income_balance: project.income_balance || 0,
          color: getStatusColor(status)
        };
      });

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Only set empty array if we really have no data to show and it's the first load
      if (projects.length === 0) {
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    setSelectedProject(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleViewProject = (project: Project, e?: React.MouseEvent) => {
    if (isDragging) {
      console.log('Ignoring click during drag');
      return;
    }
    if (e) {
      e.stopPropagation();
    }
    navigate(`/projects/${project.id}`);
  };

  const handleSaveProject = async (projectData: any) => {
    try {
      // Transform data for API
      const apiData = {
        name: projectData.name,
        client_id: projectData.client_id,
        description: projectData.description,
        status: projectData.status.toLowerCase().replace(' ', '_'),
        progress: projectData.progress,
        budget: parseInt(projectData.budget.replace(/[$,]/g, '')) || 0,
        due_date: projectData.dueDate,
        start_date: projectData.startDate,
        team_size: projectData.team,
        project_type: projectData.project_type,
        priority: projectData.priority,
        billing_type: projectData.billing_type,
        invoice_link: projectData.invoice_link,
        owner: projectData.owner,
        assigned_members: projectData.assigned_members || [],
        deliverables: projectData.deliverables || [],
        internal_tags: projectData.internal_tags || [],
        milestones: projectData.milestones || [],
        asset_count: projectData.asset_count || 0,
        income_balance: projectData.income_balance || 0
      };

      if (modalMode === 'create') {
        await projectService.create(apiData);
        toastSuccess('Project created successfully.');
      } else if (selectedProject) {
        await projectService.update(selectedProject.id, apiData);
        toastSuccess('Project updated successfully.');
      }

      // Reload projects
      await loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toastError(`Failed to save project: ${errorMessage}`);
    }
  };

  const confirmDelete = async () => {
    if (selectedProject) {
      try {
        await projectService.delete(selectedProject.id);
        await loadProjects();
        setIsDeleteDialogOpen(false);
        setSelectedProject(undefined);
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const moveProject = async (projectId: string, newStatus: string) => {
    // Cast string to ProjectStatus for local update
    const status = newStatus as ProjectStatus;

    try {
      console.log('Moving project:', projectId, 'to status:', status);

      // Update the project in the local state immediately for better UX
      setProjects(prevProjects => {
        const updated = prevProjects.map(p => {
          if (p.id === projectId) {
            console.log('Updating project:', p.id, 'from', p.status, 'to', status);
            return { ...p, status: status, color: getStatusColor(status) };
          }
          return p;
        });
        return updated;
      });

      // Update in the backend
      await projectService.update(projectId, { status: status });
      console.log('Project updated successfully in backend');
    } catch (error) {
      console.error('Error updating project status:', error);
      // Reload projects to revert the optimistic update on error
      await loadProjects();
    }
  };

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    if (!isAdmin) return;

    console.log('Drag start:', project.id, project.name);
    setIsDragging(true);
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);

    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (!isAdmin) return;

    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = '1';
    }

    // Small delay to ensure drop completes first and prevent click
    setTimeout(() => {
      setDraggedProject(null);
      setDragOverColumn(null);
      setIsDragging(false);
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (!isAdmin) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isAdmin) return;

    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;

    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    if (!isAdmin) return;

    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDraggedProject(null);

    const draggedId = e.dataTransfer.getData('text/plain');
    console.log('Drop - draggedId:', draggedId, 'columnId:', columnId);

    if (!draggedId) {
      console.log('No dragged ID found');
      return;
    }

    const project = projects.find(p => p.id === draggedId);
    console.log('Found project:', project?.name, 'current status:', project?.status);

    if (project && project.status !== columnId) {
      console.log('Moving project to new column');
      await moveProject(draggedId, columnId);
    } else {
      console.log('Project not moved - same status or not found');
    }
  };
  const isAdmin = currentUser?.role === 'admin';

  // Apply filters
  const visibleProjects = projects.filter(project => {
    const matchesSearch = !searchTerm ||
      project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesClient = clientFilter === 'all' || project.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });


  const getProjectsByStatus = (status: string) => {
    return visibleProjects.filter(p => p.status === status);
  };


  const getColumnTotal = (status: string) => {
    return visibleProjects
      .filter(p => p.status === status)
      .reduce((sum, p) => {
        const budget = parseFloat(p.budget.replace(/[^0-9.]/g, '')) || 0;
        return sum + budget;
      }, 0);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <ScrollbarStyles />

      {/* Header & Filters Section */}
      <div className="flex-shrink-0 space-y-6">
        {/* Header */}
        <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Projects</h1>
              <p className="text-gray-300">Manage and track all your active projects</p>
            </div>
            {isAdmin && (
              <button
                onClick={handleNewProject}
                className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0"
              >
                <PlusIcon className="h-5 w-5 text-white" />
                <span>New Project</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects or clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="all">All Status</option>
                {kanbanColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto pb-4 custom-scrollbar lg:overflow-x-visible">
          {kanbanColumns.map((column) => (
            <div
              key={column.id}
              className={`glass-card rounded-xl p-4 h-full min-h-0 min-w-[300px] lg:min-w-0 flex flex-col transition-all duration-300 ${dragOverColumn === column.id
                ? 'border-2 border-blue-400 bg-blue-500/10 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                : 'border-2 border-slate-700/50'
                }`}
              onDragOver={isAdmin ? (e) => handleDragOver(e, column.id) : undefined}
              onDragLeave={isAdmin ? handleDragLeave : undefined}
              onDrop={isAdmin ? (e) => handleDrop(e, column.id) : undefined}
            >
              <div className="flex-shrink-0 flex items-center justify-between mb-3 px-1 pb-2 border-b border-gray-800/50">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                    {column.title}
                  </h3>
                </div>
                <span className="text-sm font-bold text-gray-400 tabular-nums">
                  ${getColumnTotal(column.id).toLocaleString()}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                {getProjectsByStatus(column.id).map((project) => (
                  <div
                    key={project.id}
                    className={`group bg-[#0d1117] border border-gray-800/50 hover:border-blue-500/30 rounded-2xl p-5 transition-all duration-300 cursor-pointer ${draggedProject?.id === project.id ? 'opacity-40 scale-95 outline-none' : ''
                      }`}
                    draggable={isAdmin}
                    onDragStart={isAdmin ? (e) => handleDragStart(e, project) : undefined}
                    onDragEnd={isAdmin ? handleDragEnd : undefined}
                    onClick={(e) => {
                      if (!isDragging) {
                        handleViewProject(project);
                      } else {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <h4 className="text-white font-black text-base leading-tight min-w-0" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                          {project.name}
                        </h4>
                        <p className="text-gray-400 text-xs font-medium truncate">
                          {project.client}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-[#3ba3ea]/10 border border-[#3ba3ea]/30 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                          {project.project_type || 'General'}
                        </span>
                        {/* Action hints - shown on hover */}
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                            className="text-gray-500 hover:text-blue-400 p-1"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          {/* <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Due Date</span> */}
                          <span className="text-xs text-gray-300">
                            Due: {project.dueDate ? formatAppDate(project.dueDate) : '—'}
                          </span>
                        </div>
                        <div className="text-right flex flex-col gap-0.5">
                          {/* <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Value</span> */}
                          <span className="text-xs text-gray-300">
                            {project.budget}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {getProjectsByStatus(column.id).length === 0 && (
                  <div className={`text-center py-12 rounded-lg border-2 border-dashed transition-all duration-300 ${dragOverColumn === column.id
                    ? 'border-blue-400 bg-blue-500/5'
                    : 'border-slate-700/30'
                    }`}>
                    <p className="text-gray-500 text-sm">No projects in {column.title.toLowerCase()}</p>
                    {isAdmin && (
                      <p className="text-gray-600 text-xs mt-1">Drag projects here or create new ones</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
        project={selectedProject}
        mode={modalMode}
        currentUser={currentUser}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`}
      />
    </div >
  );
}