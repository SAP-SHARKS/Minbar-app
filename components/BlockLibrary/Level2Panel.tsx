
import React from 'react';
import { X, Search, BookOpen, Scroll, MessageSquare, Bookmark, Quote, HelpingHand } from 'lucide-react';
import { CategoryId, CategoryTile } from './types';

interface Level2PanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (id: CategoryId) => void;
}

const CATEGORIES: CategoryTile[] = [
  { id: 'quran', label: 'QURAN', icon: BookOpen, color: '#10B981', bgColor: '#F0FDF4' },
  { id: 'hadith', label: 'HADITH', icon: Scroll, color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: 'opening', label: 'OPENINGS', icon: MessageSquare, color: '#A855F7', bgColor: '#FAF5FF' },
  { id: 'closing', label: 'CLOSING DUAS', icon: HelpingHand, color: '#A855F7', bgColor: '#FAF5FF' },
  { id: 'stories', label: 'POWERFUL STORIES', icon: Bookmark, color: '#F97316', bgColor: '#FFEDD5' },
  { id: 'quotes', label: 'QUOTES', icon: Quote, color: '#EAB308', bgColor: '#FEF9C3' },
];

export function Level2Panel({ isOpen, onClose, onSelectCategory }: Level2PanelProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-[1000] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`
        fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl z-[1001] flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">NEW BLOCKS</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="search elements..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Islamic Content Blocks</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-xl hover:border-emerald-500 hover:shadow-lg transition-all group aspect-square"
              >
                <div className="mb-4 transition-transform group-hover:scale-110 duration-300" style={{ color: cat.color }}>
                  <cat.icon size={48} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-bold text-gray-600 tracking-wider group-hover:text-gray-900">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
