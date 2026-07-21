import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    TagIcon,
    LinkIcon,
    BookmarkIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
    Note,
    NoteBlock,
    NoteCategory,
    NoteVisibility,
    Client,
    Project,
    noteService
} from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import NoteEditor from './NoteEditor';
import Modal from '../Modal';

interface CreateEditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    note?: Note | null;
    mode: 'create' | 'edit';
    clients: Client[];
    projects: Project[];
    defaultClientId?: string;
    defaultProjectId?: string;
}

const TEMPLATES: Record<NoteCategory, NoteBlock[]> = {
    idea: [
        { id: '1', type: 'heading', content: 'Core Concept', level: 2 },
        { id: '2', type: 'paragraph', content: 'What is the Big Idea?' },
        { id: '3', type: 'heading', content: 'Target Audience', level: 2 },
        { id: '4', type: 'paragraph', content: 'Who is this for?' },
        { id: '5', type: 'heading', content: 'Next Steps', level: 2 },
        { id: '6', type: 'todo', todos: [{ text: 'Research feasibility', done: false }] }
    ],
    sop: [
        { id: '1', type: 'heading', content: 'Standard Operating Procedure', level: 2 },
        { id: '2', type: 'paragraph', content: 'Purpose of this SOP' },
        { id: '3', type: 'heading', content: 'Steps', level: 2 },
        { id: '4', type: 'numbered', items: ['Step one', 'Step two'] },
        { id: '5', type: 'callout', content: 'Warning: Critical step', tone: 'warning' }
    ],
    meeting: [
        { id: '1', type: 'heading', content: 'Meeting Minutes', level: 2 },
        { id: '2', type: 'paragraph', content: 'Attendees: ...' },
        { id: '3', type: 'heading', content: 'Agenda', level: 2 },
        { id: '4', type: 'bullets', items: ['Topic 1', 'Topic 2'] },
        { id: '5', type: 'heading', content: 'Action Items', level: 2 },
        { id: '6', type: 'todo', todos: [{ text: 'Follow up with team', done: false }] }
    ],
    sales_call: [
        { id: '1', type: 'heading', content: 'Sales Call Notes', level: 2 },
        { id: '2', type: 'paragraph', content: ' Prospect Name: ...' },
        { id: '3', type: 'paragraph', content: 'Pain Points: ...' },
        { id: '4', type: 'heading', content: 'Solution Offered', level: 2 },
        { id: '5', type: 'callout', content: 'Success: Quote sent', tone: 'success' }
    ],
    task: [
        { id: '1', type: 'heading', content: 'Task Brief', level: 2 },
        { id: '2', type: 'paragraph', content: 'Deadline: ...' },
        { id: '3', type: 'heading', content: 'Subtasks', level: 2 },
        { id: '4', type: 'todo', todos: [{ text: 'Start drafting', done: false }, { text: 'Internal review', done: false }] }
    ],
    general: [
        { id: '1', type: 'paragraph', content: '' }
    ]
};

const CATEGORY_META: Record<NoteCategory, { label: string; emoji: string; color: string }> = {
    general: { label: 'General', emoji: '📄', color: 'text-gray-400' },
    idea: { label: 'Idea', emoji: '💡', color: 'text-amber-400' },
    meeting: { label: 'Meeting', emoji: '🗓️', color: 'text-blue-400' },
    sales_call: { label: 'Sales Call', emoji: '📞', color: 'text-emerald-400' },
    sop: { label: 'SOP', emoji: '📋', color: 'text-violet-400' },
    task: { label: 'Task', emoji: '✓', color: 'text-rose-400' },
};

