import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    noteService,
    Note,
    UserRole,
    NoteBlock,
    noteAuditService,
    NoteAudit
} from '../lib/supabase';
import {
    ArrowLeftIcon,
    TrashIcon,
    FolderIcon,
    DocumentTextIcon,
    EyeIcon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    BookmarkIcon,
    ShareIcon,
    CheckCircleIcon,
    ClockIcon,
    UserIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';
import { formatAppDate } from '../lib/dateFormat';
import ConfirmDialog from './ConfirmDialog';
import NoteEditor from './notes/NoteEditor';
import { useDebounce } from '../hooks/useDebounce';

interface User {
    email: string;
    role: UserRole;
    name: string;
    id?: string;
}

interface NoteDetailProps {
    currentUser: User | null;
}

export default function NoteDetail({ currentUser }: NoteDetailProps) {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [note, setNote] = useState<Note | null>(null);
    const [blocks, setBlocks] = useState<NoteBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [auditLogs, setAuditLogs] = useState<NoteAudit[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const isAdminOrStaff = currentUser?.role === 'admin' || currentUser?.role === 'staff';
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (id) {
            loadNote();
            loadAuditLogs();
        }
    }, [id]);

    const loadNote = async () => {
        try {
            setLoading(true);
            if (id) {
                const found = await noteService.getById(id);
                if (found) {
                    setNote(found);
                    setBlocks(Array.isArray(found.content) ? found.content : []);
                } else {
                    navigate('/notes');
                }
            }
        } catch (error) {
            console.error('Error loading note:', error);
            navigate('/notes');
        } finally {
            setLoading(false);
            isInitialLoad.current = false;
        }
    };

    const loadAuditLogs = async () => {
        if (id) {
            try {
                const logs = await noteAuditService.getByNoteId(id);
                setAuditLogs(logs);
            } catch (error) {
                console.error('Error loading audit logs:', error);
            }
        }
    };

    const saveNote = async (updatedBlocks: NoteBlock[]) => {
        if (!id || isInitialLoad.current) return;

        setIsSaving(true);
        try {
            const plainText = updatedBlocks.map(b => b.content || b.items?.join(' ') || b.todos?.map(t => t.text).join(' ') || '').join(' ').slice(0, 1000);
            await noteService.update(id, {
                content: updatedBlocks,
                plainText,
                updated_at: new Date().toISOString()
            });
            loadAuditLogs();
        } catch (error) {
            console.error('Error autosaving note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Simple autosave on block change with 2s delay
    useEffect(() => {
        if (isInitialLoad.current) return;
        const timer = setTimeout(() => {
            saveNote(blocks);
        }, 2000);
        return () => clearTimeout(timer);
    }, [blocks]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            await noteService.delete(id);
            navigate('/notes');
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleTogglePin = async () => {
        if (!note) return;
        try {
            const updated = await noteService.togglePin(note.id, !note.pinned);
            setNote(updated);
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]"></div>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="space-y-6 pb-20">
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/notes')}
                    className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group"
                >
                    <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Library</span>
                </button>

                <div className="flex items-center gap-4">
                    {isSaving ? (
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#3aa3eb] uppercase tracking-widest">
                            <div className="h-2 w-2 bg-[#3aa3eb] rounded-full animate-ping" />
                            Autosaving...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                            <CheckCircleIcon className="h-4 w-4" />
                            Changes Saved
                        </div>
                    )}
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-lg transition-all ${showHistory ? 'bg-[#3aa3eb]/20 text-[#3aa3eb]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <ClockIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Container */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {/* Editor Header */}
                    <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <button
                                onClick={handleTogglePin}
                                className={`p-3 rounded-2xl transition-all border ${note.pinned
                                        ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                        : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <BookmarkIcon className={`h-6 w-6 ${note.pinned ? 'fill-yellow-500' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-4 max-w-2xl">
                            <input
                                type="text"
                                value={note.title}
                                onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setNote({ ...note, title: newTitle });
                                    // Immediate title save optional, or let it follow the blocks timer
                                }}
                                className="w-full bg-transparent border-none p-0 text-5xl font-black text-white tracking-tighter focus:outline-none placeholder:text-gray-800 uppercase"
                                placeholder="UNTITLED NOTE"
                            />

                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full bg-[#3aa3eb]/10 text-[#3aa3eb] border border-[#3aa3eb]/20 text-[10px] font-black uppercase tracking-widest">
                                    {note.category}
                                </span>
                                <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${note.visibility === 'client_visible'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {note.visibility === 'client_visible' ? 'Shared with Client' : 'Internal Agency Only'}
                                </span>
                                {note.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-gray-500 border border-white/5 text-[10px] font-bold uppercase tracking-wider">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="glass-card rounded-3xl border border-white/10 p-12 min-h-[800px]">
                        <NoteEditor
                            content={blocks}
                            onChange={setBlocks}
                            readOnly={!isAdminOrStaff}
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Details Card */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Metadata</h2>
                        <div className="space-y-4">
                            <MetaItem label="Author" value={note.authorUserId ? 'Team Member' : 'System'} icon={UserIcon} />
                            <MetaItem label="Client" value={note.client?.name || 'Internal'} icon={UserIcon} />
                            <MetaItem label="Created" value={formatAppDate(note.created_at)} icon={CalendarDaysIcon} />
                            <MetaItem label="Last Edit" value={formatAppDate(note.updated_at)} icon={ClockIcon} />
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
                        <button
                            onClick={() => {
                                if (!note.clientId) {
                                    alert('You must link a client before sharing.');
                                    return;
                                }
                                noteService.update(note.id, { visibility: note.visibility === 'internal' ? 'client_visible' : 'internal' }).then(setNote);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-widest transition-all"
                        >
                            <ShareIcon className="h-4 w-4" />
                            {note.visibility === 'client_visible' ? 'Unshare Note' : 'Share with Client'}
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-500 uppercase tracking-widest transition-all"
                        >
                            <TrashIcon className="h-4 w-4" />
                            Delete Record
                        </button>
                    </div>

                    {/* Linked Entities */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Linked Intelligence</h2>
                        <div className="space-y-2">
                            {note.projectId && (
                                <LinkedItem label="Project" value={note.project?.name || 'Project'} icon={FolderIcon} />
                            )}
                            {note.meetingId && (
                                <LinkedItem label="Meeting" value="Meeting Records" icon={VideoCameraIcon} />
                            )}
                            {note.proposalId && (
                                <LinkedItem label="Proposal" value="Proposal Draft" icon={DocumentTextIcon} />
                            )}
                            {note.invoiceId && (
                                <LinkedItem label="Invoice" value="Linked Invoice" icon={CurrencyDollarIcon} />
                            )}
                            {!note.projectId && !note.meetingId && !note.proposalId && !note.invoiceId && (
                                <p className="text-[10px] text-gray-700 italic">No entities linked to this note.</p>
                            )}
                        </div>
                    </div>

                    {/* History / Audit Log */}
                    {showHistory && (
                        <div className="glass-card rounded-2xl p-6 border border-white/10 animate-in fade-in duration-300">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                                <span>Audit Trail</span>
                                <ClockIcon className="h-4 w-4" />
                            </h2>
                            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="border-l border-white/10 pl-4 py-1">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">{log.action.replace('note_', '').replace('_', ' ')}</p>
                                        <p className="text-[9px] text-gray-600 font-medium">{new Date(log.created_at).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Intelligence Record"
                message={`Are you sure you want to delete this note? All blocks and audit data will be permanently removed.`}
            />
        </div>
    );
}

function MetaItem({ label, value, icon: Icon }: any) {
    return (
        <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-widest">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <span className="text-gray-300 font-black">{value}</span>
        </div>
    );
}

function LinkedItem({ label, value, icon: Icon }: any) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
            <div className="p-2 bg-white/5 rounded-lg group-hover:bg-[#3aa3eb]/20 transition-colors">
                <Icon className="h-4 w-4 text-gray-500 group-hover:text-[#3aa3eb]" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{label}</p>
                <p className="text-xs font-bold text-white truncate">{value}</p>
            </div>
        </div>
    );
}
