import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Play, FileText, ChevronLeft, Check, 
  MapPin, Star, Heart, MessageCircle, Send, Loader2, AlertCircle,
  Minus, Plus, Type, ChevronRight, TrendingUp, Grid, User,
  BookOpen, Moon, Sun, Users, Activity, Bookmark, LayoutList, Sparkles,
  Calendar, Shield, CheckCircle
} from 'lucide-react';
import { AUTHORS_DATA } from '../constants';
import { Khutbah, KhutbahPreview, AuthorData, Imam } from '../types';
import { supabase } from '../supabaseClient';
import { useHomepageData, usePaginatedKhutbahs, useInfiniteScroll } from '../hooks';
import { useAuth } from '../contexts/AuthContext';

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
  onImamClick?: (slug: string) => void;
}

const KhutbahCard: React.FC<KhutbahCardProps> = ({ data, onClick, onImamClick }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col relative overflow-hidden">
    
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
    
    <h3 onClick={onClick} className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight cursor-pointer">
        {data.title}
    </h3>
    
    <div className="flex items-center text-sm text-gray-500 mb-auto">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 mr-2">By</span>
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (data.imam_slug && onImamClick) onImamClick(data.imam_slug);
          }}
          className={`font-semibold text-teal-600 hover:underline cursor-pointer bg-teal-50/50 px-2 py-0.5 rounded-md transition-colors`}
        >
          {data.author}
        </span>
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

const TopicCard: React.FC<TopicCardProps> = ({ name, count, onClick }) => {
    const colors = topicColors[name] || defaultColor;
    return (
        <div onClick={onClick} className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all text-center group flex flex-col items-center justify-center h-32`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${colors.bg} ${colors.icon}`}>
                {getTopicIcon(name)}
            </div>
            <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{name}</h4>
            {count !== undefined && <span className="text-[10px] text-gray-400 font-medium">{count} Khutbahs</span>}
        </div>
    );
};

interface ImamCardProps {
  name: string;
  count?: number;
  avatar_url?: string;
  slug?: string;
  onClick: (slug: string) => void;
}

