import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    DocumentTextIcon,
    VideoCameraIcon,
    ClipboardDocumentCheckIcon,
    LightBulbIcon,
    HashtagIcon,
    BanknotesIcon,
    Squares2X2Icon,
    ListBulletIcon
} from '@heroicons/react/24/outline';
import { noteService, Note, NoteCategory } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatAppDate } from '../lib/dateFormat';
import { useDebounce } from '../hooks/useDebounce';

interface ClientNotesProps {
    currentUser: any;
}

export default function ClientNotes({ currentUser }: ClientNotesProps) {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const debouncedSearch = useDebounce(searchQuery, 300);

    useEffect(() => {
        loadNotes();
    }, [currentUser?.email]);

    const loadNotes = async () => {
        try {
            setLoading(true);
            // Logic: For clients, we fetch notes shared with their client account
            // We need to know which client this user references.
            // Usually handled by backend or service finding the client by user email/id.
            // noteService.getByClient(clientId) is available.
            // But we first need the Client ID.
            // We can use the 'clientService' to find current client or rely on RLS if we just call getAll()?
            // noteService.getAll() internally checks RLS.
            // Let's try fetching all and trusting RLS to filter for "Clients can read shared notes".
            // ... Wait, noteService.getAll selects *, RLS should apply.
            // However, noteService.getAll() orders by pinned/updated.
            // Let's verify RLS behavior: "Clients can read shared notes for their account".

            // But wait, accessing `notes` table with RLS enabled for a client user should only return their notes.
            // So simply calling `sb.from('notes').select(...)` should work.
            const data = await noteService.getAll();
            // Filter client_visible just in case RLS mimics are tricky in demo mode or mixed envs
            const visibleNotes = data.filter(n => n.visibility === 'client_visible' || n.is_shared_with_client);
            setNotes(visibleNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
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

        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(notes.map(n => n.category).filter(Boolean)));

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'idea': return LightBulbIcon;
            case 'meeting': return VideoCameraIcon;
            case 'sop': return ClipboardDocumentCheckIcon;
            case 'sales_call': return BanknotesIcon;
            default: return DocumentTextIcon;
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'idea': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'meeting': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case 'sop': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'sales_call': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 p-8 md:p-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#3aa3eb]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 font-display">
                        Shared Intelligence
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed">
                        Access strategy documents, meeting records, and project updates shared by the Wise Media team.
                    </p>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="sticky top-4 z-30 glass-card rounded-2xl border border-white/10 p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-xl">
                <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                    <div className="relative flex-1 md:max-w-md">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/50 transition-all font-medium"
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden md:block" />

                    <div className="relative group">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all cursor-pointer min-w-[160px]"
                        >
                            <option value="all">All Types</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-slate-900 capitalize">{cat?.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#3aa3eb] text-white shadow-lg shadow-[#3aa3eb]/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Squares2X2Icon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#3aa3eb] text-white shadow-lg shadow-[#3aa3eb]/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <ListBulletIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            {filteredNotes.length === 0 ? (
                <div className="glass-card rounded-3xl p-20 text-center border border-white/10">
                    <DocumentTextIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
                    <p className="text-gray-500">Try adjusting your search filters.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.map(note => {
                        const Icon = getCategoryIcon(note.category);
                        const colorClass = getCategoryColor(note.category);

                        return (
                            <div
                                key={note.id}
                                onClick={() => navigate(`/client/notes/${note.id}`)}
                                className="group relative glass-card rounded-3xl border border-white/10 hover:border-[#3aa3eb]/30 hover:shadow-lg hover:shadow-[#3aa3eb]/5 transition-all cursor-pointer overflow-hidden flex flex-col h-[280px]"
                            >
                                <div className="p-8 flex-1">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`p-3 rounded-2xl border ${colorClass}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        {note.pinned && <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#3aa3eb] transition-colors line-clamp-2">
                                        {note.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">
                                        {formatAppDate(note.updated_at)}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {note.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-gray-400 border border-white/5">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-1 w-full bg-[#3aa3eb] group-hover:scale-x-100 transition-transform duration-500 ease-out" style={{ transform: 'scaleX(0)', transformOrigin: 'left' }} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotes.map(note => {
                        const Icon = getCategoryIcon(note.category);
                        const colorClass = getCategoryColor(note.category);
                        return (
                            <div
                                key={note.id}
                                onClick={() => navigate(`/client/notes/${note.id}`)}
                                className="glass-card rounded-2xl border border-white/5 hover:border-white/10 p-4 flex items-center gap-6 cursor-pointer group transition-all hover:bg-white/5"
                            >
                                <div className={`p-3 rounded-xl border ${colorClass}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#3aa3eb] transition-colors truncate">
                                        {note.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                        {note.category} • Updated {formatAppDate(note.updated_at)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {note.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-gray-500 border border-white/5">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
