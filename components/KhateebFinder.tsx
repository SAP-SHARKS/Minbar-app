import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronLeft, User, FileText, 
  ThumbsUp, Star, Heart, MapPin, ChevronRight,
  Calendar, Shield, CheckCircle, Loader2
} from 'lucide-react';
import { KhateebProfile } from '../types';
import { supabase } from '../supabaseClient';

interface KhateebFinderProps {
  onNavigateProfile: () => void;
}

export const KhateebFinder: React.FC<KhateebFinderProps> = ({ onNavigateProfile }) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedKhateeb, setSelectedKhateeb] = useState<KhateebProfile | null>(null);
    const [search, setSearch] = useState("");
    const [styleFilter, setStyleFilter] = useState("All Styles");
    const [khateebs, setKhateebs] = useState<KhateebProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Color helper for consistent UI
    const getKhateebColor = (name: string) => {
        const colors = [
            "bg-blue-100 text-blue-600",
            "bg-emerald-100 text-emerald-600",
            "bg-purple-100 text-purple-600",
            "bg-amber-100 text-amber-600",
            "bg-rose-100 text-rose-600"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    useEffect(() => {
        const fetchImams = async () => {
            setIsLoading(true);
            console.log("🔍 Fetching Imams from database...");
            
            try {
                const { data, error } = await supabase
                    .from('imams')
                    .select('id, name, slug, bio');

                if (error) {
                    console.warn("⚠️ Supabase fetching warning:", error.message);
                    // Fixed: cast import.meta to any to access env in Vite
                    if (!(import.meta as any).env.VITE_SUPABASE_URL) {
                        console.warn("SUPABASE URL is undefined. Please check environment variables.");
                    }
                    setKhateebs([]);
                } else {
                    console.log("✅ Imams found:", data);
                    
                    // Map minimal DB data to the rich KhateebProfile UI interface
                    const mappedKhateebs: KhateebProfile[] = (data || []).map((imam: any) => ({
                        id: imam.id,
                        initial: imam.name ? imam.name.charAt(0).toUpperCase() : "?",
                        name: imam.name || "Unknown Imam",
                        rating: 4.5, // Default rating for new system
                        title: "Khateeb",
                        location: "Community",
                        tags: ["General"],
                        color: getKhateebColor(imam.name || "unknown"),
                        stats: { khutbahs: 0, likes: 0, reviews: 0 },
                        bio: imam.bio || "No biography available.",
                        reviewsList: [],
                        khutbahsList: []
                    }));
                    
                    setKhateebs(mappedKhateebs);
                }
            } catch (err) {
                console.error("Critical error fetching imams:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImams();
    }, []);

    const filteredKhateebs = khateebs.filter(k => 
        k.name.toLowerCase().includes(search.toLowerCase()) || 
        k.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
    
    const handleViewDetails = (k: KhateebProfile) => { 
        setSelectedKhateeb(k); 
        setView('detail'); 
    };

    const renderDetailView = () => {
        if (!selectedKhateeb) return null;
        return (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-20 w-full">
                <button onClick={() => setView('list')} className="mb-6 flex items-center text-gray-500 hover:text-emerald-600 gap-2 font-medium"><ChevronLeft size={18} /> Back to Database</button>
                
                {/* Header Profile Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm mb-8 w-full">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className={`w-20 md:w-24 h-20 md:h-24 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-bold shrink-0 ${selectedKhateeb.color}`}>
                            {selectedKhateeb.initial}
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedKhateeb.name}</h2>
                                    <div className="flex items-center gap-2 text-gray-500 mb-4 text-sm md:text-base">
                                        <span className="font-medium text-gray-900">{selectedKhateeb.title}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><MapPin size={16}/> {selectedKhateeb.location}</span>
                                    </div>
                                </div>
                                <div className="text-right w-full md:w-auto">
                                   <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1">
                                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Accepting Requests
                                   </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 md:gap-6 text-sm border-t border-gray-100 pt-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600"><FileText size={16}/></span>
                                    <div><span className="font-bold text-gray-900 block">{selectedKhateeb.stats.khutbahs}</span> <span className="text-gray-500 text-xs">Khutbahs</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><ThumbsUp size={16}/></span>
                                    <div><span className="font-bold text-gray-900 block">{selectedKhateeb.stats.likes}</span> <span className="text-gray-500 text-xs">Likes</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-yellow-100 p-1.5 rounded-lg text-yellow-600"><Star size={16}/></span>
                                    <div><span className="font-bold text-gray-900 block">{selectedKhateeb.rating}</span> <span className="text-gray-500 text-xs">Rating</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                    <div className="lg:col-span-2 space-y-8 min-w-0">
                        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-900 text-xl mb-4">About</h3>
                            <p className="text-gray-600 leading-relaxed text-base md:text-lg">{selectedKhateeb.bio}</p>
                            <div className="mt-6">
                                <h4 className="font-bold text-gray-900 text-sm mb-3">Topics of Expertise</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedKhateeb.tags.map(t => (
                                        <span key={t} className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedKhateeb.khutbahsList.length > 0 && (
                            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900 text-xl">Recorded Khutbahs</h3>
                                    <button className="text-emerald-600 text-sm font-bold hover:underline">View All</button>
                                </div>
                                <div className="space-y-4">
                                    {selectedKhateeb.khutbahsList.map(item => (
                                        <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{item.title}</h4>
                                                    <span className="text-xs text-gray-500">{item.date}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-500 text-sm shrink-0">
                                                <span className="flex items-center gap-1"><Heart size={14}/> {item.likes}</span>
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedKhateeb.reviewsList.length > 0 && (
                            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900 text-xl">Community Reviews</h3>
                                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg font-bold">
                                        <Star size={16} fill="currentColor"/> {selectedKhateeb.rating} <span className="text-yellow-600/60 font-normal">({selectedKhateeb.stats.reviews})</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {selectedKhateeb.reviewsList.map(review => (
                                        <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold text-gray-900">{review.user}</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={12} className={i < Math.floor(review.rating) ? "text-yellow-400 fill-current" : "text-gray-300"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 italic">"{review.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-emerald-50 p-6 md:p-8 rounded-xl border border-emerald-100 sticky top-6">
                            <h4 className="font-bold text-emerald-900 mb-6 text-lg flex items-center gap-2">
                                <Calendar size={20}/> Booking Information
                            </h4>
                            
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
                                    <span className="text-emerald-700 text-sm">Travel Radius</span>
                                    <span className="font-bold text-emerald-900">50 Miles</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
                                    <span className="text-emerald-700 text-sm">Minimum Notice</span>
                                    <span className="font-bold text-emerald-900">2 Weeks</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
                                    <span className="text-emerald-700 text-sm">Honorarium</span>
                                    <span className="font-bold text-emerald-900 text-right">£150 - £300</span>
                                </div>
                            </div>

                            <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                Request Booking
                            </button>
                            <p className="text-xs text-emerald-600/80 text-center mt-4">
                                Typical response time: Within 24 hours
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Shield size={16} className="text-gray-400"/> Verification
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle size={16} className="text-emerald-500"/> Identity Verified
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle size={16} className="text-emerald-500"/> Background Check
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle size={16} className="text-emerald-500"/> References Checked
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
            <div className="page-container py-8 xl:py-12">
                {view === 'list' && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 w-full">
                        <div><h2 className="text-3xl font-bold text-gray-900">Khateeb Database</h2><p className="text-gray-500 mt-1">Global directory of speakers and scholars.</p></div>
                        <button onClick={onNavigateProfile} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-colors w-full sm:w-auto justify-center"><User size={18} /> My Profile</button>
                    </div>
                )}
                
                {view === 'list' ? (
                    <div className="w-full">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 w-full">
                            <div className="flex-1 relative"><Search className="absolute left-3 top-3 text-gray-400" size={20} /><input type="text" placeholder="Search by name or topic..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/></div>
                            <div className="flex gap-4"><select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-gray-700 cursor-pointer hover:bg-gray-100 w-full md:w-auto"><option>All Styles</option><option>Academic</option><option>Motivational</option><option>Spiritual</option></select></div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
                                <p className="font-bold uppercase tracking-widest text-sm">Accessing database...</p>
                            </div>
                        ) : filteredKhateebs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12 w-full">
                                {filteredKhateebs.map(k => (
                                    <div key={k.id} onClick={() => handleViewDetails(k)} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all flex flex-col cursor-pointer group hover:-translate-y-1 w-full">
                                        <div className="flex justify-between items-start mb-4"><div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${k.color}`}>{k.initial}</div><div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-sm font-bold"><Star size={14} fill="currentColor" /> {k.rating}</div></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors truncate">{k.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4"><span>{k.title}</span><span>•</span><span className="flex items-center gap-1"><MapPin size={12}/> {k.location}</span></div>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-4 text-xs font-bold text-gray-600"><div className="flex flex-col items-center"><span className="text-gray-900 text-sm">{k.stats.khutbahs}</span><span>Khutbahs</span></div><div className="w-px h-6 bg-gray-200"></div><div className="flex flex-col items-center"><span className="text-gray-900 text-sm">{k.stats.likes}</span><span>Likes</span></div><div className="w-px h-6 bg-gray-200"></div><div className="flex flex-col items-center"><span className="text-gray-900 text-sm">{k.stats.reviews}</span><span className="underline decoration-dotted">Reviews</span></div></div>
                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                                            <span className="text-gray-500 text-sm font-medium group-hover:text-gray-900">View Details</span>
                                            <button className="text-emerald-600 font-bold text-sm hover:text-emerald-700 hover:underline">Request Booking</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Search size={48} className="mx-auto text-gray-300 mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-gray-600">No imams found</h3>
                                <p className="text-gray-400">Try adjusting your search criteria</p>
                            </div>
                        )}
                    </div>
                ) : (renderDetailView())}
            </div>
        </div>
    );
};