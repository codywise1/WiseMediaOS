import React, { useState, useEffect, useRef } from 'react';
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
    MinusIcon,
    BoldIcon,
    ItalicIcon,
    LinkIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';
import { NoteBlock, NoteCategory } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const parseMarkdown = (text: string) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300">$1</a>');
};

interface NoteEditorProps {
    content: NoteBlock[];
    onChange: (content: NoteBlock[]) => void;
    readOnly?: boolean;
}

interface SlashMenuState {
    show: boolean;
    index: number;
    query: string;
    position: { top: number; left: number };
}

interface InlineToolbarState {
    show: boolean;
    position: { top: number; left: number };
    blockIndex: number;
}

export default function NoteEditor({ content, onChange, readOnly = false }: NoteEditorProps) {
    const [blocks, setBlocks] = useState<NoteBlock[]>(content || []);
    const refs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
    const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
        show: false,
        index: -1,
        query: '',
        position: { top: 0, left: 0 }
    });
    const [inlineToolbar, setInlineToolbar] = useState<InlineToolbarState>({
        show: false,
        position: { top: 0, left: 0 },
        blockIndex: -1
    });
    const [focusInfo, setFocusInfo] = useState<{ id: string, offset: number, itemIndex?: number } | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const showInlineToolbar = (index: number) => {
        const textarea = refs.current[index];
        if (!textarea) return;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setInlineToolbar({
                show: true,
                position: { top: rect.top - 50, left: rect.left + rect.width / 2 - 50 },
                blockIndex: index
            });
        } else {
            hideInlineToolbar();
        }
    };

    const hideInlineToolbar = () => {
        setInlineToolbar({ show: false, position: { top: 0, left: 0 }, blockIndex: -1 });
    };

    useEffect(() => {
        if (JSON.stringify(content) !== JSON.stringify(blocks)) {
            setBlocks(content || []);
        }
    }, [content]);

    useEffect(() => {
        if (focusInfo) {
            const index = blocks.findIndex(b => b.id === focusInfo.id);
            if (index !== -1 && refs.current[index]) {
                const el = refs.current[index];

                if (typeof focusInfo.itemIndex === 'number') {
                    // Handle list item focus
                    const inputs = el?.querySelectorAll('input');
                    if (inputs && inputs[focusInfo.itemIndex]) {
                        const input = inputs[focusInfo.itemIndex];
                        input.focus();
                        setTimeout(() => {
                            input.setSelectionRange(focusInfo.offset, focusInfo.offset);
                        }, 0);
                    }
                } else {
                    // Handle standard block focus
                    el?.focus();
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        setTimeout(() => {
                            el.setSelectionRange(focusInfo.offset, focusInfo.offset);
                        }, 0);
                    }
                }
                setFocusInfo(null);
            }
        }
    }, [blocks, focusInfo]);

    const updateBlocks = (newBlocks: NoteBlock[]) => {
        setBlocks(newBlocks);
        onChange(newBlocks);
    };

    const addBlock = (type: NoteBlock['type'], index?: number, props?: Partial<NoteBlock>) => {
        const newBlock: NoteBlock = {
            id: uuidv4(),
            type,
            content: '',
            ...(type === 'heading' ? { level: 2 } : {}),
            ...props,
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

    const handleSlashCommand = (index: number, textarea: HTMLTextAreaElement | HTMLInputElement, start: number, text: string) => {
        if (start === 0 || text[start - 1] === '\n') {
            const rect = textarea.getBoundingClientRect();
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
            const lines = text.slice(0, start).split('\n').length - 1;
            setSlashMenu({
                show: true,
                index,
                query: '',
                position: { top: rect.top + lines * lineHeight + 20, left: rect.left }
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, block: NoteBlock, index: number, itemIndex?: number) => {
        const isList = block.type === 'bullets' || block.type === 'numbered' || block.type === 'todo';

        if (e.key === 'Enter' && !e.shiftKey && !slashMenu.show) {
            e.preventDefault();

            if (isList && typeof itemIndex === 'number') {
                const items = block.type === 'todo' ? block.todos : block.items;
                const currentItem = block.type === 'todo' ? (items as any[])[itemIndex].text : (items as string[])[itemIndex];

                // If empty item and it's the last one (or only one), break out of list
                if ((!currentItem || currentItem === '') && items && items.length > 0) {
                    // If it's the only item, just turn block to paragraph
                    if (items.length === 1) {
                        const newBlocks = [...blocks];
                        newBlocks[index] = { ...block, type: 'paragraph', content: '', items: undefined, todos: undefined };
                        updateBlocks(newBlocks);
                        setFocusInfo({ id: block.id, offset: 0 });
                        return;
                    }

                    // If it's the last item, remove it and create new paragraph after
                    if (itemIndex === items.length - 1) {
                        const newItems = [...(items as any[])];
                        newItems.pop();
                        const newBlocks = [...blocks];
                        // Update list
                        newBlocks[index] = {
                            ...block,
                            [block.type === 'todo' ? 'todos' : 'items']: newItems
                        };
                        // Add new paragraph
                        const newBlockId = uuidv4();
                        newBlocks.splice(index + 1, 0, { id: newBlockId, type: 'paragraph', content: '' });

                        updateBlocks(newBlocks);
                        setFocusInfo({ id: newBlockId, offset: 0 });
                        return;
                    }
                }

                // Normal list behavior: add new item
                if (block.type === 'todo') {
                    const newTodos = [...(block.todos || [])];
                    newTodos.splice(itemIndex + 1, 0, { text: '', done: false });
                    handleBlockChange(block.id, { todos: newTodos });
                    setFocusInfo({ id: block.id, offset: 0, itemIndex: itemIndex + 1 });
                } else {
                    const newItems = [...(block.items || [])];
                    newItems.splice(itemIndex + 1, 0, '');
                    handleBlockChange(block.id, { items: newItems });
                    setFocusInfo({ id: block.id, offset: 0, itemIndex: itemIndex + 1 });
                }
                return;
            }

            const el = e.target as HTMLInputElement | HTMLTextAreaElement;
            const start = el.selectionStart || 0;
            const content = block.content || '';

            const left = content.slice(0, start);
            const right = content.slice(start);

            const newBlock: NoteBlock = {
                id: uuidv4(),
                type: 'paragraph',
                content: right
            };

            const newBlocks = [...blocks];
            newBlocks[index] = { ...block, content: left };
            newBlocks.splice(index + 1, 0, newBlock);
            updateBlocks(newBlocks);
            setFocusInfo({ id: newBlock.id, offset: 0 });

        } else if (e.key === 'Backspace') {
            const el = e.target as HTMLInputElement | HTMLTextAreaElement;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;

            if (start === 0 && end === 0) {
                if (isList && typeof itemIndex === 'number') {
                    // List backspace logic
                    if (itemIndex === 0) {
                        // First item logic
                        const items = block.type === 'todo' ? block.todos : block.items;
                        if (items && items.length === 1 && !isListContentEmpty(block, itemIndex)) {
                            // Turn to paragraph if single item with content
                            // Actually standard behavior is usually: if content matches list style, maybe nothing?
                            // But Notion turns it to text if you backspace at start.
                            // Let's implement: merge into previous block if exists, or turn to paragraph?
                            // If index > 0, merge to previous block
                            if (index > 0) {
                                e.preventDefault();
                                // Implementation of merging list into previous block is complex. 
                                // Simplified: just focus previous block for now if complicated.
                                const prev = blocks[index - 1];
                                setFocusInfo({
                                    id: prev.id,
                                    offset: (prev.content?.length || 0),
                                    itemIndex: (prev.type === 'bullets' || prev.type === 'numbered' || prev.type === 'todo')
                                        ? (prev.items?.length || prev.todos?.length || 1) - 1
                                        : undefined
                                });
                                return;
                            }
                        }
                    } else {
                        // Not first item
                        e.preventDefault();
                        const items = block.type === 'todo' ? block.todos : block.items;
                        const newItems = [...(items as any[])];
                        const removedItem = newItems.splice(itemIndex, 1)[0];
                        const prevItem = newItems[itemIndex - 1];

                        // Append content to previous item
                        const removedText = block.type === 'todo' ? (removedItem as any).text : (removedItem as string);
                        const prevText = block.type === 'todo' ? (prevItem as any).text : (prevItem as string);

                        if (block.type === 'todo') {
                            (newItems[itemIndex - 1] as any).text = prevText + removedText;
                            handleBlockChange(block.id, { todos: newItems });
                        } else {
                            newItems[itemIndex - 1] = prevText + removedText;
                            handleBlockChange(block.id, { items: newItems as string[] });
                        }
                        setFocusInfo({ id: block.id, offset: prevText.length, itemIndex: itemIndex - 1 });
                        return;
                    }
                }

                if (index === 0) return;
                e.preventDefault();

                const prevBlock = blocks[index - 1];
                const currentContent = block.content || '';

                if (prevBlock.type === 'paragraph' || prevBlock.type === 'heading') {
                    const prevContent = prevBlock.content || '';
                    const newBlocks = [...blocks];
                    newBlocks[index - 1] = {
                        ...prevBlock,
                        content: prevContent + currentContent
                    };
                    newBlocks.splice(index, 1);
                    updateBlocks(newBlocks);
                    setFocusInfo({ id: prevBlock.id, offset: prevContent.length });
                } else if (prevBlock.type === 'bullets' || prevBlock.type === 'numbered' || prevBlock.type === 'todo') {
                    // Merge textual block INTO list?
                    // Append content to last item of list
                    const items = prevBlock.type === 'todo' ? [...(prevBlock.todos || [])] : [...(prevBlock.items || [])];
                    const lastIdx = items.length - 1;
                    if (lastIdx >= 0) {
                        const lastItem = items[lastIdx];
                        const lastText = prevBlock.type === 'todo' ? (lastItem as any).text : (lastItem as string);

                        if (prevBlock.type === 'todo') {
                            (items[lastIdx] as any).text = lastText + currentContent;
                            const newBlocks = [...blocks];
                            newBlocks[index - 1] = { ...prevBlock, todos: items as any[] };
                            newBlocks.splice(index, 1);
                            updateBlocks(newBlocks);
                        } else {
                            items[lastIdx] = lastText + currentContent;
                            const newBlocks = [...blocks];
                            newBlocks[index - 1] = { ...prevBlock, items: items as any[] };
                            newBlocks.splice(index, 1);
                            updateBlocks(newBlocks);
                        }
                        setFocusInfo({ id: prevBlock.id, offset: lastText.length, itemIndex: lastIdx });
                    }
                } else {
                    if (currentContent.length === 0) {
                        removeBlock(block.id);
                        setFocusInfo({ id: prevBlock.id, offset: (prevBlock.content || '').length });
                    } else {
                        setFocusInfo({ id: prevBlock.id, offset: (prevBlock.content || '').length });
                    }
                }
            }
        } else if (e.key === 'ArrowUp') {
            if (isList && typeof itemIndex === 'number' && itemIndex > 0) {
                e.preventDefault();
                setFocusInfo({ id: block.id, offset: 0, itemIndex: itemIndex - 1 });
                return;
            }

            if (index > 0) {
                e.preventDefault();
                const prev = blocks[index - 1];
                const prevIsList = prev.type === 'bullets' || prev.type === 'numbered' || prev.type === 'todo';
                const lastItemIdx = prevIsList
                    ? (prev.type === 'todo' ? (prev.todos?.length || 1) : (prev.items?.length || 1)) - 1
                    : undefined;

                setFocusInfo({ id: prev.id, offset: 0, itemIndex: lastItemIdx });
            }
        } else if (e.key === 'ArrowDown') {
            if (isList && typeof itemIndex === 'number') {
                const itemsCount = block.type === 'todo' ? (block.todos?.length || 0) : (block.items?.length || 0);
                if (itemIndex < itemsCount - 1) {
                    e.preventDefault();
                    setFocusInfo({ id: block.id, offset: 0, itemIndex: itemIndex + 1 });
                    return;
                }
            }

            if (index < blocks.length - 1) {
                e.preventDefault();
                const next = blocks[index + 1];
                const nextIsList = next.type === 'bullets' || next.type === 'numbered' || next.type === 'todo';

                setFocusInfo({ id: next.id, offset: 0, itemIndex: nextIsList ? 0 : undefined });
            }
        }
    };

    const isListContentEmpty = (block: NoteBlock, index: number) => {
        if (block.type === 'todo') return !block.todos?.[index]?.text;
        return !block.items?.[index];
    };

    const closeSlashMenu = () => {
        setSlashMenu({ show: false, index: -1, query: '', position: { top: 0, left: 0 } });
    };

    const selectBlockType = (type: NoteBlock['type'], props?: Partial<NoteBlock>) => {
        addBlock(type, slashMenu.index, props);
        closeSlashMenu();
    };

    const applyFormatting = (index: number, format: 'bold' | 'italic' | 'link') => {
        const block = blocks[index];
        if (!block) return;

        const el = refs.current[index];
        if (!el) return;

        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const start = el.selectionStart;
            const end = el.selectionEnd;

            if (start === null || end === null || start === end) return;

            const text = block.content || '';
            const selected = text.substring(start, end);

            let prefix = '';
            let suffix = '';

            switch (format) {
                case 'bold':
                    prefix = '**';
                    suffix = '**';
                    break;
                case 'italic':
                    prefix = '*';
                    suffix = '*';
                    break;
                case 'link':
                    prefix = '[';
                    suffix = '](url)';
                    break;
            }

            const newContent = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
            handleBlockChange(block.id, { content: newContent });

            // Restore selection after update (delayed to allow render)
            setTimeout(() => {
                if (el) {
                    el.focus();
                    el.setSelectionRange(start + prefix.length, end + prefix.length);
                }
            }, 0);
        }
    };

    const blockTypes = [
        { label: 'Paragraph', value: 'paragraph' as NoteBlock['type'] },
        { label: 'Heading 1', value: 'heading' as NoteBlock['type'], props: { level: 1 } },
        { label: 'Heading 2', value: 'heading' as NoteBlock['type'], props: { level: 2 } },
        { label: 'Heading 3', value: 'heading' as NoteBlock['type'], props: { level: 3 } },
        { label: 'Bulleted List', value: 'bullets' as NoteBlock['type'] },
        { label: 'Numbered List', value: 'numbered' as NoteBlock['type'] },
        { label: 'To Do', value: 'todo' as NoteBlock['type'] },
        { label: 'Callout', value: 'callout' as NoteBlock['type'] },
        { label: 'Quote', value: 'quote' as NoteBlock['type'] },
        { label: 'Code', value: 'code' as NoteBlock['type'] },
        { label: 'Divider', value: 'divider' as NoteBlock['type'] },
    ];

    return (
        <div className="space-y-4 relative">
            {slashMenu.show && (
                <div
                    style={{
                        position: 'fixed',
                        top: slashMenu.position.top,
                        left: slashMenu.position.left,
                        zIndex: 1000
                    }}
                    className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto w-64"
                >
                    {blockTypes.map((type, i) => (
                        <button
                            key={i}
                            onClick={() => selectBlockType(type.value, (type as any).props)}
                            className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-800"
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            )}

            {inlineToolbar.show && (
                <div
                    style={{
                        position: 'fixed',
                        top: inlineToolbar.position.top,
                        left: inlineToolbar.position.left,
                        zIndex: 1000
                    }}
                    className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1"
                >
                    <button onClick={() => applyFormatting(inlineToolbar.blockIndex, 'bold')} className="p-1 hover:bg-gray-100 rounded"><BoldIcon className="h-4 w-4" /></button>
                    <button onClick={() => applyFormatting(inlineToolbar.blockIndex, 'italic')} className="p-1 hover:bg-gray-100 rounded"><ItalicIcon className="h-4 w-4" /></button>
                    <button onClick={() => applyFormatting(inlineToolbar.blockIndex, 'link')} className="p-1 hover:bg-gray-100 rounded"><LinkIcon className="h-4 w-4" /></button>
                </div>
            )}

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
                                index={index}
                                refs={refs}
                                slashMenu={slashMenu}
                                handleSlashCommand={handleSlashCommand}
                                closeSlashMenu={closeSlashMenu}
                                showInlineToolbar={showInlineToolbar}
                                onKeyDown={(e, itemIndex) => handleKeyDown(e, block, index, itemIndex)}
                                isActive={activeBlockId === block.id}
                                onActivate={() => setActiveBlockId(block.id)}
                            />
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex justify-start opacity-0 group-hover:opacity-100 transition-opacity my-2">
                            <div className="h-px bg-white/10 flex-1 self-center" />
                            <div className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-hide">
                                <BlockTypeButton icon={BoldIcon} label="" onClick={() => applyFormatting(index, 'bold')} />
                                <BlockTypeButton icon={ItalicIcon} label="" onClick={() => applyFormatting(index, 'italic')} />
                                <BlockTypeButton icon={LinkIcon} label="" onClick={() => applyFormatting(index, 'link')} />
                                <BlockTypeButton icon={HashtagIcon} label="H1" onClick={() => addBlock('heading', index + 1, { level: 1 })} />
                                <BlockTypeButton icon={HashtagIcon} label="H2" onClick={() => addBlock('heading', index + 1, { level: 2 })} />
                                <BlockTypeButton icon={HashtagIcon} label="H3" onClick={() => addBlock('heading', index + 1, { level: 3 })} />
                                <BlockTypeButton icon={InformationCircleIcon} label="" onClick={() => addBlock('callout', index + 1)} />
                                <BlockTypeButton icon={ListBulletIcon} label="" onClick={() => addBlock('bullets', index)} />
                                <BlockTypeButton icon={NumberedListIcon} label="" onClick={() => addBlock('numbered', index)} />
                                <BlockTypeButton icon={CheckCircleIcon} label="" onClick={() => addBlock('todo', index)} />
                                <BlockTypeButton icon={QueueListIcon} label="" onClick={() => addBlock('toggle', index)} />
                                <BlockTypeButton icon={ChatBubbleBottomCenterTextIcon} label="" onClick={() => addBlock('quote', index)} />
                                <BlockTypeButton icon={CodeBracketIcon} label="" onClick={() => addBlock('code', index)} />
                                <BlockTypeButton icon={MinusIcon} label="" onClick={() => addBlock('divider', index)} />
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
        </div>
    );
}

function BlockTypeButton({ icon: Icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all whitespace-nowrap"
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

function BlockComponent({
    block,
    onChange,
    readOnly,
    index,
    refs,
    slashMenu,
    handleSlashCommand,
    closeSlashMenu,
    showInlineToolbar,
    onKeyDown,
    isActive,
    onActivate
}: {
    block: NoteBlock,
    onChange: (updates: Partial<NoteBlock>) => void,
    readOnly: boolean,
    index: number,
    refs: React.MutableRefObject<(HTMLInputElement | HTMLTextAreaElement | null)[]>,
    slashMenu: SlashMenuState,
    handleSlashCommand: (index: number, textarea: HTMLTextAreaElement | HTMLInputElement, start: number, text: string) => void,
    closeSlashMenu: () => void,
    showInlineToolbar: (index: number) => void,
    onKeyDown?: (e: React.KeyboardEvent, itemIndex?: number) => void,
    isActive: boolean;
    onActivate: () => void;
}) {
    const baseClasses = "w-full bg-transparent focus:outline-none placeholder:text-gray-600 text-white transition-all";

    switch (block.type) {
        case 'heading':
            const fontSize = block.level === 1 ? 'text-4xl' : block.level === 2 ? 'text-3xl' : 'text-2xl';
            if (readOnly) {
                return <div className={`${fontSize} font-black tracking-tight text-white`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />;
            }
            if (!isActive) {
                return (
                    <div
                        className={`${fontSize} font-black tracking-tight text-white cursor-text min-h-[32px]`}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || `<span class="text-gray-600 opacity-50">Heading ${block.level || 2}</span>` }}
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    />
                );
            }
            return (
                <input
                    autoFocus
                    type="text"
                    value={block.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    placeholder={`Heading ${block.level || 2}`}
                    disabled={readOnly}
                    ref={(el) => refs.current[index] = el}
                    className={`${baseClasses} ${fontSize} font-black tracking-tight`}
                    onKeyDown={(e) => {
                        if (onKeyDown) onKeyDown(e);
                        if (e.key === '/' && !slashMenu.show) {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const start = input.selectionStart ?? 0;
                            handleSlashCommand(index, input, start, input.value);
                        } else if (slashMenu.show && slashMenu.index === index) {
                            if (e.key === 'Escape') {
                                closeSlashMenu();
                            }
                        }
                    }}
                />
            );

        case 'paragraph':
            if (readOnly) {
                return <div className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />;
            }
            if (!isActive) {
                return (
                    <div
                        className="text-gray-300 leading-relaxed cursor-text min-h-[24px]"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="text-gray-600 opacity-50">Type \'/\' for commands</span>' }}
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    />
                );
            }
            return (
                <textarea
                    autoFocus
                    value={block.content}
                    onChange={(e) => onChange({ content: e.target.value })}
                    placeholder="Start typing..."
                    disabled={readOnly}
                    rows={1}
                    ref={(el) => refs.current[index] = el}
                    className={`${baseClasses} text-gray-300 resize-none overflow-hidden leading-relaxed`}
                    onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                        if (onKeyDown) onKeyDown(e);
                        if (e.key === '/' && !slashMenu.show) {
                            e.preventDefault();
                            const textarea = e.target as HTMLTextAreaElement;
                            const start = textarea.selectionStart ?? 0;
                            handleSlashCommand(index, textarea, start, textarea.value);
                        } else if (slashMenu.show && slashMenu.index === index) {
                            if (e.key === 'Escape') {
                                closeSlashMenu();
                            }
                        }
                    }}
                />
            );

        case 'bullets':
            if (readOnly) {
                return (
                    <ul className="list-disc list-inside space-y-2">
                        {block.items?.map((item, i) => (
                            <li key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                        ))}
                    </ul>
                );
            }
            if (!isActive) {
                return (
                    <ul
                        className="list-disc list-inside space-y-2 cursor-text"
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    >
                        {block.items?.map((item, i) => (
                            <li key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(item) || '<span class="opacity-50">Empty item</span>' }} />
                        ))}
                    </ul>
                );
            }
            return (
                <ul className="list-disc list-inside space-y-2" ref={(el) => refs.current[index] = el as any}>
                    {block.items?.map((item, i) => (
                        <li key={i} className="text-gray-300">
                            <input
                                autoFocus={i === (block.items?.length || 1) - 1} // Autofocus last item or specific logic? Maybe just let user click. 
                                // Actually better to autofocus the one corresponding to cursor, but hard to know.
                                type="text"
                                value={item}
                                onChange={(e) => {
                                    const newItems = [...(block.items || [])];
                                    newItems[i] = e.target.value;
                                    onChange({ items: newItems });
                                }}
                                onKeyDown={(e) => {
                                    if (onKeyDown) onKeyDown(e, i);
                                }}
                                placeholder="List item..."
                                disabled={readOnly}
                                className={`${baseClasses} inline-block w-[calc(100%-24px)] ml-2`}
                            />
                        </li>
                    ))}
                </ul>
            );

        case 'numbered':
            if (readOnly) {
                return (
                    <ol className="list-decimal list-inside space-y-2">
                        {block.items?.map((item, i) => (
                            <li key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                        ))}
                    </ol>
                );
            }
            if (!isActive) {
                return (
                    <ol
                        className="list-decimal list-inside space-y-2 cursor-text"
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    >
                        {block.items?.map((item, i) => (
                            <li key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(item) || '<span class="opacity-50">Empty item</span>' }} />
                        ))}
                    </ol>
                );
            }
            return (
                <ol className="list-decimal list-inside space-y-2" ref={(el) => refs.current[index] = el as any}>
                    {block.items?.map((item, i) => (
                        <li key={i} className="text-gray-300">
                            <input
                                autoFocus={i === (block.items?.length || 1) - 1}
                                type="text"
                                value={item}
                                onChange={(e) => {
                                    const newItems = [...(block.items || [])];
                                    newItems[i] = e.target.value;
                                    onChange({ items: newItems });
                                }}
                                onKeyDown={(e) => {
                                    if (onKeyDown) onKeyDown(e, i);
                                }}
                                placeholder="List item..."
                                disabled={readOnly}
                                className={`${baseClasses} inline-block w-[calc(100%-24px)] ml-2`}
                            />
                        </li>
                    ))}
                </ol>
            );

        case 'callout': {
            const toneMap = {
                info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: InformationCircleIcon },
                warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: InformationCircleIcon },
                error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: InformationCircleIcon },
                success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: InformationCircleIcon }
            };
            const tone = toneMap[block.tone || 'info'];
            const Icon = tone.icon;

            if (readOnly) {
                return (
                    <div className={`p-4 rounded-xl border ${tone.bg} ${tone.border} flex gap-4`}>
                        <Icon className={`h-6 w-6 shrink-0 ${tone.text}`} />
                        <div className="flex-1">
                            <div className={`${tone.text} font-medium`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />
                        </div>
                    </div>
                );
            }
            if (!isActive) {
                return (
                    <div
                        className={`p-4 rounded-xl border ${tone.bg} ${tone.border} flex gap-4 cursor-text`}
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    >
                        <Icon className={`h-6 w-6 shrink-0 ${tone.text}`} />
                        <div className="flex-1">
                            <div className={`${tone.text} font-medium`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="opacity-50">Important information...</span>' }} />
                        </div>
                    </div>
                );
            }
            return (
                <div className={`p-4 rounded-xl border ${tone.bg} ${tone.border} flex gap-4`}>
                    <Icon className={`h-6 w-6 shrink-0 ${tone.text}`} />
                    <div className="flex-1">
                        <textarea
                            autoFocus
                            value={block.content}
                            onChange={(e) => onChange({ content: e.target.value })}
                            placeholder="Important information..."
                            disabled={readOnly}
                            rows={1}
                            ref={(el) => refs.current[index] = el}
                            className={`${baseClasses} ${tone.text} resize-none overflow-hidden leading-relaxed font-medium`}
                            onInput={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (onKeyDown) onKeyDown(e);
                            }}
                        />
                    </div>
                </div>
            );
        }

        case 'quote':
            if (readOnly) {
                return (
                    <div className="border-l-4 border-[#3aa3eb] pl-6 py-2 italic text-xl text-gray-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />
                );
            }
            if (!isActive) {
                return (
                    <div
                        className="border-l-4 border-[#3aa3eb] pl-6 py-2 italic text-xl text-gray-300 cursor-text min-h-[44px]"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="text-gray-600 opacity-50">Inspiring quote...</span>' }}
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    />
                );
            }
            return (
                <div className="border-l-4 border-[#3aa3eb] pl-6 py-2">
                    <textarea
                        autoFocus
                        value={block.content}
                        onChange={(e) => onChange({ content: e.target.value })}
                        placeholder="Inspiring quote..."
                        disabled={readOnly}
                        rows={1}
                        ref={(el) => refs.current[index] = el}
                        className={`${baseClasses} italic text-xl text-gray-300 resize-none overflow-hidden leading-relaxed`}
                        onInput={(e: any) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (onKeyDown) onKeyDown(e);
                        }}
                    />
                </div>
            );

        case 'divider':
            return <div className="h-px bg-white/10 w-full my-4" />;

        case 'code':
            if (!isActive) {
                return (
                    <div
                        className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-sm cursor-text"
                        onClick={onActivate}
                        tabIndex={0}
                        onFocus={onActivate}
                        ref={(el) => refs.current[index] = el as any}
                    >
                        <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            <span>{block.lang || 'typescript'}</span>
                        </div>
                        <pre className="text-blue-400 font-mono whitespace-pre-wrap">{block.content}</pre>
                    </div>
                );
            }
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
                        autoFocus
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
                        onKeyDown={(e) => {
                            if (onKeyDown) onKeyDown(e);
                        }}
                    />
                </div>
            );

        default:
            return null;
    }
}