export default function CreateEditNoteModal({
    isOpen,
    onClose,
    onSave,
    note,
    mode,
    clients,
    projects,
    defaultClientId,
    defaultProjectId
}: CreateEditNoteModalProps) {
    const { success: toastSuccess, error: toastError } = useToast();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<NoteCategory>('general');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [blocks, setBlocks] = useState<NoteBlock[]>([]);
    const [clientId, setClientId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [visibility, setVisibility] = useState<NoteVisibility>('internal');
    const [isPinned, setIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProperties, setShowProperties] = useState(true);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && note) {
            setTitle(note.title);
            setCategory(note.category);
            setTags(note.tags || []);
            setBlocks(Array.isArray(note.content) ? note.content : []);
            setClientId(note.clientId || '');
            setProjectId(note.projectId || '');
            setVisibility(note.visibility);
            setIsPinned(note.pinned);
        } else {
            setTitle('');
            setCategory('general');
            setTags([]);
            setBlocks(TEMPLATES.general);
            setClientId(defaultClientId || '');
            setProjectId(defaultProjectId || '');
            setVisibility('internal');
            setIsPinned(false);
        }
    }, [note, mode, isOpen, defaultClientId, defaultProjectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const plainText = blocks.map(b => b.content || b.items?.join(' ') || b.todos?.map(t => t.text).join(' ') || '').join(' ').slice(0, 1000);

            const noteData = {
                title: title.trim(),
                category,
                tags,
                content: blocks,
                plainText,
                clientId: clientId || null,
                projectId: projectId || null,
                visibility,
                pinned: isPinned,
                attachments: note?.attachments || []
            };

            if (mode === 'edit' && note) {
                await noteService.update(note.id, noteData as any);
                toastSuccess('Note updated successfully.');
            } else {
                await noteService.create(noteData as any);
                toastSuccess('Note created successfully.');
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving note:', error);
            toastError(mode === 'edit' ? 'Failed to update note.' : 'Failed to create note.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const applyTemplate = (cat: NoteCategory, force = false) => {
        const oldCategory = category;
        setCategory(cat);
        const isUnedited = blocks.length <= 1 || JSON.stringify(blocks) === JSON.stringify(TEMPLATES[oldCategory]);
        if (force || (mode === 'create' && isUnedited)) {
            setBlocks(TEMPLATES[cat]);
        }
        setShowCategoryPicker(false);
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const catMeta = CATEGORY_META[category];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            maxWidth="max-w-4xl"
            hideHeader
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
                {/* Top bar — minimal, Notion-style */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                        <div className="h-4 w-px bg-white/10" />
                        <button
                            type="button"
                            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <span className="text-base leading-none">{catMeta.emoji}</span>
                            <span className={catMeta.color}>{catMeta.label}</span>
                            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        {showCategoryPicker && (
                            <div className="absolute top-12 left-16 z-50 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[180px]">
                                {(Object.keys(CATEGORY_META) as NoteCategory[]).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => applyTemplate(cat)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <span className="text-base leading-none">{CATEGORY_META[cat].emoji}</span>
                                        <span>{CATEGORY_META[cat].label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsPinned(!isPinned)}
                            className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                            title="Pin note"
                        >
                            <BookmarkIcon className={`h-4.5 w-4.5 ${isPinned ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="px-4 py-1.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Body — editor + properties sidebar */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Editor area — Notion-style, clean */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-8 sm:px-12 lg:px-16 py-8">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Untitled"
                            autoFocus
                            className="w-full bg-transparent text-white placeholder:text-gray-700 focus:outline-none text-3xl sm:text-4xl font-bold tracking-tight mb-1"
                            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                            required
                        />
                        <div className="flex items-center gap-3 mb-6 text-xs text-gray-600">
                            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>·</span>
                            <span>{blocks.length} blocks</span>
                            {tags.length > 0 && (
                                <>
                                    <span>·</span>
                                    <div className="flex items-center gap-1">
                                        {tags.slice(0, 3).map(t => (
                                            <span key={t} className="text-[#3aa3eb]">#{t}</span>
                                        ))}
                                        {tags.length > 3 && <span className="text-gray-700">+{tags.length - 3}</span>}
                                    </div>
                                </>
                            )}
                        </div>
                        <NoteEditor
                            content={blocks}
                            onChange={setBlocks}
                        />
                    </div>

                    {/* Properties sidebar — Notion-style toggle panel */}
                    <div className="w-64 shrink-0 border-l border-white/5 overflow-y-auto custom-scrollbar hidden lg:block">
                        <div className="p-5 space-y-5">
                            <button
                                type="button"
                                onClick={() => setShowProperties(!showProperties)}
                                className="flex items-center justify-between w-full text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors"
                            >
                                <span>Properties</span>
                                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showProperties ? '' : '-rotate-90'}`} />
                            </button>

                            {showProperties && (
                                <div className="space-y-4">
                                    {/* Client link */}
                                    <PropertyRow icon={<LinkIcon className="h-3.5 w-3.5" />} label="Client">
                                        <select
                                            value={clientId}
                                            onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}
                                            className="w-full bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                                        >
                                            <option value="" className="bg-[#1c1c1e]">None</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id} className="bg-[#1c1c1e]">{c.name}</option>
                                            ))}
                                        </select>
                                    </PropertyRow>

                                    {/* Project link */}
                                    {clientId && (
                                        <PropertyRow icon={<LinkIcon className="h-3.5 w-3.5" />} label="Project">
                                            <select
                                                value={projectId}
                                                onChange={(e) => setProjectId(e.target.value)}
                                                className="w-full bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#1c1c1e]">None</option>
                                                {projects.filter(p => p.client_id === clientId).map(p => (
                                                    <option key={p.id} value={p.id} className="bg-[#1c1c1e]">{p.name}</option>
                                                ))}
                                            </select>
                                        </PropertyRow>
                                    )}

                                    {/* Visibility toggle */}
                                    <PropertyRow icon={null} label="Shared">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!clientId && visibility === 'internal') {
                                                    alert('You must link a client before sharing this note.');
                                                    return;
                                                }
                                                setVisibility(visibility === 'internal' ? 'client_visible' : 'internal');
                                            }}
                                            className={`relative w-9 h-5 rounded-full transition-colors ${visibility === 'client_visible' ? 'bg-[#3aa3eb]' : 'bg-gray-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${visibility === 'client_visible' ? 'left-4' : 'left-0.5'}`} />
                                        </button>
                                    </PropertyRow>

                                    {/* Tags */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <TagIcon className="h-3.5 w-3.5 text-gray-500" />
                                            <span className="text-xs text-gray-500">Tags</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Add tag..."
                                            className="w-full bg-transparent text-sm text-white placeholder:text-gray-700 focus:outline-none border-b border-white/5 pb-1.5"
                                        />
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                {tags.map(tag => (
                                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#3aa3eb]/10 rounded text-xs text-[#3aa3eb]">
                                                        {tag}
                                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                                                            <XMarkIcon className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

function PropertyRow({ icon, label, children }: { icon: React.ReactNode | null; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
                {icon && <span className="text-gray-500">{icon}</span>}
                <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}
