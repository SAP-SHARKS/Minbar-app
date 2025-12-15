
import React, { useState, useEffect } from 'react';
import { 
  Search, Play, FileText, ChevronLeft, Check, 
  MapPin, Star, Heart, MessageCircle, Send, Loader2, AlertCircle,
  Minus, Plus, Type, ChevronRight, TrendingUp, Grid, User,
  BookOpen, Moon, Sun, Users, Activity, Bookmark
} from 'lucide-react';
import { AUTHORS_DATA } from '../constants';
import { Khutbah, KhutbahPreview, AuthorData } from '../types';
import { supabase } from '../supabaseClient';
import { useHomepageData, usePaginatedKhutbahs, useInfiniteScroll } from '../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { LoginModal } from '../../components/LoginModal';

interface KhutbahLibraryProps {
  user: any;
  showHero?: boolean;
  onStartLive?: (id?: string) => void;
  onAddToMyKhutbahs?: (id: string) => void;
}

// --- Utility Components ---

const getTagStyles = (tag: string) => {
  const styles = [
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-teal-100 text-teal-800 border-teal-200',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return styles[Math.abs(hash) % styles.length];
};

const getTopicIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('salah') || lower.includes('prayer')) return <Activity size={20} />;
    if (lower.includes('zakat') || lower.includes('charity')) return <Heart size={20} />;
    if (lower.includes('fasting') || lower.includes('ramadan')) return <Moon size={20} />;
    if (lower.includes('hajj')) return <MapPin size={20} />;
    if (lower.includes('family')) return <Users size={20} />;
    if (lower.includes('quran')) return <BookOpen size={20} />;
    return <FileText size={20} />;
};

interface KhutbahCardProps {
  data: KhutbahPreview;
  onClick: () => void;
}

const KhutbahCard: React.FC<KhutbahCardProps> = ({ data, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col relative overflow-hidden">
    
    <div className="absolute top-6 right-6">
        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-100">
            <Star size={12} fill="currentColor" /> {data.rating || '4.8'}
        </div>
    </div>

    <div className="flex flex-wrap gap-2 mb-4 pr-16">
      {data.labels && data.labels.slice(0, 3).map((label, idx) => (
          <span key={idx} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getTagStyles(label)}`}>
              {label}
          </span>
      ))}
      {(!data.labels || data.labels.length === 0) && data.topic && (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getTagStyles(data.topic)}`}>
              {data.topic}
          </span>
      )}
    </div>
    
    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight">
        {data.title}
    </h3>
    
    <div className="flex items-center text-sm text-gray-500 mb-auto">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 mr-2">By</span>
        <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{data.author}</span>
    </div>
    
    <div className="pt-5 border-t border-gray-50 mt-5 flex items-center justify-between">
       <div className="flex items-center gap-4">
           <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">
               <Heart size={14} className="text-gray-400 group-hover:text-red-500 transition-colors" /> 
               {data.likes}
           </span>
           <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-500 transition-colors">
               <MessageCircle size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> 
               {data.comments_count || 0}
           </span>
       </div>
       <span className="text-xs text-gray-400">{data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Recently'}</span>
    </div>
  </div>
);

interface TopicCardProps {
  name: string;
  count?: number;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ name, count, onClick }) => (
    <div onClick={onClick} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all text-center group flex flex-col items-center justify-center h-32">
        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:bg-emerald-100">
            {getTopicIcon(name)}
        </div>
        <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{name}</h4>
        {count !== undefined && <span className="text-[10px] text-gray-400 font-medium">{count} Khutbahs</span>}
    </div>
);

interface ImamCardProps {
  name: string;
  count?: number;
  avatar_url?: string;
  onClick: () => void;
}

const ImamCard: React.FC<ImamCardProps> = ({ name, count, avatar_url, onClick }) => (
    <div onClick={onClick} className="flex-shrink-0 w-40 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group mr-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-3 overflow-hidden border-2 border-transparent group-hover:border-emerald-200 transition-colors">
            {avatar_url ? (
                <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400 bg-gray-100">
                    {name.charAt(0)}
                </div>
            )}
        </div>
        <div className="text-center">
            <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{name}</h4>
            {count !== undefined && <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{count} Khutbahs</span>}
        </div>
    </div>
);

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

