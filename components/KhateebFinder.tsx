import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, User, FileText, 
  ThumbsUp, Star, Heart, MapPin, ChevronRight,
  Calendar, Shield, CheckCircle, Loader2, AlertCircle,
  MessageSquare, ArrowLeft, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface KhateebFinderProps {
  onNavigateProfile: () => void;
}

export const KhateebFinder: React.FC<KhateebFinderProps> = ({ onNavigateProfile }) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [imams, setImams] = useState<any[]>([]);
    const [khutbahs, setKhutbahs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedKhateeb, setSelectedKhateeb] = useState<any | null>(null);
    const [search, setSearch] = useState("");
    const [styleFilter, setStyleFilter] = useState("All Styles");
    const [khutbahSearchTerm, setKhutbahSearchTerm] = useState("");

    useEffect(() => {
        fetchImams();
    }, []);

    const fetchImams = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch imams with counts using Supabase RPC or direct joins
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

    const loadImamDetail = async (imam: any) => {
        setSelectedKhateeb(imam);
        setView('detail');
        setDetailLoading(true);
        setKhutbahs([]);
        setKhutbahSearchTerm("");

        try {
            const { data: khutbahsData } = await supabase
              .from('khutbahs')
              .select('*')
              .eq('imam_id', imam.id)
              .order('created_at', { ascending: false });

            setKhutbahs(khutbahsData || []);
        } catch (err) {
            console.error('Error loading detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const filteredKhateebs = imams.filter(k => {
        const matchesSearch = (k.name || '').toLowerCase().includes(search.toLowerCase()) || 
                             (k.bio || '').toLowerCase().includes(search.toLowerCase()) ||
                             (k.location || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesStyle = styleFilter === "All Styles" || k.style === styleFilter;
        
        return matchesSearch && matchesStyle;
    });

    const filteredKhutbahs = khutbahs.filter(k =>
      k.title?.toLowerCase().includes(khutbahSearchTerm.toLowerCase()) ||
      k.description?.toLowerCase().includes(khutbahSearchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-full md:pl-20 bg-gray-50 items-center justify-center w-full">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Accessing Database...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full md:pl-20 bg-gray-50 items-center justify-center w-full p-6">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-100 shadow-xl text-center">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Database Error</h3>
                    <p className="text-gray-500 mb-6 text-sm">{error}</p>
                    <button 
                        onClick={fetchImams}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'detail' && selectedKhateeb) {
        return (
            <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
                <div className="page-container py-8 xl:py-12 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button onClick={() => setView('list')} className="mb-6 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium">
                        <ArrowLeft size={18} /> Back to Directory
                    </button>

                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm mb-10">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-5xl font-black shrink-0 shadow-lg overflow-hidden">
                                {selectedKhateeb.avatar_url ? (
                                    <img src={selectedKhateeb.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    selectedKhateeb.name?.[0].toUpperCase()
                                )}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 w-full">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                    <div>
                                        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">{selectedKhateeb.name}</h2>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 font-bold uppercase tracking-wider">
                                            <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{selectedKhateeb.style || 'Scholar'}</span>
                                            <span className="flex items-center gap-1"><MapPin size={16} /> {selectedKhateeb.location || 'Remote'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                                            Request Booking
                                        </button>
                                    </div>
                                </div>

                                {selectedKhateeb.bio && (
                                    <p className="text-gray-600 leading-relaxed mb-8 max-w-3xl text-lg">{selectedKhateeb.bio}</p>
                                )}

                                {/* Stats Bar */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                                    <div>
                                        <div className="text-2xl font-black text-gray-900">{selectedKhateeb.khutbahs?.[0]?.count || 0}</div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sermons</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-gray-900">{selectedKhateeb.likes?.[0]?.count || 0}</div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Likes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-gray-900 flex items-center gap-1">
                                            {selectedKhateeb.rating || '4.8'} <Star size={16} className="text-yellow-400 fill-current" />
                                        </div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedKhateeb.reviews?.[0]?.count || 0} Reviews</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Repository Section */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                                <FileText size={20} className="text-emerald-500" /> Public Repository
                            </h3>
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    value={khutbahSearchTerm}
                                    onChange={(e) => setKhutbahSearchTerm(e.target.value)}
                                    placeholder="Search in repository..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        {detailLoading ? (
                            <div className="py-20 text-center">
                                <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Accessing Repository...</p>
                            </div>
                        ) : filteredKhutbahs.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold">No khutbahs found in this repository.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {filteredKhutbahs.map(k => (
                                    <div key={k.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full border-l-4 border-l-emerald-500">
                                        <h4 className="font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight uppercase tracking-tight">{k.title}</h4>
                                        {k.description && <p className="text-sm text-gray-500 line-clamp-3 mb-6 leading-relaxed italic">"{k.description}"</p>}
                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Calendar size={12} /> {k.created_at ? new Date(k.created_at).toLocaleDateString() : 'Timothy'}
                                            </span>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        {filteredKhateebs.map(k => (
                            <div key={k.id} onClick={() => loadImamDetail(k)} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all flex flex-col cursor-pointer group hover:-translate-y-2 relative overflow-hidden h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner ${k.avatar_url ? 'bg-gray-100' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {k.avatar_url ? <img src={k.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" /> : k.name?.[0].toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tighter border border-amber-100">
                                        <Star size={14} fill="currentColor" /> {k.rating || '4.8'}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-900 mb-1 truncate group-hover:text-emerald-600 transition-colors uppercase tracking-tighter">{k.name}</h3>
                                <p className="text-xs font-black text-emerald-600 mb-4 uppercase tracking-widest">{k.style || 'Scholar'}</p>
                                
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><MapPin size={12}/> {k.location || 'Remote'}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8 py-4 border-y border-gray-50 mt-auto">
                                    <div className="text-center border-r border-gray-50">
                                        <span className="block font-black text-gray-900">{k.khutbahs?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Sermons</span>
                                    </div>
                                    <div className="text-center border-r border-gray-50">
                                        <span className="block font-black text-gray-900">{k.likes?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Likes</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-black text-gray-900">{k.reviews?.[0]?.count || 0}</span>
                                        <span className="block text-[8px] font-black text-gray-300 uppercase tracking-widest">Reviews</span>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4 group-hover:border-emerald-100 transition-colors">
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest group-hover:text-emerald-600 transition-colors">View Profile</span>
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                        <ChevronRight size={20} />
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