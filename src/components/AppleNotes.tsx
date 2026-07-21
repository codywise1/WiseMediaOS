import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Share2,
  Lock,
  Folder as FolderIcon,
  FileText,
  Lightbulb,
  Calendar,
  Phone,
  ClipboardList,
  CheckSquare,
  MoreHorizontal,
  X,
  Tag,
  ChevronDown,
  ChevronRight,
  Inbox,
  Star,
  Pencil,
} from 'lucide-react';
import { noteService, Note, NoteCategory, NoteBlock, NoteVisibility, Client, Project, UserRole } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate } from '../lib/dateFormat';

interface AppleNotesProps {
  currentUser: { id?: string; email: string; role: UserRole; name: string } | null;
}

type Folder = 'all' | 'pinned' | NoteCategory | 'shared';

const FOLDER_META: Record<Folder, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'All Notes', icon: Inbox, color: 'text-[#3aa3eb]' },
  pinned: { label: 'Pinned', icon: Star, color: 'text-amber-400' },
  general: { label: 'General', icon: FileText, color: 'text-gray-400' },
  idea: { label: 'Ideas', icon: Lightbulb, color: 'text-amber-400' },
  meeting: { label: 'Meetings', icon: Calendar, color: 'text-blue-400' },
  sales_call: { label: 'Sales Calls', icon: Phone, color: 'text-emerald-400' },
  sop: { label: 'SOPs', icon: ClipboardList, color: 'text-violet-400' },
  task: { label: 'Tasks', icon: CheckSquare, color: 'text-rose-400' },
  shared: { label: 'Shared', icon: Share2, color: 'text-emerald-400' },
};

const CATEGORY_EMOJI: Record<NoteCategory, string> = {
  general: '📝',
  idea: '💡',
  meeting: '🗓️',
  sales_call: '📞',
  sop: '📋',
  task: '✅',
};

