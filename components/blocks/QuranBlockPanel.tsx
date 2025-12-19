
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Book, Trash2, ArrowLeft, Info, AlertTriangle, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface QuranResult {
  verseKey: string;
  arabic: string;
  english: string;
  reference: string;
}

interface QuranBlockPanelProps {
  onInsert: (data: any) => void;
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
  const { user, setShowLoginModal, setLoginMessage } = useAuth();
  const [query, setQuery] = useState(editingBlock?.verseKey || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuranResult[]>([]);
  const [error, setError] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [activeCategory, setActiveCategory] = useState('quran');

  const performSearch = async (searchTerm: string) => {
    if (!user) {
      setLoginRequired(true);
      return;
    }

    if (!searchTerm.trim() || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    setLoginRequired(false);
    
    try {
      if (/^\d{1,3}:\d{1,3}$/.test(searchTerm.trim())) {
        const res = await fetch(`/api/quran-verse?key=${searchTerm.trim()}`);
        if (res.status === 401 || res.status === 403) {
            setLoginRequired(true);
            return;
        }
        if (!res.ok) throw new Error(`Verse ${searchTerm} not found.`);
        const data = await res.json();
        setResults([data]);
      } else {
        const res = await fetch(`/api/quran-search?q=${encodeURIComponent(searchTerm)}`);
        if (res.status === 401 || res.status === 403) {
            setLoginRequired(true);
            return;
        }
        if (!res.ok) throw new Error("Search service unavailable");
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) return;
    const timeoutId = setTimeout(() => {
      if (query !== editingBlock?.verseKey) {
          performSearch(query);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleInsert = async (item: QuranResult) => {
    if (!user) {
        setLoginRequired(true);
        return;
    }
    
    // Pass complete data to editor
    onInsert(item);
    
    if (!editingBlock) {
        setResults([]);
        setQuery('');
    }
  };

  const handleLoginClick = () => {
    setLoginMessage("Please sign in to search and insert Quran verses.");
    setShowLoginModal(true);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {(loginRequired || !user) && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                  <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900">Login Required</h4>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          Please sign in to search and insert Quran verses into your khutbah.
                      </p>
                      <button 
                        onClick={handleLoginClick}
                        className="mt-3 flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                      >
                          <LogIn size={14} /> Sign In
                      </button>
                  </div>
              </div>
          </div>
      )}

      {editingBlock && (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Info size={10}/> Replacing Verse</span>
                <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={14}/></button>
            </div>
            <div className="font-bold text-gray-800">Quran {editingBlock.verseKey}</div>
            <button onClick={onRemoveBlock} className="mt-4 w-full py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5 shadow-sm">
                <Trash2 size={12}/> Remove Block
            </button>
        </div>
      )}

      {user && (
        <>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => cat.active && setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${cat.id === activeCategory ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="relative">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search themes or Surah:Ayah..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                />
                {loading ? <Loader2 className="absolute left-3 top-3.5 text-emerald-500 animate-spin" size={18} /> : <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />}
            </div>
        </>
      )}

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {loading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <span className="text-xs font-bold tracking-widest uppercase">Searching...</span>
          </div>
        ) : results.length > 0 ? (
          results.map((r, i) => (
            <div key={i} onClick={() => handleInsert(r)} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden flex flex-col gap-2">
              <div className="flex justify-between items-center relative z-10 border-b border-gray-50 pb-2">
                <div className="font-bold text-gray-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5"><Book size={10} className="text-emerald-500" /> {r.reference}</div>
                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14} strokeWidth={3} /></div>
              </div>
              {r.arabic && <div className="text-right font-serif text-lg leading-loose text-gray-900" dir="rtl">{r.arabic}</div>}
              {r.english && (
                <div 
                  className="text-xs text-gray-600 leading-relaxed italic" 
                  dangerouslySetInnerHTML={{ __html: `"${r.english}"` }} 
                />
              )}
              <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-30 transition-opacity" />
            </div>
          ))
        ) : query.length >= 2 && !loading && user ? (
            <div className="text-center py-20 text-gray-400">
                <Book size={48} className="mx-auto mb-4 opacity-10"/>
                <p className="text-sm font-medium">No results found for "{query}"</p>
            </div>
        ) : user ? (
            <div className="text-center py-20 text-gray-400 opacity-60">
                <Book size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-xs font-medium uppercase tracking-widest">Quran Assistant</p>
            </div>
        ) : null}
      </div>
    </div>
  );
}
