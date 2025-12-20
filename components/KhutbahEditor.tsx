
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Loader2, Save, Sparkles, X, LayoutList,
  PlusCircle, Trash2, ChevronUp, ChevronDown, Edit3, Palette
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { RichTextEditor, EditorToolbar } from './RichTextEditor';
import { LeftToolbar } from './LeftToolbar';
import { LeftPanel } from './LeftPanel';
import { RightSidebar } from './RightSidebar';
import { BlockLibrary } from './BlockLibrary/BlockLibrary';
import { CategoryId, BlockItem } from './BlockLibrary/types';

interface KhutbahEditorProps {
  user: any;
  khutbahId: string | null;
  onGoLive?: (id: string) => void;
  onSaveNew?: (id: string) => void;
}

export function KhutbahEditor({ user, khutbahId, onGoLive, onSaveNew }: KhutbahEditorProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [khutbahTitle, setKhutbahTitle] = useState("Untitled Khutbah");
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(khutbahId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [fontSize, setFontSize] = useState(16);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  
  // Block Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Summary Cards State
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Block Context Toolbar State
  const [selectedBlockEl, setSelectedBlockEl] = useState<HTMLElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (khutbahId) {
        fetchKhutbahData(khutbahId);
    } else {
        setKhutbahTitle("Untitled Khutbah");
        setContent("");
        setCards([]);
        setSaveStatus('unsaved');
    }
  }, [khutbahId]);

  const fetchKhutbahData = async (id: string) => {
        const { data: kData } = await supabase.from('user_khutbahs').select('*').eq('id', id).single();
        if (kData) {
            setKhutbahTitle(kData.title);
            setContent(kData.content || '');
            setSaveStatus('saved');
            setActiveKhutbahId(id);
            fetchCards(id);
        }
  };

  const fetchCards = async (id: string) => {
    const { data } = await supabase
      .from('user_khutbah_cards')
      .select('*')
      .eq('user_khutbah_id', id)
      .order('card_number', { ascending: true });
    if (data) setCards(data);
  };

  const handleSave = async () => {
      if (!user) return alert("Please sign in to save.");
      setIsSaving(true);
      setSaveStatus('saving');
      try {
          if (activeKhutbahId) {
              await supabase.from('user_khutbahs')
                .update({ title: khutbahTitle, content: content, updated_at: new Date().toISOString() })
                .eq('id', activeKhutbahId);
          } else {
              const { data, error } = await supabase.from('user_khutbahs')
                .insert({
                    user_id: user.id || user.uid,
                    title: khutbahTitle,
                    content: content,
                    author: user.user_metadata?.full_name || 'Me',
                    likes_count: 0
                }).select().single();
              if (error) throw error;
              if (data) {
                  setActiveKhutbahId(data.id);
                  if (onSaveNew) onSaveNew(data.id);
              }
          }
          setSaveStatus('saved');
      } catch (err: any) {
          alert("Failed to save: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleAddCard = async () => {
    if (!activeKhutbahId) {
        alert("Please save your khutbah first.");
        return;
    }
    const nextNum = cards.length + 1;
    const { data, error } = await supabase
      .from('user_khutbah_cards')
      .insert({
        user_khutbah_id: activeKhutbahId,
        card_number: nextNum,
        section_label: 'MAIN',
        title: 'New Section',
        bullet_points: ['Key point here...']
      })
      .select()
      .single();

    if (data) setCards([...cards, data]);
  };

  const handleInsertBlock = (blockHtml: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, blockHtml);
    if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        setSaveStatus('unsaved');
    }
  };

  // LEVEL 4 Interactions
  useEffect(() => {
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const blockContainer = target.closest('.khutbah-block-container') as HTMLElement;
      
      if (blockContainer) {
        setSelectedBlockEl(blockContainer);
        const rect = blockContainer.getBoundingClientRect();
        setToolbarPos({ 
          top: rect.top - 50, 
          left: rect.left + (rect.width / 2) - 100 
        });
      } else {
        setSelectedBlockEl(null);
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('click', handleEditorClick);
      return () => editor.removeEventListener('click', handleEditorClick);
    }
  }, [content]);

  const handleDeleteBlock = () => {
    if (selectedBlockEl) {
      selectedBlockEl.remove();
      setSelectedBlockEl(null);
      if (editorRef.current) setContent(editorRef.current.innerHTML);
    }
  };

  const handleMoveBlock = (dir: 'up' | 'down') => {
    if (!selectedBlockEl) return;
    const sibling = dir === 'up' ? selectedBlockEl.previousElementSibling : selectedBlockEl.nextElementSibling;
    if (sibling) {
      if (dir === 'up') sibling.before(selectedBlockEl);
      else sibling.after(selectedBlockEl);
      if (editorRef.current) setContent(editorRef.current.innerHTML);
      const rect = selectedBlockEl.getBoundingClientRect();
      setToolbarPos({ top: rect.top - 50, left: rect.left + (rect.width / 2) - 100 });
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden relative md:pl-20 pr-[320px]">
      <RightSidebar 
        cards={cards}
        onCardClick={(id) => setSelectedCardId(id)}
        onAddCard={handleAddCard}
        selectedCardId={selectedCardId}
        onOpenLibrary={() => setIsLibraryOpen(true)} 
      />

      <BlockLibrary 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
        onInsert={handleInsertBlock}
      />

      <div className="relative flex flex-col h-full shrink-0 z-20">
          <LeftToolbar activeTool={activeTool} onToolSelect={setActiveTool} />
          <LeftPanel activeTool={activeTool} onClose={() => setActiveTool(null)} />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9FBFD] relative">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4 flex-1">
                <input 
                    type="text" 
                    value={khutbahTitle}
                    onChange={(e) => { setKhutbahTitle(e.target.value); setSaveStatus('unsaved'); }}
                    className="font-bold text-xl text-gray-800 outline-none bg-transparent hover:bg-gray-50 rounded px-2 -ml-2 transition-colors truncate max-w-md"
                />
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${saveStatus === 'unsaved' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {saveStatus}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all">
                    <Save size={14}/> Save
                </button>
            </div>
        </div>

        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-center shrink-0 shadow-sm z-10">
            <EditorToolbar onExec={() => {}} activeFormats={activeFormats} fontSize={fontSize} onFontSizeChange={setFontSize} />
        </div>

        <div className="flex-1 overflow-y-auto cursor-text scroll-smooth custom-scrollbar relative">
            {selectedBlockEl && (
              <div 
                className="fixed z-[2000] flex items-center gap-1 bg-white border border-gray-200 shadow-xl rounded-lg p-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ top: toolbarPos.top, left: toolbarPos.left }}
              >
                <button 
                  onClick={() => setIsLibraryOpen(true)}
                  className="p-2 hover:bg-gray-50 text-gray-600 rounded-md transition-colors flex items-center gap-1.5"
                >
                  <Edit3 size={14}/> <span className="text-[10px] font-bold">EDIT</span>
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button onClick={() => handleMoveBlock('up')} className="p-2 hover:bg-gray-50 text-gray-500 rounded-md"><ChevronUp size={14}/></button>
                <button onClick={() => handleMoveBlock('down')} className="p-2 hover:bg-gray-50 text-gray-500 rounded-md"><ChevronDown size={14}/></button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button className="p-2 hover:bg-gray-50 text-gray-500 rounded-md"><Palette size={14}/></button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button onClick={handleDeleteBlock} className="p-2 hover:bg-red-50 text-red-500 rounded-md transition-colors"><Trash2 size={14}/></button>
              </div>
            )}

            <div className="flex justify-center pb-32 px-8 min-h-full py-12">
                <RichTextEditor 
                    content={content} 
                    onChange={(html) => { setContent(html); setSaveStatus('unsaved'); }}
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    editorRef={editorRef}
                />
            </div>
        </div>
      </div>
    </div>
  );
}
