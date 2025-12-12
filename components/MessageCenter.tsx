
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Phone, Video, MoreVertical, 
  Send, Paperclip, Smile, ArrowLeft, Check, CheckCheck
} from 'lucide-react';

// --- TYPES (Matching Supabase Schema) ---

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_1_name: string;
  participant_2_id: string; // The other person
  participant_2_name: string;
  last_message: string;
  last_message_at: string; // Timestamp
  unread_count: number;
  avatar_color?: string; // UI helper
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string; // Timestamp
  is_read: boolean;
}

// --- MOCK DATA ---

const CURRENT_USER_ID = "user_me";

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    participant_1_id: "admin_1",
    participant_1_name: "Masjid Al-Huda Admin",
    participant_2_id: CURRENT_USER_ID,
    participant_2_name: "Me",
    last_message: "Could you confirm the topic for Friday?",
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    unread_count: 1,
    avatar_color: "bg-emerald-100 text-emerald-700"
  },
  {
    id: "conv_2",
    participant_1_id: "board_1",
    participant_1_name: "Islamic Center Board",
    participant_2_id: CURRENT_USER_ID,
    participant_2_name: "Me",
    last_message: "JazakAllah Khair for last week.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    unread_count: 0,
    avatar_color: "bg-blue-100 text-blue-700"
  },
  {
    id: "conv_3",
    participant_1_id: "student_1",
    participant_1_name: "Zaid (MSA President)",
    participant_2_id: CURRENT_USER_ID,
    participant_2_name: "Me",
    last_message: "We have setup the projector.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    unread_count: 0,
    avatar_color: "bg-purple-100 text-purple-700"
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "msg_1",
    conversation_id: "conv_1",
    sender_id: "admin_1",
    sender_name: "Masjid Al-Huda Admin",
    content: "Assalamu Alaikum Sheikh, we are looking forward to your Khutbah.",
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    is_read: true
  },
  {
    id: "msg_2",
    conversation_id: "conv_1",
    sender_id: CURRENT_USER_ID,
    sender_name: "Me",
    content: "Wa Alaikum Assalam. I am preparing it now. It will be about Community building.",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    is_read: true
  },
  {
    id: "msg_3",
    conversation_id: "conv_1",
    sender_id: "admin_1",
    sender_name: "Masjid Al-Huda Admin",
    content: "Could you confirm the topic for Friday?",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    is_read: false
  },
  {
    id: "msg_4",
    conversation_id: "conv_2",
    sender_id: "board_1",
    sender_name: "Islamic Center Board",
    content: "JazakAllah Khair for last week.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    is_read: true
  }
];

export const MessageCenter = () => {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Derive active conversation and its messages
  const activeConversation = conversations.find(c => c.id === selectedConvId);
  const activeMessages = messages.filter(m => m.conversation_id === selectedConvId);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // Handle sending a message
  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedConvId) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversation_id: selectedConvId,
      sender_id: CURRENT_USER_ID,
      sender_name: "Me",
      content: inputText,
      created_at: new Date().toISOString(),
      is_read: false
    };

    // 1. Add message to list
    setMessages(prev => [...prev, newMessage]);

    // 2. Update conversation last_message and move to top
    setConversations(prev => {
      const updated = prev.map(c => 
        c.id === selectedConvId 
          ? { ...c, last_message: inputText, last_message_at: new Date().toISOString() }
          : c
      );
      return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    });

    setInputText("");

    // 3. SIMULATE REALTIME RESPONSE (Mocking Supabase Realtime)
    setTimeout(() => {
      const replyText = "JazakAllah Khair, I received your message.";
      const replyMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        conversation_id: selectedConvId,
        sender_id: "other",
        sender_name: activeConversation?.participant_1_name || "User",
        content: replyText,
        created_at: new Date().toISOString(),
        is_read: false
      };
      
      setMessages(prev => [...prev, replyMsg]);
      setConversations(prev => {
        const updated = prev.map(c => 
          c.id === selectedConvId 
            ? { ...c, last_message: replyText, last_message_at: new Date().toISOString() }
            : c
        );
        return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      });
    }, 2000);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    setMobileShowChat(true);
    // Mark as read logic would go here (Supabase update)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
  };

  const formatTime = (isoString: string) => {
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div 
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex gap-4 hover:bg-gray-50 ${selectedConvId === conv.id ? 'bg-emerald-50/50' : ''}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${conv.avatar_color || 'bg-gray-200 text-gray-600'}`}>
                {conv.participant_1_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className={`font-bold text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {conv.participant_1_name}
                  </h4>
                  <span className={`text-xs ${conv.unread_count > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {conv.last_message}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
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
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-20">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileShowChat(false)} className="md:hidden p-2 -ml-2 text-gray-600">
                   <ArrowLeft size={20} />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeConversation?.avatar_color}`}>
                  {activeConversation?.participant_1_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm md:text-base">{activeConversation?.participant_1_name}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-xs text-gray-500">Online</span>
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
              {activeMessages.map((msg) => {
                const isMe = msg.sender_id === CURRENT_USER_ID;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm relative group
                      ${isMe 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                      }
                    `}>
                      <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
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
            <div className="p-4 bg-white border-t border-gray-200">
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
                  style={{ height: 'auto', minHeight: '44px' }}
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
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Send size={40} className="text-gray-300 ml-1" />
            </div>
            <p className="text-lg font-medium">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

    </div>
  );
};
