import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService, Project as ProjectType } from '../lib/supabase';
import { 
  FolderIcon, 
  CalendarIcon, 
  UserGroupIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';

interface User {
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface ProjectsProps {
  currentUser: User | null;
}

interface Project extends Omit<ProjectType, 'budget' | 'due_date' | 'team_size' | 'id'> {
  id: string;
  budget: string;
  dueDate: string;
  team: number;
  color: string;
}

const kanbanColumns = [
  { id: 'planning', title: 'Planning', color: 'bg-[#3aa3eb]' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-[#3aa3eb]' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
  { id: 'on_hold', title: 'On Hold', color: 'bg-red-500' }
];

export default function Projects({ currentUser }: ProjectsProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  React.useEffect(() => {
    loadProjects();
  }, [currentUser]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      let data: ProjectType[] = [];
      
      if (currentUser?.role === 'admin') {
        data = await projectService.getAll();
      } else if (currentUser?.id) {
        // For clients, get projects assigned to them
        data = await projectService.getByClientId(currentUser.id);
      }
      
      // Transform data to match component interface
      const transformedProjects: Project[] = data.map(project => ({
        ...project,
        id: project.id,
        client: project.client?.name || 'Unknown Client',
        budget: project.budget ? `$${project.budget.toLocaleString()}` : '$0',
        dueDate: project.due_date || '',
        team: project.team_size || 1,
        color: getStatusColor(project.status)
      }));
      
      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
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

  const handleViewProject = (project: Project) => {
    console.log(`Viewing project details for: ${project.name}`);
    // In a real app, this would navigate to a detailed project view
    alert(`Viewing project: ${project.name}\nClient: ${project.client}\nStatus: ${project.status}\nProgress: ${project.progress}%`);
  };

  const handleSaveProject = (projectData: any) => {
    const saveProject = async () => {
      try {
        // Transform data for API
        const apiData = {
          name: projectData.name,
          client_id: projectData.client_id,
          description: projectData.description,
          status: projectData.status.toLowerCase().replace(' ', '_'),
          progress: projectData.progress,
          budget: parseInt(projectData.budget.replace(/[$,]/g, '')),
          due_date: projectData.dueDate,
          team_size: projectData.team
        };

        if (modalMode === 'create') {
          await projectService.create(apiData);
        } else if (selectedProject) {
          await projectService.update(selectedProject.id, apiData);
        }
        
        // Reload projects
        await loadProjects();
      } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving project. Please try again.');
      }
    };
    
    saveProject();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-[#3aa3eb]';
      case 'in_progress': return 'bg-[#3aa3eb]';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-red-500';
      default: return 'bg-[#3aa3eb]';
    }
  };

  const moveProject = (projectId: string, newStatus: string) => {
    const updateProject = async () => {
      try {
        // Update the project in the local state immediately for better UX
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p.id === projectId
              ? { ...p, status: newStatus, color: getStatusColor(newStatus) }
              : p
          )
        );

        // Then update in the backend
        await projectService.update(projectId, { status: newStatus });
        await loadProjects();
      } catch (error) {
        console.error('Error updating project status:', error);
        // Reload projects to revert the optimistic update on error
        await loadProjects();
      }
    };
    
    updateProject();
  };

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    if (!isAdmin) return;

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
    target.style.opacity = '1';

    setDraggedProject(null);
    setDragOverColumn(null);
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

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    setDragOverColumn(null);

    const draggedId = e.dataTransfer.getData('text/plain');
    const project = projects.find(p => p.id === draggedId);
    
    if (project && project.status !== columnId) {
      moveProject(draggedId, columnId);
    }
  };
  const isAdmin = currentUser?.role === 'admin';
  
  // All projects are already filtered by loadProjects based on user role
  const visibleProjects = projects;


  const getProjectsByStatus = (status: string) => {
    return visibleProjects.filter(p => p.status === status);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card neon-glow rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>Projects</h1>
            <p className="text-gray-300">Manage and track all your active projects</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleNewProject}
              className="btn-primary text-white font-medium flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5 text-white" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <FolderIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Total Projects</p>
              <p className="text-2xl font-bold text-white">{visibleProjects.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Completed</p>
              <p className="text-2xl font-bold text-white">{getProjectsByStatus('completed').length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">In Progress</p>
              <p className="text-2xl font-bold text-white">{getProjectsByStatus('in_progress').length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-[#3aa3eb]">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">Team Members</p>
              <p className="text-2xl font-bold text-white">{visibleProjects.reduce((sum, p) => sum + p.team, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {kanbanColumns.map((column) => (
            <div
              key={column.id}
              className={`glass-card rounded-xl p-4 min-h-[500px] transition-all duration-300 ${
                dragOverColumn === column.id
                  ? 'border-2 border-blue-400 bg-blue-500/10 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                  : 'border-2 border-slate-700/50'
              }`}
              onDragOver={isAdmin ? (e) => handleDragOver(e, column.id) : undefined}
              onDragLeave={isAdmin ? handleDragLeave : undefined}
              onDrop={isAdmin ? (e) => handleDrop(e, column.id) : undefined}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                  {column.title}
                </h3>
                <span className="text-sm text-gray-400">({getProjectsByStatus(column.id).length})</span>
              </div>
              
              <div className="space-y-4">
                {getProjectsByStatus(column.id).map((project) => (
                  <div
                    key={project.id}
                    className={`bg-slate-800/50 rounded-lg p-4 transition-all duration-200 ${
                      isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                    } ${
                      draggedProject?.id === project.id
                        ? 'opacity-40 scale-95 shadow-none'
                        : 'border-2 border-slate-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02]'
                    }`}
                    draggable={isAdmin}
                    onDragStart={isAdmin ? (e) => handleDragStart(e, project) : undefined}
                    onDragEnd={isAdmin ? handleDragEnd : undefined}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-sm">{project.name}</h4>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleViewProject(project)}
                          className="text-white hover:text-blue-300 p-1"
                          title="View Project"
                        >
                          <EyeIcon className="h-4 w-4 text-white" />
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => handleEditProject(project)}
                              className="text-blue-500 hover:text-white p-1"
                              title="Edit Project"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(project)}
                              className="text-blue-500 hover:text-red-400 p-1"
                              title="Delete Project"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-xs mb-2">{project.client}</p>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{project.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${project.color}`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserGroupIcon className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-gray-400">{project.team}</span>
                      </div>
                      <span className="text-xs font-medium text-green-400">{project.budget}</span>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <span className="text-xs text-gray-400">Due: {project.dueDate}</span>
                    </div>
                  </div>
                ))}
                
                {getProjectsByStatus(column.id).length === 0 && (
                  <div className={`text-center py-12 rounded-lg border-2 border-dashed transition-all duration-300 ${
                    dragOverColumn === column.id
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
    </div>
  );
}