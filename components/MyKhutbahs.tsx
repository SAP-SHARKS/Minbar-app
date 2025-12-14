import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, FileText, Play, Edit3, Loader2, BookOpen } from 'lucide-react';

interface MyKhutbahsProps {
  user: any;
  onEdit: (id: string) => void;
  onLive: (id: string) => void;
  onNavigateLibrary: () => void;
}

export const MyKhutbahs: React.FC<MyKhutbahsProps> = ({ user, onEdit, onLive, onNavigateLibrary }) => {
  const [myKhutbahs, setMyKhutbahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchMyKhutbahs();
    }
  }, [user]);

  const fetchMyKhutbahs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_khutbahs')
      .select('*')
      .eq('user_id', user.uid || user.id)
      .order('updated_at', { ascending: false });
    
    setMyKhutbahs(data || []);
    setLoading(false);
  };

  const filteredKhutbahs = myKhutbahs.filter(k => 
    k.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (k.author && k.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex h-screen md:pl-20 bg-gray-50 items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 xl:p-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Khutbahs</h1>
            <p className="text-gray-500 mt-1">Your personal collection of edited sermons.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search your collection..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64" 
            />
          </div>
        </div>

        {filteredKhutbahs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <BookOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No khutbahs found</h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              {searchQuery ? 'No results for your search.' : 'You haven\'t added any khutbahs to your collection yet. Browse the library to find one.'}
            </p>
            <button 
              onClick={onNavigateLibrary}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Browse Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKhutbahs.map(k => (
              <div key={k.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg">
                    <FileText size={20} />
                  </div>
                  {k.last_delivered_at && (
                    <span className="text-xs text-gray-400 font-medium">
                      Last: {new Date(k.last_delivered_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{k.title}</h3>
                <p className="text-sm text-gray-500 mb-6">{k.author || 'Unknown Author'}</p>
                
                <div className="mt-auto flex gap-3 pt-4 border-t border-gray-50">
                  <button 
                    onClick={() => onEdit(k.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold text-sm transition-colors"
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                  <button 
                    onClick={() => onLive(k.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-sm transition-colors shadow-sm"
                  >
                    <Play size={16} fill="currentColor" /> Go Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
