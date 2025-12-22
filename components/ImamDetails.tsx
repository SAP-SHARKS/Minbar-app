import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Star, Loader2, MessageCircle, MapPin, ShieldCheck, CheckCircle } from 'lucide-react';

interface ImamDetailsProps {
  imamId: string;
  onBack: () => void;
}

export function ImamDetails({ imamId, onBack }: ImamDetailsProps) {
  const [imam, setImam] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [imamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load imam
      const { data: imamData } = await supabase
        .from('imams')
        .select('*')
        .eq('id', imamId)
        .single();

      setImam(imamData);

      // Load reviews
      const { data: reviewsData } = await supabase
        .from('imam_reviews')
        .select('*')
        .eq('imam_id', imamId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 md:pl-20">
        <Loader2 size={32} className="animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 md:pl-20">
      <div className="page-container py-8 xl:py-12 max-w-5xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 font-bold uppercase tracking-widest text-xs mb-8 transition-all"
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>

        {/* Full Profile Banner */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 md:p-12 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-10 relative z-10">
            <div className="w-40 h-40 rounded-[2.5rem] bg-teal-600 flex items-center justify-center text-white text-6xl font-black shadow-2xl shadow-teal-200 shrink-0 uppercase border-8 border-white">
              {imam?.avatar_url ? (
                <img src={imam.avatar_url} className="w-full h-full object-cover rounded-[2.5rem]" alt={imam.name} />
              ) : (
                imam?.name?.[0]
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-none">{imam?.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
                <span className="text-teal-700 bg-teal-50 px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-widest">{imam?.style || 'Scholar'}</span>
                <span className="flex items-center gap-1.5 text-gray-500 font-bold uppercase tracking-widest text-xs"><MapPin size={14} className="text-teal-500"/> {imam?.location || 'Remote'}</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest text-xs bg-emerald-50 px-3 py-1 rounded-xl"><ShieldCheck size={14}/> Verified Khateeb</span>
              </div>
              
              {imam?.bio && (
                <div className="prose prose-lg prose-p:text-gray-600 prose-p:leading-relaxed max-w-none mb-8">
                  <p className="text-xl font-medium leading-relaxed italic">"{imam.bio}"</p>
                </div>
              )}

              {/* expertise */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {['Fiqh', 'Islamic Finance', 'Youth Engagement', 'Family Counseling'].map(t => (
                      <span key={t} className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-100">{t}</span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 md:p-12 mb-20">
          <div className="flex items-center justify-between mb-10">
            <div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4">
                  <Star size={32} className="text-yellow-400 fill-current" />
                  Community Reviews
                </h2>
                <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-2">{reviews.length} Verified Vouchers</p>
            </div>
            <button className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all">Submit Review</button>
          </div>
          
          {reviews.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                <MessageCircle size={48} className="mx-auto text-gray-200 mb-4 opacity-50" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No reviews yet for this scholar.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {reviews.map(review => (
                <div key={review.id} className="bg-gray-50/50 rounded-3xl p-8 border border-gray-100 hover:border-teal-200 transition-all group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-teal-600 text-lg shadow-sm">
                        {review.is_anonymous ? 'A' : (review.reviewer_name?.[0] || 'U')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="font-black text-gray-900 uppercase tracking-tight">
                            {review.is_anonymous ? 'Anonymous User' : review.reviewer_name}
                          </span>
                          <CheckCircle size={14} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-gray-50">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed font-medium">"{review.review_text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
