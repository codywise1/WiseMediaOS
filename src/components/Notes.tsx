import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  DocumentTextIcon,
  Squares2X2Icon,
  Bars3Icon,
  PlusIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  EyeIcon,
  FolderIcon,
  UserIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import {
  noteService,
  clientService,
  projectService,
  Note,
  Client,
  Project,
  UserRole,
  NoteCategory
} from '../lib/supabase';
import ConfirmDialog from './ConfirmDialog';
import { formatAppDate } from '../lib/dateFormat';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import { useDebounce } from '../hooks/useDebounce';
import NoteSearchFilters from './notes/NoteSearchFilters';
import CreateEditNoteModal from './notes/CreateEditNoteModal';

interface User {
  id?: string;
  email: string;
  role: UserRole;
  name: string;
}

interface NotesProps {
  currentUser: User | null;
}

export default function Notes({ currentUser }: NotesProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // View & Filters State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const isAdminOrStaff = currentUser?.role === 'admin' || currentUser?.role === 'staff';

  useLoadingGuard(loading, setLoading);

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role]);

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

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !debouncedSearch ||
      note.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      note.plainText?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    const matchesClient = selectedClient === 'all' || note.clientId === selectedClient;
    const matchesProject = selectedProject === 'all' || note.projectId === selectedProject;
    const matchesVisibility = selectedVisibility === 'all' || note.visibility === selectedVisibility;

    return matchesSearch && matchesCategory && matchesClient && matchesProject && matchesVisibility;
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const regularNotes = filteredNotes.filter(n => !n.pinned);

  const handleCreateNote = () => {
    setSelectedNote(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    // Navigate to detail for full editing experience
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
      }
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await noteService.togglePin(note.id, !note.pinned);
      await loadData();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedClient('all');
    setSelectedProject('all');
    setSelectedVisibility('all');
  };

  if (loading) return null;

  const stats = [
    { label: 'Intelligence', count: notes.length, icon: DocumentTextIcon, color: 'text-[#3aa3eb]' },
    { label: 'Pinned', count: notes.filter(n => n.pinned).length, icon: BookmarkIcon, color: 'text-yellow-400' },
    { label: 'Meetings', count: notes.filter(n => n.category === 'meeting').length, icon: VideoCameraIcon, color: 'text-indigo-400' },
    { label: 'SOPs', count: notes.filter(n => n.category === 'sop').length, icon: ClipboardDocumentCheckIcon, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight font-display">
            NOTES
          </h1>
          <p className="text-gray-400 mt-1 uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
            Intelligence Layer <span className="w-1.5 h-1.5 rounded-full bg-[#3aa3eb] animate-pulse" /> Agency Wide
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#3aa3eb] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#3aa3eb] text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleCreateNote}
            className="btn-primary shrink-glow-button px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Note
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card rounded-2xl p-6 border border-white/5 flex items-center gap-4 group">
            <div className={`h-12 w-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <NoteSearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={selectedCategory}
        onCategoryChange={setSelectedCategory}
        clientId={selectedClient}
        onClientChange={setSelectedClient}
        projectId={selectedProject}
        onProjectChange={setSelectedProject}
        visibility={selectedVisibility}
        onVisibilityChange={setSelectedVisibility}
        clients={clients}
        projects={projects}
        onReset={resetFilters}
        resultsCount={filteredNotes.length}
      />

      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
            className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest group"
          >
            <BookmarkIcon className="h-4 w-4 fill-yellow-500" />
            Pinned Notes ({pinnedNotes.length})
            {isPinnedExpanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
          </button>

          {isPinnedExpanded && (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-1"}>
              {pinnedNotes.map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  viewMode={viewMode}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
          <div className="h-px bg-white/5 w-full mt-8" />
        </div>
      )}

      {/* Main List */}
      {regularNotes.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-1"}>
          {regularNotes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              viewMode={viewMode}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card rounded-3xl p-20 text-center border border-white/10">
          <DocumentTextIcon className="h-16 w-16 text-gray-700 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">No notes found</h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">We couldn't find any notes matching your filters. Try adjusting your search or create a new note.</p>
          <button
            onClick={resetFilters}
            className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Clear All Filters
          </button>
        </div>
      ) : null}

      {/* Modals */}
      <CreateEditNoteModal
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
        title="Delete Intelligence Record"
        message={`Are you sure you want to delete "${selectedNote?.title}"? This will remove all associated blocks and data.`}
      />
    </div>
  );
}

function NoteItem({ note, viewMode, onEdit, onDelete, onTogglePin }: {
  note: Note;
  viewMode: 'grid' | 'list';
  onEdit: (n: Note) => void;
  onDelete: (n: Note) => void;
  onTogglePin: (e: React.MouseEvent, n: Note) => void;
}) {
  const categoryStyles: Record<string, string> = {
    idea: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    meeting: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    sales_call: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    sop: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    task: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    general: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const style = categoryStyles[note.category] || categoryStyles.general;

  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onEdit(note)}
        className="glass-card rounded-2xl border border-white/10 hover:border-[#3aa3eb]/30 transition-all cursor-pointer group flex flex-col p-6 h-full relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note); }}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="text-xl font-bold text-white truncate mb-1 group-hover:text-[#3aa3eb] transition-colors">
                {note.title}
              </h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                {note.client?.name || 'Internal Record'}
              </p>
            </div>
            <button
              onClick={(e) => onTogglePin(e, note)}
              className={`p-1 transition-colors ${note.pinned ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <BookmarkIcon className={`h-5 w-5 ${note.pinned ? 'fill-yellow-400' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${style}`}>
              {note.category}
            </span>
            {note.visibility === 'client_visible' && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                Shared
              </span>
            )}
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
            {note.plainText || 'No preview available...'}
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <FolderIcon className="h-3.5 w-3.5" />
            {note.project?.name || 'No Project'}
          </span>
          <span>{formatAppDate(note.updated_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onEdit(note)}
      className="grid grid-cols-6 items-center gap-4 px-6 py-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-white/5"
    >
      <div className="col-span-2 flex items-center gap-3 min-w-0">
        <button
          onClick={(e) => onTogglePin(e, note)}
          className={`shrink-0 transition-colors ${note.pinned ? 'text-yellow-400' : 'text-gray-800 group-hover:text-gray-600'}`}
        >
          <BookmarkIcon className={`h-4 w-4 ${note.pinned ? 'fill-yellow-400' : ''}`} />
        </button>
        <h3 className="text-base font-bold text-white group-hover:text-[#3aa3eb] transition-colors truncate">
          {note.title}
        </h3>
      </div>
      <div className="text-gray-400 text-xs font-bold uppercase tracking-widest truncate">
        {note.client?.name || 'Wise Media'}
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${style}`}>
          {note.category}
        </span>
      </div>
      <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
        {formatAppDate(note.updated_at)}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note); }}
          className="p-2 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        <button
          className="px-4 py-2 bg-white/5 hover:bg-[#3aa3eb] border border-white/10 hover:border-[#3aa3eb] rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all whitespace-nowrap"
        >
          Open Details
        </button>
      </div>
    </div>
  );
}
