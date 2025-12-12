import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link as LinkIcon, 
  Undo, Redo, Sparkles, ChevronRight, 
  X, ChevronLeft, Type,
  BookOpen, Globe, Quote, Smile,
  MoreHorizontal, Printer, Minus, Plus,
  FileText, CheckCircle, LayoutList, PlusCircle, Trash2, Save, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- Types ---
interface KhutbahCard {
  id: string;
  khutbah_id: string;
  card_number: number;
  section_label: 'INTRO' | 'MAIN' | 'HADITH' | 'QURAN' | 'STORY' | 'PRACTICAL' | 'CLOSING';
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
  { value: 'INTRO', label: 'Introduction', color: 'bg-blue-100' },
  { value: 'MAIN', label: 'Main Point', color: 'bg-gray-100' },
  { value: 'HADITH', label: 'Hadith', color: 'bg-green-100' },
  { value: 'QURAN', label: 'Quran', color: 'bg-emerald-100' },
  { value: 'STORY', label: 'Story', color: 'bg-purple-100' },
  { value: 'PRACTICAL', label: 'Practical', color: 'bg-orange-100' },
  { value: 'CLOSING', label: 'Closing', color: 'bg-rose-100' },
];

const BulletPointsEditor = ({ points, onChange }: { points: string[], onChange: (p: string[]) => void }) => {
  const addPoint = () => onChange([...points, '']);
  const removePoint = (index: number) => onChange(points.filter((_, i) => i !== index));
  const updatePoint = (index: number, value: string) => {
    const updated = [...points];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {points.map((point, index) => (
        <div key={index} className="flex gap-2 items-center">
          <span className="text-gray-400">•</span>
          <input
            value={point}
            onChange={(e) => updatePoint(index, e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
            placeholder={`Point ${index + 1}`}
          />
          <button onClick={() => removePoint(index)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
            <X size={16} />
          </button>
        </div>
      ))}
      <button onClick={addPoint} className="text-emerald-600 text-xs font-bold hover:underline flex items-center gap-1 mt-2">
        <PlusCircle size={14}/> Add bullet point
      </button>
    </div>
  );
};

export const KhutbahEditor = ({ user }: { user: any }) => {
  const [mode, setMode] = useState<'write' | 'cards'>('write');
  const [content, setContent] = useState<string>(`
    <h1>The Power of Patience (Sabr)</h1>
    <p>In the name of Allah, the Most Gracious, the Most Merciful.</p>
    <p><br></p>
    <p>My dear brothers and sisters, today we wish to speak about a quality that liberates the heart: <strong>Patience (Sabr)</strong>. It is often seen as a weakness, but in reality, it is the ultimate strength.</p>
  `);
  
  // Card Editor State
  const [cards, setCards] = useState<KhutbahCard[]>([]);
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(null);
  const [khutbahTitle, setKhutbahTitle] = useState("New Khutbah");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fontSize, setFontSize] = useState(11);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Fetch Initial Data ---
  useEffect(() => {
    const fetchActiveKhutbah = async () => {
        setIsCardsLoading(true);
        // For this demo, fetch the most recent khutbah or create a placeholder context
        const { data } = await supabase
            .from('khutbahs')
            .select('id, title')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setActiveKhutbahId(data.id);
            setKhutbahTitle(data.title);
            fetchCards(data.id);
        } else {
            // No khutbah found, maybe handle creating one later
            setKhutbahTitle("No Khutbahs Found");
            setIsCardsLoading(false);
        }
    };
    fetchActiveKhutbah();
  }, []);

  const fetchCards = async (id: string) => {
      const { data, error } = await supabase
        .from('khutbah_cards')
        .select('*')
        .eq('khutbah_id', id)
        .order('card_number', { ascending: true });

      if (data && data.length > 0) {
          setCards(data);
          setSelectedCardId(data[0].id);
      } else {
          setCards([]);
          setSelectedCardId(null);
      }
      setIsCardsLoading(false);
  };

  // --- Helpers ---
  const activeCard = cards.find(c => c.id === selectedCardId);

  const updateLocalCard = (field: keyof KhutbahCard, value: any) => {
      setCards(prev => prev.map(c => c.id === selectedCardId ? { ...c, [field]: value } : c));
  };

  const handleSaveCard = async () => {
      if (!activeCard) return;
      setIsSaving(true);
      
      const { error } = await supabase
        .from('khutbah_cards')
        .update({
            title: activeCard.title,
            section_label: activeCard.section_label,
            bullet_points: activeCard.bullet_points,
            arabic_text: activeCard.arabic_text,
            key_quote: activeCard.key_quote,
            quote_source: activeCard.quote_source,
            transition_text: activeCard.transition_text,
            time_estimate_seconds: activeCard.time_estimate_seconds,
            notes: activeCard.notes
        })
        .eq('id', activeCard.id);

      if (error) {
          alert('Failed to save card: ' + error.message);
      }
      setIsSaving(false);
  };

  const handleAddCard = async () => {
      if (!activeKhutbahId) return;
      
      const nextNumber = cards.length > 0 ? Math.max(...cards.map(c => c.card_number)) + 1 : 1;
      
      const newCardPayload = {
          khutbah_id: activeKhutbahId,
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

      const { data, error } = await supabase
        .from('khutbah_cards')
        .insert(newCardPayload)
        .select()
        .single();

      if (data) {
          setCards([...cards, data]);
          setSelectedCardId(data.id);
      } else if (error) {
          console.error("Error creating card:", error);
      }
  };

  const handleDeleteCard = async (id: string) => {
      if (!confirm('Are you sure you want to delete this card?')) return;
      
      const { error } = await supabase
        .from('khutbah_cards')
        .delete()
        .eq('id', id);
      
      if (!error) {
          const newCards = cards.filter(c => c.id !== id);
          setCards(newCards);
          if (selectedCardId === id && newCards.length > 0) {
              setSelectedCardId(newCards[0].id);
          } else if (newCards.length === 0) {
              setSelectedCardId(null);
          }
      }
  };

  const handleAiCheck = () => {
    setShowAiPanel(true);
    setIsAiLoading(true);
    setTimeout(() => {
      setIsAiLoading(false);
    }, 1500);
  };

  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-[#F9FBFD] overflow-hidden">
      
      {/* --- Header & Toolbar --- */}
      <div className="bg-white px-4 pt-3 pb-2 shadow-sm z-20 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={khutbahTitle}
                  readOnly
                  className="font-medium text-lg text-gray-800 outline-none hover:border-gray-300 border border-transparent px-1 rounded transition-colors bg-transparent truncate max-w-[300px]"
                />
                <span className="text-gray-400 text-xs px-2 py-0.5 border border-gray-300 rounded-md">Saved</span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'].map(menu => (
                  <button key={menu} className="hover:bg-gray-100 px-2 rounded -ml-2 transition-colors">{menu}</button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Mode Switcher */}
             <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => setMode('write')}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'write' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText size={16}/> Write
                </button>
                <button 
                    onClick={() => setMode('cards')}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'cards' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutList size={16}/> Cards
                </button>
             </div>

             <div className="w-px h-6 bg-gray-300 mx-2"></div>

             <button 
               onClick={handleAiCheck}
               className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all shadow-sm ${showAiPanel ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'}`}
             >
               <Sparkles size={16} fill="currentColor" className={isAiLoading ? "animate-spin" : ""} />
               {isAiLoading ? 'Analyzing...' : 'AI Assist'}
             </button>
          </div>
        </div>

        {/* Conditional Toolbar */}
        {mode === 'write' && (
             <div className="flex items-center gap-1 bg-[#EDF2FA] p-1.5 rounded-full w-fit mx-auto md:mx-4">
                  <div className="text-xs text-gray-400 font-medium px-4">Formatting Toolbar Active</div>
             </div>
        )}
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {mode === 'write' ? (
            // --- WRITE MODE ---
            <div className={`flex-1 overflow-y-auto bg-[#F9FBFD] relative`}>
               <div className="min-h-full py-8 flex justify-center cursor-text" onClick={() => editorRef.current?.focus()}>
                  <div 
                    ref={editorRef}
                    className="bg-white w-full max-w-[816px] min-h-[1056px] shadow-sm my-4 p-[96px] outline-none text-gray-800 leading-relaxed font-serif"
                    contentEditable
                    suppressContentEditableWarning
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: content }}
                    onInput={(e) => setContent(e.currentTarget.innerHTML)}
                  />
               </div>
            </div>
        ) : (
            // --- CARD EDITOR MODE ---
            <div className="flex-1 flex bg-gray-50 h-full">
                
                {/* Left: Card List */}
                <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Live Cards</h3>
                        <button onClick={handleAddCard} disabled={!activeKhutbahId} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"><PlusCircle size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {isCardsLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400"/></div>
                        ) : cards.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">No cards yet. Click + to add one.</div>
                        ) : (
                            cards.map((card, i) => (
                                <div 
                                    key={card.id}
                                    onClick={() => setSelectedCardId(card.id)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedCardId === card.id ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-200' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{i + 1}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${SECTION_OPTIONS.find(o => o.value === card.section_label)?.color || 'bg-gray-100 text-gray-500'}`}>
                                            {card.section_label}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-sm truncate leading-tight">{card.title || 'Untitled Card'}</h4>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Editor Form */}
                <div className="flex-1 overflow-y-auto bg-gray-50 h-full">
                    {activeCard ? (
                        <div className="max-w-3xl mx-auto py-8 px-8">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Edit Card #{cards.findIndex(c => c.id === selectedCardId) + 1}</h2>
                                        <p className="text-gray-500 text-sm">Customize what you see in Live Mode.</p>
                                    </div>
                                    <button onClick={() => handleDeleteCard(activeCard.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete Card"><Trash2 size={20}/></button>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Section Type</label>
                                        <select 
                                            value={activeCard.section_label}
                                            onChange={(e) => updateLocalCard('section_label', e.target.value)}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                                        >
                                            {SECTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Duration (Seconds)</label>
                                        <input 
                                            type="number"
                                            value={activeCard.time_estimate_seconds}
                                            onChange={(e) => updateLocalCard('time_estimate_seconds', parseInt(e.target.value))}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                                        />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Title</label>
                                    <input 
                                        type="text"
                                        value={activeCard.title}
                                        onChange={(e) => updateLocalCard('title', e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50"
                                        placeholder="e.g. The Story of Musa"
                                    />
                                </div>

                                <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Bullet Points (Main Talking Points)</label>
                                    <BulletPointsEditor 
                                        points={activeCard.bullet_points || []} 
                                        onChange={(newPoints) => updateLocalCard('bullet_points', newPoints)} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Arabic Text (Optional)</label>
                                        <textarea 
                                            dir="rtl"
                                            value={activeCard.arabic_text || ''}
                                            onChange={(e) => updateLocalCard('arabic_text', e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 h-24 font-serif text-right text-lg resize-none"
                                            placeholder="Add Quran/Hadith text..."
                                        />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Key Quote / Translation</label>
                                        <textarea 
                                            value={activeCard.key_quote || ''}
                                            onChange={(e) => updateLocalCard('key_quote', e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 h-24 resize-none"
                                            placeholder="English translation or key quote..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                     <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quote Source</label>
                                        <input 
                                            type="text"
                                            value={activeCard.quote_source || ''}
                                            onChange={(e) => updateLocalCard('quote_source', e.target.value)}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500"
                                            placeholder="e.g. Sahih Bukhari"
                                        />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Transition Text</label>
                                        <input 
                                            type="text"
                                            value={activeCard.transition_text || ''}
                                            onChange={(e) => updateLocalCard('transition_text', e.target.value)}
                                            className="w-full p-2.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg outline-none focus:border-blue-400 font-medium placeholder-blue-300"
                                            placeholder="e.g. Now let's move on..."
                                        />
                                    </div>
                                </div>
                                
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Personal Notes (Only visible to you)</label>
                                    <textarea 
                                        value={activeCard.notes || ''}
                                        onChange={(e) => updateLocalCard('notes', e.target.value)}
                                        className="w-full p-3 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg outline-none focus:border-yellow-400 h-20 resize-none font-medium"
                                        placeholder="Reminder: Pause for effect here..."
                                    />
                                </div>

                                <button 
                                    onClick={handleSaveCard}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>

                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                             <LayoutList size={48} className="mb-4 text-gray-300"/>
                             <p className="text-lg font-medium">Select a card to edit or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};