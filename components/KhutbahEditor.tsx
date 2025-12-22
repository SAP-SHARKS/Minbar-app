import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Loader2, Save, Sparkles, X, LayoutList,
  PlusCircle, Trash2, ChevronUp, ChevronDown, Edit3, Palette,
  CheckCircle2, Clock, AlignLeft, Languages
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

// --- Card Editing Modal Component ---
function CardEditModal({ card, onSave, onClose, isSaving }: { card: any, onSave: (updated: any) => void, onClose: () => void, isSaving: boolean }) {
  const [editedCard, setEditedCard] = useState({ ...card });

  const addPoint = () => {
    setEditedCard({ ...editedCard, bullet_points: [...(editedCard.bullet_points || []), ''] });
  };

  const updatePoint = (idx: number, val: string) => {
    const pts = [...editedCard.bullet_points];
    pts[idx] = val;
    setEditedCard({ ...editedCard, bullet_points: pts });
  };

  const removePoint = (idx: number) => {
    setEditedCard({ ...editedCard, bullet_points: editedCard.bullet_points.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Edit Summary Card</h2>
          <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Section Type</label>
              <select 
                value={editedCard.section_label}
                onChange={(e) => setEditedCard({...editedCard, section_label: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
              >
                <option value="INTRO">Introduction</option>
                <option value="MAIN">Main Point</option>
                <option value="HADITH">Hadith</option>
                <option value="QURAN">Quran</option>
                <option value="STORY">Story</option>
                <option value="PRACTICAL">Practical</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
              <input 
                value={editedCard.title}
                onChange={(e) => setEditedCard({...editedCard, title: e.target.value})}
                placeholder="Section Title"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
              Bullet Points <span>{editedCard.bullet_points?.length || 0}</span>
            </label>
            {(editedCard.bullet_points || []).map((pt: string, i: number) => (
              <div key={i} className="flex gap-2 group">
                <input 
                  value={pt}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  placeholder={`Point ${i+1}`}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button onClick={() => removePoint(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => addPoint()}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all"
            >
              + ADD TALKING POINT
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arabic Text (Optional)</label>
            <textarea 
              value={editedCard.arabic_text || ''}
              onChange={(e) => setEditedCard({...editedCard, arabic_text: e.target.value})}
              dir="rtl"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-serif text-xl h-24 resize-none"
              placeholder="إِنَّ الْحَمْدَ لِلَّهِ..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/30">
          <button onClick={() => onClose()} className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
          <button 
            onClick={() => onSave(editedCard)} 
            disabled={isSaving}
            className="flex-[2] py-3 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
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
  const savedRange = useRef<Range | null>(null);
  
  // Block Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Summary Cards State
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isCardModalSaving, setIsCardModalSaving] = useState(false);

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

    if (data) {
      setCards([...cards, data]);
      setEditingCard(data);
    }
  };

  const handleUpdateCard = async (updated: any) => {
    setIsCardModalSaving(true);
    try {
      const { error } = await supabase
        .from('user_khutbah_cards')
        .update({
          title: updated.title,
          section_label: updated.section_label,
          bullet_points: updated.bullet_points,
          arabic_text: updated.arabic_text
        })
        .eq('id', updated.id);

      if (error) throw error;

      setCards(cards.map(c => c.id === updated.id ? updated : c));
      setEditingCard(null);
    } catch (err: any) {
      alert("Error saving card: " + err.message);
    } finally {
      setIsCardModalSaving(false);
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRange.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
      }
    }
  };

  const handleInsertBlock = (blockHtml: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, blockHtml);
    if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        setSaveStatus('unsaved');
    }
    // Explicitly reset any stuck editing state
    setSelectedBlockEl(null);
  };

  // LEVEL 4 Interactions
  useEffect(() => {
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const blockContainer = target.closest('.khutbah-block-container') as HTMLElement;
      
      if (blockContainer) {
        setSelectedBlockEl(blockContainer);
        const rect = blockContainer.getBoundingClientRect();
        const editorRect = editorRef.current?.parentElement?.getBoundingClientRect() || { top: 0, left: 0 };
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
    <div className="flex h-full bg-gray-50 overflow-hidden relative md:pl-20 pr-16">
      <RightSidebar 
        cards={cards}
        onCardClick={(id) => {
          setSelectedCardId(id);
          const card = cards.find(c => c.id === id);
          if (card) setEditingCard(card);
        }}
        onAddCard={() => handleAddCard()}
        selectedCardId={selectedCardId}
        onOpenLibrary={() => setIsLibraryOpen(true)} 
      />

      <BlockLibrary 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
        onInsert={handleInsertBlock}
      />

      {editingCard && (
        <CardEditModal 
          card={editingCard} 
          onSave={handleUpdateCard} 
          onClose={() => setEditingCard(null)} 
          isSaving={isCardModalSaving}
        />
      )}

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
                <button onClick={() => handleSave()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all">
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
                <button onClick={() => handleDeleteBlock()} className="p-2 hover:bg-red-50 text-red-500 rounded-md transition-colors"><Trash2 size={14}/></button>
              </div>
            )}

            <div className="flex justify-center pb-32 px-8 min-h-full py-12">
                <RichTextEditor 
                    content={content} 
                    onChange={(html) => { setContent(html); setSaveStatus('unsaved'); }}
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    editorRef={editorRef}
                    onMouseUp={saveSelection}
                    onKeyUp={saveSelection}
                    onBlur={saveSelection}
                />
            </div>
        </div>
      </div>
    </div>
  );
}
