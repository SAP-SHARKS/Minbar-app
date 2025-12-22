import React, { useState, useEffect } from 'react';
import { 
  Search, User, Star, MapPin, ChevronRight, 
  Loader2, AlertCircle, ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import ImamProfileModal from './ImamProfileModal';

interface KhateebFinderProps {
  onNavigateProfile: () => void;
  onNavigateImam: (id: string) => void;
}

export const KhateebFinder: React.FC<KhateebFinderProps> = ({ onNavigateProfile, onNavigateImam }) => {
    const [imams, setImams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [styleFilter, setStyleFilter] = useState("All Styles");

    useEffect(() => {
        fetchImams();
    }, []);

    const fetchImams = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('imams')
                .select(`
                    *,
                    khutbahs:khutbahs(count),
                    likes:imam_likes(count),
                    reviews:imam_reviews(count)
                `)
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            setImams(data || []);
        } catch (err: any) {
            console.error('Error fetching imams:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredKhateebs = imams.filter(k => {
        const matchesSearch = (k.name || '').toLowerCase().includes(search.toLowerCase()) || 
                             (k.bio || '').toLowerCase().includes(search.toLowerCase()) ||
                             (k.location || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesStyle = styleFilter === "All Styles" || k.style === styleFilter;
        
        return matchesSearch && matchesStyle;
    });

    if (loading) {
        return (
            <div className="flex h-full md:pl-20 bg-gray-50 items-center justify-center w-full">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Accessing Database...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
            <div className="page-container py-8 xl:py-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-1">Khateeb Global DB</h1>
                        <p className="text-gray-500 font-medium">Connect with learned speakers from across the Ummah.</p>
                    </div>
                    <button onClick={onNavigateProfile} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-800 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all w-full sm:w-auto justify-center">
                        <User size={18} className="text-emerald-500" /> My Public Profile
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name, topic, or location..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="w-full pl-12 pr-4 py-4 bg-transparent outline-none font-bold text-gray-800 placeholder-gray-300"
                        />
                    </div>
                    <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                        <select 
                            value={styleFilter} 
                            onChange={(e) => setStyleFilter(e.target.value)} 
                            className="bg-white border border-gray-100 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option>All Styles</option>
                            <option>Scholar</option>
                            <option>Academic</option>
                            <option>Motivational</option>
                            <option>Spiritual</option>
                            <option>Youth</option>
                        </select>
                    </div>
                </div>

                {filteredKhateebs.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <Search size={64} className="mx-auto mb-6 text-gray-200" />
                        <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">No Matches Found</h3>
                        <button onClick={() => {setSearch(""); setStyleFilter("All Styles");}} className="mt-4 text-emerald-600 font-black text-xs uppercase hover:underline">Clear all filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {filteredKhateebs.map(k => (
                            <div 
                                key={k.id} 
                                onClick={() => onNavigateImam(k.id)} 
                                className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 mb-5">
                                    {/* Compact Avatar */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner shrink-0 ${k.avatar_url ? 'bg-gray-100' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {k.avatar_url ? <img src={k.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" /> : k.name?.[0].toUpperCase()}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors uppercase tracking-tighter leading-tight">
                                            {k.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">{k.style || 'Scholar'}</p>
                                    </div>

                                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-amber-100 shrink-0">
                                        <Star size={12} fill="currentColor" /> {k.rating || '4.8'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mb-5 uppercase tracking-widest">
                                    <MapPin size={14} className="text-gray-300"/> <span className="truncate">{k.location || 'Remote'}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-1 py-3 border-y border-gray-50 mb-5">
                                    <div className="text-center">
                                        <span className="block font-black text-gray-900 text-sm leading-none">{k.khutbahs?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Sermons</span>
                                    </div>
                                    <div className="text-center border-x border-gray-50">
                                        <span className="block font-black text-gray-900 text-sm leading-none">{k.likes?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Likes</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-black text-gray-900 text-sm leading-none">{k.reviews?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Reviews</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] group-hover:text-emerald-600 transition-colors">View Profile</span>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
