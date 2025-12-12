import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, ChevronRight, ChevronLeft, 
  X, Quote, AlignLeft, StickyNote, Timer,
  Clock, ArrowRight, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LiveMinbarProps {
  user: any;
  khutbahId?: string | null;
  onExit: () => void;
}

interface KhutbahCard {
  id: string;
  card_number: number;
  section_label: string;
  title: string;
  bullet_points: string[];
  arabic_text?: string;
  key_quote?: string;
  quote_source?: string;
  transition_text?: string;
  time_estimate_seconds: number;
  notes?: string;
}

// Fallback Mock Data
const MOCK_CARDS: KhutbahCard[] = [
    {
      id: 'mock1',
      card_number: 1,
      section_label: 'Opening',
      title: 'Khutbah al-Hajjah',
      bullet_points: [
          "Begin with Hamdala",
          "Send Salawat on the Prophet (SAW)",
          "Recite the verses of Taqwa"
      ],
      arabic_text: "إِنَّ الْحَمْدَ لِلَّهِ، نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ",
      time_estimate_seconds: 120,
      notes: "Keep voice calm and measured. Make eye contact with all sections of the audience."
    },
    {
      id: 'mock2',
      card_number: 2,
      section_label: 'Core Message',
      title: 'The Reality of Sabr',
      bullet_points: [
          "Sabr is active, not passive",
          "Story of Prophet Yaqub (AS)",
          "Three types of patience"
      ],
      key_quote: "Patiently endure what befalls you.",
      quote_source: "Surah Luqman: 17",
      transition_text: "Now let us move to how this applies in our daily lives...",
      time_estimate_seconds: 300
    },
    {
      id: 'mock3',
      card_number: 3,
      section_label: 'Conclusion',
      title: 'Action Items & Dua',
      bullet_points: [
          "Summarize main points",
          "One practical takeaway",
          "Make sincere Dua for the Ummah"
      ],
      time_estimate_seconds: 180,
      notes: "Raise voice slightly for the final Dua. Emphasize unity."
    }
];

