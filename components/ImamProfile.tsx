import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, MapPin, Star, FileText, Calendar, 
  ChevronRight, Loader2, Search, ArrowLeft,
  ChevronDown
} from 'lucide-react';

interface ImamProfileProps {
  imamId: string;
  onBack: () => void;
  onViewDetails: () => void;
  onNavigateImam: (id: string) => void;
}

export function ImamProfile({ imamId, onBack, onViewDetails, onNavigateImam }: ImamProfileProps) {
  const [imam, setImam] = useState<any>(null);
  const [allImams, setAllImams] = useState<any[]>([]);
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImamDropdown, setShowImamDropdown] = useState(false);

  useEffect(() => {
    loadData();
    loadAllImams();
  }, [imamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load this imam's profile
      const { data: imamData } = await supabase
        .from('imams')
        .select(`
          *,
          khutbahs:khutbahs(count),
          likes:imam_likes(count),
          reviews:imam_reviews(count)
        `)
        .eq('id', imamId)
        .single();

      setImam(imamData);

      // Load this imam's khutbahs
      const { data: khutbahsData } = await supabase
        .from('khutbahs')
        .select('*')
        .eq('imam_id', imamId)
        .order('created_at', { ascending: false });

      setKhutbahs(khutbahsData || []);
    } catch (error) {
      console.error('Error loading imam:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllImams = async () => {
    const { data } = await supabase
      .from('imams')
      .select('id, name, slug')
      .order('name');
    setAllImams(data || []);
  };

  const filteredKhutbahs = khutbahs.filter(k =>
    k.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-teal-600" />
          <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!imam) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Imam Not Found</h2>
          <button onClick={onBack} className="px-4 py-2 bg-teal-600 text-white rounded-lg">Back to Directory</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 md:pl-20">
      <div className="page-container py-8 xl:py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 font-bold uppercase tracking-widest text-xs mb-8 transition-all"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        {/* Top Section: Compact Profile Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            <div className="flex flex-col md:flex-row items-start gap-6 flex-1">
              {/* Avatar */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-4xl font-black shrink-0 shadow-lg uppercase">
                {imam.avatar_url ? (
                  <img src={imam.avatar_url} className="w-full h-full object-cover rounded-3xl" alt={imam.name} />
                ) : (
                  imam.name?.[0]
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                  {imam.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-bold mb-4">
                  <span className="text-teal-600 bg-teal-50 px-3 py-1 rounded-lg uppercase tracking-wider">{imam.style || 'Scholar'}</span>
                  <span className="flex items-center gap-1 uppercase tracking-wider"><MapPin size={16} /> {imam.location || 'Remote'}</span>
                </div>
                {imam.bio && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-6 line-clamp-3">{imam.bio}</p>
                )}

                {/* Stats Row */}
                <div className="flex flex-wrap gap-8 pt-6 border-t border-gray-50">
                  <div>
                    <div className="text-2xl font-black text-gray-900">{imam.khutbahs?.[0]?.count || 0}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Khutbahs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{imam.likes?.[0]?.count || 0}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Likes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{imam.reviews?.[0]?.count || 0}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reviews</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 flex items-center gap-1">
                      {imam.rating || '4.8'} <Star size={18} className="text-yellow-400 fill-current" />
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <button
                onClick={onViewDetails}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition text-sm uppercase tracking-widest"
              >
                View Bio & Reviews
              </button>
              <button className="w-full px-6 py-3 bg-teal-600 text-white rounded-xl font-black hover:bg-teal-700 transition shadow-lg shadow-teal-100 text-sm uppercase tracking-widest">
                Request Booking
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Imam Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm mb-8 flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search this imam's khutbahs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent outline-none font-bold text-gray-800 placeholder-gray-300"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowImamDropdown(!showImamDropdown)}
              className="h-full px-6 py-4 bg-gray-50 border-none rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 flex items-center gap-2 hover:bg-gray-100 transition-all"
            >
              Switch Imam
              <ChevronDown size={14} className={`transition-transform ${showImamDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showImamDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowImamDropdown(false)} />
                <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 p-2 space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 border-b border-gray-50 mb-1">Select Scholar</div>
                  {allImams.map(otherImam => (
                    <button
                      key={otherImam.id}
                      onClick={() => {
                        onNavigateImam(otherImam.id);
                        setShowImamDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left rounded-xl transition-all font-bold text-sm ${
                        otherImam.id === imamId ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {otherImam.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Khutbahs Section */}
        <div className="pb-20">
          <div className="flex items-center justify-between mb-8 px-1">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
              <FileText size={24} className="text-teal-600" />
              Khutbahs ({filteredKhutbahs.length})
            </h2>
          </div>

          {filteredKhutbahs.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 p-16 text-center">
              <FileText size={48} className="mx-auto text-gray-200 mb-4 opacity-50" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                {searchTerm ? 'No khutbahs match your search' : 'No khutbahs available from this imam yet'}
              </p>
              {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-teal-600 font-black text-xs uppercase tracking-widest hover:underline">Clear Search</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredKhutbahs.map(khutbah => (
                <div 
                  key={khutbah.id}
                  className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full border-l-4 border-l-teal-500"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-amber-100">
                      <Star size={12} fill="currentColor" /> {khutbah.rating || '4.8'}
                    </div>
                    {khutbah.created_at && (
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        {new Date(khutbah.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-4 group-hover:text-teal-600 transition-colors line-clamp-2 leading-tight uppercase tracking-tight">
                    {khutbah.title}
                  </h3>

                  {khutbah.description && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-6 leading-relaxed italic">"{khutbah.description}"</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-5">
                      <span className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                        ❤️ {khutbah.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                        💬 {khutbah.comments_count || 0}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 transition-all" />
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
