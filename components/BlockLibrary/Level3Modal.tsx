
import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Search, Loader2, BookOpen, Scroll, HelpingHand, CheckCircle2 } from 'lucide-react';
import { CategoryId, BlockItem } from './types';
import { useAuth } from '../../contexts/AuthContext';

interface Level3ModalProps {
  categoryId: CategoryId | null;
  onClose: () => void;
  onBack: () => void;
  onInsert: (item: BlockItem) => void;
}

export function Level3Modal({ categoryId, onClose, onBack, onInsert }: Level3ModalProps) {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BlockItem[]>([]);
  const [surah, setSurah] = useState('');

  const fetchResults = async () => {
    if (!categoryId || !session) return;
    setLoading(true);
    try {
      let endpoint = '';
      if (categoryId === 'quran') {
        endpoint = `/api/quran/search?q=${encodeURIComponent(query || 'guidance')}`;
      } else if (categoryId === 'hadith') {
        endpoint = `/api/hadith/search?q=${encodeURIComponent(query || 'faith')}`;
      } else if (categoryId === 'opening' || categoryId === 'closing') {
        endpoint = `/api/duas/search?type=${categoryId}`;
      } else {
        setResults([]);
        setLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setResults((data.results || []).map((r: any) => ({
          ...r,
          type: categoryId,
          id: r.id || r.verseKey || Math.random().toString()
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [categoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) fetchResults();
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  if (!categoryId) return null;

  const isQuran = categoryId === 'quran';
  const isHadith = categoryId === 'hadith';
  const themeColor = isQuran ? '#10B981' : isHadith ? '#3B82F6' : '#A855F7';
  const themeBg = isQuran ? '#F0FDF4' : isHadith ? '#EFF6FF' : '#FAF5FF';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full h-full max-w-[1400px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-gray-50/50">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold transition-colors">
            <ArrowLeft size={20} /> Back
          </button>
          
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
            {isQuran && <BookOpen size={24} className="text-emerald-500" />}
            {isHadith && <Scroll size={24} className="text-blue-500" />}
            {(!isQuran && !isHadith) && <HelpingHand size={24} className="text-purple-500" />}
            {categoryId.toUpperCase()} BROWSER
          </h2>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Filters (Quran/Hadith only) */}
          {(isQuran || isHadith) && (
            <div className="w-80 border-r border-gray-100 p-8 flex flex-col gap-6 bg-gray-50/30">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Search Keywords</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Topic or keyword..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {isQuran && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Filter by Surah</label>
                  <select 
                    value={surah}
                    onChange={(e) => setSurah(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">All Surahs</option>
                    {/* Add few common ones for brevity */}
                    <option value="1">1. Al-Fatiha</option>
                    <option value="2">2. Al-Baqarah</option>
                    <option value="18">18. Al-Kahf</option>
                    <option value="36">36. Ya-Sin</option>
                  </select>
                </div>
              )}

              <button 
                onClick={() => { setQuery(''); setSurah(''); }}
                className="mt-auto text-xs font-bold text-gray-400 hover:text-red-500 text-center"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">Fetching Wisdom...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <Search size={64} className="mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">No blocks found matching filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onInsert(item)}
                    className="group bg-white rounded-xl border border-gray-100 hover:shadow-2xl transition-all cursor-pointer flex flex-col relative overflow-hidden h-full border-l-4"
                    style={{ borderLeftColor: themeColor }}
                  >
                    {/* Card Background Tint */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: themeColor }} />
                    
                    <div className="p-6 flex flex-col h-full relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {item.title || item.reference}
                        </span>
                        {item.status && (
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white bg-blue-500`}>
                            {item.status}
                          </span>
                        )}
                      </div>

                      <div 
                        className="ar-text text-xl font-bold leading-relaxed text-right mb-4 line-clamp-4 font-serif" 
                        dir="rtl"
                        style={{ color: '#1f2937' }}
                      >
                        {item.arabic}
                      </div>

                      <div className="text-sm italic text-gray-500 leading-relaxed mb-6 line-clamp-3">
                        "{item.english}"
                      </div>

                      <div className="mt-auto flex justify-between items-end">
                        <div className="text-[10px] font-bold text-gray-300 uppercase">{item.reference}</div>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