export default function AppleNotes({ currentUser }: AppleNotesProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<Folder>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(false);

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

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  // When selecting a note, load its content into editor state
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
      setTitle('');
      setBody('');
      setCategory('general');
      setTags([]);
      setPinned(false);
      setIsShared(false);
      setSaveState('idle');
    }
  }, [selectedNoteId, selectedNote?.updated_at]);

  // Filtered notes by folder + search
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (activeFolder === 'pinned') result = result.filter((n) => n.pinned);
    else if (activeFolder === 'shared') result = result.filter((n) => n.is_shared_with_client);
    else if (activeFolder !== 'all') result = result.filter((n) => n.category === activeFolder);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.plainText?.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, activeFolder, searchQuery]);

  const handleNewNote = async () => {
    try {
      const newNote = await noteService.create({
        title: 'New Note',
        content: [{ id: '1', type: 'paragraph', content: '' }] as NoteBlock[],
        plainText: '',
        category: 'general',
        tags: [],
        pinned: false,
        visibility: 'internal',
        is_shared_with_client: false,
        attachments: [],
      } as any);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setShowMobileList(false);
      setTitle('New Note');
      setBody('');
      setCategory('general');
      setTags([]);
      setPinned(false);
      setIsShared(false);
    } catch (e) {
      console.error('Error creating note:', e);
      toastError('Failed to create note.');
    }
  };

  // Auto-save (debounced) when title or body changes
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
          title: title || 'Untitled',
          content: blocks,
          plainText,
          category,
          tags,
          pinned,
        } as any);
        setSaveState('saved');
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedNoteId
              ? { ...n, title: title || 'Untitled', content: blocks, plainText, category, tags, pinned, updated_at: new Date().toISOString() }
              : n
          )
        );
        setTimeout(() => setSaveState('idle'), 1500);
      } catch (e) {
        console.error('Auto-save error:', e);
        setSaveState('idle');
      }
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, body, category, tags, pinned, selectedNoteId]);

  const handleTogglePin = async () => {
    if (!selectedNoteId) return;
    const newPinned = !pinned;
    setPinned(newPinned);
    try {
      await noteService.togglePin(selectedNoteId, newPinned);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? { ...n, pinned: newPinned } : n)));
    } catch (e) {
      console.error(e);
    }
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
      toastSuccess('Note deleted.');
    } catch (e) {
      console.error(e);
      toastError('Failed to delete note.');
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
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

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f]/80 backdrop-blur-xl">
      {/* Panel 1: Folder sidebar */}
      <div className="w-16 sm:w-52 shrink-0 border-r border-white/5 flex flex-col bg-black/20">
        <div className="p-3 hidden sm:block">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Folders</h2>
            <button
              onClick={handleNewNote}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="New Note"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-3 space-y-0.5">
          {folders.map((folder) => {
            const meta = FOLDER_META[folder];
            const isActive = activeFolder === folder;
            return (
              <button
                key={folder}
                onClick={() => {
                  setActiveFolder(folder);
                  setShowMobileList(true);
                }}
                className={`w-full flex items-center gap-2.5 px-2 sm:px-3 py-2 rounded-lg text-sm transition-colors justify-center sm:justify-start ${
                  isActive ? 'bg-[#3aa3eb]/15 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <meta.icon size={16} className={`shrink-0 ${isActive ? meta.color : ''}`} />
                <span className="hidden sm:inline truncate">{meta.label}</span>
                {folderCounts[folder] > 0 && (
                  <span className="ml-auto hidden sm:inline text-xs text-gray-600">{folderCounts[folder]}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="p-2 sm:p-3 border-t border-white/5">
          <button
            onClick={handleNewNote}
            className="w-full flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-lg bg-[#3aa3eb] hover:bg-[#59a1e5] text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </div>

      {/* Panel 2: Note list */}
      <div className={`w-72 shrink-0 border-r border-white/5 flex flex-col ${showMobileList ? 'flex' : 'hidden'} md:flex`}>
        <div className="p-3 border-b border-white/5">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/10 border-t-[#3aa3eb]" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <FileText size={28} className="text-gray-700 mb-2" />
              <p className="text-sm text-gray-500">{searchQuery ? 'No results' : 'No notes here yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setShowMobileList(false);
                  }}
                  className={`w-full text-left p-3.5 transition-colors ${
                    selectedNoteId === note.id ? 'bg-[#3aa3eb]/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-sm leading-none mt-0.5">{CATEGORY_EMOJI[note.category]}</span>
                    <h3 className="text-sm font-semibold text-white truncate flex-1">{note.title || 'Untitled'}</h3>
                    {note.pinned && <Pin size={12} className="text-amber-400 shrink-0 mt-0.5" fill="currentColor" />}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 ml-5">
                    {note.plainText || 'No additional text'}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1 ml-5">{formatAppDate(note.updated_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedNoteId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <FileText size={28} className="text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-400">No Note Selected</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-xs">
              Select a note from the list or create a new one to start writing.
            </p>
            <button
              onClick={handleNewNote}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3aa3eb] hover:bg-[#59a1e5] text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Note
            </button>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-colors relative"
                >
                  <span className="text-base leading-none">{CATEGORY_EMOJI[category]}</span>
                  <span className="text-xs capitalize">{category.replace('_', ' ')}</span>
                  <ChevronDown size={12} className="text-gray-600" />
                  {showCategoryMenu && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[160px]">
                      {(Object.keys(CATEGORY_EMOJI) as NoteCategory[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategory(cat);
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                          <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
                          <span className="capitalize">{cat.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 mr-2">
                  {saveState === 'saving' && 'Saving...'}
                  {saveState === 'saved' && 'Saved'}
                </span>
                <button
                  onClick={handleTogglePin}
                  className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
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

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-10 lg:px-16 py-8">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-transparent text-3xl sm:text-4xl font-bold text-white placeholder:text-gray-700 focus:outline-none mb-1"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif' }}
              />
              <div className="flex items-center gap-3 mb-6 text-xs text-gray-600">
                <span>{formatAppDate(selectedNote?.updated_at || new Date())}</span>
                {selectedNote?.client?.name && (
                  <>
                    <span>·</span>
                    <span>{selectedNote.client.name}</span>
                  </>
                )}
                {isShared && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-500">Shared with client</span>
                  </>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#3aa3eb]/10 rounded text-xs text-[#3aa3eb]">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {showTagInput ? (
                  <input
                    type="text"
                    value={tagInput}
                    autoFocus
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                        setShowTagInput(false);
                      } else if (e.key === 'Escape') {
                        setShowTagInput(false);
                        setTagInput('');
                      }
                    }}
                    onBlur={() => {
                      addTag();
                      setShowTagInput(false);
                    }}
                    placeholder="tag"
                    className="bg-transparent text-xs text-white placeholder:text-gray-700 focus:outline-none w-20 border-b border-white/10"
                  />
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-600 hover:text-[#3aa3eb] hover:bg-white/5 transition-colors"
                  >
                    <Tag size={11} /> Add tag
                  </button>
                )}
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing..."
                className="w-full bg-transparent text-[15px] text-gray-200 placeholder:text-gray-700 focus:outline-none resize-none leading-relaxed min-h-[60vh]"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, sans-serif' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
