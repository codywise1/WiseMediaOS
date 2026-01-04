import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    TrashIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ListBulletIcon,
    NumberedListIcon,
    CheckCircleIcon,
    QueueListIcon,
    ChatBubbleBottomCenterTextIcon,
    InformationCircleIcon,
    CodeBracketIcon,
    MinusIcon
} from '@heroicons/react/24/outline';
import { NoteBlock, NoteCategory } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface NoteEditorProps {
    content: NoteBlock[];
    onChange: (content: NoteBlock[]) => void;
    readOnly?: boolean;
}

export default function NoteEditor({ content, onChange, readOnly = false }: NoteEditorProps) {
    const [blocks, setBlocks] = useState<NoteBlock[]>(content || []);

    useEffect(() => {
        if (JSON.stringify(content) !== JSON.stringify(blocks)) {
            setBlocks(content || []);
        }
    }, [content]);

    const updateBlocks = (newBlocks: NoteBlock[]) => {
        setBlocks(newBlocks);
        onChange(newBlocks);
    };

    const addBlock = (type: NoteBlock['type'], index?: number) => {
        const newBlock: NoteBlock = {
            id: uuidv4(),
            type,
            content: '',
            ...(type === 'heading' ? { level: 2 } : {}),
            ...(type === 'bullets' || type === 'numbered' ? { items: [''] } : {}),
            ...(type === 'todo' ? { todos: [{ text: '', done: false }] } : {}),
            ...(type === 'callout' ? { tone: 'info' } : {}),
        };

        const newBlocks = [...blocks];
        if (typeof index === 'number') {
            newBlocks.splice(index + 1, 0, newBlock);
        } else {
            newBlocks.push(newBlock);
        }
        updateBlocks(newBlocks);
    };

    const removeBlock = (id: string) => {
        updateBlocks(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;

        const newBlocks = [...blocks];
        const [movedBlock] = newBlocks.splice(index, 1);
        newBlocks.splice(newIndex, 0, movedBlock);
        updateBlocks(newBlocks);
    };

    const handleBlockChange = (id: string, updates: Partial<NoteBlock>) => {
        updateBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    return (
        <div className="space-y-4">
            {blocks.map((block, index) => (
                <div key={block.id} className="group relative">
                    <div className="flex items-start gap-3">
                        {!readOnly && (
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-10 top-0 mt-1">
                                <button
                                    onClick={() => moveBlock(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 disabled:opacity-30"
                                >
                                    <ChevronUpIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => moveBlock(index, 'down')}
                                    disabled={index === blocks.length - 1}
                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 disabled:opacity-30"
                                >
                                    <ChevronDownIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => removeBlock(block.id)}
                                    className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-gray-500"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex-1">
                            <BlockComponent
                                block={block}
                                onChange={(updates) => handleBlockChange(block.id, updates)}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity my-2">
                            <div className="h-px bg-white/10 flex-1 self-center" />
                            <div className="flex items-center gap-2 px-3">
                                <button
                                    onClick={() => addBlock('paragraph', index)}
                                    className="p-1.5 bg-[#3aa3eb]/10 hover:bg-[#3aa3eb]/20 text-[#3aa3eb] rounded-full transition-all hover:scale-110"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="h-px bg-white/10 flex-1 self-center" />
                        </div>
                    )}
                </div>
            ))}

            {!readOnly && blocks.length === 0 && (
                <div
                    onClick={() => addBlock('paragraph')}
                    className="border-2 border-dashed border-white/5 rounded-2xl p-12 text-center cursor-pointer hover:border-white/10 hover:bg-white/2 transition-all"
                >
                    <PlusIcon className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Click to add your first block</p>
                </div>
            )}

            {!readOnly && blocks.length > 0 && (
                <div className="flex items-center gap-2 pt-8 border-t border-white/5 overflow-x-auto pb-4 scrollbar-hide">
                    <BlockTypeButton icon={InformationCircleIcon} label="Intro/Info" onClick={() => addBlock('callout')} />
                    <BlockTypeButton icon={ListBulletIcon} label="Bullets" onClick={() => addBlock('bullets')} />
                    <BlockTypeButton icon={NumberedListIcon} label="Steps" onClick={() => addBlock('numbered')} />
                    <BlockTypeButton icon={CheckCircleIcon} label="Tasks" onClick={() => addBlock('todo')} />
                    <BlockTypeButton icon={QueueListIcon} label="Toggle" onClick={() => addBlock('toggle')} />
                    <BlockTypeButton icon={ChatBubbleBottomCenterTextIcon} label="Quote" onClick={() => addBlock('quote')} />
                    <BlockTypeButton icon={CodeBracketIcon} label="Snippet" onClick={() => addBlock('code')} />
                    <BlockTypeButton icon={MinusIcon} label="Divider" onClick={() => addBlock('divider')} />
                </div>
            )}
        </div>
    );
}

function BlockTypeButton({ icon: Icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all whitespace-nowrap"
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

function BlockComponent({ block, onChange, readOnly }: { block: NoteBlock, onChange: (updates: Partial<NoteBlock>) => void, readOnly: boolean }) {
    const baseClasses = "w-full bg-transparent focus:outline-none placeholder:text-gray-600 text-white transition-all";

    switch (block.type) {
        case 'heading':
            return (
                <input
                    type="text"
                    value={block.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    placeholder="Heading"
                    disabled={readOnly}
                    className={`${baseClasses} text-2xl font-black tracking-tight ${block.level === 1 ? 'text-3xl' : 'text-2xl'}`}
                />
            );

        case 'paragraph':
            return (
                <textarea
                    value={block.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    placeholder="Start typing..."
                    disabled={readOnly}
                    rows={1}
                    className={`${baseClasses} text-gray-300 resize-none overflow-hidden leading-relaxed`}
                    onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                />
            );

        case 'bullets':
            return (
                <ul className="list-disc list-inside space-y-2">
                    {block.items?.map((item, i) => (
                        <li key={i} className="text-gray-300">
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => {
                                    const newItems = [...(block.items || [])];
                                    newItems[i] = e.target.value;
                                    onChange({ items: newItems });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newItems = [...(block.items || [])];
                                        newItems.splice(i + 1, 0, '');
                                        onChange({ items: newItems });
                                    } else if (e.key === 'Backspace' && !item && block.items && block.items.length > 1) {
                                        e.preventDefault();
                                        const newItems = block.items.filter((_, idx) => idx !== i);
                                        onChange({ items: newItems });
                                    }
                                }}
                                placeholder="List item..."
                                disabled={readOnly}
                                className={`${baseClasses} inline-block w-[calc(100%-24px)] ml-2`}
                            />
                        </li>
                    ))}
                </ul>
            );

        case 'todo':
            return (
                <div className="space-y-3">
                    {block.todos?.map((todo, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (readOnly) return;
                                    const newTodos = [...(block.todos || [])];
                                    newTodos[i].done = !newTodos[i].done;
                                    onChange({ todos: newTodos });
                                }}
                                className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${todo.done ? 'bg-[#3aa3eb] border-[#3aa3eb] text-white' : 'border-white/20 hover:border-[#3aa3eb]/50'
                                    }`}
                            >
                                {todo.done && <CheckCircleIcon className="h-4 w-4" />}
                            </button>
                            <input
                                type="text"
                                value={todo.text}
                                onChange={(e) => {
                                    const newTodos = [...(block.todos || [])];
                                    newTodos[i].text = e.target.value;
                                    onChange({ todos: newTodos });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newTodos = [...(block.todos || [])];
                                        newTodos.splice(i + 1, 0, { text: '', done: false });
                                        onChange({ todos: newTodos });
                                    } else if (e.key === 'Backspace' && !todo.text && block.todos && block.todos.length > 1) {
                                        e.preventDefault();
                                        const newTodos = block.todos.filter((_, idx) => idx !== i);
                                        onChange({ todos: newTodos });
                                    }
                                }}
                                placeholder="Todo item..."
                                disabled={readOnly}
                                className={`${baseClasses} ${todo.done ? 'text-gray-600 line-through' : 'text-gray-300'}`}
                            />
                        </div>
                    ))}
                </div>
            );

        case 'callout':
            const toneMap = {
                info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: InformationCircleIcon },
                warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: InformationCircleIcon },
                error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: InformationCircleIcon },
                success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: InformationCircleIcon }
            };
            const tone = toneMap[block.tone || 'info'];
            const Icon = tone.icon;

            return (
                <div className={`p-4 rounded-xl border ${tone.bg} ${tone.border} flex gap-4`}>
                    <Icon className={`h-6 w-6 shrink-0 ${tone.text}`} />
                    <div className="flex-1">
                        <textarea
                            value={block.content}
                            onChange={(e) => onChange({ content: e.target.value })}
                            placeholder="Important information..."
                            disabled={readOnly}
                            rows={1}
                            className={`${baseClasses} ${tone.text} resize-none overflow-hidden leading-relaxed font-medium`}
                            onInput={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                    </div>
                </div>
            );

        case 'quote':
            return (
                <div className="border-l-4 border-[#3aa3eb] pl-6 py-2">
                    <textarea
                        value={block.content}
                        onChange={(e) => onChange({ content: e.target.value })}
                        placeholder="Inspiring quote..."
                        disabled={readOnly}
                        rows={1}
                        className={`${baseClasses} italic text-xl text-gray-300 resize-none overflow-hidden leading-relaxed`}
                        onInput={(e: any) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>
            );

        case 'divider':
            return <div className="h-px bg-white/10 w-full my-4" />;

        case 'code':
            return (
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-sm">
                    <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                        <input
                            type="text"
                            value={block.lang || 'typescript'}
                            onChange={(e) => onChange({ lang: e.target.value })}
                            className="bg-transparent focus:outline-none w-24"
                            placeholder="language"
                            disabled={readOnly}
                        />
                    </div>
                    <textarea
                        value={block.content}
                        onChange={(e) => onChange({ content: e.target.value })}
                        placeholder="// Paste code here..."
                        disabled={readOnly}
                        rows={4}
                        className={`${baseClasses} text-blue-400 font-mono resize-none overflow-hidden leading-relaxed`}
                        onInput={(e: any) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                </div>
            );

        default:
            return null;
    }
}
