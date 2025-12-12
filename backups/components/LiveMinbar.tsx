import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, ChevronRight, ChevronLeft, 
  X, LayoutList, ScrollText 
} from 'lucide-react';

interface LiveMinbarProps {
  user: any;
  onExit: () => void;
}

const THEMES = [
  { // Intro - Rose/Pink
    main: 'bg-white',
    footer: 'bg-rose-100',
    accent: 'text-rose-600',
    progress: 'bg-rose-500',
    shadow: 'shadow-rose-200',
    border: 'border-rose-100',
    icon: 'text-rose-300'
  },
  { // Main - Amber/Orange
    main: 'bg-white',
    footer: 'bg-amber-100',
    accent: 'text-amber-600',
    progress: 'bg-amber-500',
    shadow: 'shadow-amber-200',
    border: 'border-amber-100',
    icon: 'text-amber-300'
  },
  { // Ayah - Blue
    main: 'bg-white',
    footer: 'bg-blue-100',
    accent: 'text-blue-600',
    progress: 'bg-blue-500',
    shadow: 'shadow-blue-200',
    border: 'border-blue-100',
    icon: 'text-blue-300'
  },
  { // Closing - Emerald
    main: 'bg-white',
    footer: 'bg-emerald-100',
    accent: 'text-emerald-600',
    progress: 'bg-emerald-500',
    shadow: 'shadow-emerald-200',
    border: 'border-emerald-100',
    icon: 'text-emerald-300'
  }
];

