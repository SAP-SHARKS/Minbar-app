import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, LayoutList, 
  PlusCircle, Trash2, Save, Loader2, X, Sparkles,
  BookOpen, AlertTriangle, Thermometer
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { analyzeText } from '../utils';
import { Stats } from '../types';
import { RichTextEditor } from './RichTextEditor';

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

const SECTION_OPTIONS = [
  { value: 'INTRO', label: 'Introduction', color: 'bg-blue-100' },
  { value: 'MAIN', label: 'Main Point', color: 'bg-gray-100' },
  { value: 'HADITH', label: 'Hadith', color: 'bg-green-100' },
  { value: 'QURAN', label: 'Quran', color: 'bg-emerald-100' },
  { value: 'STORY', label: 'Story', color: 'bg-purple-100' },
  { value: 'PRACTICAL', label: 'Practical', color: 'bg-orange-100' },
  { value: 'CLOSING', label: 'Closing', color: 'bg-rose-100' },
];

// --- Subcomponents ---

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

const AiStatCard = ({ label, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
            </div>
            <span className="font-bold text-gray-700 text-sm">{label}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{subtext}</div>
    </div>
);

interface KhutbahEditorProps {
  user: any;
  khutbahId: string | null;
  onGoLive?: (id: string) => void;
  onSaveNew?: (id: string) => void;
}

export const KhutbahEditor: React.FC<KhutbahEditorProps> = ({ user, khutbahId, onGoLive, onSaveNew }) => {
  const [mode, setMode] = useState<'write' | 'cards'>('write');
  const [content, setContent] = useState<string>('<p>In the name of Allah...</p>');
  
  // Editor State
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(khutbahId);
  const [khutbahTitle, setKhutbahTitle] = useState("Untitled Khutbah");
  const [cards, setCards] = useState<KhutbahCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStats, setAiStats] = useState<Stats | null>(null);
  const [fontSize, setFontSize] = useState(16); // px size
  
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Initialize ---
  useEffect(() => {
    setActiveKhutbahId(khutbahId);
    
    if (khutbahId) {
        fetchKhutbahData(khutbahId);
    } else {
        // Reset for new khutbah
        setKhutbahTitle("Untitled Khutbah");
        setContent("");
        setCards([]);
        setSaveStatus('unsaved');
    }
  }, [khutbahId]);

  const fetchKhutbahData = async (id: string) => {
        // Fetch from user_khutbahs
        const { data: kData } = await supabase
            .from('user_khutbahs')
            .select('*')
            .eq('id', id)
            .single();

        if (kData) {
            setKhutbahTitle(kData.title);
            setContent(kData.content || '');
            setSaveStatus('saved');
            
            // Fetch cards
            const { data: cData } = await supabase
                .from('user_khutbah_cards')
                .select('*')
                .eq('user_khutbah_id', id)
                .order('card_number', { ascending: true });
            
            if (cData) {
                setCards(cData);
                if (cData.length > 0) setSelectedCardId(cData[0].id);
            }
        }
  };

  // --- Handlers ---

  const handleSave = async () => {
      if (!user) return alert("Please sign in to save.");
      setIsSaving(true);
      setSaveStatus('saving');

      try {
          if (activeKhutbahId) {
              // Update existing
              await supabase
                .from('user_khutbahs')
                .update({ 
                    title: khutbahTitle,
                    content: content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activeKhutbahId);
          } else {
              // Create new
              const { data, error } = await supabase
                .from('user_khutbahs')
                .insert({
                    user_id: user.id || user.uid, // Handle both firebase/supabase user objects structure
                    title: khutbahTitle,
                    content: content,
                    author: user.user_metadata?.full_name || 'Me',
                    likes_count: 0
                })
                .select()
                .single();
              
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

  const handleAiCheck = () => {
    setShowAiPanel(true);
    setIsAiLoading(true);
    
    // Analyze content (strip HTML tags for analysis)
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textOnly = tempDiv.textContent || "";
    
    const stats = analyzeText(textOnly);
    
    setTimeout(() => {
        setAiStats(stats);
        setIsAiLoading(false);
    }, 800);
  };

  // --- Card Helpers ---
  const activeCard = cards.find(c => c.id === selectedCardId);

  const updateLocalCard = (field: keyof KhutbahCard, value: any) => {
      setCards(prev => prev.map(c => c.id === selectedCardId ? { ...c, [field]: value } : c));
  };

  const handleSaveCard = async () => {
      if (!activeCard) return;
      setIsSaving(true);
      
      const { error } = await supabase
        .from('user_khutbah_cards')
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
      if (!activeKhutbahId) return alert("Please save the khutbah first before adding cards.");
      
      const nextNumber = cards.length > 0 ? Math.max(...cards.map(c => c.card_number)) + 1 : 1;
      
      const newCardPayload = {
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

      const { data, error } = await supabase
        .from('user_khutbah_cards')
        .insert(newCardPayload)
        .select()
        .single();

      if (data) {
          setCards([...cards, data]);
          setSelectedCardId(data.id);
      }
  };

  const handleDeleteCard = async (id: string) => {
      if (!confirm('Are you sure you want to delete this card?')) return;
      const { error } = await supabase.from('user_khutbah_cards').delete().eq('id', id);
      if (!error) {
          const newCards = cards.filter(c => c.id !== id);
          setCards(newCards);
          if (selectedCardId === id) setSelectedCardId(newCards[0]?.id || null);
      }
  };

  // --- Render ---
  return (
    <div className="flex flex-col h-full md:pl-20 bg-[#F9FBFD] overflow-hidden">
      
      {/* --- Header & Toolbar --- */}
      <div className="bg-white px-4 pt-3 pb-2 shadow-sm z-20 border-b border-gray-200 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <input 
                type="text" 
                value={khutbahTitle}
                onChange={(e) => {
                    setKhutbahTitle(e.target.value);
                    setSaveStatus('unsaved');
                }}
                className="font-bold text-xl text-gray-800 outline-none hover:bg-gray-50 border border-transparent focus:border-gray-300 px-2 rounded transition-colors bg-transparent truncate max-w-[300px] md:max-w-md"
                placeholder="Untitled Khutbah"
              />
              <div className="flex gap-4 text-xs font-medium text-gray-500 mt-1 px-2">
                {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'].map(menu => (
                  <button key={menu} className="hover:text-gray-900 transition-colors">{menu}</button>
                ))}
                <span className="text-gray-300">|</span>
                <span className={`transition-colors ${saveStatus === 'unsaved' ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
                    disabled={!activeKhutbahId}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'cards' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}
                    title={!activeKhutbahId ? "Save khutbah first" : "Edit Cards"}
                >
                    <LayoutList size={16}/> Cards
                </button>
             </div>

             <button 
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${saveStatus === 'unsaved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
             >
                 {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                 {saveStatus === 'unsaved' ? 'Save' : 'Saved'}
             </button>

             {activeKhutbahId && onGoLive && (
                 <button onClick={() => onGoLive(activeKhutbahId)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-red-700 flex items-center gap-2">
                     <Sparkles size={16}/> Go Live
                 </button>
             )}

             <button 
               onClick={() => {
                   if (showAiPanel) setShowAiPanel(false);
                   else handleAiCheck();
               }}
               className={`ml-2 flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all shadow-sm ${showAiPanel ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'}`}
             >
               <Sparkles size={16} fill="currentColor" />
               AI Check
             </button>
          </div>
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {mode === 'write' ? (
            // --- WRITE MODE ---
            <div className="flex-1 h-full w-full relative">
               
               <RichTextEditor 
                 content={content} 
                 onChange={(html) => {
                   setContent(html);
                   setSaveStatus('unsaved');
                 }}
                 fontSize={fontSize}
                 onFontSizeChange={setFontSize}
               />

               {/* AI Sidebar */}
               {showAiPanel && (
                   <div className="w-80 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-30 animate-in slide-in-from-right duration-300 absolute right-0 top-0 bottom-0 h-full">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                           <h3 className="font-bold text-gray-800 flex items-center gap-2"><Sparkles size={18} className="text-indigo-600"/> AI Analysis</h3>
                           <button onClick={() => setShowAiPanel(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                       </div>
                       
                       <div className="p-6">
                           {isAiLoading ? (
                               <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                   <Loader2 size={32} className="animate-spin text-indigo-600"/>
                                   <p className="text-sm font-medium">Analyzing Khutbah...</p>
                               </div>
                           ) : aiStats ? (
                               <div className="space-y-6">
                                   <div className="flex items-center justify-between mb-4">
                                      <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Readability Score</span>
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${aiStats.grade < 8 ? 'bg-green-100 text-green-700' : aiStats.grade < 12 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                          Grade {aiStats.grade}
                                      </span>
                                   </div>

                                   <AiStatCard 
                                      label="Hard Sentences" 
                                      value={aiStats.hardSentences} 
                                      subtext="Sentences > 20 words"
                                      icon={AlertTriangle}
                                      colorClass="bg-red-100 text-red-600"
                                   />
                                   
                                   <AiStatCard 
                                      label="Tone Check" 
                                      value={`${aiStats.passive} Passive`} 
                                      subtext="Aim for active voice"
                                      icon={Thermometer}
                                      colorClass="bg-blue-100 text-blue-600"
                                   />

                                   <div>
                                       <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2"><BookOpen size={16}/> Citations Found</h4>
                                       <div className="space-y-2">
                                           {aiStats.citations.length > 0 ? aiStats.citations.map((cite, i) => (
                                               <div key={i} className={`text-xs p-2 rounded border ${cite.status === 'verified' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                   {cite.type === 'quran' ? '📖' : '📜'} {cite.text}
                                               </div>
                                           )) : <p className="text-xs text-gray-400 italic">No citations detected.</p>}
                                       </div>
                                   </div>
                               </div>
                           ) : (
                               <p className="text-center text-gray-400 py-10">Click AI Check to analyze.</p>
                           )}
                       </div>
                   </div>
               )}
            </div>
        ) : (
            // --- CARD EDITOR MODE ---
            <div className="flex-1 flex bg-gray-50 h-full overflow-hidden">
                {/* Left: Card List */}
                <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Live Cards</h3>
                        <button onClick={handleAddCard} className="text-emerald-600 hover:text-emerald-700"><PlusCircle size={20}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {cards.length === 0 ? (
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
}