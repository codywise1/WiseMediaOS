import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
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
    CurrencyDollarIcon,
    CalendarDaysIcon,
    BookmarkIcon,
    ShareIcon,
    ClockIcon,
    UserIcon,
    VideoCameraIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { formatAppDate } from '../lib/dateFormat';
import { generateNotePDF } from '../utils/pdfGenerator';
import ConfirmDialog from './ConfirmDialog';
import NoteEditor from './notes/NoteEditor';

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

    const saveNote = async (updatedBlocks: NoteBlock[], updatedTitle?: string) => {
        if (!id || isInitialLoad.current) return;

        setIsSaving(true);
        try {
            const plainText = updatedBlocks.map(b => b.content || b.items?.join(' ') || b.todos?.map(t => t.text).join(' ') || '').join(' ').slice(0, 1000);
            await noteService.update(id, {
                title: updatedTitle ?? note?.title,
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

    useEffect(() => {
        if (note && blocks.length === 0 && !loading) {
            // Apply templates for new/empty notes
            const templates: Record<string, NoteBlock[]> = {
                sop: [
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Overview' },
                    { id: uuidv4(), type: 'paragraph', content: '' },
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Steps' },
                    { id: uuidv4(), type: 'numbered', items: [''] },
                ],
                meeting: [
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Agenda' },
                    { id: uuidv4(), type: 'bullets', items: [''] },
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Notes' },
                    { id: uuidv4(), type: 'paragraph', content: '' },
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Action Items' },
                    { id: uuidv4(), type: 'todo', todos: [{ text: '', done: false }] },
                ],
                sales_call: [
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Pain Points' },
                    { id: uuidv4(), type: 'bullets', items: [''] },
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Value Proposition' },
                    { id: uuidv4(), type: 'paragraph', content: '' },
                    { id: uuidv4(), type: 'heading', level: 2, content: 'Next Steps' },
                    { id: uuidv4(), type: 'todo', todos: [{ text: '', done: false }] },
                ]
            };

            const templateBlocks = (templates as any)[note.category];
            if (templateBlocks) {
                setBlocks(templateBlocks);
            }
        }
    }, [note?.category, loading]);

    // Simple autosave on block change with 2s delay
    useEffect(() => {
        if (isInitialLoad.current) return;
        const timer = setTimeout(() => {
            saveNote(blocks, note?.title);
        }, 2000);
        return () => clearTimeout(timer);
    }, [blocks, note?.title]);

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
                    <span className="text-[10px] font-black tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>Back to Library</span>
                </button>

                <div className="flex items-center gap-4">
                    {isSaving ? (
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#3aa3eb] tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            <div className="h-2 w-2 bg-[#3aa3eb] rounded-full animate-ping" />
                            <span>Saving Intelligence...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            <span>Intelligence Synchronized</span>
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
                    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 p-4 sm:p-8 flex flex-col items-end gap-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Share with Client</span>
                            <div
                                onClick={() => {
                                    if (!note.clientId) {
                                        alert('You must link a client before sharing.');
                                        return;
                                    }
                                    const isShared = note.is_shared_with_client;
                                    noteService.toggleShare(note.id, !isShared).then(setNote);
                                }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${note.is_shared_with_client ? 'bg-emerald-500/40 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border border-white/10'
                                    }`}
                                title={note.is_shared_with_client ? 'Unshare with client' : 'Share with client'}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${note.is_shared_with_client ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 max-w-3xl">
                            <input
                                type="text"
                                value={note.title}
                                onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setNote({ ...note, title: newTitle });
                                }}
                                className="w-full bg-transparent border-none p-0 text-3xl sm:text-5xl font-black text-white focus:outline-none placeholder:text-gray-800"
                                style={{ fontFamily: 'Integral CF, sans-serif' }}
                                placeholder="Note Title"
                            />

                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                                    style={{
                                        backgroundColor: 'rgba(59, 163, 234, 0.33)',
                                        border: '1px solid rgba(59, 163, 234, 1)'
                                    }}
                                >
                                    {note.category}
                                </span>
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                                    style={note.visibility === 'client_visible' ? {
                                        backgroundColor: 'rgba(34, 197, 94, 0.33)',
                                        border: '1px solid #22c55e'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}
                                >
                                    {note.visibility === 'client_visible' ? 'Client Visible' : 'Internal'}
                                </span>
                                {note.tags?.map(tag => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.15)'
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="glass-card rounded-[32px] border border-white/10 transition-all duration-300 shadow-2xl relative overflow-hidden">
                        <div className="relative max-w-[760px] mx-auto min-h-[800px] px-4 py-6 sm:px-6 sm:py-8">
                            <NoteEditor
                                content={blocks}
                                onChange={setBlocks}
                                readOnly={!isAdminOrStaff}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar - Sticky */}
                <div className="space-y-6 lg:sticky lg:top-6 self-start">
                    {/* Details Card */}
                    <div className="glass-card rounded-[24px] p-6 border border-white/10 shadow-xl overflow-hidden relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[10px] font-black text-white tracking-wider" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>Contextual Data</h2>
                            {isSaving ? (
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-[#3aa3eb] tracking-wider animate-pulse" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    <div className="w-1 h-1 rounded-full bg-[#3aa3eb]" />
                                    Live Content
                                </span>
                            ) : (
                                <span className="text-[9px] font-black text-emerald-500 tracking-wider opacity-70" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    Static Snapshot
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            <MetaItem label="Author" value={note.authorUserId ? 'Team Member' : 'System'} icon={UserIcon} />
                            <MetaItem label="Client" value={note.client?.name || 'Internal'} icon={UserIcon} />
                            <MetaItem label="Created" value={formatAppDate(note.created_at)} icon={CalendarDaysIcon} />
                            <MetaItem label="Last Edit" value={formatAppDate(note.updated_at)} icon={ClockIcon} />
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-center gap-4">
                        <button
                            onClick={handleTogglePin}
                            className={`p-3 rounded-full transition-all border ${note.pinned
                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                : 'bg-white/5 text-gray-500 border-white/10 hover:text-white hover:bg-white/10'
                                }`}
                            title={note.pinned ? 'Unpin' : 'Pin to top'}
                        >
                            <BookmarkIcon className={`h-5 w-5 ${note.pinned ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button
                            onClick={() => note && generateNotePDF(note)}
                            className="p-3 rounded-full bg-[#3aa3eb]/10 text-[#3aa3eb] hover:bg-[#3aa3eb]/20 border border-[#3aa3eb]/20 transition-all"
                            title="Download PDF"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all"
                            title="Delete Record"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Linked Entities */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-[10px] font-black text-white tracking-widest mb-6" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>Linked Intelligence</h2>
                        <div className="space-y-2">
                            {note.projectId && (
                                <LinkedItem
                                    label="Project"
                                    value={note.project?.name || 'Project'}
                                    icon={FolderIcon}
                                    to={`/projects/${note.projectId}`}
                                />
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
                                <p className="text-[10px] text-white/50 italic">No entities linked to this note.</p>
                            )}
                        </div>
                    </div>

                    {/* History / Audit Log */}
                    {showHistory && (
                        <div className="glass-card rounded-2xl p-6 border border-white/10 animate-in fade-in duration-300">
                            <h2 className="text-[10px] font-black text-gray-500 tracking-widest mb-6 flex items-center justify-between" style={{ fontFamily: 'Integral CF, sans-serif', textTransform: 'uppercase' }}>
                                <span>Audit Trail</span>
                                <ClockIcon className="h-4 w-4" />
                            </h2>
                            <div className="space-y-4 h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                {auditLogs.map(log => (
                                    <div key={log.id} className="border-l border-white/10 pl-4 py-1">
                                        <p className="text-[10px] font-bold text-white tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>{log.action.replace('note_', '').replace('_', ' ')}</p>
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
        <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <div className="flex items-center gap-2 text-white/70 font-bold tracking-widest">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <span className="text-white font-bold">{value}</span>
        </div>
    );
}

function LinkedItem({ label, value, icon: Icon, to }: any) {
    const content = (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group h-full">
            <div className="p-2 bg-white/5 rounded-lg group-hover:bg-[#3aa3eb]/20 transition-colors">
                <Icon className="h-4 w-4 text-gray-500 group-hover:text-[#3aa3eb]" />
            </div>
            <div className="min-w-0 flex-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <p className="text-[9px] font-black text-white/70 tracking-widest">{label}</p>
                <p className="text-xs font-bold text-white truncate">{value}</p>
            </div>
        </div>
    );

    if (to) {
        return (
            <Link to={to} className="block">
                {content}
            </Link>
        );
    }

    return content;
}
