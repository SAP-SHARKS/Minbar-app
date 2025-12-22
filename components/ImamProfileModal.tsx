import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, MapPin, Star, FileText, Calendar, ChevronRight, Loader2, Search } from 'lucide-react';

interface ImamProfileModalProps {
  imamId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImamProfileModal({ imamId, isOpen, onClose }: ImamProfileModalProps) {
  const [imam, setImam] = useState<any>(null);
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && imamId) {
      loadImamData();
    }
  }, [isOpen, imamId]);

  const loadImamData = async () => {
    try {
      setLoading(true);
      // Load imam with stats
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

      // Load imam's khutbahs
      const { data: khutbahsData } = await supabase
        .from('khutbahs')
        .select('*')
        .eq('imam_id', imamId)
        .order('created_at', { ascending: false });

      setKhutbahs(khutbahsData || []);
    } catch (error) {
      console.error('Error loading imam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredKhutbahs = khutbahs.filter(k =>
    k.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-[3001] shadow-2xl animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all z-10"
        >
          <X size={24} />
        </button>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Header */}
          <div className="p-8 md:p-10 border-b border-gray-100 bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 size={40} className="animate-spin text-emerald-600"/>
                  <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Opening Profile...</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-emerald-600 flex items-center justify-center text-white text-5xl font-black shrink-0 shadow-lg shadow-emerald-200 uppercase">
                  {imam?.avatar_url ? (
                      <img src={imam.avatar_url} className="w-full h-full object-cover rounded-[2rem]" alt={imam.name} />
                  ) : (
                      imam?.name?.[0]
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 uppercase tracking-tighter">{imam?.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-bold mb-6">
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-wider">{imam?.style || 'Scholar'}</span>
                    <span className="flex items-center gap-1 uppercase tracking-wider"><MapPin size={16} /> {imam?.location || 'Global'}</span>
                  </div>
                  
                  {imam?.bio && (
                    <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-2xl">{imam.bio}</p>
                  )}
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-8 pt-6 border-t border-gray-100">
                    <div>
                      <div className="text-2xl font-black text-gray-900">{imam?.khutbahs?.[0]?.count || 0}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sermons</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-gray-900">{imam?.likes?.[0]?.count || 0}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Likes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-gray-900 flex items-center gap-1">
                        {imam?.rating || '4.8'} <Star size={16} className="text-yellow-400 fill-current" />
                      </div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{imam?.reviews?.[0]?.count || 0} Reviews</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Repository Section */}
          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                <FileText size={20} className="text-emerald-500" /> Repository
              </h3>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search this imam's khutbahs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {loading ? null : filteredKhutbahs.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <FileText size={48} className="mx-auto text-gray-300 mb-4 opacity-50"/>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                  {searchTerm ? 'No results for your search' : 'No khutbahs available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredKhutbahs.map(khutbah => (
                  <div key={khutbah.id} className="bg-white border border-gray-100 p-6 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                    <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 uppercase tracking-tight group-hover:text-emerald-600">{khutbah.title}</h4>
                    {khutbah.topic && <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">{khutbah.topic}</p>}
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {khutbah.created_at && (
                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(khutbah.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Actions */}
        {!loading && (
            <div className="p-6 bg-gray-900 flex gap-4">
                <button className="flex-1 bg-white text-gray-900 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-100 transition-all">
                    Show full profile
                </button>
                <button className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">
                    Request Booking
                </button>
            </div>
        )}
      </div>
    </div>
  );
}