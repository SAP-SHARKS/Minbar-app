
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Loader2, Save, Sparkles, X, LayoutList,
  PlusCircle, Trash2, ChevronRight, Maximize2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { RichTextEditor, EditorToolbar } from './RichTextEditor';
import { LeftToolbar } from './LeftToolbar';
import { LeftPanel } from './LeftPanel';
import { RightSidebar } from './RightSidebar';

// --- Types ---
interface KhutbahCard {
  id: string;
  user_khutbah_id: string; 
  card_number: number;
  section_label: string;
  title: string;
  bullet_points: string[];
  arabic_text: string;
  key_quote: string;
  quote_source: string;
  transition_text: string;
  time_estimate_seconds: number;
  notes: string;
}

interface KhutbahEditorProps {
  user: any;
  khutbahId: string | null;
  onGoLive?: (id: string) => void;
  onSaveNew?: (id: string) => void;
}

const SECTION_OPTIONS = [
  { value: 'INTRO', label: 'Introduction' },
  { value: 'MAIN', label: 'Main Point' },
  { value: 'HADITH', label: 'Hadith' },
  { value: 'QURAN', label: 'Quran' },
  { value: 'STORY', label: 'Story' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'CLOSING', label: 'Closing' },
];

export const KhutbahEditor: React.FC<KhutbahEditorProps> = ({ user, khutbahId, onGoLive, onSaveNew }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [content, setContent] = useState<string>('<p>In the name of Allah...</p>');
  const [khutbahTitle, setKhutbahTitle] = useState("Untitled Khutbah");
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(khutbahId);
  const [cards, setCards] = useState<KhutbahCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false); 
  const [editingBlock, setEditingBlock] = useState<{ verseKey: string; element: HTMLElement } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [fontSize, setFontSize] = useState(16);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  useEffect(() => {
    setActiveKhutbahId(khutbahId);
    if (khutbahId) {
        fetchKhutbahData(khutbahId);
    } else {
        setKhutbahTitle("Untitled Khutbah");
        setContent("");
        setCards([]);
        setSaveStatus('unsaved');
    }
  }, [khutbahId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const block = target.closest('.khutbah-block--quran');
      if (block) {
        const verseKey = block.getAttribute('data-verse-key');
        setEditingBlock({ verseKey: verseKey || '', element: block as HTMLElement });
      } else {
        if (editorRef.current?.contains(target)) {
           setEditingBlock(null);
        }
      }
    };
    editorRef.current?.addEventListener('click', handleClick);
    return () => editorRef.current?.removeEventListener('click', handleClick);
  }, [editorRef.current]);

  const fetchKhutbahData = async (id: string) => {
        const { data: kData } = await supabase.from('user_khutbahs').select('*').eq('id', id).single();
        if (kData) {
            setKhutbahTitle(kData.title);
            setContent(kData.content || '');
            setSaveStatus('saved');
            const { data: cData } = await supabase
                .from('user_khutbah_cards')
                .select('*')
                .eq('user_khutbah_id', id)
                .order('card_number', { ascending: true });
            if (cData) setCards(cData);
        }
  };

  const checkFormats = () => {
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    setActiveFormats(formats);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkFormats();
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
          console.error("Save error:", err);
          alert("Failed to save: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleInsertQuran = (data: any) => {
    const arabic = data.arabic || "";
    const english = data.english || data.translation || "";
    const verseKey = data.verseKey || "";
    
    // Combined block with both languages
    const blockHtml = `
      <div class="khutbah-block khutbah-block--quran quran-block p-6 bg-emerald-50 border-l-4 border-emerald-500 my-6 rounded-r-xl cursor-pointer hover:bg-emerald-50/80 transition-all shadow-sm group relative" data-verse-key="${verseKey}" contenteditable="false">
        <div class="quran-ar text-3xl font-serif text-right mb-4 leading-[2] text-gray-900" dir="rtl">${arabic}</div>
        ${english ? `<div class="quran-en text-lg text-gray-700 italic mb-2 leading-relaxed">"${english}"</div>` : ''}
        <div class="quran-ref text-sm font-bold text-emerald-700 text-right mt-3 flex items-center justify-end gap-2">
           <span class="h-px w-6 bg-emerald-200"></span> Quran ${verseKey}
        </div>
      </div>
      <p><br></p>
    `;

    if (editingBlock) {
        editingBlock.element.outerHTML = blockHtml;
        setEditingBlock(null);
    } else {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, blockHtml);
    }

    if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        setSaveStatus('unsaved');
    }
  };

  const handleRemoveBlock = () => {
    if (editingBlock) {
        editingBlock.element.remove();
        setEditingBlock(null);
        if (editorRef.current) {
            setContent(editorRef.current.innerHTML);
            setSaveStatus('unsaved');
        }
    }
  };

  const handleAddCard = async () => {
      if (!activeKhutbahId) return alert("Please save the khutbah first.");
      const nextNumber = cards.length > 0 ? Math.max(...cards.map(c => c.card_number)) + 1 : 1;
      const newCard = {
          user_khutbah_id: activeKhutbahId,
          card_number: nextNumber,
          section_label: 'MAIN',
          title: 'New Card',
          bullet_points: ['Key point 1'],
          time_estimate_seconds: 180,
          arabic_text: '',
          key_quote: '',
          quote_source: '',
          transition_text: '',
          notes: ''
      };
      const { data } = await supabase.from('user_khutbah_cards').insert(newCard).select().single();
      if (data) {
          setCards([...cards, data]);
          setSelectedCardId(data.id);
          setShowCardModal(true); 
      }
  };

  const updateCard = (id: string, field: keyof KhutbahCard, value: any) => {
      setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveCardToDb = async (card: KhutbahCard) => {
      await supabase.from('user_khutbah_cards').update(card).eq('id', card.id);
  };

  const activeCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden relative md:pl-20">
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
                    placeholder="Untitled Khutbah"
                />
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${saveStatus === 'unsaved' ? 'bg-amber-50 text-amber-600' : saveStatus === 'saving' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {saveStatus === 'saving' ? <Loader2 size={10} className="animate-spin"/> : saveStatus}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {activeKhutbahId && onGoLive && (
                    <button onClick={() => onGoLive(activeKhutbahId)} className="bg-white border border-red-100 text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                        <Sparkles size={14}/> Live Mode
                    </button>
                )}
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-100">
                    <Save size={14}/> Save
                </button>
            </div>
        </div>
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-center shrink-0 shadow-sm z-10">
            <EditorToolbar onExec={execCommand} activeFormats={activeFormats} fontSize={fontSize} onFontSizeChange={setFontSize} />
        </div>
        <div 
            className="flex-1 overflow-y-auto cursor-text scroll-smooth custom-scrollbar"
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('.khutbah-block--quran')) {
                    editorRef.current?.focus();
                    checkFormats();
                }
            }}
            onKeyUp={checkFormats}
            onMouseUp={checkFormats}
        >
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
      <RightSidebar 
        cards={cards}
        onCardClick={(id) => { setSelectedCardId(id); setShowCardModal(true); }}
        onAddCard={handleAddCard}
        selectedCardId={selectedCardId}
        onInsertQuran={handleInsertQuran}
        editingBlock={editingBlock}
        onRemoveBlock={handleRemoveBlock}
        onCancelEdit={() => setEditingBlock(null)}
      />
      {showCardModal && activeCard && (
          <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
              <div className="w-[500px] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-gray-800 text-lg">Edit Outline Card</h3>
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Card #{activeCard.card_number}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => { saveCardToDb(activeCard); setSaveStatus('saved'); }} className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm" title="Save changes"><Save size={20}/></button>
                          <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Section Category</label>
                          <div className="grid grid-cols-4 gap-2">
                             {SECTION_OPTIONS.map(opt => (
                                 <button
                                    key={opt.value}
                                    onClick={() => updateCard(activeCard.id, 'section_label', opt.value)}
                                    className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${activeCard.section_label === opt.value ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Display Title</label>
                          <input 
                              value={activeCard.title} 
                              onChange={(e) => updateCard(activeCard.id, 'title', e.target.value)}
                              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                              placeholder="e.g. Introduction"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Core Talking Points</label>
                          <div className="space-y-3">
                              {activeCard.bullet_points.map((pt, i) => (
                                  <div key={i} className="flex gap-3 group animate-in slide-in-from-left-2 duration-200">
                                      <div className="mt-4 w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                                      <textarea 
                                          value={pt}
                                          onChange={(e) => {
                                              const newPts = [...activeCard.bullet_points];
                                              newPts[i] = e.target.value;
                                              updateCard(activeCard.id, 'bullet_points', newPts);
                                          }}
                                          className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none shadow-sm"
                                          rows={2}
                                          placeholder="Share a key concept..."
                                      />
                                      <button onClick={() => {
                                          const newPts = activeCard.bullet_points.filter((_, idx) => idx !== i);
                                          updateCard(activeCard.id, 'bullet_points', newPts);
                                      }} className="text-gray-300 hover:text-red-500 transition-colors h-fit mt-3 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              <button onClick={() => updateCard(activeCard.id, 'bullet_points', [...activeCard.bullet_points, ''])} className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                                  <PlusCircle size={14}/> Add New Point
                              </button>
                          </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Arabic Recitation / Script</label>
                          <div className="relative">
                              <textarea 
                                  dir="rtl"
                                  value={activeCard.arabic_text}
                                  onChange={(e) => updateCard(activeCard.id, 'arabic_text', e.target.value)}
                                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-serif text-right text-2xl leading-loose outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                                  placeholder="Arabic text for live recitation..."
                                  rows={4}
                              />
                              <div className="absolute left-3 top-3 bg-white px-2 py-0.5 rounded border border-gray-200 text-[8px] font-black text-gray-400 uppercase tracking-widest shadow-sm">Script Mode</div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-100">
                      <button 
                        onClick={() => setShowCardModal(false)}
                        className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                      >
                          Finish Editing Card
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
