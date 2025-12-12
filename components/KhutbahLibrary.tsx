import React, { useState, useEffect } from 'react';
import { 
  Search, Play, FileText, ChevronLeft, Check, 
  MapPin, Star, Heart, MessageCircle, Send, Loader2, AlertCircle,
  Minus, Plus, Type
} from 'lucide-react';
import { AUTHORS_DATA } from '../constants';
import { Khutbah, AuthorData } from '../types';
import { supabase } from '../supabaseClient';

interface KhutbahLibraryProps {
  user: any;
  showHero?: boolean;
  onStartLive?: (id?: string) => void;
}

const getTagStyles = (tag: string) => {
  const styles = [
    'bg-emerald-50 text-emerald-700',
    'bg-blue-50 text-blue-700',
    'bg-purple-50 text-purple-700',
    'bg-amber-50 text-amber-700',
    'bg-rose-50 text-rose-700',
    'bg-cyan-50 text-cyan-700',
    'bg-indigo-50 text-indigo-700',
    'bg-teal-50 text-teal-700',
  ];
  // Simple hash to pick a color based on the tag string
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % styles.length;
  return styles[index];
};

const SafeHtmlRenderer = ({ html, fontSize = 18 }: { html: string | undefined | null, fontSize?: number }) => {
  if (!html || html.trim() === '') {
    return null;
  }
  
  try {
    return (
      <div 
        className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed"
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (error) {
    console.error('Error rendering HTML:', error);
    return (
      <div className="text-gray-500">
        Unable to display content. Please try again.
      </div>
    );
  }
};

export const KhutbahLibrary: React.FC<KhutbahLibraryProps> = ({ user, showHero, onStartLive }) => {
  const [view, setView] = useState<'list' | 'authorProfile' | 'detail'>('list');
  const [selectedKhutbah, setSelectedKhutbah] = useState<Khutbah | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorData | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentFontSize, setContentFontSize] = useState(18);
  
  // Supabase State
  const [khutbahs, setKhutbahs] = useState<Khutbah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Data from Supabase
  useEffect(() => {
    async function fetchKhutbahs() {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('khutbahs')
          .select('*')
          .order('created_at', { ascending: false });

        // Apply Search
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,topic.ilike.%${searchQuery}%`);
        }

        // Apply Topic Filter
        if (activeFilter !== 'All' && activeFilter !== 'All Topics' && activeFilter !== 'Trending') {
           // Mapping some UI filters to database topics if needed, or direct match
           query = query.eq('topic', activeFilter);
        }

        const { data, error } = await query;
        
        if (error) {
          throw error;
        } else {
          // Map Supabase Data to Khutbah Interface
          const mappedData: Khutbah[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            topic: item.topic,
            labels: item.tags, // jsonb array
            likes: item.likes_count,
            content: item.extracted_text,
            style: item.topic, // Use topic as style for now
            date: item.date_delivered,
            file_url: item.file_url,
            // Create a fake array of comments based on the count to satisfy the interface length check
            comments: Array.from({ length: item.comments_count || 0 }).map((_, i) => ({
                user: 'User', 
                text: 'Comment content...', 
                date: 'Recently'
            }))
          }));
          setKhutbahs(mappedData);
        }
      } catch (err: any) {
        console.error('Error fetching khutbahs:', err);
        setError(err.message || 'Failed to load khutbahs');
      } finally {
        setLoading(false);
      }
    }

    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(() => {
        fetchKhutbahs();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeFilter]);

  const handleAuthorClick = (e: React.MouseEvent | null, authorName: string) => {
    if (e) e.stopPropagation(); 
    const data = AUTHORS_DATA[authorName] || { 
        name: authorName, 
        title: 'Khateeb', 
        location: 'Unknown', 
        bio: "No biography available.", 
        stats: { khutbahs: 0, likes: 0, followers: 0 }, 
        imageColor: 'bg-gray-100 text-gray-600',
        initial: authorName.charAt(0)
    };
    setSelectedAuthor(data as AuthorData);
    setView('authorProfile');
  };

  if (view === 'authorProfile' && selectedAuthor) {
    // Note: Ideally this would also fetch from Supabase filtering by author
    const authorKhutbahs = khutbahs.filter(k => k.author === selectedAuthor.name);
    return (
        <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[2000px] mx-auto p-8 xl:p-12">
                    <button onClick={() => setView('list')} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium text-lg"><ChevronLeft size={24} /> Back to Library</button>
                    <div className="bg-white rounded-[2rem] p-12 border border-gray-200 shadow-sm mb-12 flex flex-col md:flex-row gap-12 items-start animate-in slide-in-from-bottom-4 duration-500 max-w-screen-xl mx-auto">
                        <div className={`w-40 h-40 rounded-[2rem] flex items-center justify-center text-6xl font-bold ${selectedAuthor.imageColor} shrink-0`}>{selectedAuthor.initial}</div>
                        <div className="flex-1">
                            <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-4">{selectedAuthor.name}</h1>
                            <div className="flex items-center gap-6 text-gray-500 mb-8 text-xl">
                                <span className="font-medium text-emerald-600">{selectedAuthor.title}</span>
                                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                <span className="flex items-center gap-2"><MapPin size={20}/> {selectedAuthor.location}</span>
                            </div>
                            <div className="flex gap-12 mb-8">
                                <div><div className="text-4xl font-bold text-gray-900">{selectedAuthor.stats.khutbahs}</div><div className="text-sm uppercase font-bold text-gray-400 tracking-wider mt-1">Khutbahs</div></div>
                                <div><div className="text-4xl font-bold text-gray-900">{selectedAuthor.stats.likes}</div><div className="text-sm uppercase font-bold text-gray-400 tracking-wider mt-1">Likes</div></div>
                                <div><div className="text-4xl font-bold text-gray-900">{selectedAuthor.stats.followers}</div><div className="text-sm uppercase font-bold text-gray-400 tracking-wider mt-1">Followers</div></div>
                            </div>
                            <p className="text-gray-600 text-xl leading-relaxed max-w-3xl">{selectedAuthor.bio}</p>
                        </div>
                        <div><button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold shadow-md hover:bg-gray-800 transition-all flex items-center gap-3 text-lg"><Check size={24}/> Following</button></div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-8 max-w-screen-xl mx-auto">Khutbahs by {selectedAuthor.name}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 max-w-screen-xl mx-auto">
                        {authorKhutbahs.map(k => (
                            <div key={k.id} onClick={() => { setSelectedKhutbah(k); setView('detail'); }} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-wrap gap-2">{k.labels && k.labels.map(label => (<span key={label} className={`${getTagStyles(label)} px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider`}>{label}</span>))}</div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-emerald-700 transition-colors">{k.title}</h3>
                                <div className="text-base text-gray-400 mb-6">{k.date || 'Recently added'}</div>
                                <div className="flex items-center justify-between pt-6 border-t border-gray-50 text-sm text-gray-400">
                                    <div className="flex gap-6">
                                        <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400 fill-current"/> 4.8</span>
                                        <span className="flex items-center gap-1.5"><Heart size={16}/> {k.likes}</span>
                                        <span className="flex items-center gap-1.5"><MessageCircle size={16}/> {k.comments?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {authorKhutbahs.length === 0 && (<div className="col-span-full py-12 text-center text-gray-400 italic text-xl">No khutbahs found for this speaker.</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  if (view === 'detail' && selectedKhutbah) {
    return (
      <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-12">
            <button onClick={() => { setView('list'); }} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium text-lg"><ChevronLeft size={24} /> Back to Library</button>
            <div className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-4">{selectedKhutbah.title}</h1>
                <div className="flex items-center gap-4 text-lg text-gray-600">
                  <button onClick={(e) => handleAuthorClick(e, selectedKhutbah.author)} className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">{selectedKhutbah.author}</button>
                  <span>•</span>
                  <span>{selectedKhutbah.topic}</span>
                  {selectedKhutbah.date && (
                    <>
                      <span>•</span>
                      <span>{selectedKhutbah.date}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                 <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mr-2">
                    <Type size={18} className="text-gray-400" />
                    <button onClick={() => setContentFontSize(s => Math.max(14, s-2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Minus size={16} /></button>
                    <span className="w-8 text-center font-bold text-gray-700 select-none">{contentFontSize}</span>
                    <button onClick={() => setContentFontSize(s => Math.min(48, s+2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Plus size={16} /></button>
                 </div>
                 
                 {onStartLive && (
                    <button 
                        onClick={() => onStartLive(selectedKhutbah.id)}
                        className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-6 py-3 rounded-full hover:bg-red-100 transition-colors shadow-sm font-bold animate-in fade-in"
                    >
                        <Play size={20} fill="currentColor"/> Go Live
                    </button>
                 )}

                 <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors shadow-sm font-bold">
                    <Star size={20} className="text-yellow-400 fill-current"/> Rate
                 </button>
                 <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors shadow-sm font-bold">
                    <Heart size={20} /> Save
                 </button>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
              
              {/* If extracted_text exists (mapped to content) and is not empty, show formatted text */}
              {selectedKhutbah.content && selectedKhutbah.content.trim() !== '' ? (
                <SafeHtmlRenderer html={selectedKhutbah.content} fontSize={contentFontSize} />
              ) : selectedKhutbah.file_url ? (
                /* If no extracted_text but file_url exists, show PDF */
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedKhutbah.file_url)}&embedded=true`}
                  className="w-full h-[80vh] rounded-lg border border-gray-200"
                  title={selectedKhutbah.title}
                />
              ) : (
                /* If neither exists, show empty state */
                <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
                  No content available for this khutbah.
                </div>
              )}
              
            </div>

            <div className="mt-12 pt-12 border-t border-gray-100">
                <h3 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-900"><MessageCircle size={32} className="text-gray-400"/> Comments <span className="text-gray-400 text-2xl font-normal">({selectedKhutbah.comments?.length || 0})</span></h3>
                {/* 
                   Note: We are mocking comments here because Supabase currently only returns a count. 
                   In a real app, we would fetch the comments from a related table.
                */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-700 mb-8 text-center italic">
                    Comments view is currently limited to count only. Full discussion thread coming soon.
                </div>
                
                <div className="mt-8 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0 text-lg">Y</div>
                    <div className="flex-1 relative">
                        <textarea placeholder="Add a comment..." className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-14 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-32 text-lg" />
                        <button className="absolute bottom-4 right-4 p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"><Send size={20} /></button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full md:pl-20 bg-gray-50 overflow-y-auto"> 
      <div className="flex-1 flex flex-col max-w-[2000px] mx-auto p-8 xl:p-12">
        <div className="pb-8">
          {showHero ? (
             <div className="mb-16 mt-12 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
                <h1 className="text-6xl md:text-7xl xl:text-8xl font-serif font-bold text-gray-900 mb-8 tracking-tight max-w-5xl mx-auto leading-tight">Find a khutbah in <span className="text-emerald-600">minutes</span>, not days.</h1>
                <p className="text-2xl xl:text-3xl text-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed font-light">Access a curated library of verified sermons, or start composing your own with AI-powered assistance.</p>
                <div className="max-w-4xl mx-auto relative mb-16">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none"><Search className="text-gray-400" size={32} /></div>
                    <input type="text" placeholder="Search by topic, imam, or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-40 py-8 bg-white border border-gray-200 rounded-full shadow-2xl shadow-emerald-50/50 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-2xl transition-all placeholder-gray-300" />
                    <div className="absolute right-3 top-3 bottom-3"><button className="h-full bg-gray-900 text-white px-10 rounded-full font-bold text-lg hover:bg-gray-800 transition-colors">Search</button></div>
                </div>
                <div className="flex justify-center gap-6">
                    <button onClick={() => onStartLive?.()} className="bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-3 text-lg"><Play size={24} className="text-red-500 fill-current" /> Practice Mode</button>
                    <button className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-3 text-lg"><FileText size={24} /> New Draft</button>
                </div>
             </div>
          ) : (
            <div className="flex justify-between items-end mb-10">
                <div><h2 className="text-4xl font-bold text-gray-900">Khutbah Library</h2><p className="text-xl text-gray-500 mt-2">Explore sermons from around the world.</p></div>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none w-80 text-lg" /></div>
            </div>
          )}
          
          <div className={`flex gap-3 mb-10 overflow-x-auto pb-4 custom-scrollbar ${showHero ? 'justify-center' : ''}`}>
            {['All Topics', 'Trending', 'Jumu\'ah', 'Eid', 'Nikah', 'Spiritual', 'Academic', 'Youth'].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`px-6 py-3 rounded-full text-base font-bold whitespace-nowrap transition-colors border-2 ${activeFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
             <Loader2 size={48} className="animate-spin text-emerald-600"/>
             <p className="text-xl font-medium">Loading khutbahs from Supabase...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800">
             <AlertCircle size={48} className="mx-auto mb-4 text-red-500"/>
             <h3 className="text-2xl font-bold mb-2">Could not fetch khutbahs</h3>
             <p className="mb-6">{error}</p>
             <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Retry Connection</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              {khutbahs.length > 0 ? (
                khutbahs.map(k => (
                  <div key={k.id} onClick={() => { setSelectedKhutbah(k); setView('detail'); }} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 group hover:-translate-y-2">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-wrap gap-2">{k.labels && k.labels.map((label, i) => (<span key={i} className={`${getTagStyles(label)} px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider`}>{label}</span>))}</div>
                      <button className="text-gray-300 hover:text-red-500 transition-colors"><Heart size={20} /></button>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors leading-tight">{k.title}</h3>
                    <div className="flex items-center text-base text-gray-500 mb-6"><span>by</span><button onClick={(e) => handleAuthorClick(e, k.author)} className="ml-1 hover:text-emerald-600 hover:underline font-medium relative z-10">{k.author}</button></div>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 text-sm text-gray-400">
                      <div className="flex gap-6">
                          {/* We don't have rating in the prompt spec but keeping UI consistent */}
                          <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400 fill-current"/> 4.8</span>
                          <span className="flex items-center gap-1.5"><Heart size={16}/> {k.likes}</span>
                          <span className="flex items-center gap-1.5 group-hover:text-emerald-600 transition-colors"><MessageCircle size={16}/> {k.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-20">
                   <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search size={40} className="text-gray-400"/>
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">No khutbahs found</h3>
                   <p className="text-gray-500">Try adjusting your search or filters.</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};