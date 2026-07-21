import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, Pin, Trash2, Share2, Lock, FileText, Lightbulb, Calendar,
  Phone, ClipboardList, CheckSquare, X, Tag, ChevronDown, Inbox, Star,
  Pencil, ArrowLeft, Folder as FolderIcon, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { noteService, Note, NoteCategory, NoteBlock, UserRole } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate } from '../lib/dateFormat';

interface AppleNotesProps {
  currentUser: { id?: string; email: string; role: UserRole; name: string } | null;
}

type Folder = 'all' | 'pinned' | NoteCategory | 'shared';

const BRAND = '#3aa3eb';

const FOLDER_META: Record<Folder, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  all: { label: 'All Notes', icon: Inbox, color: 'text-[#3aa3eb]', bg: 'bg-[#3aa3eb]/10' },
  pinned: { label: 'Pinned', icon: Star, color: 'text-[#3aa3eb]', bg: 'bg-[#3aa3eb]/10' },
  general: { label: 'General', icon: FileText, color: 'text-gray-400', bg: 'bg-white/5' },
  idea: { label: 'Ideas', icon: Lightbulb, color: 'text-[#3aa3eb]', bg: 'bg-[#3aa3eb]/10' },
  meeting: { label: 'Meetings', icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  sales_call: { label: 'Sales Calls', icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  sop: { label: 'SOPs', icon: ClipboardList, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  task: { label: 'Tasks', icon: CheckSquare, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  shared: { label: 'Shared', icon: Share2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const CATEGORY_EMOJI: Record<NoteCategory, string> = {
  general: '📝', idea: '💡', meeting: '🗓️', sales_call: '📞', sop: '📋', task: '✅',
};

type MobilePanel = 'folders' | 'list' | 'editor';

export default function AppleNotes({ currentUser }: AppleNotesProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<Folder>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');

  // Collapsible folder sidebar (desktop)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Editor state (inline, auto-save)
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await noteService.getAll();
      setNotes(data);
    } catch (e) {
      console.error('Error loading notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  // Only re-sync editor fields when the *note id* changes — NOT on updated_at.
  // Re-syncing after auto-save would reset the textarea value and cause the
  // cursor/scroll to jump ("goes down a bit" glitch).
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      const blockContent = Array.isArray(selectedNote.content)
        ? selectedNote.content
            .map((b) => b.content || b.items?.join('\n') || b.todos?.map((t) => `${t.done ? '[x]' : '[ ]'} ${t.text}`).join('\n') || '')
            .join('\n\n')
        : (selectedNote.content as string) || selectedNote.plainText || '';
      setBody(blockContent);
      setCategory(selectedNote.category);
      setTags(selectedNote.tags || []);
      setPinned(selectedNote.pinned);
      setIsShared(selectedNote.is_shared_with_client);
      setSaveState('idle');
    } else {
      setTitle(''); setBody(''); setCategory('general'); setTags([]);
      setPinned(false); setIsShared(false); setSaveState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (activeFolder === 'pinned') result = result.filter((n) => n.pinned);
    else if (activeFolder === 'shared') result = result.filter((n) => n.is_shared_with_client);
    else if (activeFolder !== 'all') result = result.filter((n) => n.category === activeFolder);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) ||
          n.plainText?.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, activeFolder, searchQuery]);

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const handleNewNote = async () => {
    try {
      const newNote = await noteService.create({
        title: 'New Note', content: [{ id: '1', type: 'paragraph', content: '' }] as NoteBlock[],
        plainText: '', category: 'general', tags: [], pinned: false,
        visibility: 'internal', is_shared_with_client: false, attachments: [],
      } as any);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setMobilePanel('editor');
      setTitle('New Note'); setBody(''); setCategory('general');
      setTags([]); setPinned(false); setIsShared(false);
    } catch (e) {
      console.error('Error creating note:', e);
      toastError('Failed to create note.');
    }
  };

  // Auto-save — debounced. Only fires on content change, NOT on note metadata
  // reload, so saving never re-triggers a body reset.
  useEffect(() => {
    if (!selectedNoteId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        const plainText = body.slice(0, 1000);
        const blocks: NoteBlock[] = body
          .split('\n')
          .map((line, i) => ({ id: `${i + 1}`, type: 'paragraph', content: line } as NoteBlock));
        await noteService.update(selectedNoteId, {
          title: title || 'Untitled', content: blocks, plainText, category, tags, pinned,
        } as any);
        setSaveState('saved');
        // Update local notes WITHOUT changing updated_at in a way that
        // re-syncs the editor (we depend on selectedNoteId only).
        setNotes((prev) => prev.map((n) =>
          n.id === selectedNoteId
            ? { ...n, title: title || 'Untitled', content: blocks, plainText, category, tags, pinned, updated_at: new Date().toISOString() }
            : n
        ));
        setTimeout(() => setSaveState('idle'), 1500);
      } catch (e) {
        console.error('Auto-save error:', e);
        setSaveState('idle');
      }
    }, 900);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, category, tags, pinned, selectedNoteId]);

  const handleTogglePin = async () => {
    if (!selectedNoteId) return;
    const newPinned = !pinned;
    setPinned(newPinned);
    try {
      await noteService.togglePin(selectedNoteId, newPinned);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? { ...n, pinned: newPinned } : n)));
    } catch (e) { console.error(e); }
  };

  const handleToggleShare = async () => {
    if (!selectedNoteId) return;
    const newShared = !isShared;
    setIsShared(newShared);
    try {
      await noteService.toggleShare(selectedNoteId, newShared);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? { ...n, is_shared_with_client: newShared } : n)));
      toastSuccess(newShared ? 'Note shared with client.' : 'Note unshared.');
    } catch (e) {
      console.error(e);
      toastError('Failed to update share status.');
    }
  };

  const handleDelete = async () => {
    if (!selectedNoteId || !confirm('Delete this note? This cannot be undone.')) return;
    try {
      await noteService.delete(selectedNoteId);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId));
      setSelectedNoteId(null);
      setMobilePanel('list');
      toastSuccess('Note deleted.');
    } catch (e) {
      console.error(e);
      toastError('Failed to delete note.');
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const folders: Folder[] = ['all', 'pinned', 'general', 'idea', 'meeting', 'sales_call', 'sop', 'task', 'shared'];

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts.all = notes.length;
    counts.pinned = notes.filter((n) => n.pinned).length;
    counts.shared = notes.filter((n) => n.is_shared_with_client).length;
    (['general', 'idea', 'meeting', 'sales_call', 'sop', 'task'] as NoteCategory[]).forEach((cat) => {
      counts[cat] = notes.filter((n) => n.category === cat).length;
    });
    return counts;
  }, [notes]);

  const selectNote = (id: string) => {
    setSelectedNoteId(id);
    setMobilePanel('editor');
  };

  const selectFolder = (folder: Folder) => {
    setActiveFolder(folder);
    setShowFolderMenu(false);
    setMobilePanel('list');
  };

  const renderNoteList = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/10 border-t-[#3aa3eb]" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <FileText size={32} className="text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 font-medium">{searchQuery ? 'No results found' : 'No notes here yet'}</p>
          {!searchQuery && (
            <button onClick={handleNewNote} className="mt-4 flex items-center gap-1.5 text-xs text-[#3aa3eb] hover:text-[#59a1e5] font-medium">
              <Plus size={14} /> Create your first note
            </button>
          )}
        </div>
      ) : (
        <div>
          {pinnedNotes.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                <Pin size={11} className="text-[#3aa3eb]" fill="currentColor" />
                <span className="text-[11px] font-bold text-[#3aa3eb]/70 uppercase tracking-widest">Pinned</span>
              </div>
              {pinnedNotes.map((note) => (
                <NoteRow key={note.id} note={note} selectedNoteId={selectedNoteId} onSelect={selectNote} />
              ))}
            </div>
          )}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">All Notes</span>
                </div>
              )}
              {unpinnedNotes.map((note) => (
                <NoteRow key={note.id} note={note} selectedNoteId={selectedNoteId} onSelect={selectNote} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderFolderSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 hidden sm:flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Folders</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
          title="Collapse folders"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5 min-h-0">
        {folders.map((folder) => {
          const meta = FOLDER_META[folder];
          const isActive = activeFolder === folder;
          return (
            <button
              key={folder}
              onClick={() => selectFolder(folder)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive ? `${meta.bg} text-white` : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <meta.icon size={16} className={`shrink-0 ${isActive ? meta.color : 'text-gray-500'}`} />
              <span className="truncate flex-1 text-left">{meta.label}</span>
              {folderCounts[folder] > 0 && (
                <span className={`text-xs ${isActive ? 'text-white/60' : 'text-gray-600'}`}>{folderCounts[folder]}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] text-sm font-semibold transition-colors border border-[#3aa3eb]/20"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="flex-1 flex flex-col min-w-0 h-full min-h-0">
      {!selectedNoteId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-3xl bg-[#3aa3eb]/10 flex items-center justify-center mb-5 border border-[#3aa3eb]/20">
            <FileText size={36} className="text-[#3aa3eb]/60" />
          </div>
          <h2 className="text-xl font-semibold text-gray-400">No Note Selected</h2>
          <p className="text-sm text-gray-600 mt-1.5 max-w-xs leading-relaxed">
            Select a note from the list or create a new one to start writing.
          </p>
          <button
            onClick={handleNewNote}
            className="mt-6 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] text-sm font-semibold transition-colors border border-[#3aa3eb]/20"
          >
            <Plus size={16} /> New Note
          </button>
        </div>
      ) : (
        <>
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobilePanel('list')}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors mr-1"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-base leading-none">{CATEGORY_EMOJI[category]}</span>
                  <span className="text-xs capitalize hidden sm:inline">{category.replace('_', ' ')}</span>
                  <ChevronDown size={12} className="text-gray-600" />
                </button>
                {showCategoryMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCategoryMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 z-50 ios-card rounded-xl shadow-2xl p-1.5 min-w-[160px] border border-white/10">
                      {(Object.keys(CATEGORY_EMOJI) as NoteCategory[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={(e) => { e.stopPropagation(); setCategory(cat); setShowCategoryMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                          <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
                          <span className="capitalize">{cat.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600 mr-2 hidden sm:inline">
                {saveState === 'saving' && 'Saving...'}
                {saveState === 'saved' && 'Saved'}
              </span>
              {saveState === 'saving' && <div className="w-3 h-3 rounded-full border border-white/20 border-t-[#3aa3eb] animate-spin sm:hidden" />}
              <button
                onClick={handleTogglePin}
                className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-[#3aa3eb] bg-[#3aa3eb]/10' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                title="Pin"
              >
                <Pin size={15} fill={pinned ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleToggleShare}
                className={`p-1.5 rounded-lg transition-colors ${isShared ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                title="Share with client"
              >
                {isShared ? <Share2 size={15} /> : <Lock size={15} />}
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Editor body — fills viewport, textarea scrolls internally */}
          <div className="flex-1 flex flex-col min-h-0 px-5 sm:px-10 lg:px-16 py-4 sm:py-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white placeholder:text-gray-700 focus:outline-none mb-1 font-integral shrink-0"
            />
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-600 flex-wrap shrink-0">
              <span>{formatAppDate(selectedNote?.updated_at || new Date())}</span>
              {selectedNote?.client?.name && (<><span>·</span><span>{selectedNote.client.name}</span></>)}
              {isShared && (<><span>·</span><span className="text-emerald-500">Shared with client</span></>)}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-4 shrink-0">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#3aa3eb]/10 rounded-md text-xs text-[#3aa3eb]">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white"><X size={11} /></button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  type="text" value={tagInput} autoFocus
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(); setShowTagInput(false); }
                    else if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); }
                  }}
                  onBlur={() => { addTag(); setShowTagInput(false); }}
                  placeholder="tag"
                  className="bg-transparent text-xs text-white placeholder:text-gray-700 focus:outline-none w-20 border-b border-white/10"
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-gray-600 hover:text-[#3aa3eb] hover:bg-white/5 transition-colors"
                >
                  <Tag size={11} /> Add tag
                </button>
              )}
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing..."
              className="w-full flex-1 bg-transparent text-[15px] text-gray-200 placeholder:text-gray-700 focus:outline-none resize-none leading-relaxed min-h-0 overflow-y-auto custom-scrollbar"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden gap-3">
      {/* Mobile folder selector bar */}
      <div className="md:hidden shrink-0">
        <button
          onClick={() => setShowFolderMenu(!showFolderMenu)}
          className="w-full flex items-center justify-between px-4 py-3 ios-card rounded-2xl border border-white/10"
        >
          <div className="flex items-center gap-2.5">
            {(() => {
              const meta = FOLDER_META[activeFolder];
              return (
                <>
                  <div className={`p-1.5 rounded-lg ${meta.bg}`}>
                    <meta.icon size={16} className={meta.color} />
                  </div>
                  <span className="text-sm font-semibold text-white">{meta.label}</span>
                  <span className="text-xs text-gray-500">({folderCounts[activeFolder] || 0})</span>
                </>
              );
            })()}
          </div>
          <ChevronDown size={18} className={`text-gray-500 transition-transform ${showFolderMenu ? 'rotate-180' : ''}`} />
        </button>
        {showFolderMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowFolderMenu(false)} />
            <div className="absolute z-50 mt-2 w-full ios-card rounded-2xl border border-white/10 p-2 shadow-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
              {folders.map((folder) => {
                const meta = FOLDER_META[folder];
                const isActive = activeFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => selectFolder(folder)}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm transition-all ${
                      isActive ? `${meta.bg} text-white` : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <meta.icon size={16} className={isActive ? meta.color : 'text-gray-500'} />
                    <span className="truncate flex-1 text-left">{meta.label}</span>
                    {folderCounts[folder] > 0 && (
                      <span className={`text-xs ${isActive ? 'text-white/60' : 'text-gray-600'}`}>{folderCounts[folder]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Main 3-panel layout — desktop, fits viewport */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]/80 backdrop-blur-xl">
        {/* Collapsible folder sidebar */}
        {sidebarOpen ? (
          <div className="w-56 shrink-0 border-r border-white/5 flex flex-col bg-black/20 transition-all duration-200">
            {renderFolderSidebar()}
          </div>
        ) : (
          <div className="w-12 shrink-0 border-r border-white/5 flex flex-col items-center py-3 bg-black/20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
              title="Show folders"
            >
              <PanelLeftOpen size={18} />
            </button>
            <button
              onClick={handleNewNote}
              className="mt-2 p-2 rounded-lg bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] transition-colors"
              title="New note"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
        {/* Note list */}
        <div className="w-72 shrink-0 border-r border-white/5 flex flex-col min-h-0">
          <div className="p-3 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/40"
              />
            </div>
          </div>
          {renderNoteList()}
        </div>
        {/* Editor */}
        {renderEditor()}
      </div>

      {/* Mobile single-panel navigation */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]/80 backdrop-blur-xl flex flex-col">
        {mobilePanel === 'list' && (
          <div className="p-3 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/40"
              />
            </div>
          </div>
        )}
        {mobilePanel === 'list' && renderNoteList()}
        {mobilePanel === 'editor' && renderEditor()}
      </div>
    </div>
  );

  function NoteRow({ note, selectedNoteId, onSelect }: {
    note: Note; selectedNoteId: string | null; onSelect: (id: string) => void;
  }) {
    const isSelected = selectedNoteId === note.id;
    return (
      <button
        onClick={() => onSelect(note.id)}
        className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
          isSelected ? 'bg-[#3aa3eb]/5 border-[#3aa3eb]' : 'border-transparent hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex items-start gap-2 mb-1">
          <span className="text-sm leading-none mt-0.5">{CATEGORY_EMOJI[note.category]}</span>
          <h3 className="text-sm font-semibold text-white truncate flex-1">{note.title || 'Untitled'}</h3>
          {note.pinned && <Pin size={12} className="text-[#3aa3eb] shrink-0 mt-0.5" fill="currentColor" />}
          {note.is_shared_with_client && <Share2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 ml-5 leading-relaxed">
          {note.plainText || 'No additional text'}
        </p>
        <p className="text-[11px] text-gray-600 mt-1 ml-5">{formatAppDate(note.updated_at)}</p>
      </button>
    );
  }
}
