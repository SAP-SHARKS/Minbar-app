import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Loader2, Plus, Book, Trash2, ArrowLeft, Info, 
  AlertTriangle, LogIn, Quote, Music, Anchor, ChevronDown, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SearchResult {
  id?: string;
  verseKey?: string;
  arabic: string;
  english: string;
  reference: string;
  book?: string;
  hadithNumber?: string;
  type?: string;
  status?: string;
  title?: string;
  category?: string;
  theme?: string; 
  surah_id?: string;
  surah_name?: string;
}

interface GroupedResults {
  [key: string]: SearchResult[];
}

interface QuranBlockPanelProps {
  onInsert: (data: SearchResult) => void;
  editingBlock?: { verseKey: string; element: HTMLElement } | null;
  onRemoveBlock?: () => void;
  onCancelEdit?: () => void;
  setEditingBlock?: (block: any) => void;
}

const CATEGORIES = [
  { id: 'quran', label: 'Quran', icon: Book, color: 'emerald' },
  { id: 'hadith', label: 'Hadith', icon: Quote, color: 'blue' },
  { id: 'opening', label: 'Openings', icon: Anchor, color: 'purple' },
  { id: 'dua', label: 'Duas', icon: Music, color: 'purple' },
  { id: 'closing', label: 'Closings', icon: Anchor, color: 'purple' },
];

export function QuranBlockPanel({ onInsert, editingBlock, onRemoveBlock, onCancelEdit, setEditingBlock }: QuranBlockPanelProps) {
  const { user, session } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<SearchResult[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('quran');
  const [selectedSurahFilter, setSelectedSurahFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  const dynamicSurahs = useMemo(() => {
    if (activeCategory !== 'quran') return [];
    const surahMap = new Map<string, string>();
    allData.forEach(r => {
      if (r.surah_id && r.surah_name) {
        surahMap.set(r.surah_id, r.surah_name);
      } else if (r.verseKey) {
        const id = r.verseKey.split(':')[0];
        surahMap.set(id, `Surah ${id}`);
      }
    });
    return Array.from(surahMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allData, activeCategory]);

  const fetchDuaList = async (type: string) => {
    if (!user || !session) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/duas/search?type=${type}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setAllData(data.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (searchTerm: string) => {
    if (!user || !session) return;
    if (!searchTerm.trim() || searchTerm.length < 2) {
      if (['quran', 'hadith'].includes(activeCategory)) setAllData([]);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let endpoint = '';
      if (activeCategory === 'quran') {
        endpoint = `/api/quran/search?q=${encodeURIComponent(searchTerm)}`;
      } else if (activeCategory === 'hadith') {
        endpoint = `/api/hadith/search?q=${encodeURIComponent(searchTerm)}`;
      } else {
          setLoading(false);
          return;
      }

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      const results = (data.results || []).map((r: any) => {
          if (activeCategory === 'quran') {
              const text = (r.english + r.arabic).toLowerCase();
              if (text.includes('patience') || text.includes('sabr')) r.theme = 'Patience';
              else if (text.includes('gratitude') || text.includes('shukr')) r.theme = 'Gratitude';
              else if (text.includes('guidance') || text.includes('huda')) r.theme = 'Guidance';
              else r.theme = 'General';
          }
          return { ...r, type: activeCategory };
      });
      
      setAllData(results);
      
      const groupNames = new Set(results.map((r: any) => r.theme || r.book || r.category || 'General'));
      setExpandedGroups(new Set(groupNames as any));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery('');
    setExpandedGroups(new Set());
    setSelectedSurahFilter('');
    if (['dua', 'opening', 'closing'].includes(activeCategory)) {
        fetchDuaList(activeCategory);
    } else {
        setAllData([]);
    }
  }, [activeCategory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (['quran', 'hadith'].includes(activeCategory)) performSearch(query);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query, activeCategory]);

  const groupedResults = useMemo(() => {
    const filtered = allData.filter(r => {
        const qMatch = !query.trim() || 
                      (r.title?.toLowerCase().includes(query.toLowerCase()) || 
                       r.english?.toLowerCase().includes(query.toLowerCase()) || 
                       r.category?.toLowerCase().includes(query.toLowerCase()) || 
                       r.reference?.toLowerCase().includes(query.toLowerCase()));
        
        const surahMatch = !selectedSurahFilter || (r.verseKey && r.verseKey.startsWith(`${selectedSurahFilter}:`));
        
        return qMatch && surahMatch;
    });

    const groups: GroupedResults = {};
    filtered.forEach(r => {
        const groupName = r.theme || r.book || r.category || 'General';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(r);
    });
    
    if (query.trim() && Object.keys(groups).length > 0) {
        setExpandedGroups(new Set(Object.keys(groups)));
    }

    return groups;
  }, [allData, query, selectedSurahFilter]);

  const toggleGroup = (name: string) => {
    const next = new Set(expandedGroups);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedGroups(next);
  };

  const handleInsert = (item: SearchResult) => {
    onInsert(item);
    showToast("Block added ✓");
    if (setEditingBlock) setEditingBlock(null);
  };

  const getThemeColor = () => {
      const cat = CATEGORIES.find(c => c.id === activeCategory);
      return cat?.color || 'emerald';
  };

  const color = getThemeColor();
  const borderClass = color === 'emerald' ? 'border-emerald-500' : color === 'blue' ? 'border-blue-500' : 'border-purple-500';
  const textClass = color === 'emerald' ? 'text-emerald-600' : color === 'blue' ? 'text-blue-600' : 'text-purple-600';

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="space-y-2">
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto custom-scrollbar no-scrollbar">
              {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <cat.icon size={12} /> {cat.label}
                  </button>
              ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search in ${activeCategory}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                {loading ? <Loader2 className="absolute left-3 top-3 text-emerald-500 animate-spin" size={16} /> : <Search className="absolute left-3 top-3 text-gray-400" size={16} />}
            </div>

            {activeCategory === 'quran' && dynamicSurahs.length > 0 && (
              <div className="px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Filter by Surah</label>
                <select 
                  value={selectedSurahFilter}
                  onChange={(e) => setSelectedSurahFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Surahs</option>
                  {dynamicSurahs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 pb-20">
        {(Object.entries(groupedResults) as [string, SearchResult[]][]).map(([groupName, items]) => (
          <div key={groupName} className="border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
            <button 
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedGroups.has(groupName) ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                <span className="font-bold text-xs text-gray-700 uppercase tracking-tight">{groupName}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">{items.length}</span>
            </button>
            
            {expandedGroups.has(groupName) && (
              <div className="p-3 grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                {items.map((item, i) => (
                  <div 
                    key={i} 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsert(item)}
                    className={`group bg-white border-2 ${borderClass} rounded-lg p-3 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer flex flex-col h-full relative`}
                  >
                    <div className="text-lg mb-2 opacity-80">
                        {activeCategory === 'quran' ? '📖' : activeCategory === 'hadith' ? '📜' : '🤲'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black text-gray-800 leading-tight line-clamp-2 uppercase tracking-tighter mb-2">
                            {item.title || item.verseKey || item.reference || 'Block'}
                        </h4>
                    </div>
                    <div className={`mt-auto flex justify-end ${textClass}`}>
                        <Plus size={14} strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groupedResults).length === 0 && !loading && !error && (
            <div className="text-center py-20 text-gray-300">
                <Search size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
            </div>
        )}
      </div>

      {toast.visible && (
          <div className="fixed bottom-10 right-10 bg-gray-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100] border border-gray-700">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
      )}
    </div>
  );
}
