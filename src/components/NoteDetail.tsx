import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseAvailable, noteService, Note, UserRole } from '../lib/supabase';
import {
    ArrowLeftIcon,
    TrashIcon,
    UserIcon,
    FolderIcon,
    DocumentTextIcon,
    PaperClipIcon,
    EyeIcon,
    CurrencyDollarIcon,
    CalendarDaysIcon,
    EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { formatAppDate } from '../lib/dateFormat';
import ConfirmDialog from './ConfirmDialog';

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
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (id) {
            loadNote();
        }
    }, [id]);

    const loadNote = async () => {
        try {
            setLoading(true);
            if (!isSupabaseAvailable()) {
                // Mock data for demo
                const mockNote: Note = {
                    id: id || '1',
                    title: 'PROPOSAL BUILDER PROMPT',
                    content: `
            <p>Build a guided <strong>Proposal Builder</strong> that generates a Proposal PDF, clause level SOW per selected service, an Agreement, and auto creates a linked Draft Invoice.</p>
            <p>Proposal and Invoice stay synced via strict rules, shared line items, statuses, and audit events.</p>
            <br/>
            <h3>Product intent</h3>
            <p>This is a contract generation system, not a form.</p>
            <p>It eliminates manual rebuilds, free text scope, and mismatched billing.</p>
            <br/>
            <h3>Non negotiables</h3>
            <ul>
              <li>Every Proposal creates exactly one linked Invoice in Draft on first save.</li>
              <li>Invoice cannot be sent or paid until Proposal is Signed, unless Admin overrides.</li>
              <li>Legal text locks via clause snapshots the moment a Proposal is Sent, and all sent or signed proposals must render snapshots only.</li>
              <li>If a Proposal changes after Signed, never edit the signed invoice, create a Change Order Proposal and new Invoice.</li>
              <li>All state changes and key actions create immutable audit events.</li>
            </ul>
            <br/>
            <h3>Supported services now</h3>
            <p><strong>Website Development, Landing Page, Web App Development, Brand Identity</strong></p>
            <p>SEO Services, Graphic Design, Video Editing.</p>
          `,
                    category: 'Idea',
                    is_pinned: true,
                    is_shared_with_client: true,
                    client_id: 'client-1',
                    project_id: 'project-1',
                    user_id: 'user-1',
                    created_at: '2025-12-02T10:00:00Z',
                    updated_at: '2026-01-08T15:30:00Z',
                    tags: ['proposal', 'builder', 'automation'],
                    attachments: [
                        { id: '1', name: 'invoice_logic_flow.png', url: '#', size: 1024, type: 'image/png' }
                    ],
                    client: { name: 'Wise Media', company: 'Wise Media' },
                    project: { name: 'Website Redesign Project' }
                };
                setNote(mockNote);
            } else {
                const data = await noteService.getAll();
                const found = data.find(n => n.id === id);
                if (found) {
                    setNote(found);
                } else {
                    navigate('/notes');
                }
            }
        } catch (error) {
            console.error('Error loading note:', error);
            navigate('/notes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!note) return;
        try {
            if (isSupabaseAvailable()) {
                await noteService.delete(note.id);
            }
            navigate('/notes');
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Error deleting note. Please try again.');
        }
    };

    const isAdmin = currentUser?.role === 'admin';

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
            {/* Back Button */}
            <button
                onClick={() => navigate('/notes')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group mb-4"
            >
                <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                <span className="font-medium">Back to Notes</span>
            </button>

            {/* Header Card */}
            <div className="glass-card rounded-3xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {note.title}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                                {note.category || 'Note'}
                            </span>
                            {note.is_pinned && (
                                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold uppercase tracking-wider">
                                    Pinned
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
                            <span className="text-gray-500 text-sm font-medium ml-2">
                                {note.client?.company || note.client?.name || 'Wise Media'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-full border border-emerald-500/30 text-sm font-bold transition-all">
                            Share Note
                        </button>
                        <button className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full border border-red-500/30 text-sm font-bold transition-all">
                            Stop Sharing
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card rounded-3xl border border-white/10 overflow-hidden min-h-[600px] flex flex-col">
                        {/* Simulation Toolbar */}
                        <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex items-center gap-4 text-gray-400">
                            <span className="font-bold cursor-pointer hover:text-white transition-colors">B</span>
                            <span className="italic cursor-pointer hover:text-white transition-colors">I</span>
                            <span className="underline cursor-pointer hover:text-white transition-colors">U</span>
                            <span className="line-through cursor-pointer hover:text-white transition-colors">S</span>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 bg-white/20 rounded-sm" />
                                <div className="h-4 w-4 bg-white/20 rounded-sm" />
                                <div className="h-4 w-4 bg-white/20 rounded-sm" />
                            </div>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 bg-white/20 rounded-sm" />
                                <div className="h-4 w-4 bg-white/20 rounded-sm" />
                            </div>
                        </div>
                        {/* Note Text */}
                        <div className="p-8 flex-1">
                            <div
                                className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-4"
                                dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Details Card */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Details
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Type</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">{note.category || 'Idea'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Created</span>
                                <span className="text-gray-300 font-bold">{formatAppDate(note.created_at)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Last Edited</span>
                                <span className="text-gray-300 font-bold">{formatAppDate(note.updated_at)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Client</span>
                                <span className="text-white font-bold">{note.client?.company || note.client?.name || 'Wise Media'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Linked Card */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Linked
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <FolderIcon className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-sm text-gray-300 font-medium truncate">{note.project?.name || 'Website Redesign Project'}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <CurrencyDollarIcon className="h-4 w-4 text-indigo-400" />
                                </div>
                                <span className="text-sm text-gray-300 font-medium truncate">Invoice-333</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                                <div className="p-2 bg-gray-500/20 rounded-lg">
                                    <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-300 font-medium truncate">What is Wise Media OS?</span>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Card */}
                    <div className="glass-card rounded-2xl p-6 border border-white/10">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Attachments
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <UserIcon className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <span className="text-sm text-gray-300 font-medium truncate">invoice_logic_flow.png</span>
                                </div>
                                <EyeIcon className="h-4 w-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Note"
                message={`Are you sure you want to delete this note? This action cannot be undone.`}
            />
        </div>
    );
}
