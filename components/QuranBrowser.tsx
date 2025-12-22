import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Book, BookOpen, Loader2, ArrowLeft } from 'lucide-react';

export function QuranBrowser() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSurahs();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedSurah) {
      fetchVerses(selectedSurah.id);
    } else {
      setVerses([]);
    }
  }, [selectedSurah]);

  const fetchSurahs = async () => {
    try {
      const response = await fetch('https://api.quran.com/api/v4/chapters');
      const data = await response.json();
      setSurahs(data.chapters || []);
    } catch (error) {
      console.error('Error fetching surahs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerses = async (surahId: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?translations=131`
      );
      const data = await response.json();
      setVerses(data.verses || []);
    } catch (error) {
      console.error('Error fetching verses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSurahs = surahs.filter(surah =>
    surah.name_simple.toLowerCase().includes(searchTerm.toLowerCase()) ||
    surah.name_arabic.includes(searchTerm) ||
    surah.id.toString() === searchTerm
  );

  const handleSurahSelect = (surah: any) => {
    setSelectedSurah(surah);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleClearFilter = () => {
    setSelectedSurah(null);
    setSearchTerm('');
  };

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-1 flex items-center gap-3">
               <BookOpen size={32} className="text-emerald-600" /> Quran Browser
            </h1>
            <p className="text-gray-500 font-medium">Browse and search the Holy Quran for sermon references.</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm mb-10">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Filter by Surah</h3>
          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-left flex items-center justify-between hover:bg-white hover:border-emerald-500 transition-all shadow-inner"
            >
              <span className={`font-bold ${selectedSurah ? 'text-gray-900' : 'text-gray-400'}`}>
                {selectedSurah 
                  ? `${selectedSurah.id}. ${selectedSurah.name_simple} - ${selectedSurah.name_arabic}`
                  : `Select Surah (${surahs.length} available)`
                }
              </span>
              <ChevronDown size={20} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search surahs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="overflow-y-auto max-h-80 custom-scrollbar">
                  <button
                    onClick={() => {
                      handleClearFilter();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-6 py-4 text-left hover:bg-emerald-50 transition border-b border-gray-50 text-emerald-600 font-black text-xs uppercase tracking-widest"
                  >
                    View All Surahs
                  </button>

                  {filteredSurahs.map(surah => (
                    <button
                      key={surah.id}
                      onClick={() => handleSurahSelect(surah)}
                      className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${
                        selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-100' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-gray-900 text-sm">
                            {surah.id}. {surah.name_simple}
                          </span>
                          <span className="text-gray-400 text-[10px] font-bold uppercase ml-2 tracking-tighter">
                            ({surah.verses_count} verses)
                          </span>
                        </div>
                        <span className="text-2xl font-serif text-gray-400 group-hover:text-gray-900">{surah.name_arabic}</span>
                      </div>
                    </button>
                  ))}

                  {filteredSurahs.length === 0 && (
                    <div className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                      No matching surahs
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedSurah && (
            <button
              onClick={handleClearFilter}
              className="mt-4 text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center py-32 gap-4">
            <Loader2 size={48} className="animate-spin text-emerald-600" />
            <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Accessing Scripture...</p>
          </div>
        ) : selectedSurah ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Surah Header */}
            <div className="p-8 md:p-12 bg-emerald-600 text-white flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-4">
                    {selectedSurah.name_simple}
                  </h2>
                  <div className="flex items-center gap-4 text-emerald-100 font-bold uppercase tracking-widest text-sm justify-center md:justify-start">
                    <span>{selectedSurah.revelation_place}</span>
                    <span>•</span>
                    <span>{selectedSurah.verses_count} Verses</span>
                  </div>
                </div>
                <div className="relative z-10 text-6xl md:text-8xl font-serif opacity-30">
                    {selectedSurah.name_arabic}
                </div>
            </div>

            <div className="p-8 md:p-12 space-y-12 bg-white">
              {verses.map(verse => (
                <div key={verse.id} className="border-b border-gray-50 pb-12 last:border-0">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-xs border border-emerald-100">
                      {verse.verse_number}
                    </span>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{verse.verse_key}</span>
                  </div>

                  <p className="text-4xl text-right mb-8 leading-[2.2] font-serif text-gray-900" dir="rtl">
                    {verse.text_uthmani}
                  </p>

                  {verse.translations?.[0] && (
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative">
                        <div className="absolute top-0 left-6 -translate-y-1/2 bg-emerald-600 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Translation</div>
                        <p className="text-gray-700 leading-relaxed text-lg italic font-medium">
                          "{verse.translations[0].text.replace(/<[^>]*>/g, '')}"
                        </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 pb-20">
            {surahs.map(surah => (
              <div
                key={surah.id}
                onClick={() => setSelectedSurah(surah)}
                className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center font-black text-xs text-gray-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  {surah.id}
                </div>
                
                <div className="text-4xl font-serif text-gray-900 mb-6 mt-4 group-hover:scale-110 transition-transform duration-300">
                    {surah.name_arabic}
                </div>

                <h3 className="font-black text-xl text-gray-900 mb-1 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">{surah.name_simple}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {surah.revelation_place} • {surah.verses_count} verses
                </p>

                <div className="mt-8 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
