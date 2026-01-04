import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    noteService,
    Note,
    NoteBlock
} from '../lib/supabase';
import {
    ArrowLeftIcon,
    ClockIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { formatAppDate } from '../lib/dateFormat';
import NoteEditor from '../components/notes/NoteEditor';

export default function ClientNoteDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [note, setNote] = useState<Note | null>(null);
    const [blocks, setBlocks] = useState<NoteBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadNote();
        }
    }, [id]);

    const loadNote = async () => {
        try {
            setLoading(true);
            if (id) {
                // We use getById - ensure RLS allows read if shared
                const found = await noteService.getById(id);
                if (found) {
                    // Double check visibility client-side just in case
                    if (found.visibility !== 'client_visible') {
                        navigate('/client/notes');
                        return;
                    }
                    setNote(found);
                    setBlocks(Array.isArray(found.content) ? found.content : []);
                } else {
                    navigate('/client/notes');
                }
            }
        } catch (error) {
            console.error('Error loading note:', error);
            navigate('/client/notes');
        } finally {
            setLoading(false);
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
        <div className="space-y-8 pb-20">
            {/* Navigation */}
            <button
                onClick={() => navigate('/client/notes')}
                className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group"
            >
                <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Documents</span>
            </button>

            {/* Header */}
            <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3aa3eb]/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 space-y-4 max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase font-display">
                        {note.title}
                    </h1>

                    <div className="flex flex-wrap gap-4 items-center pt-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <DocumentTextIcon className="h-4 w-4 text-[#3aa3eb]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                {note.category}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Last updated {formatAppDate(note.updated_at)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="glass-card rounded-3xl border border-white/10 p-8 md:p-12 min-h-[600px]">
                <NoteEditor
                    content={blocks}
                    onChange={() => { }} // No-op, read-only
                    readOnly={true}
                />
            </div>
        </div>
    );
}
