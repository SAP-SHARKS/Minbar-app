import React, { useState, useEffect } from 'react';
import { 
  Play, FileText, Clock, Eye, GraduationCap, 
  BookOpen, ChevronRight, Mic, Users, Heart, Star, Loader2, AlertCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LearningResource {
  id: string;
  title: string;
  resource_type: 'video' | 'blog' | 'article';
  duration_minutes: number;
  category: string;
  thumbnail_url?: string;
  url: string;
  author: string;
  is_published: boolean;
  view_count?: number | string;
}

export const LearningSection = ({ user }: { user: any }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = ['All', 'Delivery', 'Structure', 'Fiqh', 'Engagement', 'Preparation'];

  useEffect(() => {
    async function fetchResources() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('learning_resources')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (sbError) throw sbError;
        setResources(data || []);
      } catch (err: any) {
        console.error("Error fetching learning resources:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, []);

  const filteredResources = activeFilter === 'All' 
    ? resources 
    : resources.filter(r => r.category === activeFilter);

  const handleResourceClick = (url: string) => {
    if (url) window.open(url, '_blank');
  };

  const getResourceStyles = (type: string) => {
    if (type === 'video') {
      return {
        colorClass: 'bg-indigo-100 text-indigo-600',
        icon: <Play className="ml-1 w-7 h-7 md:w-8 md:h-8 fill-current" />
      };
    }
    return {
      colorClass: 'bg-emerald-100 text-emerald-600',
      icon: <FileText className="w-7 h-7 md:w-8 md:h-8" />
    };
  };

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
        <div className="w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 flex flex-wrap items-center gap-4">
                Khutbah Academy
                <span className="bg-cyan-100 text-cyan-700 text-sm px-3 py-1.5 rounded-full uppercase tracking-wide font-bold">Beta</span>
              </h2>
              <p className="text-gray-500 mt-3 text-lg md:text-xl">Master the art of effective sermon delivery with curated resources.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 text-base shadow-sm transition-all">
                <BookOpen size={20} /> My Library
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-cyan-900 to-blue-900 rounded-[2.5rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden mb-16 animate-in fade-in slide-in-from-top-4 duration-500 w-full">
             <div className="relative z-10 max-w-4xl">
               <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-8">
                 <Star size={14} fill="currentColor" /> Featured Course
               </div>
               <h3 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold mb-6 leading-tight">The Art of Storytelling in Islam</h3>
               <p className="text-cyan-100 text-lg md:text-2xl mb-10 leading-relaxed font-light max-w-3xl">
                 Learn how to weave narratives from the Quran and Sunnah to captivate your audience and deliver powerful, memorable messages.
               </p>
               <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                 <button className="bg-cyan-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-3 text-lg">
                    <Play size={24} fill="currentColor" /> Start Watching
                 </button>
                 <button className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-colors text-lg">
                    View Syllabus
                 </button>
               </div>
             </div>
             
             {/* Decorative Elements */}
             <div className="absolute right-0 bottom-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-cyan-500/20 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
             <div className="absolute top-0 right-32 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
             <GraduationCap className="absolute right-16 top-1/2 -translate-y-1/2 text-white/5 w-64 md:w-96 h-64 md:h-96 rotate-12 pointer-events-none hidden md:block" />
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-12 overflow-x-auto pb-4 custom-scrollbar w-full">
            {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)} 
                  className={`
                    px-6 py-3 rounded-full text-base font-bold whitespace-nowrap transition-all border-2
                    ${activeFilter === f 
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  {f}
                </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Loader2 className="animate-spin mb-4" size={48} />
               <p className="font-bold uppercase tracking-widest">Loading Resources...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center max-w-xl mx-auto">
               <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
               <h3 className="text-xl font-bold text-red-900 mb-2">Connection Error</h3>
               <p className="text-red-700">{error}</p>
            </div>
          ) : filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 w-full">
              {filteredResources.map(resource => {
                const { colorClass, icon } = getResourceStyles(resource.resource_type);
                return (
                  <div 
                    key={resource.id} 
                    onClick={() => handleResourceClick(resource.url)}
                    className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2 overflow-hidden w-full flex flex-col h-full"
                  >
                    <div className={`h-48 md:h-64 ${colorClass} relative flex items-center justify-center shrink-0`}>
                       {resource.thumbnail_url && (
                         <img 
                          src={resource.thumbnail_url} 
                          alt={resource.title} 
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                         />
                       )}
                       <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="w-16 md:w-20 h-16 md:h-20 bg-white rounded-full flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300 text-gray-800 relative z-10">
                         {icon}
                       </div>
                       <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 z-10">
                          {resource.resource_type === 'video' ? <Clock size={14}/> : <BookOpen size={14}/>}
                          {resource.duration_minutes} {resource.resource_type === 'video' ? 'min' : 'min read'}
                       </div>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col flex-1">
                       <div className="flex justify-between items-start mb-4">
                         <span className={`text-[10px] md:text-xs uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500`}>
                            {resource.category}
                         </span>
                         <div className="flex items-center gap-1.5 text-gray-400 text-xs md:text-sm font-medium">
                            <Eye size={16}/> {resource.view_count || '0'}
                         </div>
                       </div>
                       <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-cyan-700 transition-colors line-clamp-2">
                         {resource.title}
                       </h3>
                       <div className="flex items-center gap-3 mt-auto pt-6">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                            {resource.author ? resource.author.charAt(0) : '?'}
                          </div>
                          <span className="text-sm md:text-base font-medium text-gray-500">{resource.author || 'Anonymous'}</span>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
               <GraduationCap size={64} className="mx-auto mb-4 text-gray-200" />
               <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">No resources found in this category</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};