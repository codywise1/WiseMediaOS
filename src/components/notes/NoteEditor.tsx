import React, { useState, useEffect, useRef } from 'react';
import {
    PlusIcon,
    TrashIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ListBulletIcon,
    NumberedListIcon,
    CheckCircleIcon,
    ChatBubbleBottomCenterTextIcon,
    InformationCircleIcon,
    CodeBracketIcon,
    MinusIcon,
    BoldIcon,
    ItalicIcon,
    LinkIcon,
    HashtagIcon,
    DocumentTextIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon
} from '@heroicons/react/24/outline';
import { NoteBlock } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { parseMarkdown } from '../../lib/markdown';


const parseMarkdownToBlocks = (text: string): NoteBlock[] => {
    const lines = text.split('\n');
    const blocks: NoteBlock[] = [];
    let i = 0;
    let codeBuffer: string[] = [];
    let inCodeBlock = false;
    let codeLang = 'text';

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Handle code blocks
        if (trimmed.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLang = trimmed.slice(3).trim() || 'text';
                codeBuffer = [];
            } else {
                blocks.push({
                    id: uuidv4(),
                    type: 'code',
                    content: codeBuffer.join('\n'),
                    lang: codeLang
                });
                inCodeBlock = false;
                codeBuffer = [];
            }
            i++;
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            i++;
            continue;
        }

        // Skip empty lines
        if (!trimmed) {
            i++;
            continue;
        }

        // Headings
        if (trimmed.startsWith('### ')) {
            blocks.push({ id: uuidv4(), type: 'heading', level: 3, content: trimmed.slice(4) });
        } else if (trimmed.startsWith('## ')) {
            blocks.push({ id: uuidv4(), type: 'heading', level: 2, content: trimmed.slice(3) });
        } else if (trimmed.startsWith('# ')) {
            blocks.push({ id: uuidv4(), type: 'heading', level: 1, content: trimmed.slice(2) });
        }
        // Bulleted lists (handles •, -, *)
        else if (/^[•\-\*]\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^[•\-\*]\s/.test(lines[i].trim())) {
                items.push(lines[i].trim().slice(2));
                i++;
            }
            blocks.push({ id: uuidv4(), type: 'bullets', items });
            continue;
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
                i++;
            }
            blocks.push({ id: uuidv4(), type: 'numbered', items });
            continue;
        }
        // Todo items (checkboxes)
        else if (/^\- \[([ x])\]/.test(trimmed)) {
            const todos: { text: string; done: boolean }[] = [];
            while (i < lines.length && /^\- \[([ x])\]/.test(lines[i].trim())) {
                const match = lines[i].trim().match(/^\- \[([ x])\]\s*(.*)/);
                if (match) {
                    todos.push({ text: match[2], done: match[1] === 'x' });
                }
                i++;
            }
            blocks.push({ id: uuidv4(), type: 'todo', todos });
            continue;
        }
        // Horizontal rule / divider
        else if (/^[\-]{3,}$/.test(trimmed)) {
            blocks.push({ id: uuidv4(), type: 'divider' });
        }
        // Quote
        else if (trimmed.startsWith('> ')) {
            let quoteText = '';
            while (i < lines.length && lines[i].trim().startsWith('> ')) {
                quoteText += lines[i].trim().slice(2) + ' ';
                i++;
            }
            blocks.push({ id: uuidv4(), type: 'quote', content: quoteText.trim() });
            continue;
        }
        // Regular paragraph
        else {
            blocks.push({ id: uuidv4(), type: 'paragraph', content: trimmed });
        }

        i++;
    }

    return blocks.length > 0 ? blocks : [{ id: uuidv4(), type: 'paragraph', content: text }];
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
    const editorRef = useRef<HTMLDivElement>(null);
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
                    const inputs = el?.querySelectorAll('input');
                    if (inputs && inputs[focusInfo.itemIndex]) {
                        const input = inputs[focusInfo.itemIndex];
                        input.focus();
                        setTimeout(() => {
                            input.setSelectionRange(focusInfo.offset, focusInfo.offset);
                        }, 0);
                    }
                } else {
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

    const handlePaste = (e: React.ClipboardEvent, _: NoteBlock, index: number) => {
        const pastedText = e.clipboardData.getData('text/plain');

        // Only auto-convert if pasting markdown-like content (contains headers, lists, code blocks, etc.)
        const hasMarkdown = /^(#{1,3}\s|[•\-\*]\s|\d+\.\s|```|>\s|---)/m.test(pastedText);

        if (hasMarkdown && pastedText.includes('\n')) {
            e.preventDefault();

            const newBlocks = parseMarkdownToBlocks(pastedText);
            const allBlocks = [...blocks];

            // Remove current block and insert parsed blocks
            allBlocks.splice(index, 1, ...newBlocks);
            updateBlocks(allBlocks);

            // Focus on first new block
            if (newBlocks.length > 0) {
                setTimeout(() => {
                    setFocusInfo({ id: newBlocks[0].id, offset: 0 });
                }, 0);
            }
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const isDeleteKey = e.key === 'Backspace' || e.key === 'Delete';

            if (isDeleteKey && !readOnly) {
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    const selectedIds: string[] = [];
                    const blockElements = editorRef.current?.querySelectorAll('[data-block-id]');

                    blockElements?.forEach(el => {
                        if (range.intersectsNode(el)) {
                            const id = el.getAttribute('data-block-id');
                            if (id) selectedIds.push(id);
                        }
                    });

                    if (selectedIds.length > 1) {
                        e.preventDefault();
                        const firstId = selectedIds[0];
                        const firstIdx = blocks.findIndex(b => b.id === firstId);

                        const newBlocks = blocks.filter(b => !selectedIds.includes(b.id));
                        if (newBlocks.length === 0) {
                            newBlocks.push({ id: uuidv4(), type: 'paragraph', content: '' });
                        }

                        updateBlocks(newBlocks);

                        const focusIdx = Math.max(0, firstIdx - 1);
                        if (newBlocks[focusIdx]) {
                            setFocusInfo({ id: newBlocks[focusIdx].id, offset: 0 });
                        }
                        return;
                    }
                }
            }

            if ((e.metaKey || e.ctrlKey) && !readOnly) {
                const activeIdx = blocks.findIndex(b => b.id === activeBlockId);
                if (activeIdx === -1) return;

                if (e.key === 'b') { e.preventDefault(); applyFormatting(activeIdx, 'bold'); }
                if (e.key === 'i') { e.preventDefault(); applyFormatting(activeIdx, 'italic'); }
                if (e.key === 'k') { e.preventDefault(); applyFormatting(activeIdx, 'link'); }

                if (e.shiftKey) {
                    if (e.key === '7') { e.preventDefault(); addBlock('numbered', activeIdx); }
                    if (e.key === '8') { e.preventDefault(); addBlock('bullets', activeIdx); }
                    if (e.key === '9') { e.preventDefault(); addBlock('todo', activeIdx); }
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [activeBlockId, blocks, readOnly]);

    const handleSlashCommand = (index: number, textarea: HTMLTextAreaElement | HTMLInputElement) => {
        const rect = textarea.getBoundingClientRect();
        setSlashMenu({
            show: true,
            index,
            query: '',
            position: { top: rect.top + 30, left: rect.left }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, block: NoteBlock, index: number, itemIndex?: number) => {
        const isList = block.type === 'bullets' || block.type === 'numbered' || block.type === 'todo';

        if (e.key === 'Tab') {
            e.preventDefault();
            const dir = e.shiftKey ? -1 : 1;
            const currentIndent = block.indent || 0;
            const newIndent = Math.max(0, Math.min(4, currentIndent + dir));
            handleBlockChange(block.id, { indent: newIndent });
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && !slashMenu.show) {
            e.preventDefault();

            if (isList && typeof itemIndex === 'number') {
                const items = block.type === 'todo' ? block.todos : block.items;
                const currentItem = block.type === 'todo' ? (items as any[])[itemIndex].text : (items as string[])[itemIndex];

                if ((!currentItem || currentItem === '') && items && items.length > 0) {
                    if (items.length === 1) {
                        const newBlocks = [...blocks];
                        newBlocks[index] = { ...block, type: 'paragraph', content: '', items: undefined, todos: undefined };
                        updateBlocks(newBlocks);
                        setFocusInfo({ id: block.id, offset: 0 });
                        return;
                    }

                    if (itemIndex === items.length - 1) {
                        const newItems = [...(items as any[])];
                        newItems.pop();
                        const newBlocks = [...blocks];
                        newBlocks[index] = {
                            ...block,
                            [block.type === 'todo' ? 'todos' : 'items']: newItems
                        };
                        const newBlockId = uuidv4();
                        newBlocks.splice(index + 1, 0, { id: newBlockId, type: 'paragraph', content: '' });
                        updateBlocks(newBlocks);
                        setFocusInfo({ id: newBlockId, offset: 0 });
                        return;
                    }
                }

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

            const newBlock: NoteBlock = { id: uuidv4(), type: 'paragraph', content: right, indent: block.indent };
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
                    if (itemIndex > 0) {
                        e.preventDefault();
                        const items = block.type === 'todo' ? block.todos : block.items;
                        const newItems = [...(items as any[])];
                        const removedItem = newItems.splice(itemIndex, 1)[0];
                        const prevItem = newItems[itemIndex - 1];
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
                    } else if (block.indent && block.indent > 0) {
                        e.preventDefault();
                        handleBlockChange(block.id, { indent: block.indent - 1 });
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
                    newBlocks[index - 1] = { ...prevBlock, content: prevContent + currentContent };
                    newBlocks.splice(index, 1);
                    updateBlocks(newBlocks);
                    setFocusInfo({ id: prevBlock.id, offset: prevContent.length });
                } else if (isList && (block.content === '' || !block.content)) {
                    // Convert list to paragraph if backspaced at start and no content
                    handleBlockChange(block.id, { type: 'paragraph', items: undefined, todos: undefined });
                } else {
                    removeBlock(block.id);
                    setFocusInfo({ id: prevBlock.id, offset: (prevBlock.content || '').length });
                }
            }
        }
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
        if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === null || end === null || start === end) return;

        const text = block.content || '';
        const selected = text.substring(start, end);
        let prefix = '', suffix = '';

        switch (format) {
            case 'bold': prefix = '**'; suffix = '**'; break;
            case 'italic': prefix = '*'; suffix = '*'; break;
            case 'link': prefix = '['; suffix = '](url)'; break;
        }

        const newContent = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
        handleBlockChange(block.id, { content: newContent });
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
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
        { label: 'Toggle', value: 'toggle' as NoteBlock['type'] },
    ];

    return (
        <div ref={editorRef} className="relative min-h-full font-sans selection:bg-[#3aa3eb]/20">
            <div className="space-y-[12px] pb-32">
                {slashMenu.show && (
                    <div
                        style={{ position: 'fixed', top: slashMenu.position.top, left: slashMenu.position.left, zIndex: 1000 }}
                        className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto w-64"
                    >
                        {blockTypes.map((type, i) => (
                            <button
                                key={i}
                                onClick={() => selectBlockType(type.value, (type as any).props)}
                                className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-[#3aa3eb]/20 rounded-xl text-white/90 transition-all group"
                            >
                                <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-[#3aa3eb]/30 transition-colors">
                                    {type.value === 'heading' ? <HashtagIcon className="h-4 w-4" /> :
                                        type.value === 'paragraph' ? <DocumentTextIcon className="h-4 w-4" /> :
                                            type.value === 'bullets' ? <ListBulletIcon className="h-4 w-4" /> :
                                                <PlusIcon className="h-4 w-4" />}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">{type.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {inlineToolbar.show && (
                    <div
                        style={{ position: 'fixed', top: inlineToolbar.position.top, left: inlineToolbar.position.left, zIndex: 1000 }}
                        className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1 flex gap-0.5"
                    >
                        <ToolbarButton icon={BoldIcon} onClick={() => applyFormatting(inlineToolbar.blockIndex, 'bold')} />
                        <ToolbarButton icon={ItalicIcon} onClick={() => applyFormatting(inlineToolbar.blockIndex, 'italic')} />
                        <ToolbarButton icon={LinkIcon} onClick={() => applyFormatting(inlineToolbar.blockIndex, 'link')} />
                    </div>
                )}

                {blocks.map((block, index) => (
                    <BlockComponent
                        key={block.id}
                        block={block}
                        onChange={(updates) => handleBlockChange(block.id, updates)}
                        onRemove={() => removeBlock(block.id)}
                        onMove={(dir) => moveBlock(index, dir)}
                        readOnly={readOnly}
                        index={index}
                        refs={refs}
                        slashMenu={slashMenu}
                        handleSlashCommand={handleSlashCommand}
                        closeSlashMenu={closeSlashMenu}
                        showInlineToolbar={showInlineToolbar}
                        onKeyDown={(e, itemIdx) => handleKeyDown(e, block, index, itemIdx)}
                        onPaste={(e) => handlePaste(e, block, index)}
                        isActive={activeBlockId === block.id}
                        onActivate={() => setActiveBlockId(block.id)}
                        isFirst={index === 0}
                        isLast={index === blocks.length - 1}
                        applyFormatting={applyFormatting}
                        addBlock={addBlock}
                    />
                ))}
            </div>

            {!readOnly && blocks.length === 0 && (
                <div
                    onClick={() => addBlock('paragraph')}
                    className="border-2 border-dashed border-white/5 rounded-3xl p-16 text-center cursor-pointer hover:border-[#3aa3eb]/30 hover:bg-[#3aa3eb]/5 transition-all group"
                >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#3aa3eb]/20 transition-colors">
                        <PlusIcon className="h-8 w-8 text-gray-700 group-hover:text-[#3aa3eb]" />
                    </div>
                    <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Click to begin drafting intelligence</p>
                </div>
            )}
        </div>
    );
}

function ToolbarButton({ icon: Icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 shrink-0">
            <div className="flex flex-col items-center">
                <Icon className="h-5 w-5" />
                {label && <span className="text-[8px] font-black -mt-1 leading-none">{label}</span>}
            </div>
        </button>
    );
}


interface BlockComponentProps {
    block: NoteBlock;
    onChange: (updates: Partial<NoteBlock>) => void;
    onRemove: () => void;
    onMove: (dir: 'up' | 'down') => void;
    readOnly: boolean;
    index: number;
    refs: React.MutableRefObject<(HTMLInputElement | HTMLTextAreaElement | null)[]>;
    slashMenu: SlashMenuState;
    handleSlashCommand: (index: number, textarea: HTMLTextAreaElement | HTMLInputElement, start: number, text: string) => void;
    closeSlashMenu: () => void;
    showInlineToolbar: (index: number) => void;
    onKeyDown?: (e: React.KeyboardEvent, itemIndex?: number) => void;
    onPaste?: (e: React.ClipboardEvent) => void;
    isActive: boolean;
    onActivate: () => void;
    isFirst: boolean;
    isLast: boolean;
    applyFormatting: (index: number, format: 'bold' | 'italic' | 'link') => void;
    addBlock: (type: NoteBlock['type'], index?: number, props?: Partial<NoteBlock>) => void;
}

function BlockComponent({
    block, onChange, onRemove, onMove, readOnly, index, refs, slashMenu,
    handleSlashCommand, onKeyDown, onPaste,
    isActive, onActivate, isFirst, isLast,
    applyFormatting, addBlock
}: BlockComponentProps) {
    const baseClasses = "w-full bg-transparent focus:outline-none placeholder:text-gray-700 text-white/90 transition-all selection:bg-[#3aa3eb]/30";
    const indentLevel = block.indent || 0;
    const indentPadding = indentLevel * 24; // 24px per level 

    return (
        <div data-block-id={block.id} className="group/block relative -ml-12 pl-12" style={{ marginLeft: `${-48 + indentPadding}px`, paddingLeft: `48px` }}>
            <div className="flex items-start gap-4">
                {!readOnly && (
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity absolute left-0 top-1">
                        <button className="p-1 cursor-grab active:cursor-grabbing text-gray-700 hover:text-gray-400">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6h2v2H8zm0 6h2v2H8zm0 6h2v2H8zm6-12h2v2h-2zm0 6h2v2h-2zm0 6h2v2h-2z" /></svg>
                        </button>
                        <div className="flex flex-col -space-y-1">
                            <button onClick={() => onMove('up')} disabled={isFirst} className="p-0.5 text-gray-800 hover:text-white disabled:opacity-20"><ChevronUpIcon className="h-3 w-3" /></button>
                            <button onClick={() => onMove('down')} disabled={isLast} className="p-0.5 text-gray-800 hover:text-white disabled:opacity-20"><ChevronDownIcon className="h-3 w-3" /></button>
                        </div>
                    </div>
                )}
                <div className="flex-1">
                    <BlockRenderer
                        block={block} onChange={onChange} readOnly={readOnly} index={index}
                        refs={refs} slashMenu={slashMenu} handleSlashCommand={handleSlashCommand}
                        onKeyDown={onKeyDown} onPaste={onPaste} isActive={isActive} onActivate={onActivate} baseClasses={baseClasses}
                    />
                </div>
            </div>
            {!readOnly && isActive && (
                <div className="mt-[20px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 flex items-center justify-between group/toolbar shadow-xl w-full">
                        <div className="flex items-center gap-0.5">
                            <ToolbarButton icon={ArrowUturnLeftIcon} onClick={() => { }} />
                            <ToolbarButton icon={ArrowUturnRightIcon} onClick={() => { }} />
                            <div className="h-4 w-px bg-white/10 mx-1.5" />
                            <ToolbarButton icon={BoldIcon} onClick={() => applyFormatting(index, 'bold')} />
                            <ToolbarButton icon={ItalicIcon} onClick={() => applyFormatting(index, 'italic')} />
                            <ToolbarButton icon={LinkIcon} onClick={() => applyFormatting(index, 'link')} />
                            <div className="h-4 w-px bg-white/10 mx-1.5" />
                            <ToolbarButton icon={HashtagIcon} label="1" onClick={() => addBlock('heading', index, { level: 1 })} />
                            <ToolbarButton icon={HashtagIcon} label="2" onClick={() => addBlock('heading', index, { level: 2 })} />
                            <ToolbarButton icon={ListBulletIcon} onClick={() => addBlock('bullets', index)} />
                            <ToolbarButton icon={NumberedListIcon} onClick={() => addBlock('numbered', index)} />
                            <ToolbarButton icon={CheckCircleIcon} onClick={() => addBlock('todo', index)} />
                            <div className="h-4 w-px bg-white/10 mx-1.5" />
                            <ToolbarButton icon={PlusIcon} onClick={() => handleSlashCommand(index, refs.current[index] as any, 0, '')} />
                            <ToolbarButton icon={TrashIcon} onClick={onRemove} />
                        </div>

                        <div className="flex items-center gap-0.5">
                            <ToolbarButton icon={CodeBracketIcon} onClick={() => addBlock('code', index)} />
                            <ToolbarButton icon={ChatBubbleBottomCenterTextIcon} onClick={() => addBlock('quote', index)} />
                            <ToolbarButton icon={InformationCircleIcon} onClick={() => addBlock('callout', index)} />
                            <ToolbarButton icon={MinusIcon} onClick={() => addBlock('divider', index)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function BlockRenderer({
    block, onChange, readOnly, index, refs, slashMenu, handleSlashCommand,
    onKeyDown, onPaste, isActive, onActivate, baseClasses
}: any) {
    const typographyClasses = "text-[15px] sm:text-[16px] leading-[1.55] tracking-normal";

    switch (block.type) {
        case 'heading': {
            const headingStyles = block.level === 1
                ? 'text-[28px] font-semibold tracking-tight text-white mb-2 mt-6'
                : block.level === 2 ? 'text-[22px] font-semibold text-white/90 mb-2 mt-4'
                    : 'text-[18px] font-semibold text-white/80 mb-1 mt-3';

            if (readOnly) return <div className={headingStyles} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />;
            if (!isActive) return (
                <div
                    className={`${headingStyles} cursor-text min-h-[32px]`}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || `<span class="text-gray-700 opacity-50">Heading ${block.level || 2}</span>` }}
                    onClick={onActivate} tabIndex={0} onFocus={onActivate} ref={(el) => refs.current[index] = el as any}
                />
            );
            return (
                <input
                    autoFocus type="text" value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                    placeholder={`Heading ${block.level || 2}`} disabled={readOnly} ref={(el) => refs.current[index] = el}
                    className={`${baseClasses} ${headingStyles} py-1`}
                    onKeyDown={(e) => {
                        if (onKeyDown) onKeyDown(e);
                        if (e.key === '/' && !slashMenu.show) {
                            e.preventDefault();
                            handleSlashCommand(index, e.target as any, (e.target as any).selectionStart, (e.target as any).value);
                        }
                    }}
                />
            );
        }
        case 'paragraph':
            if (readOnly) return <div className={`${typographyClasses} text-white/80 whitespace-pre-wrap break-words`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />;
            if (!isActive) return (
                <div
                    className={`${typographyClasses} text-white/80 whitespace-pre-wrap cursor-text min-h-[1.55em]`}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="text-gray-700 opacity-30">Type \'/\' for commands...</span>' }}
                    onClick={onActivate} tabIndex={0} onFocus={onActivate} ref={(el) => refs.current[index] = el as any}
                />
            );
            return (
                <textarea
                    autoFocus value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                    placeholder="Start typing..." disabled={readOnly} rows={1} ref={(el) => refs.current[index] = el}
                    className={`${baseClasses} ${typographyClasses} text-white/80 resize-none overflow-hidden`}
                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    onKeyDown={(e) => {
                        if (onKeyDown) onKeyDown(e);
                        if (e.key === '/' && !slashMenu.show) {
                            e.preventDefault();
                            handleSlashCommand(index, e.target as any, (e.target as any).selectionStart, (e.target as any).value);
                        }
                    }}
                    onPaste={onPaste}
                />
            );
        case 'bullets': {
            const items = block.items || [''];
            if (readOnly) {
                return (
                    <ul className="space-y-2 list-none">
                        {items.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#3aa3eb]/40 shrink-0" />
                                <div className={`${typographyClasses} text-white/80 whitespace-pre-wrap break-words`} dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                            </li>
                        ))}
                    </ul>
                );
            }
            return (
                <ul className="space-y-2 list-none" ref={(el) => refs.current[index] = el as any}>
                    {items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 group/li">
                            <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#3aa3eb]/40 shrink-0" />
                            {isActive ? (
                                <input
                                    autoFocus={i === items.length - 1} type="text" value={item}
                                    onChange={(e) => { const newItems = [...items]; newItems[i] = e.target.value; onChange({ items: newItems }); }}
                                    onKeyDown={(e) => onKeyDown?.(e, i)} placeholder="List item..."
                                    disabled={readOnly} className={`${baseClasses} ${typographyClasses} py-0.5 flex-1`}
                                />
                            ) : (
                                <div
                                    className={`${typographyClasses} text-white/80 whitespace-pre-wrap break-words cursor-text flex-1 min-h-[1.55em]`}
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(item) || '<span class="text-gray-700 opacity-30">List item...</span>' }}
                                    onClick={onActivate}
                                    tabIndex={0}
                                    onFocus={onActivate}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            );
        }
        case 'numbered': {
            const items = block.items || [''];
            if (readOnly) {
                return (
                    <ol className="space-y-2 list-none">
                        {items.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="mt-0.5 text-[14px] font-mono text-[#3aa3eb]/50 w-5 text-right shrink-0">{i + 1}.</span>
                                <div className={`${typographyClasses} text-white/80 whitespace-pre-wrap break-words`} dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                            </li>
                        ))}
                    </ol>
                );
            }
            return (
                <ol className="space-y-2 list-none" ref={(el) => refs.current[index] = el as any}>
                    {items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 group/li">
                            <span className="mt-0.5 text-[14px] font-mono text-[#3aa3eb]/50 w-5 text-right shrink-0">{i + 1}.</span>
                            {isActive ? (
                                <input
                                    autoFocus={i === items.length - 1} type="text" value={item}
                                    onChange={(e) => { const newItems = [...items]; newItems[i] = e.target.value; onChange({ items: newItems }); }}
                                    onKeyDown={(e) => onKeyDown?.(e, i)} placeholder="List item..."
                                    disabled={readOnly} className={`${baseClasses} ${typographyClasses} py-0.5 flex-1`}
                                />
                            ) : (
                                <div
                                    className={`${typographyClasses} text-white/80 whitespace-pre-wrap break-words cursor-text flex-1 min-h-[1.55em]`}
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(item) || '<span class="text-gray-700 opacity-30">List item...</span>' }}
                                    onClick={onActivate}
                                    tabIndex={0}
                                    onFocus={onActivate}
                                />
                            )}
                        </li>
                    ))}
                </ol>
            );
        }
        case 'todo': {
            const todos = block.todos || [{ text: '', done: false }];
            if (readOnly) {
                return (
                    <div className="space-y-2">
                        {todos.map((todo: { text: string, done: boolean }, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className={`mt-1 w-5 h-5 rounded border transition-all flex items-center justify-center shrink-0 ${todo.done ? 'bg-[#3aa3eb] border-[#3aa3eb]' : 'bg-white/5 border-white/20'}`}>
                                    {todo.done && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <div className={`${typographyClasses} ${todo.done ? 'line-through text-white/30' : 'text-white/80'} whitespace-pre-wrap break-words`} dangerouslySetInnerHTML={{ __html: parseMarkdown(todo.text) }} />
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <div className="space-y-2" ref={(el) => refs.current[index] = el as any}>
                    {todos.map((todo: { text: string, done: boolean }, i: number) => (
                        <div key={i} className="flex items-start gap-3 group/todo">
                            <button
                                onClick={() => { const newTodos = [...todos]; newTodos[i].done = !newTodos[i].done; onChange({ todos: newTodos }); }}
                                className={`mt-1 w-5 h-5 rounded border transition-all flex items-center justify-center shrink-0 ${todo.done ? 'bg-[#3aa3eb] border-[#3aa3eb] shadow-[0_0_10px_rgba(58,163,235,0.4)]' : 'bg-white/5 border-white/20 hover:border-white/40'}`}
                            >
                                {todo.done && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                            </button>
                            {isActive ? (
                                <input
                                    autoFocus={i === todos.length - 1} type="text" value={todo.text}
                                    onChange={(e) => { const newTodos = [...todos]; newTodos[i].text = e.target.value; onChange({ todos: newTodos }); }}
                                    onKeyDown={(e) => onKeyDown?.(e, i)} placeholder="To do item..."
                                    disabled={readOnly} className={`${baseClasses} ${typographyClasses} py-0.5 flex-1 ${todo.done ? 'line-through text-white/30' : ''}`}
                                />
                            ) : (
                                <div
                                    className={`${typographyClasses} ${todo.done ? 'line-through text-white/30' : 'text-white/80'} whitespace-pre-wrap break-words cursor-text flex-1 min-h-[1.55em]`}
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(todo.text) || '<span class="text-gray-700 opacity-30">To do item...</span>' }}
                                    onClick={onActivate}
                                    tabIndex={0}
                                    onFocus={onActivate}
                                />
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        case 'toggle': {
            const isOpen = block.isOpen ?? true;
            return (
                <div className="space-y-1" ref={(el) => refs.current[index] = el as any}>
                    <div className="flex items-start gap-2 group/toggle-head">
                        <button onClick={() => onChange({ isOpen: !isOpen })} className="mt-1 p-0.5 hover:bg-white/10 rounded transition-colors">
                            <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </button>
                        <textarea
                            autoFocus={isActive} value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                            onClick={onActivate} placeholder="Toggle block..." disabled={readOnly} rows={1}
                            className={`${baseClasses} ${typographyClasses} text-white/90 font-medium resize-none overflow-hidden`}
                            onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            onKeyDown={(e) => onKeyDown?.(e)}
                        />
                    </div>
                </div>
            );
        }
        case 'quote':
            if (readOnly) {
                return (
                    <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3aa3eb] rounded-full" />
                        <div className={`${typographyClasses} pl-6 italic text-white/90 whitespace-pre-wrap break-words`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />
                    </div>
                );
            }
            if (!isActive) {
                return (
                    <div className="relative cursor-text" onClick={onActivate} tabIndex={0} onFocus={onActivate} ref={(el) => refs.current[index] = el as any}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3aa3eb] rounded-full" />
                        <div className={`${typographyClasses} pl-6 italic text-white/90 min-h-[1.55em]`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="text-gray-700 opacity-50">Inspiring quote...</span>' }} />
                    </div>
                );
            }
            return (
                <div className="relative" ref={(el) => refs.current[index] = el as any}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3aa3eb] rounded-full" />
                    <textarea
                        autoFocus value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                        onClick={onActivate} placeholder="Inspiring quote..." disabled={readOnly} rows={1}
                        className={`${baseClasses} ${typographyClasses} pl-6 italic text-white/90 resize-none overflow-hidden`}
                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onKeyDown={(e) => onKeyDown?.(e)}
                    />
                </div>
            );
        case 'callout': {
            const toneMap: any = {
                info: { bg: 'bg-[#3aa3eb]/10', border: 'border-[#3aa3eb]/20', text: 'text-[#3aa3eb]', icon: InformationCircleIcon },
                warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: InformationCircleIcon },
                error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: InformationCircleIcon },
                success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: InformationCircleIcon }
            };
            const tone = toneMap[block.tone || 'info'];
            const Icon = tone.icon;

            if (readOnly) {
                return (
                    <div className={`p-4 rounded-[20px] border ${tone.bg} ${tone.border} flex gap-4 shadow-lg shadow-black/20`}>
                        <Icon className={`h-5 w-5 shrink-0 ${tone.text} mt-1`} />
                        <div className={`${typographyClasses} ${tone.text} font-medium`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') }} />
                    </div>
                );
            }
            if (!isActive) {
                return (
                    <div className={`p-4 rounded-[20px] border ${tone.bg} ${tone.border} flex gap-4 shadow-lg shadow-black/20 cursor-text`} onClick={onActivate} tabIndex={0} onFocus={onActivate} ref={(el) => refs.current[index] = el as any}>
                        <Icon className={`h-5 w-5 shrink-0 ${tone.text} mt-1`} />
                        <div className={`${typographyClasses} ${tone.text} font-medium min-h-[1.55em]`} dangerouslySetInnerHTML={{ __html: parseMarkdown(block.content || '') || '<span class="opacity-50">Important information...</span>' }} />
                    </div>
                );
            }
            return (
                <div className={`p-4 rounded-[20px] border ${tone.bg} ${tone.border} flex gap-4 shadow-lg shadow-black/20`} ref={(el) => refs.current[index] = el as any}>
                    <Icon className={`h-5 w-5 shrink-0 ${tone.text} mt-1`} />
                    <textarea
                        autoFocus value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                        onClick={onActivate} placeholder="Important information..." disabled={readOnly} rows={1}
                        className={`${baseClasses} ${typographyClasses} ${tone.text} font-medium resize-none overflow-hidden`}
                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onKeyDown={(e) => onKeyDown?.(e)}
                    />
                </div>
            );
        }
        case 'divider':
            return (
                <div className="py-2" ref={(el) => refs.current[index] = el as any}>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
                </div>
            );
        case 'code':
            return (
                <div className="bg-black/60 rounded-[16px] border border-white/10 overflow-hidden relative group/code" ref={(el) => refs.current[index] = el as any}>
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        <input
                            type="text" value={block.lang || 'typescript'} onChange={(e) => onChange({ lang: e.target.value })}
                            className="bg-transparent focus:outline-none w-24" placeholder="language" disabled={readOnly} onClick={onActivate}
                        />
                        <button onClick={() => navigator.clipboard.writeText(block.content || '')} className="opacity-0 group-hover/code:opacity-100 transition-opacity hover:text-[#3aa3eb]">Copy to clipboard</button>
                    </div>
                    <textarea
                        autoFocus={isActive} value={block.content} onChange={(e) => onChange({ content: e.target.value })}
                        onClick={onActivate} placeholder="// Paste code here..." disabled={readOnly} rows={4}
                        className={`${baseClasses} p-4 font-mono text-[13px] sm:text-[14px] leading-relaxed text-[#3aa3eb] resize-none overflow-hidden`}
                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onKeyDown={(e) => onKeyDown?.(e)}
                    />
                </div>
            );
        default: return null;
    }
}
