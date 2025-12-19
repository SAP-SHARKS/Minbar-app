
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Book, Trash2, ArrowLeft, Info, AlertTriangle, LogIn, Quote } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SearchResult {
  verseKey?: string;
  arabic: string;
  english: string;
  reference: string;
}

interface QuranBlockPanelProps {
  onInsert: (data: SearchResult) => void;
  editingBlock?: { verseKey: string; element: HTMLElement } | null;
  onRemoveBlock?: () => void;
  onCancelEdit?: () => void;
}

const CATEGORIES = [
  { id: 'quran', label: 'Quran', icon: Book },
  { id: 'hadith', label: 'Hadith', icon: Quote },
  { id: 'dua', label: 'Dua', icon: Info },
  { id: 'openings', label: 'Openings', icon: Info },
];

export function QuranBlockPanel({ onInsert, editingBlock, onRemoveBlock, onCancelEdit }: QuranBlockPanelProps) {
  const { user, session, setShowLoginModal, setLoginMessage } = useAuth();
  const [query, setQuery] = useState(editingBlock?.verseKey || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [activeCategory, setActiveCategory] = useState('quran');

  const performSearch = async (searchTerm: string) => {
    if (!user || !session) {
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
      let endpoint = '';
      if (activeCategory === 'quran') {
        // Direct verse lookup or search
        if (/^\d{1,3}:\d{1,3}$/.test(searchTerm.trim())) {
            endpoint = `/api/quran-verse?key=${searchTerm.trim()}`;
        } else {
            endpoint = `/api/quran/search?q=${encodeURIComponent(searchTerm)}`;
        }
      } else if (activeCategory === 'hadith') {
        endpoint = `/api/hadith/search?q=${encodeURIComponent(searchTerm)}`;
      } else {
          setResults([]);
          setLoading(false);
          return;
      }

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await res.json();

      if (res.status === 401 || data.error === 'LOGIN_REQUIRED') {
        setLoginRequired(true);
        setResults([]);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Search failed");

      // Normalize Verse detail vs Search results
      const finalResults = data.results || (data.verseKey ? [data] : []);
      setResults(finalResults);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query || query.length < 2) return;
    const timeoutId = setTimeout(() => performSearch(query), 500);
    return () => clearTimeout(timeoutId);
  }, [query, activeCategory]);

  const handleInsert = (item: SearchResult) => {
    onInsert(item);
    if (!editingBlock) {
        setResults([]);
        setQuery('');
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Category Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto custom-scrollbar">
          {CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => {
                    setActiveCategory(cat.id);
                    setResults([]);
                    setError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <cat.icon size={12} /> {cat.label}
              </button>
          ))}
      </div>

      {loginRequired && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                  <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900">Sign in required</h4>
                      <p className="text-xs text-amber-700 mt-1">Please sign in to search Quran and Hadith verses.</p>
                      <button 
                        onClick={() => setShowLoginModal(true)}
                        className="mt-3 flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                      >
                          <LogIn size={14} /> Log In
                      </button>
                  </div>
              </div>
          </div>
      )}

      {editingBlock && (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Info size={10}/> Editing Block</span>
                <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={14}/></button>
            </div>
            <div className="font-bold text-gray-800">{editingBlock.verseKey}</div>
            <button onClick={onRemoveBlock} className="mt-4 w-full py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5 shadow-sm">
                <Trash2 size={12}/> Remove Block
            </button>
        </div>
      )}

      <div className="relative">
          <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeCategory}...`}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
          />
          {loading ? <Loader2 className="absolute left-3 top-3.5 text-emerald-500 animate-spin" size={18} /> : <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {results.map((r, i) => (
          <div 
            key={i} 
            onClick={() => handleInsert(r)} 
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden flex flex-col gap-2"
          >
            <div className="flex justify-between items-center relative z-10 border-b border-gray-50 pb-2">
              <div className="font-bold text-gray-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <Book size={10} className="text-emerald-500" /> {r.reference}
              </div>
              <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} strokeWidth={3} />
              </div>
            </div>
            
            <div className="text-right font-serif text-lg leading-loose text-gray-900" dir="rtl">
              {r.arabic}
            </div>
            
            <div className="text-xs text-gray-600 leading-relaxed italic border-l-2 border-emerald-100 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              {r.english || "Translation unavailable"}
            </div>

            <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        ))}
        
        {query.length >= 2 && !loading && results.length === 0 && !error && user && (
            <div className="text-center py-10">
                <Search className="mx-auto text-gray-200 mb-2" size={32} />
                <p className="text-gray-400 text-xs font-medium">No results found for "{query}"</p>
            </div>
        )}
      </div>
    </div>
  );
}
