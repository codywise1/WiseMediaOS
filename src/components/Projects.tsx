import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService, clientService, Project as SbProject, UserRole } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import { useToast } from '../contexts/ToastContext';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function isProjectOverdue(dueDate: string, status: string): boolean {
  if (!dueDate || status === 'completed') return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface ProjectsProps {
  currentUser: User | null;
}

type ProjectStatus = 'not_started' | 'in_progress' | 'in_review' | 'completed';

interface Project extends Omit<SbProject, 'budget' | 'due_date' | 'team_size' | 'client' | 'status'> {
  id: string;
  budget: string;
  dueDate: string;
  startDate: string;
  team: number;
  color: string;
  client: string;
  industry: string;
  status: ProjectStatus;
}

const kanbanColumns = [
  { id: 'not_started', title: 'Not Started', color: 'bg-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-[#3aa3eb]' },
  { id: 'in_review', title: 'In Review', color: 'bg-amber-500' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' }
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

const getDaysUntilDue = (dueDate: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Due today';
  if (diffDays > 0) return `Due in ${diffDays} days`;
  return `Overdue by ${Math.abs(diffDays)} days`;
};

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
  const [industryFilter, setIndustryFilter] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sortBy, setSortBy] = useState<'due' | 'amount' | 'client'>('due');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [displayCount, setDisplayCount] = useState(20);

  useLoadingGuard(loading, setLoading);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'not_started':
        return 'text-slate-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'in_review':
        return 'text-amber-400';
      case 'completed':
        return 'text-green-400';
      default:
        return 'text-gray-400';
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
        if (status === 'not_started' || status === 'in_progress' || status === 'in_review' || status === 'completed') {
          return status;
        }
        // Fallback or mapping for legacy data
        if (status === 'on_hold') return 'not_started';
        return 'not_started';
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
          industry: project.client?.category || 'General',
          budget: project.budget ? `$${project.budget.toLocaleString()}` : '$0',
          dueDate: project.due_date || '',
          startDate: project.start_date || '',
          team: project.team_size || 1,
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
        due_date: projectData.dueDate || null,
        start_date: projectData.startDate || null,
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
        asset_count: projectData.asset_count || 0
      };

      if (modalMode === 'create') {
        const created = await projectService.create(apiData);
        await syncProjectInvoiceLink(created.id, projectData.invoice_link);
        toastSuccess('Project created successfully.');
      } else if (selectedProject) {
        await projectService.update(selectedProject.id, apiData);
        await syncProjectInvoiceLink(selectedProject.id, projectData.invoice_link);
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

  const syncProjectInvoiceLink = async (projectId: string, invoiceId: string | undefined) => {
    if (!invoiceId) return;
    try {
      await supabase.from('invoice_projects').upsert({ invoice_id: invoiceId, project_id: projectId }, { onConflict: 'invoice_id,project_id' });
    } catch (e) {
      console.error('Error syncing project-invoice link:', e);
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

  // Sorted and filtered projects
  const sortedProjects = React.useMemo(() => {
    const filtered = projects.filter(project => {
      const matchesSearch = !searchTerm ||
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesClient = clientFilter === 'all' || project.client_id === clientFilter;
      const matchesIndustry = industryFilter === 'all' || project.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesClient && matchesIndustry;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'due') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDate - bDate;
      }
      if (sortBy === 'amount') {
        const aBudget = parseFloat(a.budget.replace(/[^0-9.]/g, '')) || 0;
        const bBudget = parseFloat(b.budget.replace(/[^0-9.]/g, '')) || 0;
        return bBudget - aBudget;
      }
      if (sortBy === 'client') {
        return (a.client || '').localeCompare(b.client || '');
      }
      return 0;
    });
    return sorted;
  }, [projects, searchTerm, statusFilter, clientFilter, industryFilter, sortBy]);

  const visibleProjects = sortedProjects;

  const uniqueIndustries = Array.from(new Set(projects.map(p => p.industry).filter(Boolean)));

  const clientIdsWithProjects = new Set(projects.map(p => p.client_id));
  const clientsWithProjects = clients.filter(c => clientIdsWithProjects.has(c.id));


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
    <div className="h-full flex flex-col space-y-0">
      <ScrollbarStyles />

      {/* Header & Filters Section */}
      <div className="space-y-2">
        {/* Header */}
        <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="min-w-0">
              <h1 className="font-display font-bold gradient-text leading-tight tracking-tight uppercase mb-2" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)' }}>Projects</h1>
              <p className="text-gray-400 text-sm sm:text-base">
                {currentUser?.role === 'admin'
                  ? 'Track progress, timelines, and deliverables across all work.'
                  : 'View active work, progress, and milestones.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-300 hover:text-white transition-all"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
              {isAdmin && (
                <button
                  onClick={handleNewProject}
                  className="btn-header-glass flex-1 sm:flex-none space-x-2"
                >
                  <span className="btn-text-glow whitespace-nowrap">New Project</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Segmented Control — scroll-snap, no wrap, edge fade */}
          {!isDesktop && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 overflow-x-auto snap-x edge-fade-right" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-2 py-1">
                  {kanbanColumns.map((col) => {
                    const isActive = activeTab === col.id;
                    const count = visibleProjects.filter(p => p.status === col.id).length;
                    return (
                      <button
                        key={col.id}
                        onClick={() => { setActiveTab(col.id); setDisplayCount(20); }}
                        className={`snap-start flex items-center gap-1.5 px-3.5 h-11 rounded-full whitespace-nowrap transition-all duration-200 border shrink-0 ${isActive
                          ? 'bg-[#3aa3eb]/20 border-[#3aa3eb]/50 text-white'
                          : 'bg-white/[0.06] border-white/8 text-gray-400'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${col.color}`} />
                        <span className="text-xs font-semibold">{col.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]' : 'bg-white/8 text-gray-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setShowFilterSheet(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 h-11 rounded-full bg-white/[0.06] border border-white/8 text-gray-300"
              >
                <FunnelIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Desktop Filters — hidden on mobile */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Project State</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                >
                  <option value="all">All Status</option>
                  {kanbanColumns.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Client</label>
                <select
                  disabled={!isAdmin}
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All Clients</option>
                  {clientsWithProjects.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Industry</label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                >
                  <option value="all">All Categories</option>
                  {uniqueIndustries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all' || industryFilter !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
              <span className="text-gray-400">Active filters:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                  Search: {searchTerm}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                  Status: {kanbanColumns.find(c => c.id === statusFilter)?.title}
                </span>
              )}
              {clientFilter !== 'all' && (
                <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                  Client: {clients.find(c => c.id === clientFilter)?.name}
                </span>
              )}
              {industryFilter !== 'all' && (
                <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                  Industry: {industryFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setClientFilter('all');
                  setIndustryFilter('all');
                }}
                className="text-[#3aa3eb] hover:text-blue-300 font-medium shrink-glow-button"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: single-status list with infinite scroll */}
      {!isDesktop && (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4">
          <div className="space-y-3">
            {(() => {
              const statusProjects = sortedProjects.filter(p => p.status === activeTab);
              const shown = statusProjects.slice(0, displayCount);
              return (
                <>
                  {shown.map((project) => {
                    const overdue = isProjectOverdue(project.dueDate, project.status);
                    const odDays = overdue ? daysOverdue(project.dueDate) : 0;
                    return (
                      <div
                        key={project.id}
                        className="card-press card-lift bg-[#16181c] border border-white/8 rounded-xl p-4 cursor-pointer"
                        onClick={() => handleViewProject(project)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-white font-semibold text-[17px] leading-tight flex-1 min-w-0 truncate">
                            {project.name}
                          </h4>
                          <span className="text-white font-bold text-base tabular-nums shrink-0">
                            {project.budget}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm truncate mb-2">
                          {project.client} · {project.project_type || 'General'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Due: {project.dueDate ? formatAppDate(project.dueDate) : '—'}
                            </span>
                            {overdue && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                Overdue {odDays}d
                              </span>
                            )}
                          </div>
                          <ProjectOverflowMenu
                            project={project}
                            isAdmin={isAdmin}
                            onView={handleViewProject}
                            onEdit={handleEditProject}
                            onDelete={handleDeleteProject}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {statusProjects.length > displayCount && (
                    <div
                      ref={(el) => {
                        if (!el) return;
                        const observer = new IntersectionObserver((entries) => {
                          if (entries[0].isIntersecting) {
                            setDisplayCount(c => Math.min(c + 20, statusProjects.length));
                          }
                        }, { rootMargin: '200px' });
                        observer.observe(el);
                      }}
                      className="py-4 text-center"
                    >
                      <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
                        <div className="h-4 w-4 border-2 border-white/10 border-t-[#3aa3eb] rounded-full animate-spin" />
                        Loading more...
                      </div>
                    </div>
                  )}
                  {statusProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-slate-700/50">
                      <p className="text-gray-400 text-sm font-medium">No projects in this stage</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Desktop Kanban Board */}
      {isDesktop && (
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-x-visible pb-4 pt-8 custom-scrollbar">
          {kanbanColumns.map((column) => (
            <div
              key={column.id}
              className={`glass-card rounded-xl p-4 h-full min-h-0 min-w-[300px] lg:min-w-0 flex flex-col transition-all duration-300 ${activeTab === column.id ? 'flex' : 'hidden lg:flex'} ${dragOverColumn === column.id
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
                  <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                    {column.title}
                  </h3>
                </div>
                <span className="text-sm font-bold text-gray-400 tabular-nums">
                  ${getColumnTotal(column.id).toLocaleString()}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                {getProjectsByStatus(column.id).map((project) => {
                  const overdue = isProjectOverdue(project.dueDate, project.status);
                  const odDays = overdue ? daysOverdue(project.dueDate) : 0;
                  return (
                    <div
                      key={project.id}
                      className={`group bg-[#0d1117]/50 border border-gray-800/50 hover:border-blue-500/30 rounded-[10px] p-4 sm:p-5 transition-all duration-300 cursor-pointer ${draggedProject?.id === project.id ? 'opacity-40 scale-95 outline-none' : ''}`}
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
                          <h4 className="text-white font-black text-base leading-tight min-w-0" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}>
                            {project.name}
                          </h4>
                          <p className="text-gray-400 text-xs font-medium truncate">
                            {project.client}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(59, 163, 234, 0.33)', border: '1px solid rgba(59, 163, 234, 1)', color: '#ffffff' }}>
                            {project.project_type || 'General'}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                              Overdue {odDays}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-300">
                              {project.status === 'in_progress' ? (getDaysUntilDue(project.dueDate) || 'Due: —') : `Due: ${project.dueDate ? formatAppDate(project.dueDate) : '—'}`}
                            </span>
                          </div>
                          <div className="text-right flex flex-col gap-0.5">
                            <span className="text-xs text-gray-300">
                              {project.budget}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {getProjectsByStatus(column.id).length === 0 && (
                  <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed transition-all duration-300 ${dragOverColumn === column.id
                    ? 'border-green-400 bg-green-500/10 scale-105'
                    : 'border-slate-700/50 bg-slate-800/20'
                    }`}>
                    <div className={`mb-4 p-3 rounded-full border-2 border-dashed ${dragOverColumn === column.id ? 'border-green-400 bg-green-400/20' : 'border-slate-700'}`}>
                      <ArrowDownIcon className={`h-8 w-8 ${dragOverColumn === column.id ? 'text-green-400 animate-bounce' : 'text-slate-600'}`} />
                    </div>
                    <p className={`text-base font-bold tracking-widest mb-1 ${dragOverColumn === column.id ? 'text-green-400' : 'text-gray-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}>
                      No Project Here
                    </p>
                    <p className="text-gray-500 text-xs text-center max-w-[150px]">
                      {isAdmin ? 'Drag projects here or create a new one' : 'No projects in this stage'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Mobile Filter Sheet */}
      {!isDesktop && (
        <ProjectFilterSheet
          open={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          onApply={() => setShowFilterSheet(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          clientFilter={clientFilter}
          setClientFilter={setClientFilter}
          industryFilter={industryFilter}
          setIndustryFilter={setIndustryFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          clients={clients}
          industries={Array.from(new Set(projects.map(p => p.industry).filter(Boolean))) as string[]}
        />
      )}

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

function ProjectOverflowMenu({ project, isAdmin, onView, onEdit, onDelete }: {
  project: any;
  isAdmin: boolean;
  onView: (p: any) => void;
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-white/10 py-1 shadow-2xl" style={{ background: '#1c1f24' }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView(project); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2">
            <EyeIcon className="h-4 w-4" /> View
          </button>
          {isAdmin && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(project); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-2">
                <PencilIcon className="h-4 w-4" /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(project); }} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <TrashIcon className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectFilterSheet({
  open, onClose, onApply,
  searchTerm, setSearchTerm,
  clientFilter, setClientFilter,
  industryFilter, setIndustryFilter,
  sortBy, setSortBy,
  clients, industries,
}: {
  open: boolean; onClose: () => void; onApply: () => void;
  searchTerm: string; setSearchTerm: (v: string) => void;
  clientFilter: string; setClientFilter: (v: string) => void;
  industryFilter: string; setIndustryFilter: (v: string) => void;
  sortBy: 'due' | 'amount' | 'client'; setSortBy: (v: 'due' | 'amount' | 'client') => void;
  clients: { id: string; name: string }[];
  industries: string[];
}) {
  const startY = useRef<number | null>(null);
  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 80) { onClose(); startY.current = null; }
  };
  const activeCount = [searchTerm, clientFilter !== 'all', industryFilter !== 'all', sortBy !== 'due'].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="ios-sheet-panel ios-sheet-enter absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1.5 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/8">
          <h3 className="text-lg font-bold text-white">Filters & Sort</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search</label>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client</label>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="all">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Industry</label>
            <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="all">All Industries</option>
              {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'due' | 'amount' | 'client')} className="w-full px-4 py-3 bg-white/[0.08] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]/50" style={{ fontSize: '16px' }}>
              <option value="due">Due Date</option>
              <option value="amount">Amount</option>
              <option value="client">Client Name</option>
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 flex gap-3 px-5 py-4 border-t border-white/8" style={{ background: '#1c1f24', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => { setSearchTerm(''); setClientFilter('all'); setIndustryFilter('all'); setSortBy('due'); }}
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium"
            style={{ fontSize: '16px' }}
          >
            Clear all
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 bg-[#3aa3eb] rounded-xl text-white font-medium"
            style={{ fontSize: '16px' }}
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}