export const LiveMinbar: React.FC<LiveMinbarProps> = ({ user, khutbahId, onExit }) => {
  const [cards, setCards] = useState<KhutbahCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Timers
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const [cardTimeLeft, setCardTimeLeft] = useState(0);

  // Selector State (if no ID passed)
  const [availableKhutbahs, setAvailableKhutbahs] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(!khutbahId);

  // --- Fetch Data ---
  useEffect(() => {
    async function loadData() {
        if (!khutbahId) {
            // Fetch available khutbahs for selection
            const { data } = await supabase.from('khutbahs').select('id, title, author, topic').limit(10);
            if (data) setAvailableKhutbahs(data);
            setLoading(false);
            return;
        }

        setLoading(true);
        // Try fetching cards from Supabase
        const { data: realCards, error } = await supabase
            .from('khutbah_cards')
            .select('*')
            .eq('khutbah_id', khutbahId)
            .order('card_number', { ascending: true });

        if (realCards && realCards.length > 0) {
            setCards(realCards);
            setCardTimeLeft(realCards[0].time_estimate_seconds);
        } else {
            // Fallback to mock data if no cards found for this khutbah
            setCards(MOCK_CARDS);
            setCardTimeLeft(MOCK_CARDS[0].time_estimate_seconds);
        }
        setLoading(false);
    }

    loadData();
  }, [khutbahId]);

  // --- Timer Logic ---
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTotalTimeElapsed(t => t + 1);
        setCardTimeLeft(t => Math.max(0, t - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Reset card timer when card changes
  useEffect(() => {
    if (cards[currentCardIndex]) {
        // Only reset if we haven't visited this card? 
        // For simplicity, we reset to estimate. 
        // Ideally we'd track per-card state, but simple reset is fine for MVP.
        setCardTimeLeft(cards[currentCardIndex].time_estimate_seconds);
    }
  }, [currentCardIndex, cards]);

  const handleKhutbahSelect = (id: string) => {
      // reload component with new ID essentially
      // We can just set internal state or call parent. 
      // Since props are immutable, we rely on parent routing or internal fetch override.
      // Let's just override internal fetch logic by setting a local ID if prop is null.
      // But cleaner to just reload data.
      setIsSelecting(false);
      setLoading(true);
      
      // Re-run fetch logic
      (async () => {
        const { data: realCards } = await supabase
            .from('khutbah_cards')
            .select('*')
            .eq('khutbah_id', id)
            .order('card_number', { ascending: true });
        
        if (realCards && realCards.length > 0) {
            setCards(realCards);
            setCardTimeLeft(realCards[0].time_estimate_seconds);
        } else {
            setCards(MOCK_CARDS);
            setCardTimeLeft(MOCK_CARDS[0].time_estimate_seconds);
        }
        setLoading(false);
      })();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
      return (
          <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-emerald-600 animate-spin mb-4"/>
              <p className="text-xl font-bold text-gray-700">Preparing Live Mode...</p>
          </div>
      );
  }

  // --- Selection Screen ---
  if (isSelecting) {
      return (
          <div className="fixed inset-0 bg-gray-50 z-50 p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                      <h1 className="text-3xl font-bold text-gray-900">Select a Khutbah for Live Mode</h1>
                      <button onClick={onExit} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"><X size={24}/></button>
                  </div>
                  <div className="grid gap-4">
                      {availableKhutbahs.map(k => (
                          <div key={k.id} onClick={() => handleKhutbahSelect(k.id)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                              <div>
                                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700">{k.title}</h3>
                                  <p className="text-gray-500">{k.topic} • {k.author}</p>
                              </div>
                              <ArrowRight size={24} className="text-gray-300 group-hover:text-emerald-500"/>
                          </div>
                      ))}
                      <div onClick={() => handleKhutbahSelect('mock_id')} className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:bg-emerald-100 cursor-pointer text-center font-bold text-emerald-800">
                          Use Sample Khutbah
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col font-sans text-white">
      
      {/* --- Top Bar: Timers & Controls --- */}
      <div className="h-20 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex items-center justify-between px-6 md:px-12 shrink-0">
          
          {/* Total Timer */}
          <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700">
              <Clock size={20} className="text-gray-400"/>
              <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Time</div>
                  <div className="font-mono text-xl font-bold text-emerald-400">{formatTime(totalTimeElapsed)}</div>
              </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-6">
               <button onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))} className="p-4 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30" disabled={currentCardIndex === 0}>
                   <ChevronLeft size={32} />
               </button>
               
               <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
               >
                   {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
               </button>

               <button onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))} className="p-4 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30" disabled={currentCardIndex === cards.length - 1}>
                   <ChevronRight size={32} />
               </button>
          </div>

          {/* Right: Exit */}
          <div className="flex items-center gap-4">
               <button onClick={onExit} className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-4 py-2 rounded-lg font-bold transition-colors text-sm border border-red-500/30">
                   End Session
               </button>
          </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Left: Card View */}
         <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar flex justify-center">
             <div className="w-full max-w-4xl bg-white text-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
                 
                 {/* Card Header */}
                 <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
                     <div>
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                            {currentCard.section_label}
                        </span>
                        <h2 className="text-3xl font-bold text-gray-900 leading-tight">{currentCard.title}</h2>
                     </div>
                     <div className="text-5xl font-black text-gray-100 select-none">
                         {String(currentCard.card_number).padStart(2, '0')}
                     </div>
                 </div>

                 {/* Card Content (Scrollable) */}
                 <div className="flex-1 p-10 overflow-y-auto">
                     
                     {/* Arabic Text */}
                     {currentCard.arabic_text && (
                         <div className="bg-emerald-50/50 border-r-4 border-emerald-500 p-6 rounded-l-lg mb-8 text-right">
                             <p className="font-serif text-3xl leading-[2] text-gray-800" dir="rtl">
                                 {currentCard.arabic_text}
                             </p>
                         </div>
                     )}

                     {/* Bullet Points */}
                     <div className="space-y-4 mb-10">
                         {currentCard.bullet_points.map((bp, i) => (
                             <div key={i} className="flex gap-4 items-start">
                                 <div className="mt-2.5 w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                                 <p className="text-2xl font-medium text-gray-700 leading-relaxed">{bp}</p>
                             </div>
                         ))}
                     </div>

                     {/* Key Quote */}
                     {currentCard.key_quote && (
                         <div className="bg-amber-50 rounded-2xl p-8 relative mb-8">
                             <Quote size={40} className="text-amber-200 absolute top-4 left-4" />
                             <p className="text-xl font-serif text-center italic text-gray-800 relative z-10 px-6">
                                 "{currentCard.key_quote}"
                             </p>
                             {currentCard.quote_source && (
                                 <p className="text-center text-sm font-bold text-amber-700 mt-4 uppercase tracking-widest">
                                     — {currentCard.quote_source}
                                 </p>
                             )}
                         </div>
                     )}

                     {/* Personal Notes */}
                     {currentCard.notes && (
                         <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg transform -rotate-1 shadow-sm w-3/4 mx-auto">
                             <div className="flex items-center gap-2 text-yellow-800 font-bold text-xs uppercase mb-2">
                                 <StickyNote size={14}/> Personal Note
                             </div>
                             <p className="font-handwriting text-lg text-gray-800 leading-relaxed font-medium">
                                 {currentCard.notes}
                             </p>
                         </div>
                     )}

                 </div>

                 {/* Card Footer: Transition */}
                 {currentCard.transition_text && (
                     <div className="bg-gray-900 text-white px-10 py-6">
                         <div className="flex items-center gap-3 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                             <ArrowRight size={14}/> Transition
                         </div>
                         <p className="text-lg font-medium text-gray-200">
                             {currentCard.transition_text}
                         </p>
                     </div>
                 )}
             </div>
         </div>

         {/* Right Sidebar: Card Timer & Status */}
         <div className="w-24 md:w-32 bg-gray-800 border-l border-gray-700 flex flex-col items-center py-10 gap-8 z-10">
             
             {/* Card Timer */}
             <div className="flex flex-col items-center gap-2">
                 <div className="relative w-20 h-20 flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                         <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-700" />
                         <circle 
                            cx="40" cy="40" r="36" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            fill="transparent" 
                            className={`${cardTimeLeft < 30 ? 'text-red-500' : 'text-emerald-500'} transition-all duration-500`}
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={2 * Math.PI * 36 * (1 - cardTimeLeft / currentCard.time_estimate_seconds)}
                         />
                     </svg>
                     <div className="absolute font-mono font-bold text-xl">{formatTime(cardTimeLeft)}</div>
                 </div>
                 <span className="text-[10px] font-bold text-gray-500 uppercase text-center">Card<br/>Timer</span>
             </div>

             <div className="w-full h-px bg-gray-700"></div>

             {/* Progress Dots */}
             <div className="flex flex-col gap-3">
                 {cards.map((_, i) => (
                     <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full transition-all ${i === currentCardIndex ? 'bg-white scale-125' : i < currentCardIndex ? 'bg-emerald-500' : 'bg-gray-600'}`}
                     />
                 ))}
             </div>

         </div>

      </div>
    </div>
  );
};