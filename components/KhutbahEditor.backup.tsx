import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link as LinkIcon, 
  Undo, Redo, Sparkles, ChevronRight, 
  X, ChevronLeft, Type,
  BookOpen, Globe, Quote, Smile,
  MoreHorizontal, Printer, Minus, Plus,
  FileText, CheckCircle, LayoutList, PlusCircle, Trash2, Save
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- Types ---
interface KhutbahCard {
  id: string;
  khutbah_id?: string;
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

const DEFAULT_CARD: KhutbahCard = {
    id: 'new',
    card_number: 1,
    section_label: 'MAIN',
    title: 'New Point',
    bullet_points: [''],
    arabic_text: '',
    key_quote: '',
    quote_source: '',
    transition_text: '',
    time_estimate_seconds: 120,
    notes: ''
};

const SECTION_OPTIONS = ['INTRO', 'MAIN', 'HADITH', 'QURAN', 'STORY', 'PRACTICAL', 'CLOSING'];

// --- Mock AI Analysis Data (Keep existing) ---
const MOCK_AI_DATA = {
  readability: { score: 72, label: "Good", detail: "Grade 8 reading level" },
  arabic: { count: 2, text: "untranslated terms found" },
  citations: { count: 3, text: "verified Hadiths detected" },
  tone: { label: "Inspirational", detail: "High emotional resonance" }
};

export const KhutbahEditor = ({ user }: { user: any }) => {
  const [mode, setMode] = useState<'write' | 'cards'>('write');
  const [content, setContent] = useState<string>(`
    <h1>The Power of Patience (Sabr)</h1>
    <p>In the name of Allah, the Most Gracious, the Most Merciful.</p>
    <p><br></p>
    <p>My dear brothers and sisters, today we wish to speak about a quality that liberates the heart: <strong>Patience (Sabr)</strong>. It is often seen as a weakness, but in reality, it is the ultimate strength.</p>
    <p><br></p>
    <p>Look at the story of Prophet Yusuf (AS). After years of betrayal and separation caused by his brothers, what did he say when he had power over them? "No blame will there be upon you today." He chose peace over revenge.</p>
    <p><br></p>
    <h3>The Three Types of Sabr</h3>
    <ul>
      <li>Patience in obeying Allah</li>
      <li>Patience in abstaining from sins</li>
      <li>Patience during calamities</li>
    </ul>
    <p><br></p>
    <p>As the Prophet (SAW) said: "Patience is at the first stroke of a calamity." (Sahih Bukhari)</p>
  `);
  
  // Card Editor State
  const [cards, setCards] = useState<KhutbahCard[]>([
      { ...DEFAULT_CARD, id: '1', title: 'Opening', section_label: 'INTRO' },
      { ...DEFAULT_CARD, id: '2', title: 'Story of Yusuf', section_label: 'STORY' }
  ]);
  const [selectedCardId, setSelectedCardId] = useState<string>('1');

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fontSize, setFontSize] = useState(11);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const activeCard = cards.find(c => c.id === selectedCardId) || cards[0];

  const updateCard = (field: keyof KhutbahCard, value: any) => {
      setCards(prev => prev.map(c => c.id === selectedCardId ? { ...c, [field]: value } : c));
  };

  const addCard = () => {
      const newId = Date.now().toString();
      const newCard = { ...DEFAULT_CARD, id: newId, card_number: cards.length + 1 };
      setCards([...cards, newCard]);
      setSelectedCardId(newId);
  };

  const deleteCard = (id: string) => {
      if (cards.length <= 1) return;
      const newCards = cards.filter(c => c.id !== id);
      setCards(newCards);
      if (selectedCardId === id) setSelectedCardId(newCards[0].id);
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
                  defaultValue="Jumu'ah Khutbah - Dec 15" 
                  className="font-medium text-lg text-gray-800 outline-none hover:border-gray-300 border border-transparent px-1 rounded transition-colors"
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
             /* Keep existing toolbar code for brevity, assumes it renders here */
             <div className="flex items-center gap-1 bg-[#EDF2FA] p-1.5 rounded-full w-fit mx-auto md:mx-4">
                  {/* ... Toolbar buttons from previous code ... */}
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
            <div className="flex-1 flex bg-gray-50">
                
                {/* Left: Card List */}
                <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Live Cards</h3>
                        <button onClick={addCard} className="text-emerald-600 hover:text-emerald-700"><PlusCircle size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {cards.map((card, i) => (
                            <div 
                                key={card.id}
                                onClick={() => setSelectedCardId(card.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCardId === card.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded">{i + 1}</span>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase">{card.section_label}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm truncate">{card.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Editor Form */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Edit Card #{cards.findIndex(c => c.id === selectedCardId) + 1}</h2>
                                <p className="text-gray-500 text-sm">Customize what you see in Live Mode.</p>
                            </div>
                            <button onClick={() => deleteCard(activeCard.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20}/></button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Section Type</label>
                                <select 
                                    value={activeCard.section_label}
                                    onChange={(e) => updateCard('section_label', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 outline-none focus:border-emerald-500"
                                >
                                    {SECTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Duration (Seconds)</label>
                                <input 
                                    type="number"
                                    value={activeCard.time_estimate_seconds}
                                    onChange={(e) => updateCard('time_estimate_seconds', parseInt(e.target.value))}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Title</label>
                            <input 
                                type="text"
                                value={activeCard.title}
                                onChange={(e) => updateCard('title', e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold text-gray-900 outline-none focus:border-emerald-500"
                                placeholder="e.g. The Story of Musa"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bullet Points (One per line)</label>
                            <textarea 
                                value={activeCard.bullet_points.join('\n')}
                                onChange={(e) => updateCard('bullet_points', e.target.value.split('\n'))}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 h-32"
                                placeholder="- Key point 1..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Arabic Text (Optional)</label>
                                <textarea 
                                    dir="rtl"
                                    value={activeCard.arabic_text}
                                    onChange={(e) => updateCard('arabic_text', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 h-24 font-serif text-right text-lg"
                                    placeholder="Add Quran/Hadith text..."
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Translation / Quote</label>
                                <textarea 
                                    value={activeCard.key_quote}
                                    onChange={(e) => updateCard('key_quote', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-500 h-24"
                                    placeholder="English translation or key quote..."
                                />
                            </div>
                        </div>

                        <div className="mb-8">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Transition to Next Card</label>
                             <input 
                                type="text"
                                value={activeCard.transition_text}
                                onChange={(e) => updateCard('transition_text', e.target.value)}
                                className="w-full p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg outline-none focus:border-blue-400 font-medium"
                                placeholder="e.g. Now let's move on to the solution..."
                            />
                        </div>

                        <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                            <Save size={20}/> Save All Changes
                        </button>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};