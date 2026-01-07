import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    TagIcon,
    LinkIcon,
    BookmarkIcon,
    SparklesIcon
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
        { id: '1', type: 'paragraph', content: 'Start taking notes...' }
    ]
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
            // Calculate plainText for search
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
            } else {
                await noteService.create(noteData as any);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const applyTemplate = (cat: NoteCategory, force = false) => {
        const oldCategory = category;
        setCategory(cat);

        // If force is true, or if blocks are unedited (match previous template or are empty)
        const isUnedited = blocks.length <= 1 || JSON.stringify(blocks) === JSON.stringify(TEMPLATES[oldCategory]);

        if (force || (mode === 'create' && isUnedited)) {
            setBlocks(TEMPLATES[cat]);
        }
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? 'Create Note' : 'Edit Note'}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title & Category Row */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Note Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your note a name..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/50 transition-all font-bold text-lg"
                            required
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => applyTemplate(e.target.value as NoteCategory)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="general">General</option>
                            <option value="idea">Idea</option>
                            <option value="meeting">Meeting</option>
                            <option value="sales_call">Sales Call</option>
                            <option value="sop">SOP</option>
                            <option value="task">Task</option>
                        </select>
                    </div>
                </div>

                {/* Templates Quick Bar */}
                {mode === 'create' && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest self-center mr-2">Quick Start:</span>
                        {Object.keys(TEMPLATES).map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => applyTemplate(cat as NoteCategory)}
                                className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${category === cat
                                    ? 'bg-[#3aa3eb]/20 border-[#3aa3eb]/50 text-[#3aa3eb]'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                {cat.replace('_', ' ')}
                            </button>
                        ))}
                        {/* Reset Option if content was edited but category matches */}
                        {mode === 'create' && JSON.stringify(blocks) !== JSON.stringify(TEMPLATES[category]) && (
                            <button
                                type="button"
                                onClick={() => applyTemplate(category, true)}
                                className="px-3 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-all ml-auto"
                            >
                                Reset to Template
                            </button>
                        )}
                    </div>
                )}

                {/* Editor Area */}
                <div className="glass-card rounded-2xl border border-white/10 p-6 min-h-[400px]">
                    <NoteEditor
                        content={blocks}
                        onChange={setBlocks}
                    />
                </div>

                {/* Links & Tags Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                <LinkIcon className="h-3 w-3" /> Link to Client
                            </label>
                            <select
                                value={clientId}
                                onChange={(e) => {
                                    setClientId(e.target.value);
                                    setProjectId(''); // Reset project when client changes
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all"
                            >
                                <option value="">No Client Linked</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        {clientId && (
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    <LinkIcon className="h-3 w-3" /> Link to Project
                                </label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all"
                                >
                                    <option value="">No Project Linked</option>
                                    {projects.filter(p => p.client_id === clientId).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                <TagIcon className="h-3 w-3" /> Tags (Press Enter)
                            </label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    placeholder="marketing, research, q1..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/50 transition-all"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-[#3aa3eb]/10 border border-[#3aa3eb]/20 rounded-full text-[10px] font-bold text-[#3aa3eb] uppercase tracking-wider">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)}>
                                                <XMarkIcon className="h-3 w-3 hover:text-white" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 flex flex-col justify-between">
                        <div className="space-y-4 pt-1">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Visibility</h4>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                        {visibility === 'client_visible' ? 'Shared with Client' : 'Internal Only'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!clientId && visibility === 'internal') {
                                            alert('You must link a client before sharing this note.');
                                            return;
                                        }
                                        setVisibility(visibility === 'internal' ? 'client_visible' : 'internal');
                                    }}
                                    className={`w-12 h-6 rounded-full transition-all relative ${visibility === 'client_visible' ? 'bg-[#3aa3eb]' : 'bg-gray-700'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${visibility === 'client_visible' ? 'left-7' : 'left-1'
                                        }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Pin to Top</h4>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                        {isPinned ? 'Pinned' : 'Default'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPinned(!isPinned)}
                                    className={`p-2 rounded-xl transition-all ${isPinned ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-white/5 text-gray-500 border border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <BookmarkIcon className={`h-5 w-5 ${isPinned ? 'fill-yellow-500' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white uppercase tracking-wider transition-all"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim()}
                                className="flex-[2] btn-primary shrink-glow-button px-6 py-3 rounded-xl text-sm font-bold text-white uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <SparklesIcon className="h-5 w-5" />
                                        {mode === 'create' ? 'Create Note' : 'Save Changes'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
