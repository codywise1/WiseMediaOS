import React, { useState, useEffect, useRef } from 'react';
import {
    BoldIcon,
    ItalicIcon,
    ListBulletIcon,
    QueueListIcon,
    CheckCircleIcon,
    LinkIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

interface MeetingNotesEditorProps {
    initialContent?: string;
    onSave?: (content: string) => void;
    isReadOnly?: boolean;
    autoSaveInterval?: number; // milliseconds
}

export default function MeetingNotesEditor({
    initialContent = '',
    onSave,
    isReadOnly = false,
    autoSaveInterval = 5000
}: MeetingNotesEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (initialContent) {
            setContent(initialContent);
        }
    }, [initialContent]);

    useEffect(() => {
        // Auto-save logic
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        if (!isReadOnly && onSave && content !== initialContent) {
            saveTimeoutRef.current = setTimeout(async () => {
                setIsSaving(true);
                await onSave(content);
                setLastSaved(new Date());
                setIsSaving(false);
            }, autoSaveInterval);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current); // Use clearTimeout here as well
            }
        };
    }, [content, isReadOnly, onSave, initialContent, autoSaveInterval]);

    const handleToolbarAction = (action: string) => {
        if (isReadOnly || !textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        let newText = content;
        let newCursorPos = start;

        switch (action) {
            case 'bold':
                newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
                newCursorPos = end + 4;
                break;
            case 'italic':
                newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
                newCursorPos = end + 2;
                break;
            case 'list':
                newText = content.substring(0, start) + `\n- ${selectedText}` + content.substring(end);
                newCursorPos = end + 3;
                break;
            case 'todo':
                newText = content.substring(0, start) + `\n[ ] ${selectedText}` + content.substring(end);
                newCursorPos = end + 5;
                break;
            case 'h1':
                newText = content.substring(0, start) + `\n# ${selectedText}` + content.substring(end);
                newCursorPos = end + 3;
                break;
            case 'h2':
                newText = content.substring(0, start) + `\n## ${selectedText}` + content.substring(end);
                newCursorPos = end + 4;
                break;
        }

        setContent(newText);
        textarea.focus();
        // In a real implementation we'd need to set selection range properly after update
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full glass-card rounded-2xl border border-white/10 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <ToolbarButton icon={<BoldIcon className="h-4 w-4" />} onClick={() => handleToolbarAction('bold')} title="Bold" disabled={isReadOnly} />
                    <ToolbarButton icon={<ItalicIcon className="h-4 w-4" />} onClick={() => handleToolbarAction('italic')} title="Italic" disabled={isReadOnly} />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<span className="font-bold text-xs">H1</span>} onClick={() => handleToolbarAction('h1')} title="Heading 1" disabled={isReadOnly} />
                    <ToolbarButton icon={<span className="font-bold text-xs">H2</span>} onClick={() => handleToolbarAction('h2')} title="Heading 2" disabled={isReadOnly} />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton icon={<ListBulletIcon className="h-4 w-4" />} onClick={() => handleToolbarAction('list')} title="Bullet List" disabled={isReadOnly} />
                    <ToolbarButton icon={<CheckCircleIcon className="h-4 w-4" />} onClick={() => handleToolbarAction('todo')} title="Checklist" disabled={isReadOnly} />
                    <ToolbarButton icon={<LinkIcon className="h-4 w-4" />} onClick={() => { }} title="Link" disabled={isReadOnly} />
                </div>

                <div className="text-xs text-gray-500 font-medium">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-blue-400">
                            <ArrowPathIcon className="h-3 w-3 animate-spin" /> Saving...
                        </span>
                    ) : lastSaved ? (
                        <span>Saved {formatTime(lastSaved)}</span>
                    ) : null}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Start typing meeting notes here..."
                    className="w-full h-full bg-transparent p-4 text-gray-300 placeholder:text-gray-600 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                    spellCheck={false}
                />
                {isReadOnly && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1 bg-black/50 rounded-full text-xs text-white/50 border border-white/10">Read Only</span>
                    </div>
                )}
            </div>

            {/* Footer / Status */}
            <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-[10px] text-gray-500 flex justify-between">
                <span>Admin Notes</span>
                <span>Markdown supported</span>
            </div>
        </div>
    );
}

function ToolbarButton({ icon, onClick, title, disabled }: { icon: React.ReactNode, onClick: () => void, title: string, disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-lg transition-colors ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/10 text-gray-400 hover:text-white'
                }`}
        >
            {icon}
        </button>
    );
}
