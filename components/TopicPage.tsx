import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, MapPin, Star, FileText, Calendar, 
  ChevronRight, Loader2, Search, ArrowLeft,
  Activity, Heart, Moon, Users, BookOpen
} from 'lucide-react';
import { TagButton } from './TagButton';

interface TopicPageProps {
  topicSlug: string;
  onBack: () => void;
  onSelectKhutbah: (id: string) => void;
  onNavigateImam: (id: string) => void;
  onNavigateTopic: (slug: string) => void;
}

const getTopicIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('salah') || lower.includes('prayer')) return <Activity size={32} />;
    if (lower.includes('zakat') || lower.includes('charity')) return <Heart size={32} />;
    if (lower.includes('fasting') || lower.includes('ramadan')) return <Moon size={32} />;
    if (lower.includes('family')) return <Users size={32} />;
    if (lower.includes('quran')) return <BookOpen size={32} />;
    return <FileText size={32} />;
};

export function TopicPage({ topicSlug, onBack, onSelectKhutbah, onNavigateImam, onNavigateTopic }: TopicPageProps) {
  const [topic, setTopic] = useState<any>(null);
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadAllTags();
  }, [topicSlug]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch the tag/topic details
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('slug', topicSlug)
        .single();

      if (tagError) throw tagError;
      setTopic(tagData);

      // 2. Fetch khutbahs with this tag using the junction table as per instructions
      const { data: khutbahsData, error: khutbahsError } = await supabase
        .from('khutbahs')
        .select(`
          *,
          imam:imams(id, name, slug, style, location),
          khutbah_tags!inner(
            tag:tags(id, name, slug)
          )
        `)
        .eq('khutbah_tags.tag_id', tagData.id)
        .order('created_at', { ascending: false });

      if (khutbahsError) throw khutbahsError;

      // 3. Transform the data to have a clean tags array
      const mapped = khutbahsData.map((k: any) => ({
        ...k,
        // Ensure author name is populated from joined imam or denormalized field
        displayAuthor: k.imam?.name || k.author,
        tags: k.khutbah_tags?.map((kt: any) => kt.tag).filter(Boolean) || []
      }));

      setKhutbahs(mapped);
    } catch (error: any) {
      console.error('Error loading topic page:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTags = async () => {
    try {
      const { data } = await supabase
        .from('tags')
        .select('id, name, slug, khutbah_count')
        .order('khutbah_count', { ascending: false });
      setAllTags(data || []);
    } catch (err) {
      console.error("Error loading all tags:", err);
    }
  };

  const filteredKhutbahs = khutbahs.filter(k =>
    k.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 md:pl-20">
        <Loader2 size={40} className="animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 md:pl-20">
      <div className="page-container py-8 xl:py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold uppercase tracking-widest text-xs mb-8 transition-all"
        >
          <ArrowLeft size={16} /> Back to Library
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 md:p-12 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-10 relative z-10">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                    {getTopicIcon(topic?.name || 'General')}
                </div>
                <div className="flex-1">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-none">{topic?.name}</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-6">
                      {khutbahs.length} curated sermon{khutbahs.length !== 1 ? 's' : ''} in this category
                    </p>
                    
                    {topic?.description && (
                        <p className="text-gray-600 text-lg mb-6 leading-relaxed max-w-3xl italic">"{topic.description}"</p>
                    )}

                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2">
                             <Star size={16} className="text-emerald-600 fill-current" />
                             <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Elite Collection</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Topic Navigator */}
        <div className="mb-10">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Switch Topic</h3>
            <div className="flex flex-wrap gap-2">
                {allTags.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onNavigateTopic(t.slug)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                            t.slug === topicSlug 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100 underline underline-offset-4 decoration-2' 
                            : 'bg-white text-gray-500 border-gray-100 hover:border-emerald-500 hover:text-emerald-600 hover:underline'
                        }`}
                    >
                        {t.name} ({t.khutbah_count || 0})
                    </button>
                ))}
            </div>
        </div>

        {/* Search & Grid */}
        <div className="space-y-8">
            <div className="relative w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder={`Search within ${topic?.name}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800 placeholder-gray-300"
                />
            </div>

            {filteredKhutbahs.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <FileText size={48} className="mx-auto text-gray-200 mb-4 opacity-50" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest">No matching sermons found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {filteredKhutbahs.map(k => (
                        <div 
                          key={k.id}
                          onClick={() => onSelectKhutbah(k.id)}
                          className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full border-l-4 border-l-emerald-500"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-amber-100">
                                    <Star size={12} fill="currentColor" /> {k.rating || '4.8'}
                                </div>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(k.created_at).toLocaleDateString()}</span>
                            </div>

                            <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight uppercase tracking-tight">
                                {k.title}
                            </h3>

                            <div className="flex flex-wrap gap-2 mb-6">
                              {k.tags?.map((tag: any) => (
                                <TagButton key={tag.id} tag={tag} onNavigate={onNavigateTopic} size="xs" />
                              ))}
                            </div>

                            <div className="flex items-center text-sm text-gray-500 mb-6">
                                <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      onNavigateImam(k.imam?.id || k.imam_id); 
                                    }}
                                    className="group/author flex items-center gap-2"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">By</span>
                                    <span className="font-black text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-tighter text-sm transition-all shadow-sm">
                                        {k.displayAuthor}
                                    </span>
                                </button>
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                                <div className="flex items-center gap-5">
                                    <span className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">❤️ {k.likes_count || 0}</span>
                                    <span className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">💬 {k.comments_count || 0}</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-all" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}