export const LiveMinbar: React.FC<LiveMinbarProps> = ({ user, onExit }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'teleprompter'>('cards');
    
  const cards = [
    {
      type: 'Intro',
      duration: 180,
      title: "Opening Duas",
      script: "In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of the worlds. We praise Him, seek His help, and ask for His forgiveness.",
      bullets: ["Hamdala (Praise Allah)", "Salawat (Send peace on Prophet)", "Taqwa (Consciousness of Allah)"]
    },
    {
      type: 'Core',
      duration: 600,
      title: "The Power of Forgiveness",
      script: "Today we wish to speak about a quality that liberates the heart: Forgiveness. It is often seen as a weakness, but in reality, it is the ultimate strength. Look at Prophet Yusuf (AS).",
      bullets: ["Forgiveness is a strength", "Story of Prophet Yusuf (AS)", "Health benefits of letting go"]
    },
    {
      type: 'Ayah',
      duration: 300,
      title: "Surah Ash-Shura, Verse 40",
      script: "Allah (SWT) says: 'The recompense of an injury is an injury the like thereof; but whoever forgives and makes reconciliation, his reward is with Allah.'",
      bullets: ["'The recompense of an injury...'", "'...his reward is with Allah.'", "Direct reward from the Creator"]
    },
    {
      type: 'Closing',
      duration: 120,
      title: "Conclusion & Dua",
      script: "To conclude, let us leave here today with a resolve to forgive one person who has wronged us. May Allah grant us soft hearts and forgive our shortcomings. Ameen.",
      bullets: ["Summary of key points", "Action item: Call a relative", "Final Dua for the Ummah"]
    }
  ];

  useEffect(() => {
    setTimeLeft(cards[currentCardIndex].duration);
    setIsPlaying(false);
  }, [currentCardIndex]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    } else if (timeLeft === 0) {
        setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (currentCardIndex < cards.length - 1) setCurrentCardIndex(p => p + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentCardIndex > 0) setCurrentCardIndex(p => p - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const nextCard = () => {
    if (currentCardIndex < cards.length - 1) setCurrentCardIndex(p => p + 1);
  };

  const prevCard = () => {
    if (currentCardIndex > 0) setCurrentCardIndex(p => p - 1);
  };

  const currentTheme = THEMES[currentCardIndex % THEMES.length];

  return (
    <div className="fixed inset-0 bg-[#F3F4F6] z-50 flex flex-col overflow-hidden font-sans transition-colors duration-700">
      
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-8 z-50 absolute top-0 left-0 right-0">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-200">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
             <span className="text-xs uppercase tracking-[0.2em] font-bold text-gray-800">Live Minbar</span>
           </div>
           
           <div className="flex bg-white/80 backdrop-blur-md rounded-full p-1 border border-gray-200 shadow-sm">
             <button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                <LayoutList size={14}/> Cards
             </button>
             <button onClick={() => setViewMode('teleprompter')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'teleprompter' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>
                <ScrollText size={14}/> Script
             </button>
           </div>
        </div>
        
        {/* Top Timer */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4">
             <div className="bg-white/90 backdrop-blur-xl pl-6 pr-2 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white flex items-center gap-4">
                 <div className={`font-mono font-bold text-4xl tabular-nums tracking-tight ${isPlaying ? currentTheme.accent : 'text-gray-800'}`}>
                   {formatTime(timeLeft)}
                 </div>
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'}`}
                 >
                   {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                 </button>
             </div>
        </div>

        <div className="flex gap-4 items-center justify-end">
          <button onClick={onExit} className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white/50 hover:bg-white px-4 py-2 rounded-full">
            <span className="text-xs font-bold uppercase tracking-wider">End Session</span>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative w-full h-full flex items-center overflow-hidden pt-12">
        
        {viewMode === 'cards' ? (
          <div className="w-full h-full flex items-center justify-center relative perspective-1000">
             
             {/* Carousel Track */}
             <div 
                className="flex items-center absolute left-0 h-[75vh] transition-transform duration-700 cubic-bezier(0.25, 1, 0.5, 1)"
                style={{ 
                    // Card Width: 75vw
                    // Gap: 2vw
                    // Center screen: 50vw
                    // Half card: 37.5vw
                    // Start pos: 12.5vw
                    // Shift: 77vw per card
                    transform: `translateX(calc(50vw - 37.5vw - (${currentCardIndex} * 77vw)))` 
                }}
             >
                {cards.map((card, idx) => {
                    const isActive = idx === currentCardIndex;
                    const theme = THEMES[idx % THEMES.length];
                    
                    return (
                        <div 
                            key={idx}
                            onClick={() => setCurrentCardIndex(idx)}
                            className={`
                                w-[75vw] md:w-[75vw] h-full rounded-[3rem] 
                                flex flex-col justify-between relative overflow-hidden
                                transition-all duration-700 ease-out cursor-pointer mx-[1vw]
                                border-4 bg-white
                                ${isActive 
                                    ? `scale-100 opacity-100 shadow-2xl ${theme.shadow} border-white z-20` 
                                    : 'scale-[0.85] opacity-60 blur-[1px] border-transparent shadow-none grayscale-[0.5] hover:grayscale-0 z-10'
                                }
                            `}
                        >
                             {/* Card Upper Body (White) */}
                             <div className="flex-1 p-10 md:p-14 relative z-10">
                                 <div className="flex justify-between items-start mb-4">
                                     <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-100 ${theme.accent}`}>
                                        {card.type}
                                     </div>
                                     <div className={`text-6xl font-serif font-black opacity-10 ${theme.accent}`}>
                                         {(idx + 1).toString().padStart(2, '0')}
                                     </div>
                                 </div>
                                 
                                 <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-10 leading-tight">
                                    {card.title}
                                 </h2>

                                 <div className="flex flex-col justify-center gap-6">
                                    {card.bullets.map((point, i) => (
                                        <div key={i} className="flex gap-6 items-start">
                                            <div className={`mt-2 w-3 h-3 rounded-full shrink-0 ${isActive ? theme.progress : 'bg-gray-300'}`}></div>
                                            <p className={`font-serif text-3xl md:text-4xl font-medium leading-normal transition-all duration-500 ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {point}
                                            </p>
                                        </div>
                                    ))}
                                 </div>
                             </div>

                             {/* Card Footer (Colored) */}
                             <div className={`h-[25%] ${theme.footer} relative px-10 md:px-14 flex items-center justify-between`}>
                                 {/* Decorative Wave/Line */}
                                 <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
                                 
                                 <div className="flex-1 pr-12">
                                     <p className={`font-medium text-lg italic opacity-80 ${theme.accent}`}>
                                         "{card.script.substring(0, 80)}..."
                                     </p>
                                 </div>

                                 {/* Progress Bar inside Footer */}
                                 <div className="w-1/3 flex flex-col gap-2 items-end">
                                     <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>Time Remaining</span>
                                     <div className="w-full h-3 bg-white/50 rounded-full overflow-hidden backdrop-blur-sm">
                                         <div 
                                            className={`h-full ${theme.progress} transition-all duration-1000 ease-linear`} 
                                            style={{ width: isActive ? `${(timeLeft / card.duration) * 100}%` : '100%' }}
                                         ></div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    );
                })}
             </div>

             {/* Navigation Controls (Floating) */}
             <button 
                onClick={prevCard} 
                disabled={currentCardIndex === 0} 
                className="absolute left-6 top-1/2 -translate-y-1/2 p-6 rounded-full bg-white hover:bg-gray-50 text-gray-800 shadow-xl border border-gray-100 transition-all disabled:opacity-0 disabled:pointer-events-none z-30 group"
             >
                <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
             </button>

             <button 
                onClick={nextCard} 
                disabled={currentCardIndex === cards.length - 1} 
                className="absolute right-6 top-1/2 -translate-y-1/2 p-6 rounded-full bg-white hover:bg-gray-50 text-gray-800 shadow-xl border border-gray-100 transition-all disabled:opacity-0 disabled:pointer-events-none z-30 group"
             >
                <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
             </button>

          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto h-[80vh] bg-white rounded-[2.5rem] p-16 overflow-y-auto border border-gray-100 shadow-2xl custom-scrollbar relative">
             <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white via-white to-transparent z-10"></div>
             <div className="prose prose-xl max-w-none font-serif leading-loose text-center text-gray-900">
                <p className="text-gray-400 text-lg uppercase tracking-widest font-sans mb-12 font-bold bg-gray-50 py-2 rounded-lg inline-block px-6">
                    {cards[currentCardIndex].title}
                </p>
                <p className="text-4xl md:text-5xl leading-[1.6]">
                    {cards[currentCardIndex].script}
                </p>
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white to-transparent z-10 pointer-events-none"></div>
          </div>
        )}
      </div>

      {/* Global Progress */}
      <div className="h-2 bg-gray-200 fixed bottom-0 left-0 right-0 z-50">
         <div 
            className={`h-full shadow-lg transition-all duration-300 ${currentTheme.progress}`} 
            style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
         ></div>
      </div>

    </div>
  );
};