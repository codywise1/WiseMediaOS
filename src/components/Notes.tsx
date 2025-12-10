import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  TrashIcon,
  PencilIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  PaperClipIcon,
  FunnelIcon,
  UserIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { noteService, clientService, projectService, Note, Client, Project } from '../lib/supabase';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { formatAppDate } from '../lib/dateFormat';
import { useLoadingGuard } from '../hooks/useLoadingGuard';

interface User {
  email: string;
  role: 'admin' | 'user';
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
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useLoadingGuard(loading, setLoading);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesData, clientsData, projectsData] = await Promise.all([
        noteService.getAll(),
        clientService.getAll(),
        projectService.getAll()
      ]);
      setNotes(notesData);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
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
    setSelectedNote(note);
    setModalMode('edit');
    setIsModalOpen(true);
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

    return matchesSearch && matchesCategory && matchesClient;
  });

  const categories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>
          Notes
        </h1>
        {isAdmin && (
          <button
            onClick={handleCreateNote}
            className="btn-primary flex items-center justify-center space-x-2 px-6 py-3 rounded-xl"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Note</span>
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input w-full pl-12 pr-4 py-3 rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center justify-center space-x-2 px-6 py-3 rounded-xl md:w-auto"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="form-input w-full px-4 py-3 rounded-lg"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <DocumentArrowUpIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No notes found</p>
            {isAdmin && (
              <button
                onClick={handleCreateNote}
                className="mt-4 btn-primary px-6 py-3 rounded-xl"
              >
                Create Your First Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-[#3aa3eb]/30 rounded-xl p-4 transition-all cursor-pointer group"
                onClick={() => handleEditNote(note)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate mb-1">
                      {note.title}
                    </h3>
                    {note.category && (
                      <span className="inline-block px-2 py-1 bg-[#3aa3eb]/20 text-[#3aa3eb] text-xs rounded-lg">
                        {note.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(note);
                    }}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <BookmarkIcon className={`h-5 w-5 transition-colors ${
                      note.is_pinned ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 group-hover:text-white'
                    }`} />
                  </button>
                </div>

                <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                  {note.content.replace(/<[^>]*>/g, '')}
                </p>

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-700/50 text-gray-300 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="px-2 py-1 text-gray-400 text-xs">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {note.attachments.length > 0 && (
                  <div className="flex items-center space-x-2 mb-3">
                    <PaperClipIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-slate-700/50 pt-3">
                  <div className="flex items-center space-x-3">
                    {note.client && (
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span className="truncate max-w-[100px]">
                          {note.client.company || note.client.name}
                        </span>
                      </div>
                    )}
                    {note.project && (
                      <div className="flex items-center space-x-1">
                        <FolderIcon className="h-4 w-4" />
                        <span className="truncate max-w-[100px]">
                          {note.project.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <span>{formatAppDate(note.updated_at)}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditNote(note);
                      }}
                      className="flex-1 btn-secondary text-xs py-2 rounded-lg"
                    >
                      <PencilIcon className="h-4 w-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note);
                      }}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs py-2 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
        note={selectedNote}
        mode={modalMode}
        clients={clients}
        projects={projects}
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
}

function NoteModal({ isOpen, onClose, onSave, note, mode, clients, projects }: NoteModalProps) {
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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            className="form-input w-full px-4 py-3 rounded-lg min-h-[200px]"
            placeholder="Write your note here..."
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
              className="form-input w-full px-4 py-3 rounded-lg"
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
            disabled={!formData.client_id}
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
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary px-4 py-2 rounded-lg"
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
                  className="hover:text-white"
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
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 border-2 border-dashed border-slate-700 hover:border-[#3aa3eb]/50 rounded-lg cursor-pointer transition-colors"
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
                    className="p-1 hover:bg-slate-700 rounded"
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
            />
            <span className="text-gray-300">Pin this note</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_shared_with_client}
              onChange={(e) => setFormData(prev => ({ ...prev, is_shared_with_client: e.target.checked }))}
              className="form-checkbox h-5 w-5 text-[#3aa3eb] rounded"
            />
            <span className="text-gray-300">Share with client</span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-6 py-3 rounded-xl"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary px-6 py-3 rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Note' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
