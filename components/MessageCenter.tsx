import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Phone, Video, MoreVertical, 
  Send, Paperclip, Smile, ArrowLeft, Check, CheckCheck, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// --- TYPES ---

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_1_name: string;
  participant_2_id: string;
  participant_2_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  avatar_color?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const MessageCenter = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // --- Fetch Conversations ---
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoadingConvs(true);
      try {
        const userId = user.id;
        // In a real app, you'd filter by user participation. 
        // Here we fetch all conversations this user is part of.
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
          .order('last_message_at', { ascending: false });

        if (error) throw error;
        
        // Add dynamic avatar colors for UI
        const mapped = (data || []).map((c, i) => ({
          ...c,
          avatar_color: i % 2 === 0 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
        }));
        
        setConversations(mapped);
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoadingConvs(false);
      }
    };

    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel('conversations-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
          setConversations(prev => {
              const updated = prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c);
              return [...updated].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- Fetch Messages for Selected Conversation ---
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConvId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room-${selectedConvId}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`
      }, (payload) => {
          setMessages(prev => {
              // Prevent duplicates from local state optimistic updates
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new as Message];
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedConvId || !user) return;

    const currentText = inputText.trim();
    setInputText("");

    try {
      const newMessage = {
        conversation_id: selectedConvId,
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || 'Me',
        content: currentText,
        created_at: new Date().toISOString(),
        is_read: false
      };

      // Optimistic Update
      const optimisticId = `temp-${Date.now()}`;
      setMessages(prev => [...prev, { ...newMessage, id: optimisticId }]);

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));

      // Update the conversation's last_message preview
      await supabase
        .from('conversations')
        .update({ 
          last_message: currentText, 
          last_message_at: new Date().toISOString() 
        })
        .eq('id', selectedConvId);

    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message.");
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    setMobileShowChat(true);
    // Mark as read in UI
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
  };

  const filteredConversations = conversations.filter(c => 
    c.participant_1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.participant_2_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(c => c.id === selectedConvId);
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden relative">
      
      {/* --- LEFT SIDEBAR (Conversation List) --- */}
      <div className={`
        w-full md:w-96 bg-white border-r border-gray-200 flex flex-col z-10 absolute md:relative h-full transition-transform duration-300
        ${mobileShowChat ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvs ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Loader2 className="animate-spin mb-2" size={24} />
               <span className="text-xs font-bold uppercase tracking-widest">Loading Chats</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map(conv => {
              const otherName = user?.id === conv.participant_1_id ? conv.participant_2_name : conv.participant_1_name;
              return (
                <div 
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex gap-4 hover:bg-gray-50 ${selectedConvId === conv.id ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${conv.avatar_color || 'bg-gray-200 text-gray-600'}`}>
                    {otherName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className={`font-bold text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {otherName}
                      </h4>
                      <span className={`text-xs ${conv.unread_count > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-6">
                <p className="text-sm text-gray-400">No conversations found.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT MAIN AREA (Chat View) --- */}
      <div className={`
        flex-1 flex flex-col bg-[#F0F2F5] absolute md:relative w-full h-full transition-transform duration-300
        ${mobileShowChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileShowChat(false)} className="md:hidden p-2 -ml-2 text-gray-600">
                   <ArrowLeft size={20} />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeConversation?.avatar_color}`}>
                  {(user?.id === activeConversation?.participant_1_id ? activeConversation?.participant_2_name : activeConversation?.participant_1_name)?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm md:text-base">
                    {user?.id === activeConversation?.participant_1_id ? activeConversation?.participant_2_name : activeConversation?.participant_1_name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-xs text-gray-500">Live Connection</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 text-gray-400">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Phone size={20}/></button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Video size={20}/></button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={20}/></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              ) : messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm relative group
                      ${isMe 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                      }
                    `}>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`text-[10px] mt-1 flex justify-end gap-1 ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                        {isMe && (msg.is_read ? <CheckCheck size={12}/> : <Check size={12}/>)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all"
              >
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                  <Paperclip size={20} />
                </button>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 resize-none max-h-32 py-2 min-h-[44px]"
                  rows={1}
                />
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                  <Smile size={20} />
                </button>
                <button 
                  type="submit"
                  disabled={!inputText.trim()} 
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Send size={40} className="text-gray-300 ml-1" />
            </div>
            <p className="text-lg font-medium">Select a conversation to start messaging</p>
            <p className="text-xs mt-2 uppercase tracking-widest font-black opacity-30">Supabase Secure Live Data</p>
          </div>
        )}
      </div>

    </div>
  );
};