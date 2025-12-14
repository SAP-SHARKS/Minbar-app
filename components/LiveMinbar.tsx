import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, ChevronRight, ChevronLeft, 
  X, Quote, AlignLeft, StickyNote, Timer,
  Clock, ArrowRight, Loader2, Search, ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LiveMinbarProps {
  user: any;
  khutbahId?: string | null;
  onExit: () => void;
}

interface KhutbahCard {
  id: string;
  user_khutbah_id: string;
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

const SECTION_COLORS: Record<string, string> = {
  INTRO: 'bg-blue-100 text-blue-700',
  MAIN: 'bg-gray-100 text-gray-700',
  HADITH: 'bg-green-100 text-green-700',
  QURAN: 'bg-emerald-100 text-emerald-700',
  STORY: 'bg-purple-100 text-purple-700',
  PRACTICAL: 'bg-orange-100 text-orange-700',
  CLOSING: 'bg-rose-100 text-rose-700',
  DEFAULT: 'bg-gray-100 text-gray-700'
};

const MOCK_CARDS: KhutbahCard[] = [
    {
      id: 'mock1',
      user_khutbah_id: 'mock',
      card_number: 1,
      section_label: 'INTRO',
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
      user_khutbah_id: 'mock',
      card_number: 2,
      section_label: 'MAIN',
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
      user_khutbah_id: 'mock',
      card_number: 3,
      section_label: 'CLOSING',
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

  // Selector State
  const [availableKhutbahs, setAvailableKhutbahs] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(!khutbahId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKhutbahTitle, setSelectedKhutbahTitle] = useState('');

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSelecting) return;
      
      if (e.key === 'ArrowRight') {
        if (currentCardIndex < cards.length - 1) setCurrentCardIndex(p => p + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentCardIndex > 0) setCurrentCardIndex(p => p - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex, cards.length, isSelecting]);

  // --- Search Khutbahs (Server-Side) ---
  useEffect(() => {
    if (!isSelecting) return;

    // Fetch from user_khutbahs for selection screen
    const fetchKhutbahs = async () => {
      let query = supabase
        .from('user_khutbahs')
        .select('id, title, author')
        .eq('user_id', user.uid || user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      
      if (data) {
        setAvailableKhutbahs(data);
      }
    };

    const debounce = setTimeout(fetchKhutbahs, 300);
    return () => clearTimeout(debounce);
  }, [isSelecting, searchQuery, user]);

  // --- Load Selected Khutbah Data ---
  useEffect(() => {
    async function loadCards() {
        const idToFetch = khutbahId; 
        
        if (!idToFetch && !selectedKhutbahTitle) {
            setLoading(false);
            return;
        }

        if (!idToFetch) return; 

        setLoading(true);
        
        // Fetch from user_khutbah_cards
        const { data: realCards, error } = await supabase
            .from('user_khutbah_cards')
            .select('id, card_number, section_label, title, bullet_points, arabic_text, key_quote, quote_source, transition_text, time_estimate_seconds, notes')
            .eq('user_khutbah_id', idToFetch)
            .order('card_number', { ascending: true });

        // Fetch title if needed
        if (!selectedKhutbahTitle) {
            const { data: kData } = await supabase.from('user_khutbahs').select('title').eq('id', idToFetch).single();
            if (kData) setSelectedKhutbahTitle(kData.title);
        }

        if (realCards && realCards.length > 0) {
            setCards(realCards);
            setCardTimeLeft(realCards[0].time_estimate_seconds || 120);
        } else {
            console.log("No cards found, using mock data");
            setCards(MOCK_CARDS);
            setCardTimeLeft(MOCK_CARDS[0].time_estimate_seconds);
            if (!selectedKhutbahTitle) setSelectedKhutbahTitle("Sample Khutbah");
        }
        setLoading(false);
    }

    loadCards();
  }, [khutbahId, selectedKhutbahTitle]);

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
        setCardTimeLeft(cards[currentCardIndex].time_estimate_seconds || 120);
    }
  }, [currentCardIndex, cards]);

  const handleKhutbahSelect = async (id: string, title: string) => {
      setIsSelecting(false);
      setLoading(true);
      setSelectedKhutbahTitle(title);
      
      const { data: realCards } = await supabase
        .from('user_khutbah_cards')
        .select('*')
        .eq('user_khutbah_id', id)
        .order('card_number', { ascending: true });
    
      if (realCards && realCards.length > 0) {
        setCards(realCards);
        setCardTimeLeft(realCards[0].time_estimate_seconds || 120);
      } else {
        setCards(MOCK_CARDS);
        setCardTimeLeft(MOCK_CARDS[0].time_estimate_seconds);
      }
      setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Selection Screen ---
  if (isSelecting) {
      return (
          <div className="fixed inset-0 bg-gray-50 z-50 p-8 overflow-y-auto font-sans">
              <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                      <h1 className="text-3xl font-bold text-gray-900">Select a Khutbah for Live Mode</h1>
                      <button onClick={onExit} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X size={24}/></button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-8">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                          type="text" 
                          placeholder="Search your khutbahs..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-lg transition-all"
                      />
                  </div>

                  <div className="grid gap-4">
                      {availableKhutbahs.map(k => (
                          <div key={k.id} onClick={() => handleKhutbahSelect(k.id, k.title)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                              <div>
                                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700">{k.title}</h3>
                                  <p className="text-gray-500 mt-1">{k.author}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase">Ready</span>
                                  <ArrowRight size={24} className="text-gray-300 group-hover:text-emerald-500"/>
                              </div>
                          </div>
                      ))}
                      
                      {availableKhutbahs.length === 0 && (
                          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                              <Search size={48} className="mx-auto mb-4 opacity-20"/>
                              <p className="text-lg font-medium">No personal khutbahs found matching "{searchQuery}"</p>
                              <p className="text-sm mt-2">Add khutbahs to your collection first.</p>
                          </div>
                      )}

                      <div onClick={() => handleKhutbahSelect('mock_id', 'Sample Khutbah')} className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:bg-emerald-100 cursor-pointer text-center font-bold text-emerald-800 mt-4 border-dashed">
                          Use Sample Khutbah (Demo)
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (loading || !cards.length) {
      return (
          <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin mb-4 text-emerald-500"/>
              <p className="text-xl font-bold">Preparing Presentation...</p>
          </div>
      );
  }

  const currentCard = cards[currentCardIndex];
  const sectionColorClass = SECTION_COLORS[currentCard.section_label] || SECTION_COLORS.DEFAULT;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col font-sans text-gray-100 overflow-hidden">
      
      {/* --- Header --- */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Live</span>
              </div>
              <div className="h-6 w-px bg-gray-700"></div>
              <h1 className="font-bold text-lg text-gray-100 truncate max-w-md">{selectedKhutbahTitle}</h1>
          </div>

          <div className="flex items-center gap-8">
               {/* Card Timer */}
               <div className="flex flex-col items-center w-24">
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Card</span>
                   <span className={`font-mono text-xl font-bold ${cardTimeLeft < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                       {formatTime(cardTimeLeft)}
                   </span>
               </div>
               
               {/* Play/Pause */}
               <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-lg ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
               >
                   {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
               </button>

               {/* Total Timer */}
               <div className="flex flex-col items-center w-24">
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total</span>
                   <span className="font-mono text-xl font-bold text-white">
                       {formatTime(totalTimeElapsed)}
                   </span>
               </div>
          </div>

          <button onClick={onExit} className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border border-gray-600">
              End Session
          </button>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-900 overflow-hidden relative">
          
          {/* Previous Button */}
          <button 
            onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
            disabled={currentCardIndex === 0}
            className="absolute left-6 p-4 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 transition-all z-10"
          >
              <ChevronLeft size={32} />
          </button>

          {/* Current Card */}
          <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col text-gray-900 relative" style={{ height: '80vh' }}>
              
              {/* Card Header */}
              <div className="px-10 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                  <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${sectionColorClass}`}>
                          {currentCard.section_label}
                      </span>
                      <h2 className="text-3xl font-bold text-gray-900 mt-3 leading-tight">{currentCard.title}</h2>
                  </div>
                  <div className="text-gray-200 font-black text-6xl select-none opacity-50">
                      {(currentCardIndex + 1).toString().padStart(2, '0')}
                  </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar space-y-8" style={{ maxHeight: '60vh' }}>
                  
                  {/* Bullet Points */}
                  {currentCard.bullet_points && currentCard.bullet_points.length > 0 && (
                      <div className="space-y-4">
                          {currentCard.bullet_points.map((point, i) => (
                              <div key={i} className="flex gap-4 items-start">
                                  <div className="mt-2.5 w-2 h-2 bg-gray-400 rounded-full shrink-0"></div>
                                  <p className="text-2xl font-medium text-gray-800 leading-relaxed">{point}</p>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* Arabic Text */}
                  {currentCard.arabic_text && (
                      <div className="bg-gray-50 rounded-xl p-8 border-r-4 border-gray-300 text-right">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-left">Key Arabic</h4>
                          <p className="font-serif text-4xl leading-[2] text-gray-900" dir="rtl">{currentCard.arabic_text}</p>
                      </div>
                  )}

                  {/* Quote to Recite */}
                  {currentCard.key_quote && (
                      <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                          Quote to Recite
                        </p>
                        <p className="text-lg italic">"{currentCard.key_quote}"</p>
                        {currentCard.quote_source && (
                          <p className="text-sm text-green-600 mt-2">— {currentCard.quote_source}</p>
                        )}
                      </div>
                  )}

                  {/* Transition to Next */}
                  {currentCard.transition_text && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
                          Transition to Next
                        </p>
                        <p className="text-lg text-blue-800">→ {currentCard.transition_text}</p>
                      </div>
                  )}

                  {/* Notes */}
                  {currentCard.notes && (
                      <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 shadow-sm transform rotate-1 transition-transform hover:rotate-0">
                          <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <StickyNote size={14}/> Personal Note
                          </h4>
                          <p className="font-handwriting text-lg text-gray-800">{currentCard.notes}</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Next Button */}
          <button 
            onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))}
            disabled={currentCardIndex === cards.length - 1}
            className="absolute right-6 p-4 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 transition-all z-10"
          >
              <ChevronRight size={32} />
          </button>

      </div>

      {/* --- Footer: Progress Dots --- */}
      <div className="h-16 bg-gray-900 flex items-center justify-center gap-3">
          <div className="flex justify-center gap-2 mt-4">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentCardIndex
                    ? 'bg-green-500 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
      </div>

    </div>
  );
};