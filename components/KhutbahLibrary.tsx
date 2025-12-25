import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Play, FileText, ChevronLeft, Check, 
  MapPin, Star, Heart, MessageCircle, Send, Loader2, AlertCircle,
  Minus, Plus, Type, ChevronRight, TrendingUp, Grid, User,
  BookOpen, Moon, Sun, Users, Activity, Bookmark, LayoutList, Sparkles,
  Calendar, Shield, CheckCircle, ArrowLeft, Filter, ArrowRight, Bookmark as BookmarkIcon,
  Eye, CheckCircle2
} from 'lucide-react';
import { AUTHORS_DATA } from '../constants';
import { Khutbah, KhutbahPreview, AuthorData, Imam, Topic } from '../types';
import { supabase } from '../supabaseClient';
import { useHomepageData, usePaginatedKhutbahs, useInfiniteScroll } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { KhutbahComments } from './KhutbahComments';

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
  onAuthorClick?: (authorName: string) => void;
  onTagClick?: (slug: string) => void;
  onCommentClick?: (e: React.MouseEvent, data: KhutbahPreview) => void;
  onBookmark?: (e: React.MouseEvent | null, id: string) => void;
  onLike?: (e: React.MouseEvent | null, id: string) => void;
  isBookmarked?: boolean;
  isLiked?: boolean;
}

const KhutbahCard: React.FC<KhutbahCardProps> = ({ 
  data, onClick, onAuthorClick, onTagClick, onCommentClick, onBookmark, onLike, isBookmarked, isLiked 
}) => {
  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAuthorClick) {
      onAuthorClick(data.author);
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(e, data.id);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(e, data.id);
  };

  const tagHoverClasses = "hover:bg-gray-900 hover:text-white hover:underline transition-all duration-200";

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 h-full flex flex-col relative overflow-hidden cursor-pointer"
    >
      
      {/* Top Left Bookmark */}
      <button 
        onClick={handleBookmarkClick}
        className={`absolute top-4 left-4 z-10 p-2 rounded-full transition-all ${isBookmarked ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-gray-50/50 text-gray-400 hover:text-amber-500 hover:bg-white'}`}
      >
        <BookmarkIcon size={18} fill={isBookmarked ? "currentColor" : "none"} />
      </button>

      <div className="absolute top-6 right-6">
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-100">
              <Star size={12} fill="currentColor" /> {data.rating || '4.8'}
          </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 mt-6 pr-16">
        {data.labels && data.labels.slice(0, 3).map((label, idx) => (
            <span 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(label.toLowerCase().trim().replace(/\s+/g, '-'));
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${tagHoverClasses} ${getTagStyles(label)}`}
            >
                {label}
            </span>
        ))}
        {(!data.labels || data.labels.length === 0) && data.topic && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(data.topic?.toLowerCase().trim().replace(/\s+/g, '-') || '');
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${tagHoverClasses} ${getTagStyles(data.topic)}`}
            >
                {data.topic}
            </span>
        )}
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight">
          {data.title}
      </h3>
      
      <div className="flex items-center text-sm text-gray-500 mb-auto">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400 mr-2">By</span>
          <span 
            onClick={handleAuthorClick}
            className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
          >
            {data.author}
          </span>
      </div>
      
      <div className="pt-5 border-t border-gray-50 mt-5 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <button 
                onClick={handleLikeClick}
                className={`flex items-center gap-1.5 text-xs font-medium transition-all active:scale-125 ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
             >
                 <Heart size={14} className={isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400 group-hover:text-red-500 transition-colors'} /> 
                 {data.likes}
             </button>
             <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (onCommentClick) onCommentClick(e, data);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-500 transition-colors cursor-pointer"
             >
                 <MessageCircle size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> 
                 {data.comments_count || 0}
             </button>
             <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                 <Eye size={14} /> 
                 {data.view_count || 0}
             </span>
         </div>
         <span className="text-xs text-gray-400">{data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Recently'}</span>
      </div>
    </div>
  );
};

interface TopicCardProps {
  name: string;
  count?: number;
  slug: string;
  onClick: (slug: string) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ name, count, slug, onClick }) => (
    <div onClick={() => onClick(slug)} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all text-center group flex flex-col items-center justify-center h-32">
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
    <div onClick={onClick} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group flex flex-col items-center h-full">
        <div className="w-20 h-20 bg-gray-100 rounded-full mb-3 overflow-hidden border-2 border-transparent group-hover:border-emerald-200 transition-colors shrink-0">
            {avatar_url ? (
                <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className={`w-full h-full flex items-center justify-center text-2xl font-bold ${getAvatarColor(name)}`}>
                    {name.charAt(0)}
                </div>
            )}
        </div>
        <div className="text-center w-full min-w-0">
            <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{name}</h4>
            {count !== undefined && <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full whitespace-nowrap">{count} Khutbahs</span>}
        </div>
    </div>
);

// --- New Imams List View Component ---

const ImamsListView = ({ 
  onBack,
  onSelectImam
}: { 
  onBack: () => void;
  onSelectImam: (slug: string) => void;
}) => {
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchAllImams() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('imams')
          .select('*')
          .order('khutbah_count', { ascending: false });
        
        if (data) setImams(data);
      } catch (err) {
        console.error("Error fetching imams list:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAllImams();
  }, []);

  const filteredImams = useMemo(() => {
    if (!searchQuery.trim()) return imams;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return imams.filter(i => i.name.toLowerCase().includes(lowerQuery));
  }, [imams, searchQuery]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 size={48} className="animate-spin text-emerald-600 mb-4" />
      <p className="text-emerald-800 font-bold uppercase tracking-widest">Finding Scholars...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-32">
      <button onClick={onBack} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium">
        <ArrowLeft size={18} /> Back to Library
      </button>

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-4">
            Our <span className="text-emerald-600">Imams</span>
          </h1>
          <p className="text-gray-500 text-xl">Browse our directory of verified scholars and speakers.</p>
        </div>
        
        <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder={`Search imams by name...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-lg transition-all"
            />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {filteredImams.map(imam => (
          <div key={imam.id} className="h-full">
            <ImamCard 
              name={imam.name} 
              count={imam.khutbah_count} 
              avatar_url={imam.avatar_url} 
              onClick={() => onSelectImam(imam.slug)} 
            />
          </div>
        ))}
      </div>

      {filteredImams.length === 0 && (
        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-20 text-center">
           <User size={64} className="mx-auto mb-4 text-gray-200" />
           <p className="text-gray-400 font-bold text-xl">No scholars found matching your search.</p>
        </div>
      )}
    </div>
  );
};

