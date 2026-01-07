import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  Squares2X2Icon,
  Bars3Icon,
  PlusIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  noteService,
  clientService,
  projectService,
  Note,
  Client,
  Project,
  UserRole,
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
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

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
    const matchesPinnedFilter = !showPinnedOnly || note.pinned;

    return matchesSearch && matchesCategory && matchesClient && matchesProject && matchesVisibility && matchesPinnedFilter;
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const regularNotes = filteredNotes.filter(n => !n.pinned);

  const linkedClients = useMemo(() => {
    const clientIds = new Set(notes.map(n => n.clientId).filter(Boolean));
    return clients.filter(client => clientIds.has(client.id));
  }, [notes, clients]);

  const linkedProjects = useMemo(() => {
    const projectIds = new Set(notes.map(n => n.projectId).filter(Boolean));
    return projects.filter(project => projectIds.has(project.id));
  }, [notes, projects]);

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
    setShowPinnedOnly(false);
  };

  if (loading) return null;

  const stats = [
    { label: 'All Notes', count: notes.length, icon: DocumentTextIcon, color: 'text-[#3aa3eb]' },
    { label: 'Pinned', count: notes.filter(n => n.pinned).length, icon: BookmarkIcon, color: 'text-yellow-400' },
    { label: 'SOPs', count: notes.filter(n => n.category === 'sop').length, icon: ClipboardDocumentCheckIcon, color: 'text-emerald-400' },
    { label: 'Meetings', count: notes.filter(n => n.category === 'meeting').length, icon: VideoCameraIcon, color: 'text-indigo-400' }
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header and Filters Section */}
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>NOTES</h1>
            <p className="text-gray-300">Intelligence Layer of Wise Media Agency Wide</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
            <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#3aa3eb] text-white' : 'text-gray-400 hover:text-white'} shrink-glow-button`}
                title="Grid View"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-[#3aa3eb] text-white' : 'text-gray-400 hover:text-white'} shrink-glow-button`}
                title="List View"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handleCreateNote}
              className="btn-primary text-white font-medium flex items-center space-x-2 shrink-glow-button shrink-0"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Note</span>
            </button>
          </div>
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
          clients={linkedClients}
          projects={linkedProjects}
          onReset={resetFilters}
          resultsCount={filteredNotes.length}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const isActive =
            (stat.label === 'All Notes' && selectedCategory === 'all' && !showPinnedOnly) ||
            (stat.label === 'Pinned' && showPinnedOnly) ||
            (stat.label === 'SOPs' && selectedCategory === 'sop') ||
            (stat.label === 'Meetings' && selectedCategory === 'meeting');

          return (
            <div
              key={idx}
              onClick={() => {
                if (stat.label === 'Pinned') {
                  setShowPinnedOnly(true);
                  setSelectedCategory('all');
                } else if (stat.label === 'All Notes') {
                  setShowPinnedOnly(false);
                  setSelectedCategory('all');
                } else if (stat.label === 'SOPs') {
                  setShowPinnedOnly(false);
                  setSelectedCategory('sop');
                } else if (stat.label === 'Meetings') {
                  setShowPinnedOnly(false);
                  setSelectedCategory('meeting');
                }
              }}
              className={`glass-card rounded-xl p-6 cursor-pointer transition-all duration-300 ${isActive
                ? 'border-[#3aa3eb] shadow-[0_0_15px_rgba(58,163,235,0.3)] ring-1 ring-[#3aa3eb]'
                : 'hover-glow border-white/10'
                }`}
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${isActive ? 'bg-[#3aa3eb]' : 'bg-[#3aa3eb]/20'}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-white font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Integral CF, sans-serif' }}>{stat.count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
            className="flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase tracking-widest group"
          >
            <BookmarkIcon className="h-4 w-4 fill-yellow-500" />
            <span style={{ fontFamily: 'Integral CF, sans-serif' }}>Pinned Notes ({pinnedNotes.length})</span>
            {isPinnedExpanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
          </button>

          {isPinnedExpanded && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-8 py-4 bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>Title</span>
                  <span>Client</span>
                  <span className="text-center">Type</span>
                  <span className="text-center">Last Edited</span>
                  <span className="text-right pr-8">Action</span>
                </div>
                <div className="divide-y divide-white/5">
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
              </div>
            )
          )}
          <div className="h-px bg-white/5 w-full mt-8" />
        </div>
      )}

      {/* Main List */}
      {regularNotes.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-8 py-4 bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span>Title</span>
              <span>Client</span>
              <span className="text-center">Type</span>
              <span className="text-center">Last Edited</span>
              <span className="text-right pr-8">Action</span>
            </div>
            <div className="divide-y divide-white/5">
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
          </div>
        )
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card rounded-3xl p-20 text-center border border-white/10">
          <DocumentTextIcon className="h-16 w-16 text-gray-700 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>No notes found</h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">We couldn't find any notes matching your filters. Try adjusting your search or create a new note.</p>
          <button
            onClick={resetFilters}
            className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white tracking-widest hover:bg-white/10 transition-all"
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
        message={`Are you sure you want to delete "${selectedNote?.title}" ? This will remove all associated blocks and data.`}
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
  const categoryConfigs: Record<string, { bg: string, border: string, text: string, label: string }> = {
    idea: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'Idea' },
    meeting: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'Meeting' },
    sales_call: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'Sales Call' },
    sop: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'SOP' },
    task: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'Task' },
    general: { bg: 'rgba(59, 163, 234, 0.33)', border: 'rgba(59, 163, 234, 1)', text: '#ffffff', label: 'General' }
  };

  const config = categoryConfigs[note.category] || categoryConfigs.general;

  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onEdit(note)}
        className="glass-card rounded-2xl border border-white/10 hover:border-[#3aa3eb]/30 transition-all cursor-pointer group flex flex-col p-6 h-full relative overflow-hidden"
      >

        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="text-xl font-bold text-white truncate mb-1 group-hover:text-[#3aa3eb] transition-colors" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {note.title}
              </h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                {note.client?.name || 'Internal Record'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => onTogglePin(e, note)}
                className={`p-1 transition-colors ${note.pinned ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
              >
                <BookmarkIcon className={`h-5 w-5 ${note.pinned ? 'fill-yellow-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: config.bg,
                border: `1px solid ${config.border} `,
                color: config.text
              }}
            >
              {config.label}
            </span>
            {note.visibility === 'client_visible' && (
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.33)',
                  border: '1px solid rgba(16, 185, 129, 1)',
                  color: '#ffffff'
                }}
              >
                Shared
              </span>
            )}
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
            {note.plainText || 'No preview available...'}
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span>Last Edited: {formatAppDate(note.updated_at)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note); }}
            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
            title="Delete Note"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onEdit(note)}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-8 py-6 hover:bg-white/[0.03] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={(e) => onTogglePin(e, note)}
          className={`shrink-0 transition-colors ${note.pinned ? 'text-yellow-400' : 'text-gray-800 group-hover:text-gray-600'}`}
        >
          <BookmarkIcon className={`h-4 w-4 ${note.pinned ? 'fill-yellow-400' : ''}`} />
        </button>
        <h3 className="text-sm font-bold text-white group-hover:text-[#3aa3eb] transition-colors truncate" style={{ fontFamily: 'Integral CF, sans-serif' }}>
          {note.title}
        </h3>
      </div>

      <div className="text-sm text-gray-400 font-medium truncate">
        {note.client?.name || 'Wise Media'}
      </div>

      <div className="flex items-center justify-center">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
          style={{
            backgroundColor: config.bg,
            border: `1px solid ${config.border}`,
            color: config.text
          }}
        >
          {config.label}
        </span>
      </div>

      <div className="text-sm text-gray-400 font-medium text-center">
        {formatAppDate(note.updated_at)}
      </div>

      <div className="flex items-center justify-end gap-3 px-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(note); }}
          className="shrink-glow-button px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-bold text-white transition-all flex items-center gap-2"
        >
          <span>View Note</span>
          <EyeIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note); }}
          className="p-2 hover:bg-red-500/20 text-gray-700 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
