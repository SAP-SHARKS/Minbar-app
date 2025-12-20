
import React, { useState } from 'react';
import { 
  Plus, Settings, Layers, MousePointer2, Type, 
  LayoutTemplate, ListTree, Package, Wrench, ChevronLeft, ChevronRight
} from 'lucide-react';
import { CardsSidebar } from './CardsSidebar';

interface RightSidebarProps {
  cards: any[];
  onCardClick: (id: string) => void;
  onAddCard: () => void;
  selectedCardId: string | null;
  onOpenLibrary: () => void;
}

export function RightSidebar({ 
  cards, 
  onCardClick, 
  onAddCard, 
  selectedCardId, 
  onOpenLibrary 
}: RightSidebarProps) {
  const [cardsExpanded, setCardsExpanded] = useState(false);

  const tools = [
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Summary Cards Panel - Slides out to the left of the fixed bar */}
      <div 
        className={`fixed top-0 bottom-0 w-[320px] bg-white border-l border-gray-200 shadow-2xl z-[90] transition-transform duration-300 ease-in-out`}
        style={{ 
          right: '64px',
          transform: cardsExpanded ? 'translateX(0)' : 'translateX(calc(100% + 64px))'
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outline Manager</span>
            <button onClick={() => setCardsExpanded(false)} className="p-1 hover:bg-gray-200 rounded text-gray-400"><ChevronRight size={18}/></button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CardsSidebar 
              cards={cards}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
              selectedCardId={selectedCardId}
            />
          </div>
        </div>
      </div>

      {/* Main Narrow Strip Sidebar - Always Fixed at Right 0 */}
      <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-6 gap-4 flex-shrink-0 z-[100] fixed right-0 top-0 h-full shadow-lg">
        {/* Toggle Summary Cards */}
        <button
          onClick={() => setCardsExpanded(!cardsExpanded)}
          className={`
            w-10 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative
            ${cardsExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}
          `}
        >
          <ListTree size={20} />
          <span className="text-[8px] font-black">{cards.length}</span>
          <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            SUMMARY CARDS
          </div>
        </button>

        <div className="w-8 h-px bg-gray-100" />

        {/* ADD ELEMENT BUTTON - ALWAYS VISIBLE */}
        <button
          onClick={onOpenLibrary}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-95"
          title="Add Element"
        >
          <Plus size={24} strokeWidth={2.5} />
          <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            ADD ELEMENT
          </div>
        </button>

        <div className="w-8 h-px bg-gray-100" />

        {/* Other Tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors group relative"
          >
            <tool.icon size={20} />
            <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 uppercase">
              {tool.label}
            </div>
          </button>
        ))}

        <div className="flex-1" />

        <div className="p-2">
          <MousePointer2 size={18} className="text-gray-300" />
        </div>
      </div>
    </>
  );
}
