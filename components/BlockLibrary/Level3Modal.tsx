import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Search, Loader2, BookOpen, Scroll, HelpingHand, 
  CheckCircle2, Star, Info, Copy, Filter, ChevronLeft, ChevronRight,
  AlertCircle
} from 'lucide-react';
import { CategoryId, BlockItem } from './types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';

interface Level3ModalProps {
  categoryId: CategoryId | null;
  onClose: () => void;
  onBack: () => void;
  onInsert: (item: BlockItem) => void;
  initialQuery?: string;
}

const HADITH_BOOKS = [
  { id: 'sahih-bukhari', label: 'Sahih Bukhari' },
  { id: 'sahih-muslim', label: 'Sahih Muslim' },
  { id: 'al-tirmidhi', label: 'Jami\' Al-Tirmidhi' },
  { id: 'sunan-abu-dawood', label: 'Sunan Abu Dawood' },
  { id: 'sunan-ibn-majah', label: 'Sunan Ibn Majah' },
  { id: 'sunan-nasai', label: 'Sunan An-Nasa\'i' },
  { id: 'mishkat-al-masabih', label: 'Mishkat Al-Masabih' },
  { id: 'musnad-ahmad', label: 'Musnad Ahmad' },
  { id: 'al-silsila-sahiha', label: 'Al-Silsila Sahiha' },
];

const HADITH_TOPICS = [
  "Faith (Iman)", "Prayer (Salah)", "Fasting (Sawm)", "Charity (Zakat)", 
  "Hajj", "Manners & Character", "Knowledge", "Family & Marriage", 
  "Business & Trade", "Justice", "Paradise & Hellfire", "End Times", 
  "Medicine", "Du'a & Dhikr"
];

