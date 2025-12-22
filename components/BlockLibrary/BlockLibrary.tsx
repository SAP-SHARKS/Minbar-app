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
    // Wrap in dynamic container for Level 4 behavior
    const blockHTML = `
      <div class="khutbah-block-container" 
           data-block-id="${item.id}" 
           data-block-type="${item.type}" 
           data-block-ref="${item.reference}"
           contenteditable="false"
           style="position: relative; margin: 24px 0; outline: none;">
        <div class="khutbah-block ${item.type}-block" 
             style="cursor: pointer; transition: all 0.2s ease;">
          <div class="ar-text" dir="rtl">${item.arabic}</div>
          <div class="en-text">"${item.english}"</div>
          <div class="block-ref">
            ${item.status ? `<span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>` : ''}
            ${item.reference}
          </div>
        </div>
      </div>
      <p contenteditable="true"><br></p>
    `;

    onInsert(blockHTML);
    showToast("Block added ✓");
    
    setActiveLevel(2);
    setSelectedCategory(null);
    onClose();
  };

  return (
    <div onMouseDown={(e) => e.preventDefault()}>
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

      {toast.visible && (
        <div className="fixed bottom-10 right-10 bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[3000] border border-gray-700">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}