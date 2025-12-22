import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseAvailable, noteService, projectService, supabase, UserRole } from '../lib/supabase';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
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
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [directMessage, setDirectMessage] = useState('');
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);

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
        if (!isSupabaseAvailable()) {
          setNotes([
            {
              id: 'mock-note-1',
              title: `${foundProject?.client?.name || 'Client'} Website Call`,
              category: 'Meeting',
              content: 'Cover Page, Logo centered, Tagline: "Brand. Website. System"\nReal Estate OS, Target: Developers, STR operators',
              updated_at: new Date().toISOString(),
            },
            {
              id: 'mock-note-2',
              title: `${foundProject?.client?.name || 'Client'} Discovery Call`,
              category: 'Meeting',
              content: 'Cover Page, Logo centered, Tagline: "Brand. Website. System"\nReal Estate OS, Target: Developers, STR operators',
              updated_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ]);
        } else {
          try {
            const notesData = await noteService.getByProject(id!);
            setNotes(notesData);
          } catch (error) {
            console.error('Error loading notes:', error);
            setNotes([]);
          }
        }
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
        asset_count: projectData.asset_count || 0,
        income_balance: projectData.income_balance || 0
      };

      await projectService.update(id!, apiData);
      await loadProject();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project. Please try again.');
    }
  };

  const handleSendDirectMessage = async () => {
    const message = directMessage.trim();
    if (!message) return;

    try {
      setSendingDirectMessage(true);

      if (!isSupabaseAvailable()) {
        setDirectMessage('');
        setIsMessageModalOpen(false);
        alert('Demo mode: message sent.');
        return;
      }

      if (!profile?.id) {
        alert('Cannot send message: your profile is not available.');
        return;
      }

      const clientEmail = project?.client?.email;
      if (!clientEmail) {
        alert('Cannot send message: client email is missing.');
        return;
      }

      const { data: recipientProfile } = await supabase!
        .from('profiles')
        .select('id')
        .eq('email', clientEmail)
        .maybeSingle();

      if (!recipientProfile?.id) {
        alert(`Cannot send message: ${project?.client?.name || 'client'} hasn't created their account yet.`);
        return;
      }

      const { error } = await supabase!
        .from('private_messages')
        .insert({
          sender_id: profile.id,
          recipient_id: recipientProfile.id,
          message,
        });

      if (error) throw error;

      setDirectMessage('');
      setIsMessageModalOpen(false);
    } catch (error) {
      console.error('Error sending direct message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingDirectMessage(false);
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

  const formatStatusLabel = (status: unknown) => {
    const value = typeof status === 'string' ? status : '';
    return value.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    return formatAppDate(dateString);
  };

  const formatRangeDate = (start?: string, end?: string) => {
    const formatShort = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    const startLabel = start ? formatShort(start) : '';
    const endLabel = end ? formatShort(end) : '';
    if (!startLabel && !endLabel) return '—';
    if (startLabel && !endLabel) return startLabel;
    if (!startLabel && endLabel) return endLabel;
    return `${startLabel} - ${endLabel}`;
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

  const fallbackNotes = [
    {
      id: 'fallback-note-1',
      title: `${project?.client?.name || 'Client'} Website Call`,
      category: 'Meeting',
      content: 'Cover Page, Logo centered, Tagline: "Brand. Website. System"\nReal Estate OS, Target: Developers, STR operators',
    },
    {
      id: 'fallback-note-2',
      title: `${project?.client?.name || 'Client'} Discovery Call`,
      category: 'Meeting',
      content: 'Cover Page, Logo centered, Tagline: "Brand. Website. System"\nReal Estate OS, Target: Developers, STR operators',
    },
  ];

  const notesToRender = (notes && notes.length > 0 ? notes : fallbackNotes).slice(0, 4);

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
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 min-w-0 truncate" style={{ fontFamily: 'Integral CF, sans-serif' }}>
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-gray-400 min-w-0">
              <span className="flex items-center space-x-2 min-w-0">
                <BuildingOfficeIcon className="h-4 w-4" />
                <span className="min-w-0 truncate">{project.client?.name || 'Unknown Client'}</span>
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-200 shrink-0">
                {project.project_type || 'Website'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={() => setIsMessageModalOpen(true)}
              className="px-4 py-2 glass-card hover:bg-blue-500/10 rounded-full transition-all flex items-center space-x-2"
              title="Message"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-200" />
              <span className="text-sm text-gray-100">Message</span>
            </button>
            <button
              onClick={() => navigate(`/community/chat?clientId=${project.client_id}`)}
              className="px-4 py-2 glass-card hover:bg-blue-500/10 rounded-full transition-all flex items-center space-x-2"
              title="Open Chat"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-200" />
              <span className="text-sm text-gray-100">Open Chat</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={handleEditProject}
                  className="p-2 glass-card hover:bg-blue-500/20 rounded-lg transition-all shrink-0"
                  title="Edit Project"
                >
                  <PencilIcon className="h-5 w-5 text-blue-400" />
                </button>
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="p-2 glass-card hover:bg-red-500/20 rounded-lg transition-all shrink-0"
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
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
          Project Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <FlagIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p className="text-white font-medium">{formatStatusLabel(project.status)}</p>
              <p className="text-xs text-gray-500 mt-1">{project.due_date ? `Due ${formatDate(project.due_date)}` : 'No due date'}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-2">Progress</p>
              <div className="flex items-center gap-3">
                <div className="w-full bg-slate-700 rounded-full h-2 flex-1">
                  <div
                    className={`h-2 rounded-full ${getStatusColor(project.status)}`}
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
                <span className="text-white font-medium text-sm shrink-0">{project.progress || 0}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{project.progress || 0}% completed</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <CurrencyDollarIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Value</p>
              <p className="text-white font-medium text-lg">${(project.budget || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{project.billing_type || 'Fixed'}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <CalendarIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Timeline</p>
              <p className="text-white font-medium">{formatRangeDate(project.start_date, project.due_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <FlagIcon className="h-6 w-6 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Priority</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium text-white ${getPriorityColor(project.priority)} break-words`}>
                {project.priority || 'Medium'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
            <UserIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 mb-1">Assigned Owner</p>
              <p className="text-white font-medium min-w-0 truncate">{project.owner || currentUser?.name || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
          Notes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notesToRender.map((note: any) => (
            <div key={note.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
                <p className="text-white font-bold min-w-0 truncate" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                  {note.title}
                </p>
                {note.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-gray-200 shrink-0">
                    {note.category}
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {(note.content || '').length > 160 ? `${note.content.slice(0, 160)}...` : (note.content || '')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
          <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Integral CF, sans-serif' }}>
            Description
          </h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
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
          asset_count: project.asset_count,
          income_balance: project.income_balance
        }}
        mode="edit"
        currentUser={
          currentUser
            ? { role: currentUser.role === 'admin' ? 'admin' : 'user', name: currentUser.name }
            : null
        }
      />

      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => {
          if (sendingDirectMessage) return;
          setIsMessageModalOpen(false);
        }}
        title={`Message ${project?.client?.name || 'Client'}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <textarea
            value={directMessage}
            onChange={(e) => setDirectMessage(e.target.value)}
            rows={5}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Write a direct message..."
            disabled={sendingDirectMessage}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setIsMessageModalOpen(false)}
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-white transition-colors"
              disabled={sendingDirectMessage}
            >
              Cancel
            </button>
            <button
              onClick={handleSendDirectMessage}
              className="px-4 py-2 rounded-lg bg-[#3aa3eb] hover:bg-[#2b8dd0] text-white transition-colors disabled:opacity-60"
              disabled={sendingDirectMessage || !directMessage.trim()}
            >
              {sendingDirectMessage ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>

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
