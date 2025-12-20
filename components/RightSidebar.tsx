
import React, { useState } from 'react';
import { LayoutList, PlusSquare, ChevronRight, ChevronLeft, X } from 'lucide-react';
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
        className="fixed right-0 top-1/2 -translate-y-1/2 w-8 h-24 bg-white border border-gray-200 border-r-0 rounded-l-2xl shadow-xl flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-all z-40 border-l-4 border-l-emerald-500"
      >
        <ChevronLeft size={20} />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 z-40 relative shadow-2xl">
      {/* Header with Close */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/30">
        <h2 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Library & Outline</h2>
        <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"><X size={16}/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1">
        <button 
          onClick={() => setActiveTab('outline')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'outline' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        >
          <LayoutList size={14}/> Outline
        </button>
        <button 
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'blocks' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
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
          <div className="p-4 flex flex-col h-full overflow-hidden">
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