export function Level3Modal({ categoryId, onClose, onBack, onInsert, initialQuery = '' }: Level3ModalProps) {
  const { session } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BlockItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  
  // Quran Filters
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState('');

  // Hadith Filters
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [authenticity, setAuthenticity] = useState('All');
  const [topic, setTopic] = useState('');
  const [sortBy, setSortBy] = useState('Relevance');
  const [showFilters, setShowFilters] = useState(true);

  // Fetch Surahs for Quran Filter
  useEffect(() => {
    async function fetchSurahs() {
      try {
        const { data, error } = await supabase
          .from('quran_verses')
          .select('surah_number, surah_name_english, surah_name_arabic')
          .order('surah_number');
        
        if (error) throw error;
        
        if (data) {
          // Remove duplicates
          const uniqueSurahs = Array.from(
            new Map(data.map(s => [s.surah_number, s])).values()
          );
          setSurahs(uniqueSurahs);
        }
      } catch (err) {
        console.error("Error fetching surahs:", err);
      }
    }
    if (categoryId === 'quran') {
      fetchSurahs();
    }
  }, [categoryId]);

  const fetchResults = async (page = 1) => {
    if (!categoryId || !session) return;
    setLoading(true);
    try {
      let endpoint = '';
      if (categoryId === 'quran') {
        const surahParam = selectedSurah ? `&surah=${selectedSurah}` : '';
        endpoint = `/api/quran/search?q=${encodeURIComponent(query || 'guidance')}${surahParam}`;
      } else if (categoryId === 'hadith') {
        const bookParam = selectedBooks.length > 0 ? `&book=${selectedBooks.join(',')}` : '';
        const statusParam = authenticity === 'Sahih only' ? '&status=Sahih' : 
                            authenticity === 'Sahih & Hasan' ? '&status=Sahih,Hasan' :
                            authenticity === 'Show weak (Da\'eef)' ? '&status=Da\'eef' : '';
        const searchQ = query || topic || 'faith';
        endpoint = `/api/hadith/search?q=${encodeURIComponent(searchQ)}${bookParam}${statusParam}&page=${page}&paginate=21`;
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
        if (data.total !== undefined) {
          setTotalCount(data.total);
          setCurrentPage(data.currentPage || 1);
          setLastPage(data.lastPage || 1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(1);
  }, [categoryId, selectedBooks, authenticity, topic, selectedSurah]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2 || query.length === 0) fetchResults(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  const clearFilters = () => {
    setQuery('');
    setSelectedBooks([]);
    setSelectedSurah('');
    setAuthenticity('All');
    setTopic('');
    setSortBy('Relevance');
  };

  const toggleBook = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  if (!categoryId) return null;

  const isQuran = categoryId === 'quran';
  const isHadith = categoryId === 'hadith';
  const themeColor = isQuran ? '#10B981' : isHadith ? '#3B82F6' : '#A855F7';

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-500';
    const s = status.toLowerCase();
    if (s.includes('sahih')) return 'bg-emerald-500 text-white';
    if (s.includes('hasan')) return 'bg-amber-400 text-white';
    if (s.includes('da\'eef') || s.includes('weak')) return 'bg-rose-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getLengthColor = (len?: string) => {
    if (len === 'Short') return 'text-emerald-500';
    if (len === 'Medium') return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full h-full max-w-[1600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold transition-colors">
              <ArrowLeft size={20} /> Back
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
              {isQuran && <BookOpen size={24} className="text-emerald-500" />}
              {isHadith && <Scroll size={24} className="text-blue-500" />}
              {(!isQuran && !isHadith) && <HelpingHand size={24} className="text-purple-500" />}
              {categoryId.toUpperCase()} BROWSER
            </h2>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                 type="text"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder={`Search ${categoryId}...`}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
               />
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Filters */}
          {showFilters && (
            <div className="w-80 border-r border-gray-100 p-6 flex flex-col gap-6 bg-white overflow-y-auto custom-scrollbar shrink-0">
              <div className="lg:hidden">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Search Keywords</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Topic or keyword..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {isHadith && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Book Filter</label>
                    <div className="space-y-2">
                      {HADITH_BOOKS.map(book => (
                        <label key={book.id} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={selectedBooks.includes(book.id)}
                            onChange={() => toggleBook(book.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600 group-hover:text-gray-900">{book.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Authenticity</label>
                    <div className="space-y-2">
                      {['All', 'Sahih only', 'Sahih & Hasan', 'Show weak (Da\'eef)'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="radio"
                            name="authenticity"
                            checked={authenticity === opt}
                            onChange={() => setAuthenticity(opt)}
                            className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600 group-hover:text-gray-900">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Topic Filter</label>
                    <select 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                    >
                      <option value="">All Topics</option>
                      {HADITH_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sort Results</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                    >
                      <option>Relevance</option>
                      <option>Book order</option>
                      <option>Authenticity</option>
                      <option>Length</option>
                    </select>
                  </div>
                </>
              )}

              {isQuran && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Filter by Surah</label>
                  <select 
                    value={selectedSurah}
                    onChange={(e) => setSelectedSurah(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">All Surahs</option>
                    {surahs.map(surah => (
                      <option key={surah.surah_number} value={surah.surah_number}>
                        {surah.surah_number}. {surah.surah_name_english} ({surah.surah_name_arabic})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={clearFilters}
                className="mt-4 w-full py-2.5 text-xs font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl border border-gray-100 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden">
            {/* Quick Chips & Count */}
            <div className="px-8 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4">
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Filter size={14} /> Filters
                  </button>
                  {isHadith && authenticity !== 'All' && (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border border-blue-100 animate-in fade-in zoom-in duration-200">
                      {authenticity} <X size={10} className="cursor-pointer" onClick={() => setAuthenticity('All')} />
                    </span>
                  )}
                  {isHadith && selectedBooks.length > 0 && (
                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border border-emerald-100 animate-in fade-in zoom-in duration-200">
                      {selectedBooks.length} Books <X size={10} className="cursor-pointer" onClick={() => setSelectedBooks([])} />
                    </span>
                  )}
                  {isHadith && topic && (
                    <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border border-purple-100 animate-in fade-in zoom-in duration-200">
                      {topic} <X size={10} className="cursor-pointer" onClick={() => setTopic('')} />
                    </span>
                  )}
                  {isQuran && selectedSurah && (
                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border border-emerald-100 animate-in fade-in zoom-in duration-200">
                      Surah {selectedSurah} <X size={10} className="cursor-pointer" onClick={() => setSelectedSurah('')} />
                    </span>
                  )}
               </div>
               
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  {loading ? 'Searching...' : `Showing ${results.length} of ${totalCount} results`}
               </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                  <p className="font-black uppercase tracking-widest text-xs">Accessing Knowledge...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <AlertCircle size={64} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">No results found for your filters</p>
                  <button onClick={clearFilters} className="mt-4 text-xs font-bold text-blue-600 hover:underline">Clear all filters and try again</button>
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
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button className="p-1.5 bg-white rounded-lg shadow-md hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Bookmark">
                          <Star size={14} />
                        </button>
                        <button className="p-1.5 bg-white rounded-lg shadow-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Copy">
                          <Copy size={14} />
                        </button>
                        <button className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors" title="Hadith Info">
                          <Info size={14} />
                        </button>
                      </div>

                      <div className="p-6 flex flex-col h-full relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {item.book || item.reference}
                            </span>
                            <span className="text-[9px] font-bold text-gray-300 uppercase">#{item.hadithNumber || 'Verse'}</span>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            {item.status && (
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            )}
                            {item.length && (
                              <span className={`text-[8px] font-bold uppercase tracking-tighter ${getLengthColor(item.length)}`}>
                                • {item.length}
                              </span>
                            )}
                          </div>
                        </div>

                        <div 
                          className="ar-text text-xl font-bold leading-relaxed text-right mb-4 line-clamp-4 font-serif" 
                          dir="rtl"
                          style={{ color: '#1f2937' }}
                        >
                          {item.arabic}
                        </div>

                        <div className="text-sm italic text-gray-500 leading-relaxed mb-6 line-clamp-4">
                          "{item.english}"
                        </div>

                        <div className="mt-auto flex justify-between items-end border-t border-gray-50 pt-4">
                          <div className="text-[10px] font-bold text-gray-300 uppercase truncate pr-4">{item.reference}</div>
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 shrink-0 shadow-sm border border-emerald-100">
                            <CheckCircle2 size={18} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {isHadith && totalCount > 0 && (
              <div className="px-8 py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                <button 
                  disabled={currentPage === 1 || loading}
                  onClick={() => fetchResults(currentPage - 1)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page</span>
                  <span className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg font-black text-sm">{currentPage}</span>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">of {lastPage}</span>
                </div>

                <button 
                  disabled={currentPage === lastPage || loading}
                  onClick={() => fetchResults(currentPage + 1)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 disabled:opacity-30"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}