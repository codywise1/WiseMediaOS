import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectService, Project as ProjectType, UserRole } from '../lib/supabase';
import {
  ArrowLeftIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';
import { formatAppDate } from '../lib/dateFormat';

interface User {
  email: string;
  role: UserRole;
  name: string;
  id?: string;
}

interface ProjectDetailProps {
  currentUser: User | null;
}

export default function ProjectDetail({ currentUser }: ProjectDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll();
      const foundProject = data.find(p => p.id === id);
      if (foundProject) {
        setProject(foundProject);
      } else {
        navigate('/projects');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProject = async (projectData: any) => {
    try {
      const apiData = {
        name: projectData.name,
        client_id: projectData.client_id,
        description: projectData.description,
        status: projectData.status.toLowerCase().replace(' ', '_'),
        progress: projectData.progress,
        budget: parseInt(projectData.budget.replace(/[$,]/g, '')),
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
        asset_count: projectData.asset_count || 0
      };

      await projectService.update(id!, apiData);
      await loadProject();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project. Please try again.');
    }
  };

  const handleDuplicate = async () => {
    if (!project) return;
    try {
      const apiData = {
        name: `${project.name} (Copy)`,
        client_id: project.client_id,
        description: project.description,
        status: 'planning',
        progress: 0,
        budget: project.budget,
        due_date: project.due_date,
        start_date: project.start_date,
        team_size: project.team_size,
        project_type: project.project_type,
        priority: project.priority,
        billing_type: project.billing_type,
        owner: project.owner,
        assigned_members: project.assigned_members || [],
        deliverables: project.deliverables || [],
        internal_tags: project.internal_tags || [],
        milestones: []
      };

      const newProject = await projectService.create(apiData);
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('Error duplicating project:', error);
      alert('Error duplicating project. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      await projectService.delete(project.id);
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500';
      case 'in_progress': return 'bg-[#3aa3eb]';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    return formatAppDate(dateString);
  };

  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const description = project.description || '';
  const shouldTruncate = description.length > 200;
  const displayDescription = shouldTruncate && !showFullDescription
    ? description.slice(0, 200) + '...'
    : description;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>Back to Projects</span>
      </button>

      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              {project.name}
            </h1>
            <div className="flex items-center space-x-4 text-gray-400">
              <span className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-4 w-4" />
                <span>{project.client?.name || 'Unknown Client'}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span>{project.project_type || 'Website'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${getStatusColor(project.status)} flex items-center space-x-2`}>
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span>{project.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
            </span>
            {isAdmin && (
              <>
                <button
                  onClick={handleEditProject}
                  className="p-2 glass-card hover:bg-blue-500/20 rounded-lg transition-all"
                  title="Edit Project"
                >
                  <PencilIcon className="h-5 w-5 text-blue-400" />
                </button>
                <button
                  onClick={handleDuplicate}
                  className="p-2 glass-card hover:bg-blue-500/20 rounded-lg transition-all"
                  title="Duplicate Project"
                >
                  <DocumentDuplicateIcon className="h-5 w-5 text-blue-400" />
                </button>
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="p-2 glass-card hover:bg-red-500/20 rounded-lg transition-all"
                  title="Delete Project"
                >
                  <TrashIcon className="h-5 w-5 text-red-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Row 1 - Status & Client */}
          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <FlagIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(project.status)}`}>
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span>{project.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Client</p>
              <p className="text-white font-medium">{project.client?.name || 'Unknown Client'}</p>
            </div>
          </div>

          {/* Row 2 - Value & Due Date */}
          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <CurrencyDollarIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Project Value</p>
              <p className="text-white font-medium text-lg">${project.budget?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-500 mt-1">{project.billing_type || 'Fixed'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <CalendarIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Due Date</p>
              <p className="text-white font-medium">{formatDate(project.due_date)}</p>
            </div>
          </div>

          {/* Row 3 - Owner & Priority */}
          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <UserIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Owner</p>
              <p className="text-white font-medium">{project.owner || 'Unassigned'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <FlagIcon className="h-6 w-6 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Priority</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium text-white ${getPriorityColor(project.priority)}`}>
                {project.priority || 'Medium'}
              </span>
            </div>
          </div>

          {/* Row 4 - Internal Tags & Progress */}
          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <TagIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">Internal Tags</p>
              {project.internal_tags && project.internal_tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.internal_tags.map((tag: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-slate-700 text-gray-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Empty</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">Progress</p>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getStatusColor(project.status)}`}
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
                <span className="text-white font-medium text-sm">{project.progress || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="glass-card neon-glow rounded-2xl p-8">
          <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Description
          </h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {displayDescription}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <ProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProject}
        project={{
          id: project.id,
          name: project.name,
          client: project.client?.name || '',
          client_id: project.client_id,
          progress: project.progress || 0,
          status: project.status,
          dueDate: project.due_date,
          startDate: project.start_date,
          team: project.team_size || 1,
          budget: project.budget ? `${project.budget}` : '0',
          description: project.description || '',
          project_type: project.project_type,
          priority: project.priority,
          billing_type: project.billing_type,
          invoice_link: project.invoice_link,
          owner: project.owner,
          assigned_members: project.assigned_members,
          deliverables: project.deliverables,
          internal_tags: project.internal_tags,
          milestones: project.milestones,
          asset_count: project.asset_count
        }}
        mode="edit"
        currentUser={currentUser}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