// --- Topic Page View Component ---

const TopicPageView = ({ 
  slug, 
  onBack,
  onSelectKhutbah,
  onSelectImam,
  onTagClick,
  onCommentClick,
  onLike,
  userLikes
}: { 
  slug: string; 
  onBack: () => void;
  onSelectKhutbah: (k: KhutbahPreview) => void;
  onSelectImam: (slug: string) => void;
  onTagClick: (slug: string) => void;
  onCommentClick: (e: React.MouseEvent, k: KhutbahPreview) => void;
  onLike?: (e: React.MouseEvent | null, id: string) => void;
  userLikes?: Set<string>;
}) => {
  const [tagInfo, setTagInfo] = useState<any>(null);
  const [allKhutbahs, setAllKhutbahs] = useState<KhutbahPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadTopicData() {
      setLoading(true);
      try {
        const { data: tagDataArray } = await supabase.from('tags').select('id, name, slug').ilike('slug', slug).limit(1);
        const tagData = tagDataArray?.[0];
        if (!tagData) {
            setTagInfo({ name: slug, slug: slug });
            setAllKhutbahs([]);
            setLoading(false);
            return;
        }
        setTagInfo(tagData);

        const { data: khutbahData } = await supabase
          .from('khutbahs')
          .select(`id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating, imams ( slug ), khutbah_tags!inner ( tag_id )`)
          .eq('khutbah_tags.tag_id', tagData.id)
          .order('created_at', { ascending: false });

        setAllKhutbahs((khutbahData || []).map((item: any) => ({
            id: item.id, title: item.title, author: item.author, topic: item.topic, labels: item.tags,
            likes: item.likes_count, comments_count: item.comments_count, view_count: item.view_count || 0,
            published_at: item.created_at, rating: typeof item.rating === 'number' ? item.rating : parseFloat(item.rating || '4.8'),
            imam_slug: item.imams?.slug
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTopicData();
  }, [slug]);

  const handleAuthorClick = (authorName: string) => {
    onBack();
  };

  const filteredKhutbahs = useMemo(() => {
    if (!searchQuery.trim()) return allKhutbahs;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return allKhutbahs.filter(k => k.title.toLowerCase().includes(lowerQuery) || k.author.toLowerCase().includes(lowerQuery));
  }, [allKhutbahs, searchQuery]);

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 size={48} className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-32">
      <button onClick={onBack} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium"><ArrowLeft size={18} /> Back</button>
      <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-12"><span className="text-emerald-600">Topic:</span> {tagInfo?.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredKhutbahs.map(k => (
          <KhutbahCard 
            key={k.id} data={k} onClick={() => onSelectKhutbah(k)} 
            onAuthorClick={() => handleAuthorClick(k.author)} onTagClick={onTagClick} 
            onCommentClick={onCommentClick} onLike={onLike} isLiked={userLikes?.has(k.id)} 
          />
        ))}
      </div>
    </div>
  );
};

