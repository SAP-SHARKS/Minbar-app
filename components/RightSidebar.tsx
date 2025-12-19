
import React, { useState } from 'react';
import { LayoutList, PlusSquare, ChevronRight, ChevronLeft } from 'lucide-react';
import { CardsSidebar } from './CardsSidebar';
import { QuranBlockPanel } from './blocks/QuranBlockPanel';

interface RightSidebarProps {
  cards: any[];
  onCardClick: (id: string) => void;
  onAddCard: () => void;
  selectedCardId: string | null;
  onInsertQuran: (data: any) => void;
  editingBlock: { verseKey: string; element: HTMLElement } | null;
  onRemoveBlock: () => void;
  onCancelEdit: () => void;
}

export function RightSidebar({ 
  cards, onCardClick, onAddCard, selectedCardId, 
  onInsertQuran, editingBlock, onRemoveBlock, onCancelEdit 
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<'outline' | 'blocks'>(editingBlock ? 'blocks' : 'outline');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <button 
        onClick={() => setIsCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-8 h-20 bg-white border border-gray-200 border-r-0 rounded-l-xl shadow-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-all z-40"
      >
        <ChevronLeft size={20} />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 z-10 relative">
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(true)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-all z-20 group"
      >
        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
        <button 
          onClick={() => setActiveTab('outline')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'outline' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <LayoutList size={14}/> Outline
        </button>
        <button 
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'blocks' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <PlusSquare size={14}/> Blocks
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'outline' ? (
          <CardsSidebar 
            cards={cards} 
            onCardClick={onCardClick} 
            onAddCard={onAddCard} 
            selectedCardId={selectedCardId} 
          />
        ) : (
          <div className="p-4 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Block Library</h3>
            <QuranBlockPanel 
              onInsert={onInsertQuran} 
              editingBlock={editingBlock} 
              onRemoveBlock={onRemoveBlock}
              onCancelEdit={onCancelEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
