import React from 'react';
import { Plus } from 'lucide-react';

interface CardsSidebarProps {
  cards: any[];
  onCardClick: (id: string) => void;
  onAddCard: () => void;
  selectedCardId: string | null;
}

export function CardsSidebar({ cards, onCardClick, onAddCard, selectedCardId }: CardsSidebarProps) {
  
  const getSectionColor = (label: string) => {
    const colors: Record<string, string> = {
      INTRO: 'bg-blue-100 text-blue-700',
      MAIN: 'bg-gray-100 text-gray-700',
      HADITH: 'bg-green-100 text-green-700',
      QURAN: 'bg-emerald-100 text-emerald-700',
      STORY: 'bg-purple-100 text-purple-700',
      PRACTICAL: 'bg-orange-100 text-orange-700',
      CLOSING: 'bg-rose-100 text-rose-700',
    };
    return colors[label] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-end">
        <div>
            <h3 className="font-bold text-gray-800 text-lg">Summary Cards</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live Mode Outline</p>
        </div>
        <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{cards.length}</div>
      </div>

      {/* Cards List - Google Tasks Style */}
      <div className="flex-1 overflow-y-auto">
        {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-6 text-center">
                <p className="text-sm mb-2">No cards yet.</p>
                <p className="text-xs">Add cards to create a summary for Live Mode.</p>
            </div>
        ) : (
            cards.map((card, index) => (
            <div
                key={card.id}
                onClick={() => onCardClick(card.id)}
                className={`flex items-start gap-3 p-4 border-b border-gray-50 cursor-pointer group transition-colors ${selectedCardId === card.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
            >
                {/* Checkbox circle */}
                <div className="mt-0.5 shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCardId === card.id ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 group-hover:border-emerald-500'}`}>
                    <span className={`text-[10px] font-bold ${selectedCardId === card.id ? 'text-white' : 'text-gray-400'}`}>{index + 1}</span>
                </div>
                </div>
                
                {/* Card content */}
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getSectionColor(card.section_label)}`}>
                    {card.section_label}
                    </span>
                </div>
                <div className={`font-bold text-sm truncate mb-1 ${selectedCardId === card.id ? 'text-blue-900' : 'text-gray-800'}`}>
                    {card.title || 'Untitled'}
                </div>
                {card.bullet_points?.[0] && (
                    <div className="text-xs text-gray-500 truncate mt-0.5 pl-2 border-l-2 border-gray-200">
                    {card.bullet_points[0]}
                    </div>
                )}
                </div>
            </div>
            ))
        )}
      </div>

      {/* Add Card Button */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onAddCard}
          className="w-full py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 bg-white border border-emerald-100 hover:border-emerald-200 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Summary Card
        </button>
      </div>
    </div>
  );
}