// --- Detailed View Component ---

const ImamDetailedView = ({ 
  imam, 
  onBack 
}: { 
  imam: Imam; 
  onBack: () => void;
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-32 w-full">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-teal-600 gap-2 font-medium">
        <ArrowLeft size={18} /> Back to Profile
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 min-w-0">
          <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User size={24} className="text-teal-500" /> About {imam.name}
            </h2>
            <div className="prose prose-teal max-w-none text-gray-600 leading-relaxed space-y-4">
              <p className="whitespace-pre-wrap leading-relaxed">{imam.bio || 'No biography available.'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- Imam Profile View Component ---

const ImamProfileView = ({ 
  slug, 
  onBack,
  onSelectKhutbah,
  onNavigateDetails,
  onTagClick,
  onCommentClick,
  onLike,
  userLikes
}: { 
  slug: string; 
  onBack: () => void; 
  onSelectKhutbah: (k: KhutbahPreview) => void;
  onNavigateDetails: (imam: Imam) => void;
  onTagClick: (slug: string) => void;
  onCommentClick: (e: React.MouseEvent, k: KhutbahPreview) => void;
  onLike?: (e: React.MouseEvent | null, id: string) => void;
  userLikes?: Set<string>;
}) => {
  const [imam, setImam] = useState<Imam | null>(null);
  const [sermons, setSermons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImamData() {
      setLoading(true);
      try {
        const { data: imamDataArray } = await supabase.from('imams').select('*').eq('slug', slug);
        const imamData = imamDataArray?.[0];
        if (!imamData) throw new Error("Imam profile not found");
        setImam(imamData);

        const { data: sermonData } = await supabase.from('khutbahs').select(`id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating, imams ( slug )`).eq('imam_id', imamData.id).order('created_at', { ascending: false });
        setSermons(sermonData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadImamData();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 size={48} className="animate-spin text-teal-600" /></div>;
  if (!imam) return null;

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-20 w-full">
      <button onClick={onBack} className="mb-3 flex items-center text-gray-500 hover:text-teal-600 gap-2 font-medium">
        <ChevronLeft size={16} /> Back
      </button>
      
      {/* Restored Header: Name, Bio, and Stats */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 mb-10 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-bold shrink-0 shadow-lg ${getAvatarColor(imam.name)}`}>
                  {imam.avatar_url ? <img src={imam.avatar_url} alt={imam.name} className="w-full h-full object-cover rounded-3xl" /> : imam.name.charAt(0)}
              </div>
              <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-serif font-bold text-gray-900">{imam.name}</h1>
                  <p className="text-gray-600 mt-2 leading-relaxed max-w-3xl line-clamp-3">
                      {imam.bio || 'Verified scholarly contributor.'}
                  </p>
                  
                  <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                      <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900">{imam.khutbah_count || 0}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Khutbahs</span>
                      </div>
                      <div className="w-px h-10 bg-gray-100"></div>
                      <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900">{imam.rating_avg || '4.9'}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Rating</span>
                      </div>
                      <div className="w-px h-10 bg-gray-100"></div>
                      <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900">{imam.review_count || '25'}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reviews</span>
                      </div>
                  </div>

                  <button 
                    onClick={() => onNavigateDetails(imam)} 
                    className="text-emerald-600 font-bold hover:underline mt-6 flex items-center gap-2"
                  >
                    View Full Scholarly Profile <ChevronRight size={16} />
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sermons.map(s => (
          <KhutbahCard 
            key={s.id} data={{ id: s.id, title: s.title, author: imam.name, likes: s.likes_count || 0, topic: s.topic, labels: s.tags, view_count: s.view_count || 0, published_at: s.created_at, rating: s.rating, imam_slug: s.imams?.slug, comments_count: s.comments_count }} 
            onClick={() => onSelectKhutbah({ id: s.id } as any)} 
            onTagClick={onTagClick}
            onCommentClick={onCommentClick}
            onLike={onLike}
            isLiked={userLikes?.has(s.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface HomeViewProps {
    data: any;
    isLoading: boolean;
    onNavigate: (view: any, filter?: any) => void; 
    onSelectKhutbah: (k: KhutbahPreview) => void;
    onSelectImam: (slug: string) => void;
    onTagClick: (slug: string) => void;
    onCommentClick: (e: React.MouseEvent, k: KhutbahPreview) => void;
    onBookmark: (e: React.MouseEvent | null, id: string) => void;
    onLike: (e: React.MouseEvent | null, id: string) => void;
    userBookmarks: Set<string>;
    userLikes: Set<string>;
}

const HomeView: React.FC<HomeViewProps> = ({ 
    data, 
    isLoading, 
    onNavigate, 
    onSelectKhutbah,
    onSelectImam,
    onTagClick,
    onCommentClick,
    onBookmark,
    onLike,
    userBookmarks,
    userLikes
}) => {
    const handleAuthorClick = (authorName: string) => {
        onNavigate('list', { imam: authorName });
    };

    if (isLoading || !data) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 size={32} className="animate-spin text-emerald-600"/>
            </div>
        );
    }

    return (
        <div className="space-y-16 pb-20 animate-in fade-in duration-500">
            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Latest Khutbahs</h2>
                        <p className="text-gray-500 text-sm mt-1">Freshly added to the library</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'latest' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.latest.map((k: KhutbahPreview) => (
                        <KhutbahCard 
                            key={k.id} data={k} onClick={() => onSelectKhutbah(k)} 
                            onAuthorClick={handleAuthorClick} onTagClick={onTagClick} onCommentClick={onCommentClick}
                            onBookmark={(e) => onBookmark(e, k.id)} onLike={(e) => onLike(e, k.id)}
                            isBookmarked={userBookmarks.has(k.id)}
                            isLiked={userLikes.has(k.id)}
                        />
                    ))}
                </div>
            </section>

            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={24} className="text-emerald-500"/> Trending</h2>
                        <p className="text-gray-500 text-sm mt-1">Most viewed this month</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'trending' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.trending.map((k: KhutbahPreview) => (
                        <KhutbahCard 
                            key={k.id} data={k} onClick={() => onSelectKhutbah(k)} 
                            onAuthorClick={handleAuthorClick} onTagClick={onTagClick} onCommentClick={onCommentClick}
                            onBookmark={(e) => onBookmark(e, k.id)} onLike={(e) => onLike(e, k.id)}
                            isBookmarked={userBookmarks.has(k.id)}
                            isLiked={userLikes.has(k.id)}
                        />
                    ))}
                </div>
            </section>

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
                        {data.topics.map((t: Topic) => (
                            <TopicCard key={t.id} name={t.name} count={t.khutbah_count} slug={t.slug} onClick={onTagClick} />
                        ))}
                    </div>
                </div>
            </section>

            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Popular Imams</h2>
                        <p className="text-gray-500 text-sm mt-1">Learned scholars and speakers</p>
                    </div>
                    <button onClick={() => onNavigate('imams-list')} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">View All <ChevronRight size={14}/></button>
                </div>
                <div className="flex overflow-x-auto pb-6 -mx-2 px-2 custom-scrollbar">
                    {data.imams.map((i: Imam) => (
                        <div key={i.id} className="flex-shrink-0 w-40 mr-4">
                           <ImamCard name={i.name} count={i.khutbah_count} avatar_url={i.avatar_url} onClick={() => onSelectImam(i.slug)} />
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bookmark size={24} className="text-amber-500"/> Most Used</h2>
                        <p className="text-gray-500 text-sm mt-1">Timeless sermons often repeated</p>
                    </div>
                    <button onClick={() => onNavigate('list', { sort: 'trending' })} className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1">See All <ChevronRight size={14}/></button>
                </div>
                <div className="flex overflow-x-auto pb-6 -mx-4 px-4 custom-scrollbar gap-6">
                    {data.classics.map((k: KhutbahPreview) => (
                        <div key={k.id} className="min-w-[300px] w-[300px]">
                            <KhutbahCard 
                                data={k} onClick={() => onSelectKhutbah(k)} 
                                onAuthorClick={handleAuthorClick} onTagClick={onTagClick} onCommentClick={onCommentClick}
                                onBookmark={(e) => onBookmark(e, k.id)} onLike={(e) => onLike(e, k.id)}
                                isBookmarked={userBookmarks.has(k.id)}
                                isLiked={userLikes.has(k.id)}
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

interface ListViewProps {
    data: KhutbahPreview[];
    count: number;
    hasMore: boolean;
    isLoading: boolean;
    loadMore: () => void;
    filters: any;
    setFilters: (f: any) => void;
    onSelectKhutbah: (k: KhutbahPreview) => void;
    onBack: () => void;
    onSelectImam: (slug: string) => void;
    onTagClick: (slug: string) => void;
    onCommentClick: (e: React.MouseEvent, k: KhutbahPreview) => void;
    onBookmark: (e: React.MouseEvent | null, id: string) => void;
    onLike: (e: React.MouseEvent | null, id: string) => void;
    userBookmarks: Set<string>;
    userLikes: Set<string>;
}

const ListView: React.FC<ListViewProps> = ({ 
    data, count, hasMore, isLoading, loadMore, filters, 
    setFilters, onSelectKhutbah, onBack, onSelectImam, 
    onTagClick, onCommentClick, onBookmark, onLike, userBookmarks, userLikes
}) => {
    const lastElementRef = useInfiniteScroll(loadMore, hasMore, isLoading);
    const handleAuthorClick = (authorName: string) => { setFilters({ ...filters, imam: authorName }); };
    return (
        <div className="pt-4">
            <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium"><ChevronLeft size={18} /> Back to Home</button>
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">{filters.topic ? `${filters.topic} Khutbahs` : filters.imam ? `Khutbahs by ${filters.imam}` : filters.search ? `Search: "${filters.search}"` : 'All Khutbahs'}</h2>
                    <p className="text-gray-500 mt-1">{count} results found</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Refine search..." value={filters.search || ''} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm shadow-sm transition-all" />
                    </div>
                    <select value={filters.sort || 'latest'} onChange={(e) => setFilters({...filters, sort: e.target.value})} className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-sm font-medium shadow-sm"><option value="latest">Latest</option><option value="trending">Trending</option></select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {data.map((k, index) => (
                    <div key={k.id} ref={index === data.length - 1 ? lastElementRef : null}>
                        <KhutbahCard data={k} onClick={() => onSelectKhutbah(k)} onAuthorClick={handleAuthorClick} onTagClick={onTagClick} onCommentClick={onCommentClick} onBookmark={(e) => onBookmark(e, k.id)} onLike={(e) => onLike(e, k.id)} isBookmarked={userBookmarks.has(k.id)} isLiked={userLikes.has(k.id)} />
                    </div>
                ))}
            </div>
            {isLoading && <div className="py-10 text-center flex justify-center"><Loader2 size={32} className="animate-spin text-emerald-600"/></div>}
            {!isLoading && data.length === 0 && <div className="text-center py-20 bg-gray-100 rounded-2xl"><Search size={48} className="mx-auto text-gray-300 mb-4"/><h3 className="text-xl font-bold text-gray-600">No khutbahs found</h3><p className="text-gray-400">Try adjusting your filters</p></div>}
        </div>
    );
};

export const KhutbahLibrary: React.FC<KhutbahLibraryProps> = ({ user, showHero, onStartLive, onAddToMyKhutbahs }) => {
  const [view, setView] = useState<'home' | 'list' | 'detail' | 'imam-profile' | 'imam-details' | 'topic-page' | 'imams-list'>('home');
  const [activeFilters, setActiveFilters] = useState<{ topic?: string, imam?: string, sort?: string, search?: string }>({});
  const [selectedKhutbahId, setSelectedKhutbahId] = useState<string | null>(null);
  const [selectedImamSlug, setSelectedImamSlug] = useState<string | null>(null);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);
  const [activeImam, setActiveImam] = useState<Imam | null>(null);
  
  const [detailData, setDetailData] = useState<Khutbah | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contentFontSize, setContentFontSize] = useState(18);
  const [isInMyKhutbahs, setIsInMyKhutbahs] = useState(false);
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [addingToMyKhutbahs, setAddingToMyKhutbahs] = useState(false);
  const [khutbahCards, setKhutbahCards] = useState<any[]>([]);
  
  const { user: authUser, requireAuth } = useAuth(); 

  const { data: homeData, isLoading: homeLoading, setData: setHomeData, refresh: refreshHome } = useHomepageData();
  const { data: listData, count, hasMore, isLoading: listLoading, loadMore, refresh: refreshList, setData: setListData } = usePaginatedKhutbahs(activeFilters);

  useEffect(() => {
    const fetchUserInteractions = async () => {
        const currentUser = authUser || user;
        if (!currentUser) return;
        const [bookmarksRes, likesRes] = await Promise.all([
          supabase.from('user_bookmarks').select('source_khutbah_id').eq('user_id', currentUser.id),
          supabase.from('khutbah_likes').select('khutbah_id').eq('user_id', currentUser.id)
        ]);
        if (bookmarksRes.data) setUserBookmarks(new Set(bookmarksRes.data.map(b => b.source_khutbah_id)));
        if (likesRes.data) setUserLikes(new Set(likesRes.data.map(l => l.khutbah_id)));
    };
    fetchUserInteractions();
  }, [authUser, user]);

  const handleNavigate = (newView: any, filters: any = {}) => {
      const sanitizedFilters = { ...filters };
      if (sanitizedFilters.search) sanitizedFilters.search = sanitizedFilters.search.trim();
      setActiveFilters(sanitizedFilters);
      setView(newView);
  };

  const handleSelectImam = (slug: string) => { setSelectedImamSlug(slug); setView('imam-profile'); };
  const handleSelectTopic = (slug: string) => { setSelectedTopicSlug(slug); setView('topic-page'); };
  const handleNavigateImamDetails = (imam: Imam) => { setActiveImam(imam); setView('imam-details'); };

  const incrementViews = async (khutbahId: string) => {
    try { 
        await supabase.rpc('increment_khutbah_views', { row_id: khutbahId }); 
        
        // Manual local state sync for view counts across views
        const updateViews = (k: any) => k.id === khutbahId ? { ...k, view_count: (k.view_count || 0) + 1 } : k;
        
        if (homeData) {
            setHomeData({
                ...homeData,
                latest: homeData.latest.map(updateViews),
                trending: homeData.trending.map(updateViews),
                classics: homeData.classics.map(updateViews),
                featured: homeData.featured.map(updateViews)
            });
        }
        setListData(prev => prev.map(updateViews));
        
    } catch (err) { console.error("View tracking error:", err); }
  };

  const handleLike = async (e: React.MouseEvent | null, khutbahId: string) => {
    e?.stopPropagation();
    const currentUser = authUser || user;
    if (!currentUser) {
        requireAuth('Sign in to like this sermon.', () => {});
        return;
    }

    try {
        const { data, error } = await supabase.rpc('toggle_khutbah_like', { 
            k_id: khutbahId,
            u_id: currentUser.id 
        });

        if (error) {
            console.error("Toggle like error:", error);
            throw error;
        }

        // Update local detail state if viewing this khutbah
        if (data && data.length > 0) {
            const { new_count, is_liked } = data[0];

            // Update userLikes set so the heart toggles filled/outline
            setUserLikes(prev => {
                const next = new Set(prev);
                if (is_liked) next.add(khutbahId);
                else next.delete(khutbahId);
                return next;
            });

            // Update detail view count
            if (detailData && detailData.id === khutbahId) {
                setDetailData({ ...detailData, likes: new_count });
            }
            
            // Sync counts across other views (Home and List)
            const syncCount = (k: any) => k.id === khutbahId ? { ...k, likes: new_count } : k;
            if (homeData) {
                setHomeData({
                    ...homeData,
                    latest: homeData.latest.map(syncCount),
                    trending: homeData.trending.map(syncCount),
                    classics: homeData.classics.map(syncCount),
                    featured: homeData.featured.map(syncCount)
                });
            }
            setListData(prev => prev.map(syncCount));
        }
    } catch (err) {
        console.error("Like error:", err);
    }
  };

  const handleBookmark = async (e: React.MouseEvent | null, khutbahId: string) => {
    e?.stopPropagation();
    const currentUser = authUser || user;
    if (!currentUser) {
        requireAuth('Sign in to bookmark this sermon.', () => {});
        return;
    }
    
    try {
        if (userBookmarks.has(khutbahId)) {
            await supabase.from('user_bookmarks').delete().eq('user_id', currentUser.id).eq('source_khutbah_id', khutbahId);
            setUserBookmarks(prev => { const next = new Set(prev); next.delete(khutbahId); return next; });
        } else {
            await supabase.from('user_bookmarks').insert({ user_id: currentUser.id, source_khutbah_id: khutbahId });
            setUserBookmarks(prev => { const next = new Set(prev); next.add(khutbahId); return next; });
        }
    } catch (err) { console.error("Bookmark error:", err); }
  };

  const handleSelectKhutbah = async (preview: KhutbahPreview, scrollToComments = false) => {
      await incrementViews(preview.id);
      setSelectedKhutbahId(preview.id);
      setView('detail');
      setDetailLoading(true);
      setIsInMyKhutbahs(false);
      setKhutbahCards([]);
      try {
          const { data } = await supabase.from('khutbahs').select('*').eq('id', preview.id).single();
          if (data) {
              setDetailData({ id: data.id, title: data.title, author: data.author, topic: data.topic, labels: data.tags, likes: data.likes_count, content: data.extracted_text || data.content, style: data.topic, date: data.created_at ? new Date(data.created_at).toLocaleDateString() : undefined, file_url: data.file_url, comments: [], view_count: (data.view_count || 0) + 1 });
              const { data: cardsData } = await supabase.from('khutbah_cards').select('*').eq('khutbah_id', data.id).order('card_number', { ascending: true });
              if (cardsData) setKhutbahCards(cardsData);
              const currentUser = authUser || user;
              if (currentUser) {
                  const { data: userData } = await supabase.from('user_khutbahs').select('id').eq('user_id', currentUser.id).eq('source_khutbah_id', data.id).maybeSingle();
                  if (userData) setIsInMyKhutbahs(true);
              }

              // Implementation of "Scroll to Comments"
              if (scrollToComments) {
                setTimeout(() => {
                    const commentsSection = document.getElementById('comments-section');
                    if (commentsSection) {
                        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 200);
              }
          }
      } catch (err) { console.error("Error fetching detail:", err); } finally { setDetailLoading(false); }
  };

  const handleCommentClick = (e: React.MouseEvent, preview: KhutbahPreview) => {
    handleSelectKhutbah(preview, true);
  };

  const handleAddCopy = async () => {
    const currentUser = authUser || user;
    if (!currentUser) { requireAuth('Sign in to save this khutbah to your personal library.', () => {}); return; }
    if (!detailData) return;
    setAddingToMyKhutbahs(true);
    try {
        const userId = currentUser.id;
        const { data: userKhutbah, error: headerError } = await supabase.from('user_khutbahs').insert({ user_id: userId, source_khutbah_id: detailData.id, title: detailData.title, author: detailData.author, content: detailData.content || '', }).select().single();
        if (headerError) throw headerError;
        if (khutbahCards && khutbahCards.length > 0) {
            const userCards = khutbahCards.map(c => ({ user_khutbah_id: userKhutbah.id, card_number: c.card_number, section_label: c.section_label, title: c.title, bullet_points: c.bullet_points, arabic_text: c.arabic_text, key_quote: c.key_quote, quote_source: c.quote_source, transition_text: c.transition_text, time_estimate_seconds: c.time_estimate_seconds, notes: c.notes }));
            const { error: cardsError } = await supabase.from('user_khutbah_cards').insert(userCards);
            if (cardsError) throw cardsError;
        }
        setIsInMyKhutbahs(true);
        if (onAddToMyKhutbahs) onAddToMyKhutbahs(userKhutbah.id);
    } catch (err: any) { console.error("Error copying khutbah:", err); alert(`Failed to add to My Khutbahs: ${err.message}`); } finally { setAddingToMyKhutbahs(false); }
  };

  if (view === 'imams-list') { return ( <div className="flex h-screen md:pl-20 bg-white overflow-hidden"> <div className="flex-1 overflow-y-auto"> <div className="page-container py-8 xl:py-12"> <ImamsListView onBack={() => setView('home')} onSelectImam={handleSelectImam} /> </div> </div> </div> ); }
  if (view === 'topic-page' && selectedTopicSlug) { return ( <div className="flex h-screen md:pl-20 bg-white overflow-hidden"> <div className="flex-1 overflow-y-auto"> <div className="page-container py-8 xl:py-12"> <TopicPageView slug={selectedTopicSlug} onBack={() => setView('home')} onSelectKhutbah={handleSelectKhutbah} onSelectImam={handleSelectImam} onTagClick={handleSelectTopic} onCommentClick={handleCommentClick} onLike={handleLike} userLikes={userLikes} /> </div> </div> </div> ); }
  if (view === 'imam-details' && activeImam) { return ( <div className="flex h-screen md:pl-20 bg-white overflow-hidden"> <div className="flex-1 overflow-y-auto"> <div className="page-container py-8 xl:py-12"> <ImamDetailedView imam={activeImam} onBack={() => setView('imam-profile')} /> </div> </div> </div> ); }
  if (view === 'imam-profile' && selectedImamSlug) { return ( <div className="flex h-screen md:pl-20 bg-white overflow-hidden"> <div className="flex-1 overflow-y-auto"> <div className="page-container py-8 xl:py-12"> <ImamProfileView slug={selectedImamSlug} onBack={() => setView('home')} onSelectKhutbah={handleSelectKhutbah} onNavigateDetails={handleNavigateImamDetails} onTagClick={handleSelectTopic} onCommentClick={handleCommentClick} onLike={handleLike} userLikes={userLikes} /> </div> </div> </div> ); }

  if (view === 'detail') {
      if (detailLoading || !detailData) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-emerald-600"/></div>;
      const isCurrentlyBookmarked = userBookmarks.has(detailData.id);
      const isCurrentlyLiked = userLikes.has(detailData.id);
      return (
        <div className="flex h-screen md:pl-20 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto">
            <div className="page-container py-8 xl:py-12">
                <button onClick={() => setView('home')} className="mb-8 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium text-lg"><ChevronLeft size={24} /> Back to Library</button>
                <div className="flex flex-col xl:flex-row justify-between items-start mb-10 gap-6">
                  <div>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-gray-900 mb-4">{detailData.title}</h1>
                      <div className="flex wrap items-center gap-4 text-lg text-gray-600">
                        <span onClick={() => handleSelectImam(detailData.author.toLowerCase().replace(/\s+/g, '-'))} className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg cursor-pointer hover:underline">{detailData.author}</span>
                        <span>•</span>
                        <span onClick={() => handleSelectTopic(detailData.topic.toLowerCase().replace(/\s+/g, '-'))} className="cursor-pointer hover:underline">{detailData.topic}</span>
                        {detailData.date && <><span>•</span><span>{detailData.date}</span></>}
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><Eye size={18} className="text-gray-400" /> {detailData.view_count || 0} views</span>
                      </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mr-2">
                          <Type size={18} className="text-gray-400" />
                          <button onClick={() => setContentFontSize(s => Math.max(12, s-2))} className="p-1 hover:bg-gray-100 rounded-full"><Minus size={16}/></button>
                          <span className="w-8 text-center font-bold text-gray-700">{contentFontSize}</span>
                          <button onClick={() => setContentFontSize(s => Math.min(40, s+2))} className="p-1 hover:bg-gray-100 rounded-full"><Plus size={16}/></button>
                      </div>
                      {isInMyKhutbahs ? ( <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-3 rounded-full font-bold shadow-sm"> <Check size={20} /> In My Khutbahs </div> ) : ( <button onClick={handleAddCopy} disabled={addingToMyKhutbahs} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold disabled:opacity-50" > {addingToMyKhutbahs ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} Add to My Khutbahs </button> )}
                      <button onClick={(e) => handleBookmark(e, detailData.id)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border shadow-sm ${isCurrentlyBookmarked ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}><BookmarkIcon size={20} fill={isCurrentlyBookmarked ? "currentColor" : "none"} />{isCurrentlyBookmarked ? 'Bookmarked' : 'Bookmark'}</button>
                      <button onClick={(e) => handleLike(e, detailData.id)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border shadow-sm ${isCurrentlyLiked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}`}><Heart size={20} fill={isCurrentlyLiked ? "currentColor" : "none"} />{detailData.likes || 0} Likes</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
                    <div className="lg:col-span-2 min-w-0">
                        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 w-full overflow-hidden min-h-[600px] mb-8 font-serif" style={{ fontSize: `${contentFontSize}px` }} dangerouslySetInnerHTML={{ __html: detailData.content || '' }} />
                        {detailData && <KhutbahComments khutbahId={detailData.id} />}
                    </div>
                    <div className="lg:col-span-1">
                      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm sticky top-6">
                        <div className="flex items-center gap-2 mb-6"><div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><LayoutList size={20} /></div><h3 className="font-bold text-gray-900 text-xl tracking-tight">Summary Cards</h3></div>
                        <div className="space-y-4">{khutbahCards.map((card, idx) => (<div key={card.id} className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-emerald-200 transition-colors"><div className="flex justify-between items-start mb-3"><span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${getSectionColor(card.section_label)}`}>{card.section_label}</span><span className="text-[10px] font-bold text-gray-400">CARD {idx + 1}</span></div><h4 className="font-bold text-gray-800 mb-3">{card.title}</h4><ul className="space-y-2">{card.bullet_points?.slice(0, 3).map((pt: string, i: number) => (<li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" /><span className="line-clamp-2">{pt}</span></li>))}</ul></div>))}</div>
                      </div>
                    </div>
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
                            if (e.key === 'Enter') { 
                                const term = activeFilters.search?.trim(); 
                                if (term) handleNavigate('list', { search: term }); 
                            } 
                        }} 
                        className="w-full pl-16 sm:pl-24 pr-24 sm:pr-40 py-6 sm:py-8 bg-white border border-gray-200 rounded-full shadow-2xl shadow-emerald-50/50 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-xl sm:text-2xl transition-all placeholder-gray-300" 
                    />
                    <button 
                        onClick={() => { 
                            const term = activeFilters.search?.trim(); 
                            if (term) handleNavigate('list', { search: term }); 
                        }} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-700 transition-all hidden sm:block shadow-lg"
                    >
                        Search
                    </button>
                </div>
             </div>
          )}
        </div>
        {view === 'home' && <HomeView data={homeData} isLoading={homeLoading} onNavigate={handleNavigate} onSelectKhutbah= {handleSelectKhutbah} onSelectImam={handleSelectImam} onTagClick={handleSelectTopic} onCommentClick={handleCommentClick} onBookmark={handleBookmark} onLike={handleLike} userBookmarks={userBookmarks} userLikes={userLikes} />}
        {view === 'list' && ( <ListView data={listData} count={count} hasMore={hasMore} isLoading={listLoading} loadMore={loadMore} filters={activeFilters} setFilters={setActiveFilters} onSelectKhutbah={handleSelectKhutbah} onBack={() => setView('home')} onSelectImam={handleSelectImam} onTagClick={handleSelectTopic} onCommentClick={handleCommentClick} onBookmark={handleBookmark} onLike={handleLike} userBookmarks={userBookmarks} userLikes={userLikes} /> )}
      </div>
    </div>
  );
};