const HomeView = ({ 
    onNavigate, 
    onSelectKhutbah 
}: { 
    onNavigate: (view: 'home' | 'list', filter?: any) => void; 
    onSelectKhutbah: (k: KhutbahPreview) => void;
}) => {
    const { data, isLoading } = useHomepageData();

    if (isLoading || !data) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 size={32} className="animate-spin text-emerald-600"/>
            </div>
        );
    }

    return (
        <div className="space-y-16 pb-20 animate-in fade-in duration-500">
            {/* Latest Section */}
            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Latest Khutbahs</h2>
                        <p className="text-gray-500 text-sm mt-1">Freshly added to the library</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'latest' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.latest.map(k => <KhutbahCard key={k.id} data={k} onClick={() => onSelectKhutbah(k)} />)}
                </div>
            </section>

            {/* Trending Section */}
            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={24} className="text-emerald-500"/> Trending</h2>
                        <p className="text-gray-500 text-sm mt-1">Most viewed this month</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'trending' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.trending.map(k => <KhutbahCard key={k.id} data={k} onClick={() => onSelectKhutbah(k)} />)}
                </div>
            </section>

            {/* Topics Grid */}
            <section className="bg-gray-100 -mx-8 px-8 py-14">
                <div className="max-w-[2000px] mx-auto">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Browse by Topic</h2>
                            <p className="text-gray-500 text-sm mt-1">Explore sermons by subject matter</p>
                        </div>
                        <button onClick={() => onNavigate('list', {})} className="text-gray-600 font-bold text-sm hover:text-gray-900 flex items-center gap-1">View All Topics <ChevronRight size={14}/></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {data.topics.length > 0 ? data.topics.map(t => (
                            <TopicCard key={t.id} name={t.name} count={t.khutbah_count} onClick={() => onNavigate('list', { topic: t.name })} />
                        )) : (
                            ['Salah', 'Zakat', 'Fasting', 'Hajj', 'Family', 'Character', 'Quran', 'Sunnah', 'History', 'Ethics'].map(t => (
                                <TopicCard key={t} name={t} onClick={() => onNavigate('list', { topic: t })} />
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Imams Scroll */}
            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Popular Imams</h2>
                        <p className="text-gray-500 text-sm mt-1">Learned scholars and speakers</p>
                    </div>
                    <button onClick={() => onNavigate('list', {})} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">View All <ChevronRight size={14}/></button>
                </div>
                <div className="flex overflow-x-auto pb-6 -mx-2 px-2 custom-scrollbar">
                    {data.imams.length > 0 ? data.imams.map(i => (
                        <ImamCard key={i.id} name={i.name} count={i.khutbah_count} avatar_url={i.avatar_url} onClick={() => onNavigate('list', { imam: i.name })} />
                    )) : (
                        ['Mufti Menk', 'Omar Suleiman', 'Nouman Ali Khan', 'Yasir Qadhi', 'Hamza Yusuf', 'Suhaib Webb'].map(i => (
                            <ImamCard key={i} name={i} onClick={() => onNavigate('list', { imam: i })} />
                        ))
                    )}
                </div>
            </section>

            {/* Most Used / Classics Section */}
            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bookmark size={24} className="text-amber-500"/> Most Used</h2>
                        <p className="text-gray-500 text-sm mt-1">Timeless sermons often repeated</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'trending' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="flex overflow-x-auto pb-6 -mx-4 px-4 custom-scrollbar gap-6">
                    {data.classics.map(k => (
                        <div key={k.id} className="min-w-[300px] w-[300px]">
                            <KhutbahCard data={k} onClick={() => onSelectKhutbah(k)} />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const ListView = ({ 
    filters, 
    setFilters, 
    onSelectKhutbah,
    onBack
}: { 
    filters: any, 
    setFilters: (f: any) => void, 
    onSelectKhutbah: (k: KhutbahPreview) => void,
    onBack: () => void
}) => {
    const { data, count, hasMore, isLoading, loadMore, refresh } = usePaginatedKhutbahs(filters);
    const lastElementRef = useInfiniteScroll(loadMore, hasMore, isLoading);

    useEffect(() => {
        refresh();
    }, [filters]);

    return (
        <div className="pt-4">
            <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium"><ChevronLeft size={18} /> Back to Home</button>
            
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        {filters.topic ? `${filters.topic} Khutbahs` : filters.imam ? `Khutbahs by ${filters.imam}` : filters.search ? `Search: "${filters.search}"` : 'All Khutbahs'}
                    </h2>
                    <p className="text-gray-500 mt-1">{count} results found</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filters.sort || 'latest'} 
                        onChange={(e) => setFilters({...filters, sort: e.target.value})}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none text-sm font-medium"
                    >
                        <option value="latest">Latest</option>
                        <option value="trending">Trending</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {data.map((k, index) => (
                    <div key={k.id} ref={index === data.length - 1 ? lastElementRef : null}>
                        <KhutbahCard data={k} onClick={() => onSelectKhutbah(k)} />
                    </div>
                ))}
            </div>
            
            {isLoading && (
                <div className="py-10 text-center flex justify-center">
                    <Loader2 size={32} className="animate-spin text-emerald-600"/>
                </div>
            )}
            
            {!isLoading && data.length === 0 && (
                <div className="text-center py-20 bg-gray-100 rounded-2xl">
                    <Search size={48} className="mx-auto text-gray-300 mb-4"/>
                    <h3 className="text-xl font-bold text-gray-600">No khutbahs found</h3>
                    <p className="text-gray-400">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
};

export const KhutbahLibrary: React.FC<KhutbahLibraryProps> = ({ user, showHero, onStartLive, onAddToMyKhutbahs }) => {
  const [view, setView] = useState<'home' | 'list' | 'detail'>('home');
  const [activeFilters, setActiveFilters] = useState<{ topic?: string, imam?: string, sort?: string, search?: string }>({});
  const [selectedKhutbahId, setSelectedKhutbahId] = useState<string | null>(null);
  
  // Detail View State
  const [detailData, setDetailData] = useState<Khutbah | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contentFontSize, setContentFontSize] = useState(18);
  const [isInMyKhutbahs, setIsInMyKhutbahs] = useState(false);
  const [addingToMyKhutbahs, setAddingToMyKhutbahs] = useState(false);
  
  // Use direct auth for actions
  const { user: authUser, setShowLoginModal, setLoginMessage } = useAuth(); 

  const handleNavigate = (newView: 'home' | 'list', filters: any = {}) => {
      setActiveFilters(filters);
      setView(newView);
  };

  const handleSelectKhutbah = async (preview: KhutbahPreview) => {
      setSelectedKhutbahId(preview.id);
      setView('detail');
      setDetailLoading(true);
      setIsInMyKhutbahs(false);
      
      try {
          // Fetch public detail
          const { data, error } = await supabase
            .from('khutbahs')
            .select('*')
            .eq('id', preview.id)
            .single();
            
          if (data) {
              setDetailData({
                  id: data.id,
                  title: data.title,
                  author: data.author,
                  topic: data.topic,
                  labels: data.tags,
                  likes: data.likes_count,
                  content: data.extracted_text, 
                  style: data.topic,
                  date: data.created_at ? new Date(data.created_at).toLocaleDateString() : undefined,
                  file_url: data.file_url,
                  comments: [] 
              });

              // Check if in my khutbahs using maybeSingle to avoid errors if not found
              const currentUser = authUser || user;
              if (currentUser) {
                  const { data: userData } = await supabase
                    .from('user_khutbahs')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('source_khutbah_id', data.id)
                    .maybeSingle();
                  
                  if (userData) setIsInMyKhutbahs(true);
              }
          }
      } catch (err) {
          console.error("Error fetching detail:", err);
      } finally {
          setDetailLoading(false);
      }
  };

  const handleAddCopy = async () => {
      const currentUser = authUser || user;
      
      if (!currentUser) {
          setLoginMessage("Sign in to save this khutbah to your personal library.");
          setShowLoginModal(true);
          return;
      }
      
      if (!detailData) return;
      setAddingToMyKhutbahs(true);

      try {
          const userId = currentUser.id;
          
          // 1. Create User Khutbah Copy
          const { data: userKhutbah, error: headerError } = await supabase
            .from('user_khutbahs')
            .insert({
                user_id: userId,
                source_khutbah_id: detailData.id,
                title: detailData.title,
                author: detailData.author,
                content: detailData.content || '', // Handle potentially null content
            })
            .select()
            .single();

          if (headerError) throw headerError;

          // 2. Fetch original cards
          const { data: originalCards } = await supabase
            .from('khutbah_cards')
            .select('*')
            .eq('khutbah_id', detailData.id)
            .order('card_number');

          if (originalCards && originalCards.length > 0) {
              // 3. Map to user cards
              const userCards = originalCards.map(c => ({
                  user_khutbah_id: userKhutbah.id,
                  card_number: c.card_number,
                  section_label: c.section_label,
                  title: c.title,
                  bullet_points: c.bullet_points,
                  arabic_text: c.arabic_text,
                  key_quote: c.key_quote,
                  quote_source: c.quote_source,
                  transition_text: c.transition_text,
                  time_estimate_seconds: c.time_estimate_seconds,
                  notes: c.notes
              }));

              const { error: cardsError } = await supabase
                .from('user_khutbah_cards')
                .insert(userCards);
                
              if (cardsError) throw cardsError;
          }

          setIsInMyKhutbahs(true);
          // If parent provided callback, call it (e.g. to navigate to editor)
          if (onAddToMyKhutbahs) onAddToMyKhutbahs(userKhutbah.id);

      } catch (err: any) {
          console.error("Error copying khutbah:", err);
          const msg = err.message || JSON.stringify(err);
          
          if (msg.includes("duplicate key")) {
              alert("This khutbah is already in your collection.");
              setIsInMyKhutbahs(true);
          } else {
              alert(`Failed to add to My Khutbahs: ${msg}`);
          }
      } finally {
          setAddingToMyKhutbahs(false);
      }
  };

  if (view === 'detail') {
      if (detailLoading || !detailData) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-emerald-600"/></div>;
      
      return (
        <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
             {/* Using Global Login Modal from App root controlled by context */}
            <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-12">
                <button onClick={() => setView('home')} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium text-lg"><ChevronLeft size={24} /> Back to Library</button>
                <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-4">{detailData.title}</h1>
                    <div className="flex items-center gap-4 text-lg text-gray-600">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">{detailData.author}</span>
                    <span>•</span>
                    <span>{detailData.topic}</span>
                    {detailData.date && <><span>•</span><span>{detailData.date}</span></>}
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mr-2">
                        <Type size={18} className="text-gray-400" />
                        <button onClick={() => setContentFontSize(s => Math.max(14, s-2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Minus size={16} /></button>
                        <span className="w-8 text-center font-bold text-gray-700 select-none">{contentFontSize}</span>
                        <button onClick={() => setContentFontSize(s => Math.min(48, s+2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Plus size={16} /></button>
                    </div>
                    
                    {/* Add to My Khutbahs Logic */}
                    {isInMyKhutbahs ? (
                        <button 
                            disabled 
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3 rounded-full cursor-default shadow-sm font-bold"
                        >
                            <Check size={20} /> In My Khutbahs
                        </button>
                    ) : (
                        <button 
                            onClick={handleAddCopy}
                            disabled={addingToMyKhutbahs}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 font-bold disabled:opacity-50"
                        >
                            {addingToMyKhutbahs ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            Add to My Khutbahs
                        </button>
                    )}

                    <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors shadow-sm font-bold">
                        <Heart size={20} /> Save
                    </button>
                </div>
                </div>
                
                <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
                {detailData.content && detailData.content.trim() !== '' ? (
                    <SafeHtmlRenderer html={detailData.content} fontSize={contentFontSize} />
                ) : detailData.file_url ? (
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(detailData.file_url)}&embedded=true`} className="w-full h-[80vh] rounded-lg border border-gray-200" title={detailData.title} />
                ) : (
                    <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">No content available for this khutbah.</div>
                )}
                </div>
            </div>
            </div>
        </div>
      );
  }

  // ... (Keep existing Home/List render)
  return (
    <div className="h-full md:pl-20 bg-gray-50 overflow-y-auto"> 
      <div className="flex-1 flex flex-col max-w-[2000px] mx-auto p-8 xl:p-12">
        <div className="pb-8">
          {showHero && view === 'home' && (
             <div className="mb-16 mt-12 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
                <h1 className="text-6xl md:text-7xl xl:text-8xl font-serif font-bold text-gray-900 mb-8 tracking-tight max-w-5xl mx-auto leading-tight">Find a khutbah in <span className="text-emerald-600">minutes</span>, not days.</h1>
                <div className="max-w-4xl mx-auto relative mb-16">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none"><Search className="text-gray-400" size={32} /></div>
                    <input 
                        type="text" 
                        placeholder="Search by topic, imam, or keyword..." 
                        value={activeFilters.search || ''} 
                        onChange={(e) => setActiveFilters({...activeFilters, search: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleNavigate('list', { ...activeFilters, search: (e.target as HTMLInputElement).value });
                        }}
                        className="w-full pl-20 pr-40 py-8 bg-white border border-gray-200 rounded-full shadow-2xl shadow-emerald-50/50 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-2xl transition-all placeholder-gray-300" 
                    />
                    <div className="absolute right-3 top-3 bottom-3">
                        <button 
                            onClick={() => handleNavigate('list', activeFilters)}
                            className="h-full bg-gray-900 text-white px-10 rounded-full font-bold text-lg hover:bg-gray-800 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>
             </div>
          )}
          
          {(!showHero || view !== 'home') && (
            <div className="flex justify-between items-end mb-10">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={activeFilters.search || ''} 
                        onChange={(e) => setActiveFilters({...activeFilters, search: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleNavigate('list', { ...activeFilters, search: (e.target as HTMLInputElement).value });
                        }}
                        className="pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full text-lg" 
                    />
                </div>
            </div>
          )}
        </div>

        {view === 'home' && <HomeView onNavigate={handleNavigate} onSelectKhutbah={handleSelectKhutbah} />}
        {view === 'list' && (
            <ListView 
                filters={activeFilters} 
                setFilters={setActiveFilters} 
                onSelectKhutbah={handleSelectKhutbah}
                onBack={() => setView('home')} 
            />
        )}
        
      </div>
    </div>
  );
};
