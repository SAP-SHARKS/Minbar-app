
import React, { useState } from 'react';
import { 
  Plus, Settings, Layers, MousePointer2, Type, 
  LayoutTemplate, ListTree, Package, Wrench 
} from 'lucide-react';
import { CardsSidebar } from './CardsSidebar';

interface RightSidebarProps {
  cards: any[];
  onCardClick: (id: string) => void;
  onAddCard: () => void;
  selectedCardId: string | null;
  onOpenLibrary: () => void;
}

type TabId = 'outline' | 'blocks' | 'tools';

export function RightSidebar({ 
  cards, 
  onCardClick, 
  onAddCard, 
  selectedCardId, 
  onOpenLibrary 
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('outline');

  const tools = [
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'typography', icon: Type, label: 'Global Styling' },
    { id: 'layers', icon: Layers, label: 'Layer Manager' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col z-[100] fixed right-0 top-0 h-full shadow-2xl">
      {/* Tab Header */}
      <div className="flex border-b border-gray-100 bg-white shrink-0">
        {[
          { id: 'outline', icon: ListTree, label: 'Outline' },
          { id: 'blocks', icon: Package, label: 'Blocks' },
          { id: 'tools', icon: Wrench, label: 'Tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`
              flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative
              ${activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
            `}
          >
            <tab.icon size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'outline' && (
          <div className="h-full flex flex-col animate-in fade-in duration-300">
            <CardsSidebar 
              cards={cards}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
              selectedCardId={selectedCardId}
            />
          </div>
        )}

        {activeTab === 'blocks' && (
          <div className="p-6 h-full flex flex-col animate-in fade-in duration-300">
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Islamic Elements</h3>
              <p className="text-xs text-gray-500 mt-1">Browse Quran, Hadith, and Duas to insert into your Khutbah.</p>
            </div>
            
            <button
              onClick={onOpenLibrary}
              className="w-full py-12 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-4 group hover:bg-emerald-100 hover:border-emerald-400 transition-all"
            >
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-transform group-hover:scale-110">
                <Plus size={32} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-emerald-800 tracking-tight">ADD ELEMENT</span>
            </button>
            
            <div className="mt-8 space-y-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Blocks</div>
              <div className="text-sm text-gray-400 italic text-center py-8 bg-gray-50 rounded-xl">
                No recent elements used.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="p-6 grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-700 transition-all group border border-transparent hover:border-emerald-100"
              >
                <div className="mb-2 text-gray-400 group-hover:text-emerald-600">
                  <tool.icon size={24} />
                </div>
                <span className="text-[10px] font-bold text-center uppercase tracking-tight">{tool.label}</span>
              </button>
            ))}
            
            <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
               <div className="bg-indigo-50 p-4 rounded-xl flex items-center gap-3">
                  <MousePointer2 size={18} className="text-indigo-600" />
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Selection Mode: Active</div>
               </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-center">
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Minbar AI v2.4</span>
      </div>
    </div>
  );
}