const ImamCard: React.FC<ImamCardProps> = ({ name, count, avatar_url, slug, onClick }) => (
    <div onClick={() => slug && onClick(slug)} className="flex-shrink-0 w-40 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group mr-4">
        <div className={`w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-transparent group-hover:border-emerald-200 transition-colors ${!avatar_url ? getAvatarColor(name) : 'bg-gray-100'}`}>
            {avatar_url ? (
                <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
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

const HomeView = ({ 
    onNavigate, 
    onSelectKhutbah,
    onSelectImam
}: { 
    onNavigate: (view: any, filter?: any) => void; 
    onSelectKhutbah: (k: KhutbahPreview) => void;
    onSelectImam: (slug: string) => void;
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
                    {data.latest.map(k => <KhutbahCard key={k.id} data={k} onClick={() => onSelectKhutbah(k)} onImamClick={onSelectImam} />)}
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
                    {data.trending.map(k => <KhutbahCard key={k.id} data={k} onClick={() => onSelectKhutbah(k)} onImamClick={onSelectImam} />)}
                </div>
            </section>

            {/* Topics Grid */}
            <section className="bg-gray-100 -mx-6 px-6 py-14">
                <div className="w-full">
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
                        <ImamCard key={i.id} name={i.name} count={i.khutbah_count} avatar_url={i.avatar_url} slug={i.slug} onClick={onSelectImam} />
                    )) : (
                        ['Mufti Menk', 'Omar Suleiman', 'Nouman Ali Khan', 'Yasir Qadhi', 'Hamza Yusuf', 'Suhaib Webb'].map(i => (
                            <ImamCard key={i} name={i} onClick={() => {}} />
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
                <div className="flex overflow-x-auto pb-6 -mx-2 px-2 custom-scrollbar gap-6">
                    {data.classics.map(k => (
                        <div key={k.id} className="min-w-[300px] w-[300px]">
                            <KhutbahCard data={k} onClick={() => onSelectKhutbah(k)} onImamClick={onSelectImam} />
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
    onBack,
    onSelectImam
}: { 
    filters: any, 
    setFilters: (f: any) => void, 
    onSelectKhutbah: (k: KhutbahPreview) => void,
    onBack: () => void,
    onSelectImam: (slug: string) => void
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
                        <KhutbahCard data={k} onClick={() => onSelectKhutbah(k)} onImamClick={onSelectImam} />
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

// --- New Imam Profile View Component ---

const ImamProfileView = ({ 
  slug, 
  onBack,
  onSelectKhutbah 
}: { 
  slug: string; 
  onBack: () => void;
  onSelectKhutbah: (k: KhutbahPreview) => void;
}) => {
  const [imam, setImam] = useState<Imam | null>(null);
  const [sermons, setSermons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sermonSearch, setSermonSearch] = useState('');
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    async function loadImamData() {
      setLoading(true);
      try {
        // Fetch Imam profile
        const { data: imamData, error: imamError } = await supabase
          .from('imams')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (imamError) throw imamError;
        console.log("Loading Imam Data:", imamData);
        setImam(imamData);

        // Fetch sermons for this imam
        const { data: sermonData, error: sermonError } = await supabase
          .from('khutbahs')
          .select('*')
          .eq('imam_id', imamData.id)
          .order('created_at', { ascending: false });
        
        if (sermonError) throw sermonError;
        setSermons(sermonData || []);
      } catch (err) {
        console.error("Error loading imam profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadImamData();
  }, [slug]);

  const filteredSermons = useMemo(() => {
    if (!sermonSearch) return sermons;
    return sermons.filter(s => 
      s.title.toLowerCase().includes(sermonSearch.toLowerCase()) ||
      (s.topic && s.topic.toLowerCase().includes(sermonSearch.toLowerCase()))
    );
  }, [sermons, sermonSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-teal-600 mb-4" />
        <p className="text-teal-800 font-bold">LOADING IMAM PROFILE</p>
      </div>
    );
  }

  if (!imam) return <div className="p-8 text-center">Imam profile not found.</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-20 w-full">
      <button onClick={onBack} className="mb-3 flex items-center text-gray-500 hover:text-teal-600 gap-2 font-medium">
        <ChevronLeft size={16} /> Back
      </button>
      
      {/* Header Section - ULTRA COMPACT BANNER */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4 w-full relative overflow-hidden flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
          {/* Profile Image - Smaller */}
          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm ${getAvatarColor(imam.name)}`}>
            {imam.avatar_url ? <img src={imam.avatar_url} alt={imam.name} className="w-full h-full object-cover rounded-2xl" /> : imam.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h1 className="text-xl md:text-2xl font-serif font-bold text-gray-900 truncate">{imam.name}</h1>
              <span className="font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded text-[10px] uppercase whitespace-nowrap border border-teal-100">Verified Scholar</span>
              {imam.city && (
                <span className="flex items-center gap-1 text-gray-400 text-xs font-medium"><MapPin size={10}/> {imam.city}</span>
              )}
            </div>
            
            {/* Bio Snippet - Integrated */}
            <p className="text-gray-500 text-xs md:text-sm truncate max-w-2xl mb-1.5">
              {imam.bio || `Dr. ${imam.name} is a renowned scholar specializing in Islamic thought and community development.`}
            </p>

            {/* Inline Stats Row */}
            <div className="flex items-center gap-5 text-gray-600">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-teal-500" />
                <span className="text-sm font-bold text-gray-900">{imam.khutbah_count || 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Sermons</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-amber-400 fill-current" />
                <span className="text-sm font-bold text-gray-900">{imam.rating_avg || '4.9'}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle size={14} className="text-blue-400" />
                <span className="text-sm font-bold text-gray-900">{imam.review_count || 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Area - Far Right */}
        <div className="flex items-center gap-2 shrink-0">
           <button className="bg-teal-600 text-white px-5 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-teal-700 transition-all">Follow</button>
           <button className="bg-white border border-gray-200 text-gray-700 px-5 py-1.5 rounded-full text-xs font-bold hover:bg-gray-50 transition-all">Share</button>
           <button 
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="flex items-center gap-1 text-teal-600 font-bold text-xs hover:underline ml-2"
            >
              {showFullDetails ? 'Hide Details' : 'View Full Details'} <ChevronRight size={14} className={showFullDetails ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>
        </div>
      </div>

      {/* Detailed View Collapsible Section */}
      {showFullDetails && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><Calendar size={16} className="text-teal-500" /> Booking Info</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between border-b border-gray-50 pb-2"><span>Travel Radius</span><span className="font-bold text-gray-900">50 Miles</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-2"><span>Min. Notice</span><span className="font-bold text-gray-900">2 Weeks</span></div>
                <div className="flex justify-between border-b border-gray-50 pb-2"><span>Honorarium</span><span className="font-bold text-gray-900">£150-300</span></div>
              </div>
              <button className="w-full py-2 bg-teal-600 text-white rounded-lg font-bold text-xs shadow-md">Request Booking</button>
           </div>
           <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><Shield size={16} className="text-teal-500" /> Verification</h3>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-teal-500"/> Identity Verified</li>
                <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-teal-500"/> Background Check</li>
                <li className="flex items-center gap-2 text-xs text-gray-600"><CheckCircle size={14} className="text-teal-500"/> References Checked</li>
              </ul>
           </div>
           <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><MessageCircle size={16} className="text-teal-500" /> Recent Reviews</h3>
              <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                <div className="p-2.5 bg-gray-50 rounded-xl">
                  <div className="flex justify-between mb-0.5"><span className="text-[10px] font-bold">Admin A.</span><div className="flex text-amber-400"><Star size={8} fill="currentColor"/><Star size={8} fill="currentColor"/><Star size={8} fill="currentColor"/></div></div>
                  <p className="text-[10px] text-gray-500 italic">"Punctual and very engaging with the youth."</p>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Sermon List Area - IMMEDIATELY VISIBLE AT TOP */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-900">Recorded Sermons</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter sermons..." 
              value={sermonSearch}
              onChange={(e) => setSermonSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all text-xs shadow-sm"
            />
          </div>
        </div>

        {filteredSermons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSermons.map(s => (
              <KhutbahCard 
                key={s.id} 
                data={{
                  id: s.id,
                  title: s.title,
                  author: imam.name,
                  likes: s.likes_count || 0,
                  topic: s.topic,
                  labels: s.tags,
                  published_at: s.created_at,
                  rating: s.rating
                }} 
                onClick={() => onSelectKhutbah({ id: s.id } as any)} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 p-12 text-center text-gray-400">
             <FileText size={40} className="mx-auto mb-2 opacity-20" />
             <p className="font-bold">No sermons found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const KhutbahLibrary: React.FC<KhutbahLibraryProps> = ({ user, showHero, onStartLive, onAddToMyKhutbahs }) => {
  const [view, setView] = useState<'home' | 'list' | 'detail' | 'imam-profile'>('home');
  const [activeFilters, setActiveFilters] = useState<{ topic?: string, imam?: string, sort?: string, search?: string }>({});
  const [selectedKhutbahId, setSelectedKhutbahId] = useState<string | null>(null);
  const [selectedImamSlug, setSelectedImamSlug] = useState<string | null>(null);
  
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

  const handleNavigate = (newView: any, filters: any = {}) => {
      setActiveFilters(filters);
      setView(newView);
  };

  const handleSelectImam = (slug: string) => {
    setSelectedImamSlug(slug);
    setView('imam-profile');
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

              if (cardsData) setKhutbahCards(cardsData);

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

  if (view === 'imam-profile' && selectedImamSlug) {
      return (
        <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="page-container py-8 xl:py-12">
                   <ImamProfileView 
                      slug={selectedImamSlug} 
                      onBack={() => setView('home')} 
                      onSelectKhutbah={handleSelectKhutbah}
                   />
                </div>
            </div>
        </div>
      );
  }

  if (view === 'detail') {
      if (detailLoading || !detailData) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-emerald-600"/></div>;
      
      return (
        <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto">
            <div className="page-container py-8 xl:py-12">
                <button onClick={() => setView('home')} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium text-lg"><ChevronLeft size={24} /> Back to Library</button>
                <div className="flex flex-col xl:flex-row justify-between items-start mb-10 gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-gray-900 mb-4">{detailData.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-lg text-gray-600">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">{detailData.author}</span>
                    <span>•</span>
                    <span>{detailData.topic}</span>
                    {detailData.date && <><span>•</span><span>{detailData.date}</span></>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                        <Type size={18} className="text-gray-400" />
                        <button onClick={() => setContentFontSize(s => Math.max(14, s-2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Minus size={16} /></button>
                        <span className="w-8 text-center font-bold text-gray-700 select-none">{contentFontSize}</span>
                        <button onClick={() => setContentFontSize(s => Math.min(48, s+2))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Plus size={16} /></button>
                    </div>
                    
                    <button 
                        onClick={handleProcessAI}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-full hover:opacity-90 transition-all shadow-lg shadow-violet-200 font-bold disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                        {isProcessing ? 'Processing...' : 'Process with AI'}
                    </button>

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
                
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100 w-full overflow-hidden">
                            <div 
                                className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed break-words"
                                style={{ fontSize: `${contentFontSize}px` }}
                                dangerouslySetInnerHTML={{ __html: detailData.content || '' }}
                            />
                            
                            {(!detailData.content || detailData.content.trim() === '') && (
                                <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">No text content available for this khutbah.</div>
                            )}
                        </div>
                    </div>

                    {khutbahCards.length > 0 && (
                        <div className="w-full lg:w-96 shrink-0">
                            <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                                <LayoutList size={20} className="text-emerald-600" /> Summary Cards
                            </h3>
                            <div className="space-y-4 sticky top-8">
                                {khutbahCards.map(card => (
                                    <div key={card.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-200 transition-colors shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${getSectionColor(card.section_label)}`}>
                                                {card.section_label}
                                            </span>
                                            <span className="text-xs font-bold text-gray-300">#{card.card_number}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-3 text-lg leading-tight">{card.title}</h4>
                                        {card.bullet_points && card.bullet_points.length > 0 && (
                                            <ul className="space-y-2">
                                                {card.bullet_points.map((pt: string, i: number) => (
                                                    <li key={i} className="flex gap-2 items-start text-sm text-gray-600 leading-snug">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                                        {pt}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {card.arabic_text && (
                                            <div className="mt-4 pt-3 border-t border-gray-50 text-right">
                                                <p className="font-serif text-lg text-gray-800 leading-relaxed" dir="rtl">{card.arabic_text}</p>
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-gray-900 mb-8 tracking-tight max-w-5xl mx-auto leading-tight">Find a khutbah in <span className="text-emerald-600">minutes</span>, not days.</h1>
                <div className="max-w-4xl mx-auto relative mb-16 px-4 sm:px-0">
                    <div className="absolute inset-y-0 left-6 sm:left-10 flex items-center pointer-events-none"><Search className="text-gray-400" size={32} /></div>
                    <input 
                        type="text" 
                        placeholder="Topic, imam, or keyword..." 
                        value={activeFilters.search || ''} 
                        onChange={(e) => setActiveFilters({...activeFilters, search: e.target.value})}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') handleNavigate('list', { ...activeFilters, search: (e.target as HTMLInputElement).value });
                        }}
                        className="w-full pl-16 sm:pl-24 pr-24 sm:pr-40 py-6 sm:py-8 bg-white border border-gray-200 rounded-full shadow-2xl shadow-emerald-50/50 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-xl sm:text-2xl transition-all placeholder-gray-300" 
                    />
                    <div className="absolute right-3 sm:right-5 top-3 sm:top-5 bottom-3 sm:top-5">
                        <button 
                            onClick={() => handleNavigate('list', activeFilters)}
                            className="h-full bg-gray-900 text-white px-6 sm:px-10 rounded-full font-bold text-base sm:text-lg hover:bg-gray-800 transition-colors"
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

        {view === 'home' && <HomeView onNavigate={handleNavigate} onSelectKhutbah={handleSelectKhutbah} onSelectImam={handleSelectImam} />}
        {view === 'list' && (
            <ListView 
                filters={activeFilters} 
                setFilters={setActiveFilters} 
                onSelectKhutbah={handleSelectKhutbah}
                onBack={() => setView('home')} 
                onSelectImam={handleSelectImam}
            />
        )}
        
      </div>
    </div>
  );
};