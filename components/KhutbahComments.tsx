import React, { useState, useEffect } from 'react';
import { MessageCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  display_name: string | null;
  full_name: string | null;
  email: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profile?: Profile | null;
}

interface KhutbahCommentsProps {
  khutbahId: string;
}

export const KhutbahComments: React.FC<KhutbahCommentsProps> = ({ khutbahId }) => {
  const { user, requireAuth } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (khutbahId) {
        fetchComments();
    }
  }, [khutbahId]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch comments first
      const { data: commentsData, error: commentsError } = await supabase
        .from('khutbah_comments')
        .select('id, content, created_at, user_id')
        .eq('khutbah_id', khutbahId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Get unique user IDs
      const userIds = [...new Set(commentsData?.map(c => c.user_id).filter(Boolean))];

      let enrichedComments: Comment[] = [];

      if (userIds.length > 0) {
        // Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, full_name, email')
          .in('id', userIds);

        if (profilesError) console.warn("Could not fetch profiles:", profilesError.message);

        // Create a map of profiles
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        // Combine comments with profiles
        enrichedComments = (commentsData || []).map(comment => ({
          ...comment,
          user_profile: profilesMap.get(comment.user_id) || null
        }));
      } else {
        enrichedComments = (commentsData || []);
      }

      setComments(enrichedComments);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      // Fix for [object Object]: Ensure we extract the message string or stringify the object
      const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Failed to load comments';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    requireAuth('Sign in to post a comment.', async () => {
      if (!user) return;
      setIsSubmitting(true);
      try {
        const { data, error: sbError } = await supabase
          .from('khutbah_comments')
          .insert({
            khutbah_id: khutbahId,
            user_id: user.id,
            content: commentText.trim()
          })
          .select('id, content, created_at, user_id')
          .single();

        if (sbError) throw sbError;

        // Fetch the user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, full_name, email')
          .eq('id', user.id)
          .single();

        const newComment: Comment = {
          ...data,
          user_profile: profileData || null
        };

        setComments(prev => [newComment, ...prev]);
        setCommentText('');
      } catch (err: any) {
        console.error('Comment error:', err);
        const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown error';
        alert('Failed to post comment: ' + message);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const resolveUserDisplay = (comment: Comment) => {
    const profile = comment.user_profile;
    
    const email = profile?.email || "anonymous@minbar.ai";
    const isAdmin = email === 'zaid.aiesec@gmail.com';
    
    const displayName = profile?.display_name || email;

    return { name: displayName, isAdmin };
  };

  return (
    <div id="comments-section" className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 w-full mt-12 scroll-mt-20">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <MessageCircle size={24} className="text-blue-500" /> 
          Community Discussion ({comments.length})
        </h3>
        {error && (
            <button 
                onClick={fetchComments}
                className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
            >
                <AlertCircle size={14}/> Retry Load
            </button>
        )}
      </div>
      
      <div className="mb-10">
        <textarea 
          value={commentText} 
          onChange={(e) => setCommentText(e.target.value)} 
          placeholder="Add a comment or ask a question..." 
          className="w-full p-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none h-32 text-lg" 
        />
        <div className="flex justify-end mt-4">
          <button 
            onClick={handlePostComment} 
            disabled={isSubmitting || !commentText.trim()} 
            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Post Comment"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm font-medium text-gray-400 animate-pulse uppercase tracking-widest">Loading Conversation</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 rounded-2xl border border-red-100 text-center">
            <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
            <p className="text-red-800 font-bold mb-1">Could not fetch comments</p>
            <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map(c => {
            const { name, isAdmin } = resolveUserDisplay(c);
            
            return (
              <div key={c.id} className="p-6 bg-gray-50/50 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${isAdmin ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-400'}`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{name}</span>
                        {isAdmin && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1 border border-emerald-200 tracking-tighter shadow-sm">
                            <ShieldCheck size={12} className="text-emerald-600" /> Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Contributor</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg pl-1">
                  {c.content}
                </p>
              </div>
            );
          })}
          
          {comments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-10" />
              <p className="font-medium text-lg">No comments yet. Start the conversation!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};