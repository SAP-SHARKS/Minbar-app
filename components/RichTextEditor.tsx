import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, 
  Undo, Redo,
  Minus, Plus, Printer
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  editorRef?: React.RefObject<HTMLDivElement>;
}

// --- Separated Toolbar Component ---
export function EditorToolbar({ 
    onExec, 
    activeFormats, 
    fontSize, 
    onFontSizeChange 
}: { 
    onExec: (cmd: string, val?: string) => void, 
    activeFormats: string[],
    fontSize: number,
    onFontSizeChange: (size: number) => void
}) {
    
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); 
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        isActive 
          ? 'bg-gray-900 text-white' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-gray-300 mx-1" />;

  return (
    <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => onExec('undo')} title="Undo"><Undo size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('redo')} title="Redo"><Redo size={16} /></ToolbarButton>
        <Divider />
        {/* Print */}
        <ToolbarButton onClick={() => window.print()} title="Print"><Printer size={16} /></ToolbarButton>
        <Divider />
        {/* Font Size */}
        <ToolbarButton onClick={() => onFontSizeChange(Math.max(10, fontSize - 2))} title="Decrease"><Minus size={16} /></ToolbarButton>
        <span className="px-1 text-xs font-bold text-gray-700 min-w-[24px] text-center select-none">{fontSize}</span>
        <ToolbarButton onClick={() => onFontSizeChange(Math.min(64, fontSize + 2))} title="Increase"><Plus size={16} /></ToolbarButton>
        <Divider />
        {/* Text Formatting */}
        <ToolbarButton onClick={() => onExec('bold')} isActive={activeFormats.includes('bold')} title="Bold"><Bold size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('italic')} isActive={activeFormats.includes('italic')} title="Italic"><Italic size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('underline')} isActive={activeFormats.includes('underline')} title="Underline"><Underline size={16} /></ToolbarButton>
        <Divider />
        {/* Alignment */}
        <ToolbarButton onClick={() => onExec('justifyLeft')} isActive={activeFormats.includes('justifyLeft')} title="Align Left"><AlignLeft size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('justifyCenter')} isActive={activeFormats.includes('justifyCenter')} title="Align Center"><AlignCenter size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('justifyRight')} isActive={activeFormats.includes('justifyRight')} title="Align Right"><AlignRight size={16} /></ToolbarButton>
        <Divider />
        {/* Lists */}
        <ToolbarButton onClick={() => onExec('insertUnorderedList')} isActive={activeFormats.includes('insertUnorderedList')} title="Bullet List"><List size={16} /></ToolbarButton>
        <ToolbarButton onClick={() => onExec('insertOrderedList')} isActive={activeFormats.includes('insertOrderedList')} title="Numbered List"><ListOrdered size={16} /></ToolbarButton>
    </div>
  );
}

// --- Simplified Editor Component ---
export function RichTextEditor({ content, onChange, fontSize, editorRef }: RichTextEditorProps) {
  // Use internal ref if not provided
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = editorRef || internalRef;

  // Sync content from props (e.g. database load)
  useEffect(() => {
    if (ref.current) {
      if (ref.current.innerHTML !== content) {
         const isFocused = document.activeElement === ref.current;
         if (!isFocused) {
            ref.current.innerHTML = content;
         } else if (content === '' && ref.current.innerHTML !== '') {
            ref.current.innerHTML = '';
         }
      }
    }
  }, [content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newHtml = e.currentTarget.innerHTML;
    onChange(newHtml);
  };

  return (
    <div 
        ref={ref}
        className="bg-white w-full max-w-[816px] min-h-[1056px] shadow-sm border border-gray-200 outline-none prose prose-lg max-w-none prose-headings:font-serif prose-p:leading-relaxed text-gray-800"
        style={{ 
            fontSize: `${fontSize}px`,
            padding: '96px 96px',
        }}
        contentEditable
        onInput={handleInput}
    />
  );
}