import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MagnifyingGlassIcon,
  BookmarkIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  PaperClipIcon,
  UserIcon,
  FolderIcon,
  Squares2X2Icon,
  Bars3Icon,
  VideoCameraIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { noteService, clientService, projectService, Note, Client, Project, UserRole } from '../lib/supabase';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { formatAppDate } from '../lib/dateFormat';
import { useLoadingGuard } from '../hooks/useLoadingGuard';

interface User {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
}

interface NotesProps {
  currentUser: User | null;
}

interface NoteFormData {
  title: string;
  content: string;
  category: string;
  tags: string[];
  client_id: string;
  project_id: string;
  is_shared_with_client: boolean;
  is_shared_with_admin: boolean;
  is_pinned: boolean;
  attachments: any[];
}

export default function Notes({ currentUser }: NotesProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | undefined>();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'staff';

  useLoadingGuard(loading, setLoading);

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role]);

  const loadData = async () => {
    try {
      if (notes.length === 0) {
        setLoading(true);
      }
      const notesPromise = isAdmin
        ? noteService.getAll()
        : (async () => {
          if (!currentUser?.email) return [];
          const client = await clientService.getByEmail(currentUser.email);
          if (!client?.id) return [];
          const clientNotes = await noteService.getByClient(client.id);
          return clientNotes.filter(note => note.is_shared_with_client);
        })();

      const [notesData, clientsData, projectsData] = await Promise.all([
        notesPromise,
        clientService.getAll(),
        projectService.getAll()
      ]);
      setNotes(notesData);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      if (notes.length === 0) {
        // Only wipe if we have no data to show
        // We might want to keep empty arrays if it failed initially
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    setSelectedNote(undefined);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    navigate(`/notes/${note.id}`);
  };

  const handleDeleteNote = (note: Note) => {
    setSelectedNote(note);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedNote) {
      try {
        await noteService.delete(selectedNote.id);
        await loadData();
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
      }
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await noteService.togglePin(note.id, !note.is_pinned);
      await loadData();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    const matchesClient = selectedClient === 'all' || note.client_id === selectedClient;
    const matchesProject = selectedProject === 'all' || note.project_id === selectedProject;

    return matchesSearch && matchesCategory && matchesClient && matchesProject;
  });

  const categories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = [
    { label: 'All Notes', count: notes.length, icon: UserIcon },
    { label: 'Pinned', count: notes.filter(n => n.is_pinned).length, icon: BookmarkIcon },
    { label: 'SOPs', count: notes.filter(n => n.category?.toLowerCase() === 'sop').length, icon: ClipboardDocumentCheckIcon },
    { label: 'Meetings', count: notes.filter(n => n.category?.toLowerCase() === 'meeting').length, icon: VideoCameraIcon },
  ];

  return (
    <div className="relative space-y-6 pb-20 md:pb-8">
      {/* Background Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#3aa3eb]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            NOTES
          </h1>
          <p className="text-gray-400 mt-1">Create, edit, and manage your notes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900/50 backdrop-blur-md rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#3aa3eb] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#3aa3eb] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={handleCreateNote}
              className="px-6 py-2.5 bg-transparent border border-white/20 hover:border-white/40 text-white rounded-full transition-all backdrop-blur-md hover:bg-white/5 font-medium"
            >
              New Note
            </button>
          )}
        </div>
      </div>

      {/* Filters Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search notes or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/50 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-colors appearance-none"
            >
              <option value="all">Select a note type</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-colors appearance-none"
            >
              <option value="all">Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-colors appearance-none"
            >
              <option value="all">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card rounded-2xl p-6 flex items-center gap-4 border border-white/10 hover:border-white/20 transition-all group">
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notes Grid/List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-white/5 mt-8">
          <DocumentTextIcon className="h-16 w-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No notes found matching your criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className="glass-card rounded-2xl border border-white/10 hover:border-[#3aa3eb]/30 transition-all cursor-pointer group flex flex-col p-6"
              onClick={() => handleEditNote(note)}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white truncate mb-2 group-hover:text-[#3aa3eb] transition-colors">
                      {note.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-medium">{note.client?.company || note.client?.name || 'Wise Media'}</p>
                  </div>
                  <BookmarkIcon className={`h-5 w-5 shrink-0 transition-colors ${note.is_pinned ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {note.category && (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${note.category.toLowerCase() === 'idea' || note.category.toLowerCase() === 'ideas' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      note.category.toLowerCase() === 'sop' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        note.category.toLowerCase() === 'meeting' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                      {note.category}
                    </span>
                  )}
                  {note.is_shared_with_client ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Shared
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Private
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                  {note.content.replace(/<[^>]*>/g, '')}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <FolderIcon className="h-3.5 w-3.5" />
                  {note.project?.name || 'No Project'}
                </span>
                <div className="flex items-center gap-4">
                  <span>{formatAppDate(note.updated_at)}</span>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note);
                      }}
                      className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 p-2 mt-8">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 px-8 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">
            <div className="col-span-2">Title</div>
            <div>Client</div>
            <div>Type</div>
            <div className="flex items-center gap-1">
              Last Edited <ChevronDownIcon className="h-3 w-3" />
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="grid grid-cols-5 items-center gap-4 px-6 py-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-white/5"
                onClick={() => handleEditNote(note)}
              >
                <div className="col-span-2">
                  <h3 className="text-base font-bold text-white group-hover:text-[#3aa3eb] transition-colors truncate">
                    {note.title}
                  </h3>
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {note.client?.company || note.client?.name || 'Wise Media'}
                </div>
                <div>
                  {note.category && (
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${note.category.toLowerCase() === 'idea' || note.category.toLowerCase() === 'ideas' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      note.category.toLowerCase() === 'sop' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        note.category.toLowerCase() === 'meeting' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                      {note.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm whitespace-nowrap">
                    {formatAppDate(note.updated_at)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditNote(note);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-all ml-4"
                  >
                    View Note <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
        note={selectedNote}
        mode={modalMode}
        clients={clients}
        projects={projects}
        readOnly={!isAdmin}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Note"
        message={`Are you sure you want to delete "${selectedNote?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  note?: Note;
  mode: 'create' | 'edit';
  clients: Client[];
  projects: Project[];
  readOnly?: boolean;
}

function NoteModal({ isOpen, onClose, onSave, note, mode, clients, projects, readOnly = false }: NoteModalProps) {
  const [formData, setFormData] = useState<NoteFormData>({
    title: '',
    content: '',
    category: '',
    tags: [],
    client_id: '',
    project_id: '',
    is_shared_with_client: false,
    is_shared_with_admin: false,
    is_pinned: false,
    attachments: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (note && mode === 'edit') {
      setFormData({
        title: note.title,
        content: note.content,
        category: note.category || '',
        tags: note.tags || [],
        client_id: note.client_id || '',
        project_id: note.project_id || '',
        is_shared_with_client: note.is_shared_with_client,
        is_shared_with_admin: note.is_shared_with_admin,
        is_pinned: note.is_pinned,
        attachments: note.attachments || []
      });
    } else {
      setFormData({
        title: '',
        content: '',
        category: '',
        tags: [],
        client_id: '',
        project_id: '',
        is_shared_with_client: false,
        is_shared_with_admin: false,
        is_pinned: false,
        attachments: []
      });
    }
  }, [note, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    if (isSubmitting) return;

    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const noteData: any = {
        title: formData.title.trim(),
        content: formData.content,
        category: formData.category || null,
        tags: formData.tags,
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        is_shared_with_client: formData.is_shared_with_client,
        is_shared_with_admin: formData.is_shared_with_admin,
        is_pinned: formData.is_pinned,
        attachments: formData.attachments
      };

      if (mode === 'edit' && note) {
        await noteService.update(note.id, noteData);
      } else {
        await noteService.create(noteData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString()
    }));

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const handleRemoveAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const filteredProjects = formData.client_id
    ? projects.filter(p => p.client_id === formData.client_id)
    : projects;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Note' : 'Edit Note'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="form-input w-full px-4 py-3 rounded-lg"
            placeholder="Note title..."
            required
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="form-input w-full px-4 py-3 rounded-lg min-h-[200px]"
            placeholder="Write your note here..."
            disabled={readOnly}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="form-input w-full px-4 py-3 rounded-lg"
              placeholder="Meeting, Idea, Task..."
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
              className="form-input w-full px-4 py-3 rounded-lg"
              disabled={readOnly}
            >
              <option value="">No Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
          <select
            value={formData.project_id}
            onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
            className="form-input w-full px-4 py-3 rounded-lg"
            disabled={readOnly || !formData.client_id}
          >
            <option value="">No Project</option>
            {filteredProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="form-input flex-1 px-4 py-2 rounded-lg"
              placeholder="Add tag..."
              disabled={readOnly}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary px-4 py-2 rounded-lg shrink-glow-button"
              disabled={readOnly}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-[#3aa3eb]/20 text-[#3aa3eb] rounded-lg"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-white shrink-glow-button"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Attachments</label>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={readOnly}
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center space-x-2 w-full px-4 py-3 border-2 border-dashed border-slate-700 rounded-lg transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:border-[#3aa3eb]/50 cursor-pointer'}`}
          >
            <DocumentArrowUpIcon className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400">Click to upload files</span>
          </label>
          {formData.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {formData.attachments.map((attachment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{attachment.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1 hover:bg-slate-700 rounded shrink-glow-button"
                  >
                    <XMarkIcon className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_pinned}
              onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-[#3aa3eb] rounded"
              disabled={readOnly}
            />
            <span className="text-gray-300">Pin this note</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_shared_with_client}
              onChange={(e) => setFormData(prev => ({ ...prev, is_shared_with_client: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-[#3aa3eb] rounded"
              disabled={readOnly}
            />
            <span className="text-gray-300">Share with client</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-6 py-3 rounded-xl shrink-glow-button"
            disabled={isSubmitting}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              className="btn-primary px-6 py-3 rounded-xl shrink-glow-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Note' : 'Save Changes'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
