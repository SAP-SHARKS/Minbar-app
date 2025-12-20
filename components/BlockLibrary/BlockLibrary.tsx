
import React, { useState } from 'react';
import { Level2Panel } from './Level2Panel';
import { Level3Modal } from './Level3Modal';
import { CategoryId, BlockItem } from './types';
import { CheckCircle2 } from 'lucide-react';

interface BlockLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

export function BlockLibrary({ isOpen, onClose, onInsert }: BlockLibraryProps) {
  const [activeLevel, setActiveLevel] = useState<2 | 3>(2);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const handleSelectCategory = (id: CategoryId) => {
    setSelectedCategory(id);
    setActiveLevel(3);
  };

  const showToast = (msg: string) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: '' }), 2000);
  };

  const handleInsertItem = (item: BlockItem) => {
    // Determine colors based on category
    let bgColor = '#F0FDF4';
    let accentColor = '#10B981';
    
    switch(item.type) {
      case 'hadith':
        bgColor = '#EFF6FF';
        accentColor = '#3B82F6';
        break;
      case 'opening':
      case 'closing':
        bgColor = '#FAF5FF';
        accentColor = '#A855F7';
        break;
      case 'stories':
        bgColor = '#FFEDD5';
        accentColor = '#F97316';
        break;
      case 'quotes':
        bgColor = '#FEF9C3';
        accentColor = '#EAB308';
        break;
    }

    const blockHTML = `
      <div style="background: ${bgColor}; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 20px; margin: 16px 0;" contenteditable="false">
        <div style="text-align: right; font-size: 20px; font-weight: 600; line-height: 1.8; margin-bottom: 12px; font-family: serif;" dir="rtl">
          ${item.arabic}
        </div>
        <div style="font-size: 16px; font-style: italic; color: #555; margin-bottom: 12px;">
          ${item.english}
        </div>
        <div style="text-align: right; font-size: 13px; color: #888; font-weight: bold; text-transform: uppercase;">
          ${item.reference}
        </div>
      </div>
      <p><br></p>
    `;

    onInsert(blockHTML);
    showToast("Block added ✓");
    
    // Close everything
    setActiveLevel(2);
    setSelectedCategory(null);
    onClose();
  };

  return (
    <>
      <Level2Panel 
        isOpen={isOpen && activeLevel === 2} 
        onClose={onClose}
        onSelectCategory={handleSelectCategory}
      />
      
      {activeLevel === 3 && (
        <Level3Modal 
          categoryId={selectedCategory}
          onClose={() => { setActiveLevel(2); onClose(); }}
          onBack={() => setActiveLevel(2)}
          onInsert={handleInsertItem}
        />
      )}

      {/* Insertion Toast */}
      {toast.visible && (
        <div className="fixed bottom-10 right-10 bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[3000] border border-gray-700">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}
    </>
  );
}
