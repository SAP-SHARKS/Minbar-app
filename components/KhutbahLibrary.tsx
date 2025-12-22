import React, { useState, useEffect } from 'react';
import { 
  Search, Play, FileText, ChevronLeft, Check, 
  MapPin, Star, Heart, MessageCircle, Send, Loader2, AlertCircle,
  Minus, Plus, Type, ChevronRight, TrendingUp, Grid, User,
  BookOpen, Moon, Sun, Users, Activity, Bookmark, LayoutList, Sparkles
} from 'lucide-react';
import { AUTHORS_DATA } from '../constants';
import { Khutbah, KhutbahPreview, AuthorData } from '../types';
import { supabase } from '../supabaseClient';
import { useHomepageData, usePaginatedKhutbahs, useInfiniteScroll } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import ImamProfileModal from './ImamProfileModal';

interface KhutbahLibraryProps {
  user: any;
  showHero?: boolean;
  onStartLive?: (id?: string) => void;
  onAddToMyKhutbahs?: (id: string) => void;
  onNavigateImam?: (id: string) => void;
  onNavigateTopic?: (topicName: string) => void;
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

const getSectionColor = (label: string) => {
    const colors: Record<string, string> = {
      INTRO: 'bg-blue-100 text-blue-700 border-blue-200',
      MAIN: 'bg-gray-100 text-gray-700 border-gray-200',
      HADITH: 'bg-green-100 text-green-700 border-green-200',
      QURAN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      STORY: 'bg-purple-100 text-purple-700 border-purple-200',
      PRACTICAL: 'bg-orange-100 text-orange-700 border-orange-200',
      CLOSING: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[label] || 'bg-gray-100 text-gray-700 border-gray-200';
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

const topicColors: Record<string, { bg: string; icon: string }> = {
  'Salah': { bg: 'bg-blue-50', icon: 'text-blue-500' },
  'Zakat': { bg: 'bg-pink-50', icon: 'text-pink-500' },
  'Fasting': { bg: 'bg-purple-50', icon: 'text-purple-500' },
  'Hajj': { bg: 'bg-orange-50', icon: 'text-orange-500' },
  'Quran': { bg: 'bg-emerald-50', icon: 'text-emerald-500' },
  'Hadith': { bg: 'bg-teal-50', icon: 'text-teal-500' },
  'Family': { bg: 'bg-rose-50', icon: 'text-rose-500' },
  'Character': { bg: 'bg-indigo-50', icon: 'text-indigo-500' },
  'Death & Afterlife': { bg: 'bg-slate-50', icon: 'text-slate-500' },
  'Community': { bg: 'bg-cyan-50', icon: 'text-cyan-500' },
  'Current Events': { bg: 'bg-amber-50', icon: 'text-amber-500' },
  'Ramadan': { bg: 'bg-violet-50', icon: 'text-violet-500' },
  'Anger': { bg: 'bg-red-50', icon: 'text-red-500' },
  'Patience': { bg: 'bg-green-50', icon: 'text-green-500' },
  'Love': { bg: 'bg-pink-50', icon: 'text-pink-500' },
  'Hope': { bg: 'bg-yellow-50', icon: 'text-yellow-500' },
};

const defaultColor = { bg: 'bg-gray-50', icon: 'text-gray-500' };

const avatarColors = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-orange-100 text-orange-600',
  'bg-teal-100 text-teal-600',
  'bg-indigo-100 text-indigo-600',
  'bg-rose-100 text-rose-600',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

interface KhutbahCardProps {
  data: KhutbahPreview;
  onClick: () => void;
  onImamClick: (id: string) => void;
  onTagClick: (tag: string) => void;
}

const KhutbahCard: React.FC<KhutbahCardProps> = ({ data, onClick, onImamClick, onTagClick }) => (
  <div onClick={onClick} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl cursor-pointer transition-all duration-500 group hover:-translate-y-2 h-full flex flex-col relative overflow-hidden">
    
    <div className="absolute top-8 right-8">
        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-tighter border border-amber-100">
            <Star size={14} fill="currentColor" /> {data.rating || '4.8'}
        </div>
    </div>

    <div className="flex flex-wrap gap-2 mb-6 pr-20">
      {data.labels && data.labels.slice(0, 3).map((label, idx) => (
          <button 
            key={idx} 
            onClick={(e) => { e.stopPropagation(); onTagClick(label); }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 hover:underline active:scale-95 ${getTagStyles(label)}`}
          >
              {label}
          </button>
      ))}
      {(!data.labels || data.labels.length === 0) && data.topic && (
          <button 
            onClick={(e) => { e.stopPropagation(); onTagClick(data.topic!); }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 hover:underline active:scale-95 ${getTagStyles(data.topic)}`}
          >
              {data.topic}
          </button>
      )}
    </div>
    
    <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight uppercase tracking-tighter">
        {data.title}
    </h3>
    
    <div className="flex items-center text-sm text-gray-500 mb-auto">
        <button 
            onClick={(e) => {
                e.stopPropagation();
                if (data.imam_id) onImamClick(data.imam_id);
            }}
            className="group/author flex items-center gap-2"
        >
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">By</span>
            <span className="font-black text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-tighter text-sm transition-all shadow-sm">
                {data.author}
            </span>
        </button>
    </div>
    
    <div className="pt-6 border-t border-gray-50 mt-6 flex items-center justify-between">
       <div className="flex items-center gap-5">
           <span className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">
               <Heart size={16} className="text-gray-300 group-hover:text-red-500 transition-colors" /> 
               {data.likes}
           </span>
           <span className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-widest">
               <MessageCircle size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" /> 
               {data.comments_count || 0}
           </span>
       </div>
       <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
           {data.published_at ? new Date(data.published_at).toLocaleDateString() : 'RECENT'}
       </span>
    </div>
  </div>
);

interface TopicCardProps {
  name: string;
  count?: number;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ name, count, onClick }) => {
    const colors = topicColors[name] || defaultColor;
    return (
        <div onClick={onClick} className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-2xl hover:-translate-y-1 cursor-pointer transition-all text-center group flex flex-col items-center justify-center h-40`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-sm ${colors.bg} ${colors.icon}`}>
                {getTopicIcon(name)}
            </div>
            <h4 className="font-black text-gray-800 text-xs mb-1 line-clamp-1 uppercase tracking-widest">{name}</h4>
            {count !== undefined && <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{count} SERMONS</span>}
        </div>
    );
};

interface ImamCardProps {
  name: string;
  count?: number;
  avatar_url?: string;
  onClick: () => void;
}

const ImamCard: React.FC<ImamCardProps> = ({ name, count, avatar_url, onClick }) => (
    <div onClick={onClick} className="flex-shrink-0 w-44 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl cursor-pointer transition-all group mr-6 hover:-translate-y-1">
        <div className={`w-24 h-24 rounded-[1.5rem] mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg group-hover:border-emerald-200 transition-colors ${!avatar_url ? getAvatarColor(name) : 'bg-gray-100'}`}>
            {avatar_url ? (
                <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black uppercase">
                    {name.charAt(0)}
                </div>
            )}
        </div>
        <div className="text-center">
            <h4 className="font-black text-sm text-gray-900 truncate mb-1 uppercase tracking-tighter">{name}</h4>
            {count !== undefined && <span className="text-[9px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest">{count} SERMONS</span>}
        </div>
    </div>
);

const HomeView = ({ 
    onNavigate, 
    onSelectKhutbah,
    onImamClick,
    onNavigateTopic
}: { 
    onNavigate: (view: 'home' | 'list', filter?: any) => void; 
    onSelectKhutbah: (k: KhutbahPreview) => void;
    onImamClick: (id: string) => void;
    onNavigateTopic: (t: string) => void;
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
                <div className="flex justify-between items-end mb-8 px-1">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Latest Sermons</h2>
                        <p className="text-gray-500 font-medium mt-1">Freshly curated academic and spiritual content.</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'latest' })} className="bg-white border border-gray-200 text-emerald-600 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-2">Explore All <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.latest.map(k => <KhutbahCard key={k.id} data={k} onTagClick={onNavigateTopic} onImamClick={onImamClick} onClick={() => onSelectKhutbah(k)} />)}
                </div>
            </section>

            {/* Trending Section */}
            <section>
                <div className="flex justify-between items-end mb-8 px-1">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tighter"><TrendingUp size={32} className="text-emerald-500"/> Trending</h2>
                        <p className="text-gray-500 font-medium mt-1">Sermons with high community engagement.</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'trending' })} className="bg-white border border-gray-200 text-emerald-600 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-2">View Popular <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.trending.map(k => <KhutbahCard key={k.id} data={k} onTagClick={onNavigateTopic} onImamClick={onImamClick} onClick={() => onSelectKhutbah(k)} />)}
                </div>
            </section>

            {/* Topics Grid */}
            <section className="bg-gray-900 -mx-10 px-10 py-20 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Browse Topics</h2>
                            <p className="text-gray-400 font-medium mt-2 text-lg">Deep dive into specific scholarly subjects.</p>
                        </div>
                        <button onClick={() => onNavigate('list', {})} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2">View Atlas <ChevronRight size={14}/></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {data.topics.length > 0 ? data.topics.map(t => (
                            <TopicCard key={t.id} name={t.name} count={t.khutbah_count} onClick={() => onNavigateTopic(t.name)} />
                        )) : (
                            ['Salah', 'Zakat', 'Fasting', 'Hajj', 'Family', 'Character', 'Quran', 'Sunnah', 'History', 'Ethics'].map(t => (
                                <TopicCard key={t} name={t} onClick={() => onNavigateTopic(t)} />
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Imams Scroll */}
            <section>
                <div className="flex justify-between items-end mb-8 px-1">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Featured Scholars</h2>
                        <p className="text-gray-500 font-medium mt-1">Connect with learned voices from the global community.</p>
                    </div>
                    <button onClick={() => onNavigate('list', {})} className="bg-white border border-gray-200 text-emerald-600 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm">Directory <ChevronRight size={14} className="inline"/></button>
                </div>
                <div className="flex overflow-x-auto pb-8 -mx-4 px-4 custom-scrollbar">
                    {data.imams.length > 0 ? data.imams.map(i => (
                        <ImamCard key={i.id} name={i.name} count={i.khutbah_count} avatar_url={i.avatar_url} onClick={() => onImamClick(i.id)} />
                    )) : (
                        ['Mufti Menk', 'Omar Suleiman', 'Nouman Ali Khan', 'Yasir Qadhi', 'Hamza Yusuf', 'Suhaib Webb'].map(i => (
                            <ImamCard key={i} name={i} onClick={() => onNavigate('list', { imam: i })} />
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};

const ListView = ({ 
    filters, 
    setFilters, 
    onSelectKhutbah,
    onImamClick,
    onBack,
    onNavigateTopic
}: { 
    filters: any, 
    setFilters: (f: any) => void, 
    onSelectKhutbah: (k: KhutbahPreview) => void,
    onImamClick: (id: string) => void,
    onBack: () => void,
    onNavigateTopic: (t: string) => void
}) => {
    const { data, count, hasMore, isLoading, loadMore, refresh } = usePaginatedKhutbahs(filters);
    const lastElementRef = useInfiniteScroll(loadMore, hasMore, isLoading);

    useEffect(() => {
        refresh();
    }, [filters]);

    return (
        <div className="pt-4">
            <button onClick={onBack} className="mb-8 flex items-center text-gray-400 hover:text-emerald-600 gap-2 font-black uppercase tracking-widest text-xs transition-all"><ChevronLeft size={16} /> Back to Repository</button>
            
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">
                        {filters.topic ? `${filters.topic} Sermons` : filters.imam ? `Sermons by ${filters.imam}` : filters.search ? `Results: "${filters.search}"` : 'Global Archive'}
                    </h2>
                    <p className="text-gray-500 font-bold mt-2 uppercase tracking-widest text-xs bg-gray-100 px-3 py-1 rounded-lg w-fit">{count} entries found</p>
                </div>
                <div className="flex gap-3">
                    <select 
                        value={filters.sort || 'latest'} 
                        onChange={(e) => setFilters({...filters, sort: e.target.value})}
                        className="px-6 py-3 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-black uppercase tracking-widest text-gray-600 focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
                    >
                        <option value="latest">Sort: Newest</option>
                        <option value="trending">Sort: Trending</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {data.map((k, index) => (
                    <div key={k.id} ref={index === data.length - 1 ? lastElementRef : null}>
                        <KhutbahCard data={k} onTagClick={onNavigateTopic} onImamClick={onImamClick} onClick={() => onSelectKhutbah(k)} />
                    </div>
                ))}
            </div>
            
            {isLoading && (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <Loader2 size={40} className="animate-spin text-emerald-600"/>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Archive...</p>
                </div>
            )}
            
            {!isLoading && data.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                    <Search size={64} className="mx-auto text-gray-200 mb-6"/>
                    <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tighter">No sermons found</h3>
                    <button onClick={() => setFilters({})} className="mt-6 text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">Clear all filters</button>
                </div>
            )}
        </div>
    );
};

export const KhutbahLibrary: React.FC<KhutbahLibraryProps> = ({ user, showHero, onStartLive, onAddToMyKhutbahs, onNavigateImam, onNavigateTopic }) => {
  const [view, setView] = useState<'home' | 'list' | 'detail'>('home');
  const [activeFilters, setActiveFilters] = useState<{ topic?: string, imam?: string, sort?: string, search?: string }>({});
  const [selectedKhutbahId, setSelectedKhutbahId] = useState<string | null>(null);
  
  // Detail View State
  const [detailData, setDetailData] = useState<Khutbah | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contentFontSize, setContentFontSize] = useState(18);
  const [isInMyKhutbahs, setIsInMyKhutbahs] = useState(false);
  const [addingToMyKhutbahs, setAddingToMyKhutbahs] = useState(false);
  const [khutbahCards, setKhutbahCards] = useState<any[]>([]);
  
  // AI Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user: authUser, requireAuth } = useAuth(); 

  const handleNavigate = (newView: 'home' | 'list', filters: any = {}) => {
      setActiveFilters(filters);
      setView(newView);
  };

  const handleSelectKhutbah = async (preview: KhutbahPreview) => {
      setSelectedKhutbahId(preview.id);
      setView('detail');
      setDetailLoading(true);
      setIsInMyKhutbahs(false);
      setKhutbahCards([]);
      
      try {
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
                  imam_id: data.imam_id,
                  topic: data.topic,
                  labels: data.tags,
                  likes: data.likes_count,
                  content: data.extracted_text || data.content,
                  style: data.topic,
                  date: data.created_at ? new Date(data.created_at).toLocaleDateString() : undefined,
                  file_url: data.file_url,
                  comments: [] 
              });

              const { data: cardsData } = await supabase
                  .from('khutbah_cards')
                  .select('*')
                  .eq('khutbah_id', data.id)
                  .order('card_number', { ascending: true });

              if (cardsData) {
                  setKhutbahCards(cardsData);
              }

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

  const handleProcessAI = async () => {
    if (!detailData || !detailData.id) return;
    
    setIsProcessing(true);
    try {
        const rawText = detailData.content || ''; 
        if (!rawText) throw new Error("No content to process");

        const resFormat = await fetch('/api/process-khutbah', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ content: rawText, type: 'format' })
        });
        
        if (!resFormat.ok) throw new Error('API Format Error');
        const dataFormat = await resFormat.json();
        const html = dataFormat.result;

        const resCards = await fetch('/api/process-khutbah', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ content: html, type: 'cards' })
        });
        
        if (!resCards.ok) throw new Error('API Cards Error');
        const dataCards = await resCards.json();
        
        let cardsJson = [];
        try {
            const cleanJson = dataCards.result.replace(/```json/g, '').replace(/```/g, '').trim();
            cardsJson = JSON.parse(cleanJson);
        } catch (e) {
            cardsJson = JSON.parse(dataCards.result);
        }

        const { error: updateError } = await supabase
            .from('khutbahs')
            .update({ content: html, extracted_text: html }) 
            .eq('id', detailData.id);
        
        if (updateError) throw updateError;

        await supabase.from('khutbah_cards').delete().eq('khutbah_id', detailData.id);
        
        const cardsPayload = cardsJson.map((c: any) => ({
            khutbah_id: detailData.id,
            card_number: c.card_number,
            section_label: c.section_label || 'MAIN',
            title: c.title || 'Section',
            bullet_points: c.bullet_points || [],
            arabic_text: c.arabic_text || '',
            key_quote: c.key_quote || '',
            quote_source: c.quote_source || '',
            time_estimate_seconds: c.time_estimate_seconds || 60
        }));
        
        const { error: insertError } = await supabase.from('khutbah_cards').insert(cardsPayload);
        if (insertError) throw insertError;

        handleSelectKhutbah({ id: detailData.id } as any);
        alert('Khutbah processed successfully!');

    } catch (err: any) {
        console.error("AI Processing Failed:", err);
        alert("Processing failed: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddCopy = () => {
      requireAuth('Sign in to save this khutbah to your personal library.', async () => {
          if (!detailData) return;
          
          setAddingToMyKhutbahs(true);
          const currentUser = authUser || user; 

          try {
              const userId = currentUser?.id;
              if (!userId) throw new Error("User not authenticated");
              
              const { data: userKhutbah, error: headerError } = await supabase
                .from('user_khutbahs')
                .insert({
                    user_id: userId,
                    source_khutbah_id: detailData.id,
                    title: detailData.title,
                    author: detailData.author,
                    content: detailData.content || '',
                })
                .select()
                .single();

              if (headerError) throw headerError;

              const { data: originalCards } = await supabase
                .from('khutbah_cards')
                .select('*')
                .eq('khutbah_id', detailData.id)
                .order('card_number');

              if (originalCards && originalCards.length > 0) {
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
      });
  };

  const handleNavigateImam = (id: string) => {
    if (onNavigateImam) onNavigateImam(id);
  };

  const handleNavigateTopic = (name: string) => {
    if (onNavigateTopic) onNavigateTopic(name);
  };

  if (view === 'detail') {
      if (detailLoading || !detailData) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-emerald-600"/></div>;
      
      return (
        <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto">
            <div className="page-container py-8 xl:py-12">
                <button onClick={() => setView('home')} className="mb-8 flex items-center text-gray-400 hover:text-emerald-600 gap-2 font-black uppercase tracking-widest text-xs transition-all"><ChevronLeft size={20} /> Back to Archive</button>
                <div className="flex flex-col xl:flex-row justify-between items-start mb-12 gap-8">
                <div>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-gray-900 mb-6 leading-tight tracking-tighter uppercase">{detailData.title}</h1>
                    <div className="flex flex-wrap items-center gap-5 text-sm font-black uppercase tracking-widest">
                    <button onClick={() => detailData.imam_id && handleNavigateImam(detailData.imam_id)} className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 font-black">{detailData.author}</button>
                    <span className="text-gray-200">•</span>
                    <button onClick={() => handleNavigateTopic(detailData.topic)} className="text-gray-400 hover:text-emerald-600 hover:underline">{detailData.topic}</button>
                    {detailData.date && <><span className="text-gray-200">•</span><span className="text-gray-400">{detailData.date}</span></>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-xl">
                        <Type size={18} className="text-gray-400" />
                        <button onClick={() => setContentFontSize(s => Math.max(14, s-2))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"><Minus size={16} /></button>
                        <span className="w-8 text-center font-black text-gray-800 select-none">{contentFontSize}</span>
                        <button onClick={() => setContentFontSize(s => Math.min(48, s+2))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"><Plus size={16} /></button>
                    </div>
                    
                    <button 
                        onClick={handleProcessAI}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl hover:bg-black transition-all shadow-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isProcessing ? 'Processing' : 'AI Generate Summary'}
                    </button>

                    {isInMyKhutbahs ? (
                        <button 
                            disabled 
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-8 py-4 rounded-2xl cursor-default shadow-sm font-black uppercase tracking-widest text-xs"
                        >
                            <Check size={18} /> In Library
                        </button>
                    ) : (
                        <button 
                            onClick={handleAddCopy}
                            disabled={addingToMyKhutbahs}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/20 font-black uppercase tracking-widest text-xs disabled:opacity-50"
                        >
                            {addingToMyKhutbahs ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Copy to Library
                        </button>
                    )}
                </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-[2.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 w-full overflow-hidden relative">
                             <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-50/20 to-transparent pointer-events-none"></div>
                            <div 
                                className="prose prose-xl max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-800 prose-p:leading-[1.8] break-words relative z-10"
                                style={{ fontSize: `${contentFontSize}px` }}
                                dangerouslySetInnerHTML={{ __html: detailData.content || '' }}
                            />
                            
                            {(!detailData.content || detailData.content.trim() === '') && (
                                <div className="bg-gray-50 p-20 rounded-3xl text-center text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100">No archival text found.</div>
                            )}
                        </div>
                    </div>

                    {khutbahCards.length > 0 && (
                        <div className="w-full lg:w-96 shrink-0">
                            <h3 className="font-black text-gray-900 mb-6 text-xs uppercase tracking-[0.2em] flex items-center gap-2 border-b border-gray-100 pb-4">
                                <LayoutList size={20} className="text-emerald-600" /> Executive Summary
                            </h3>
                            <div className="space-y-6 sticky top-10">
                                {khutbahCards.map(card => (
                                    <div key={card.id} className="bg-white border border-gray-100 rounded-[1.5rem] p-6 hover:shadow-2xl hover:border-emerald-100 transition-all shadow-sm group">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border shadow-sm ${getSectionColor(card.section_label)}`}>
                                                {card.section_label}
                                            </span>
                                            <span className="text-xs font-black text-gray-200 group-hover:text-emerald-200 transition-colors tracking-widest">#{card.card_number}</span>
                                        </div>
                                        <h4 className="font-black text-gray-900 mb-4 text-lg leading-tight uppercase tracking-tighter">{card.title}</h4>
                                        {card.bullet_points && card.bullet_points.length > 0 && (
                                            <ul className="space-y-3">
                                                {card.bullet_points.map((pt: string, i: number) => (
                                                    <li key={i} className="flex gap-3 items-start text-sm text-gray-500 font-medium leading-relaxed">
                                                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                                                        {pt}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {card.arabic_text && (
                                            <div className="mt-6 pt-5 border-t border-gray-50 text-right">
                                                <p className="font-serif text-xl text-gray-900 leading-[1.8] font-bold" dir="rtl">{card.arabic_text}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full md:pl-20 bg-gray-50 overflow-y-auto w-full"> 
      <div className="page-container py-8 xl:py-12">
        <div className="pb-8 w-full">
          {showHero && view === 'home' && (
             <div className="mb-16 mt-12 animate-in fade-in slide-in-from-top-4 duration-500 text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-gray-900 mb-8 tracking-tight max-w-5xl mx-auto leading-tight uppercase">Master the <span className="text-emerald-600">Minbar</span> with Scholarly Guidance.</h1>
                <div className="max-w-4xl mx-auto relative mb-16 px-4 sm:px-0">
                    <div className="absolute inset-y-0 left-6 sm:left-10 flex items-center pointer-events-none"><Search className="text-gray-300" size={32} /></div>
                    <input 
                        type="text" 
                        placeholder="Search topics, scholars, or themes..." 
                        value={activeFilters.search || ''} 
                        onChange={(e) => setActiveFilters({...activeFilters, search: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleNavigate('list', { ...activeFilters, search: (e.target as HTMLInputElement).value });
                        }}
                        className="w-full pl-16 sm:pl-24 pr-24 sm:pr-40 py-6 sm:py-8 bg-white border border-gray-100 rounded-[2rem] shadow-2xl shadow-emerald-100/50 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-xl sm:text-2xl transition-all placeholder-gray-300 font-bold" 
                    />
                    <div className="absolute right-3 sm:right-5 top-3 sm:top-5 bottom-3 sm:top-5">
                        <button 
                            onClick={() => handleNavigate('list', activeFilters)}
                            className="h-full bg-gray-900 text-white px-6 sm:px-10 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-black transition-colors shadow-lg"
                        >
                            Search
                        </button>
                    </div>
                </div>
             </div>
          )}
          
          {(!showHero || view !== 'home') && (
            <div className="flex justify-between items-end mb-10 w-full">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Filter the archive..." 
                        value={activeFilters.search || ''} 
                        onChange={(e) => setActiveFilters({...activeFilters, search: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleNavigate('list', { ...activeFilters, search: (e.target as HTMLInputElement).value });
                        }}
                        className="pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xl focus:ring-2 focus:ring-emerald-500 outline-none w-full text-lg font-bold placeholder-gray-300" 
                    />
                </div>
            </div>
          )}
        </div>

        {view === 'home' && <HomeView onNavigate={handleNavigate} onSelectKhutbah={handleSelectKhutbah} onImamClick={handleNavigateImam} onNavigateTopic={handleNavigateTopic} />}
        {view === 'list' && (
            <ListView 
                filters={activeFilters} 
                setFilters={setActiveFilters} 
                onSelectKhutbah={handleSelectKhutbah}
                onImamClick={handleNavigateImam}
                onNavigateTopic={handleNavigateTopic}
                onBack={() => setView('home')} 
            />
        )}
        
      </div>
    </div>
  );
};