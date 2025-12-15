import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Loader2, Save, Sparkles, X, LayoutList,
  PlusCircle, Trash2, ChevronRight, Maximize2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { RichTextEditor, EditorToolbar } from './RichTextEditor';
import { LeftToolbar } from './LeftToolbar';
import { LeftPanel } from './LeftPanel';
import { CardsSidebar } from './CardsSidebar';

// --- Types (Re-used) ---
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

const SECTION_OPTIONS = [
  { value: 'INTRO', label: 'Introduction' },
  { value: 'MAIN', label: 'Main Point' },
  { value: 'HADITH', label: 'Hadith' },
  { value: 'QURAN', label: 'Quran' },
  { value: 'STORY', label: 'Story' },
  { value: 'PRACTICAL', label: 'Practical' },
  { value: 'CLOSING', label: 'Closing' },
];

interface KhutbahEditorProps {
  user: any;
  khutbahId: string | null;
  onGoLive?: (id: string) => void;
  onSaveNew?: (id: string) => void;
}

export const KhutbahEditor: React.FC<KhutbahEditorProps> = ({ user, khutbahId, onGoLive, onSaveNew }) => {
  // Layout State
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  // Editor Content State
  const [content, setContent] = useState<string>('<p>In the name of Allah...</p>');
  const [khutbahTitle, setKhutbahTitle] = useState("Untitled Khutbah");
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(khutbahId);
  
  // Cards State
  const [cards, setCards] = useState<KhutbahCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false); // Modal for editing cards
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [fontSize, setFontSize] = useState(16);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Rich Text Formats State (For Toolbar)
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // --- Initialization ---
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

  // --- Toolbar Logic ---
  const checkFormats = () => {
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.push('justifyRight');
    if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.push('insertOrderedList');
    setActiveFormats(formats);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    checkFormats();
  };

  // --- Handlers ---
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

  // --- Card Logic ---
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
          setShowCardModal(true); // Open edit modal
      }
  };

  const updateCard = (id: string, field: keyof KhutbahCard, value: any) => {
      setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveCardToDb = async (card: KhutbahCard) => {
      await supabase.from('user_khutbah_cards').update(card).eq('id', card.id);
  };

  const activeCard = cards.find(c => c.id === selectedCardId);

  // --- Render ---
  return (
    <div className="flex h-full bg-gray-50 overflow-hidden relative md:pl-20">
      
      {/* 1. Editor Tools (Left Toolbar + Panel) */}
      {/* Wrapped in a relative container to manage positioning of the pop-out panel */}
      <div className="relative flex flex-col h-full shrink-0 z-20">
          <LeftToolbar activeTool={activeTool} onToolSelect={setActiveTool} />
          {/* LeftPanel is absolute positioned relative to this wrapper via its own CSS (left-16) */}
          <LeftPanel activeTool={activeTool} onClose={() => setActiveTool(null)} />
      </div>

      {/* 2. Center Column (Editor Content) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9FBFD] relative">
        
        {/* Top Bar: Title + Save Status */}
        <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4 flex-1">
                <input 
                    type="text" 
                    value={khutbahTitle}
                    onChange={(e) => { setKhutbahTitle(e.target.value); setSaveStatus('unsaved'); }}
                    className="font-bold text-xl text-gray-800 outline-none bg-transparent hover:bg-gray-50 rounded px-2 -ml-2 transition-colors truncate max-w-md"
                    placeholder="Untitled Khutbah"
                />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${saveStatus === 'unsaved' ? 'bg-amber-50 text-amber-600' : saveStatus === 'saving' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {saveStatus === 'saving' ? <Loader2 size={10} className="animate-spin"/> : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                {activeKhutbahId && onGoLive && (
                    <button onClick={() => onGoLive(activeKhutbahId)} className="bg-white border border-red-100 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                        <Sparkles size={14}/> Live Mode
                    </button>
                )}
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                    <Save size={14}/> Save
                </button>
            </div>
        </div>

        {/* Toolbar Strip */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-center shrink-0 shadow-sm z-10 relative">
            <EditorToolbar 
                onExec={execCommand} 
                activeFormats={activeFormats} 
                fontSize={fontSize} 
                onFontSizeChange={setFontSize} 
            />
        </div>

        {/* Editor Area (Scrollable) */}
        <div 
            className="flex-1 overflow-y-auto cursor-text scroll-smooth"
            onClick={() => {
                editorRef.current?.focus();
                checkFormats();
            }}
            onKeyUp={checkFormats}
            onMouseUp={checkFormats}
        >
            <div className="flex justify-center pb-32 px-8 min-h-full py-8">
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

      {/* 3. Right Sidebar (Summary Cards) */}
      <CardsSidebar 
        cards={cards}
        onCardClick={(id) => { setSelectedCardId(id); setShowCardModal(true); }}
        onAddCard={handleAddCard}
        selectedCardId={selectedCardId}
      />

      {/* Card Edit Modal */}
      {showCardModal && activeCard && (
          <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end">
              <div className="w-[500px] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 text-lg">Edit Card</h3>
                      <div className="flex gap-2">
                          <button onClick={() => { saveCardToDb(activeCard); }} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-full" title="Save"><Save size={20}/></button>
                          <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Section Type</label>
                          <select 
                              value={activeCard.section_label}
                              onChange={(e) => updateCard(activeCard.id, 'section_label', e.target.value)}
                              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                          >
                              {SECTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label>
                          <input 
                              value={activeCard.title} 
                              onChange={(e) => updateCard(activeCard.id, 'title', e.target.value)}
                              className="w-full p-3 border border-gray-200 rounded-lg font-bold text-lg"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Talking Points</label>
                          <div className="space-y-2">
                              {activeCard.bullet_points.map((pt, i) => (
                                  <div key={i} className="flex gap-2">
                                      <span className="text-gray-400 mt-2">•</span>
                                      <textarea 
                                          value={pt}
                                          onChange={(e) => {
                                              const newPts = [...activeCard.bullet_points];
                                              newPts[i] = e.target.value;
                                              updateCard(activeCard.id, 'bullet_points', newPts);
                                          }}
                                          className="flex-1 p-2 border border-gray-200 rounded-lg text-sm resize-none"
                                          rows={2}
                                      />
                                      <button onClick={() => {
                                          const newPts = activeCard.bullet_points.filter((_, idx) => idx !== i);
                                          updateCard(activeCard.id, 'bullet_points', newPts);
                                      }} className="text-gray-300 hover:text-red-500 h-fit mt-2"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              <button onClick={() => updateCard(activeCard.id, 'bullet_points', [...activeCard.bullet_points, ''])} className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                  <PlusCircle size={14}/> Add Point
                              </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Arabic / Quote</label>
                          <textarea 
                              dir="rtl"
                              value={activeCard.arabic_text}
                              onChange={(e) => updateCard(activeCard.id, 'arabic_text', e.target.value)}
                              className="w-full p-3 border border-gray-200 rounded-lg font-serif text-right"
                              placeholder="Arabic text..."
                              rows={3}
                          />
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}