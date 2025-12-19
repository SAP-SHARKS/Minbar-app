
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Plus, Book, Trash2, ArrowLeft, Info, Check } from 'lucide-react';

interface QuranResult {
  verseKey: string;
  arabic?: string;
  translation: string;
  reference: string;
  text?: string; // Search results might have this as 'text'
}

interface QuranBlockPanelProps {
  onInsert: (data: QuranResult) => void;
  editingBlock?: { verseKey: string; element: HTMLElement } | null;
  onRemoveBlock?: () => void;
  onCancelEdit?: () => void;
}

const CATEGORIES = [
  { id: 'quran', label: 'Quran', active: true },
  { id: 'hadith', label: 'Hadith', active: false },
  { id: 'dua', label: 'Dua', active: false },
  { id: 'openings', label: 'Openings', active: false },
];

export function QuranBlockPanel({ onInsert, editingBlock, onRemoveBlock, onCancelEdit }: QuranBlockPanelProps) {
  const [query, setQuery] = useState(editingBlock?.verseKey || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuranResult[]>([]);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('quran');

  // Unified search function
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    
    console.log(`[QuranPanel] Searching for: "${searchTerm}"`);
    
    try {
      // Check if it's a direct verse lookup (e.g. 2:255)
      if (/^\d{1,3}:\d{1,3}$/.test(searchTerm.trim())) {
        const res = await fetch(`/api/quran-verse?key=${searchTerm.trim()}`);
        console.log(`[QuranPanel] Verse lookup response status: ${res.status}`);
        if (!res.ok) throw new Error(`Verse ${searchTerm} not found.`);
        const data = await res.json();
        setResults([data]);
      } else {
        // Keyword search via our proxy
        const res = await fetch(`/api/quran-search?q=${encodeURIComponent(searchTerm)}`);
        console.log(`[QuranPanel] Keyword search response status: ${res.status}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Search failed (${res.status})`);
        }
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err: any) {
      console.error(`[QuranPanel] Search Error:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search logic
  useEffect(() => {
    if (!query) return;
    const timeoutId = setTimeout(() => {
      // Only search if it's not the exact same as the currently editing block (to avoid auto-searching on edit open)
      if (query !== editingBlock?.verseKey) {
          performSearch(query);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleInsertFullVerse = async (verseKey: string) => {
    setLoading(true);
    try {
      console.log(`[QuranPanel] Fetching full verse details for insertion: ${verseKey}`);
      const res = await fetch(`/api/quran-verse?key=${verseKey}`);
      if (!res.ok) throw new Error('Failed to fetch full verse details');
      const fullData = await res.json();
      onInsert(fullData);
      
      // Cleanup UI
      if (!editingBlock) {
          setResults([]);
          setQuery('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Edit Mode Header */}
      {editingBlock ? (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-2 shadow-sm animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <Info size={10}/> Editing Block
                </span>
                <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={14}/>
                </button>
            </div>
            <div className="font-bold text-gray-800 text-lg">Quran {editingBlock.verseKey}</div>
            <div className="mt-4 flex gap-2">
                <button 
                  onClick={onRemoveBlock}
                  className="flex-1 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                    <Trash2 size={12}/> Remove Block
                </button>
            </div>
        </div>
      ) : null}

      {/* Categories */}
      {!editingBlock && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => cat.active && setActiveCategory(cat.id)}
                    className={`
                        px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all
                        ${cat.id === activeCategory 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : cat.active 
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed'}
                    `}
                >
                    {cat.label}{!cat.active && '...'}
                </button>
            ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={editingBlock ? "Search to replace..." : "Search Quran (e.g. 'Patience' or '2:255')"}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
        />
        {loading ? (
            <Loader2 className="absolute left-3 top-3.5 text-emerald-500 animate-spin" size={18} />
        ) : (
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2 duration-200">
            <Trash2 size={14} className="shrink-0 mt-0.5" />
            <div>
                <p className="font-bold">Search failed</p>
                <p className="opacity-80">{error}</p>
            </div>
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {loading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <span className="text-xs font-bold tracking-widest uppercase">Searching Quran...</span>
          </div>
        ) : results.length > 0 ? (
          results.map((r, i) => (
            <div 
                key={i} 
                onClick={() => handleInsertFullVerse(r.verseKey)}
                className="p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Book size={14} className="text-emerald-500" />
                    {r.reference}
                </div>
                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} strokeWidth={3} />
                </div>
              </div>
              <div className="text-xs text-gray-500 line-clamp-3 italic leading-relaxed relative z-10">
                "{r.text || r.translation}"
              </div>
              {/* Subtle background highlight on hover */}
              <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-30 transition-opacity" />
            </div>
          ))
        ) : query.length >= 2 && !loading ? (
            <div className="text-center py-20 text-gray-400 animate-in fade-in duration-300">
                <Book size={48} className="mx-auto mb-4 opacity-10"/>
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs mt-1">Try searching by topic or verse key like "2:185"</p>
            </div>
        ) : (
            <div className="text-center py-20 text-gray-400 opacity-60">
                <Book size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-xs font-medium uppercase tracking-widest">Verse Inserter</p>
                <p className="text-[10px] mt-2 italic px-8">Quickly find and insert Ayahs directly into your khutbah draft.</p>
            </div>
        )}
      </div>
    </div>
  );
}
