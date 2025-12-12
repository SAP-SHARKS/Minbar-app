import React, { useState } from 'react';
import { 
  Play, FileText, Clock, Eye, GraduationCap, 
  BookOpen, ChevronRight, Mic, Users, Heart, Star 
} from 'lucide-react';

export const LearningSection = ({ user }: { user: any }) => {
  const [activeFilter, setActiveFilter] = useState('All');

  const resources = [
    {
      id: 1,
      type: 'video',
      title: 'The Prophetic Method of Public Speaking',
      author: 'Sheikh Omar Suleiman',
      duration: '15 min',
      category: 'Delivery',
      color: 'bg-indigo-100 text-indigo-600',
      views: '12k'
    },
    {
      id: 2,
      type: 'article',
      title: 'Structuring Your Jumu\'ah Khutbah: The 5 Pillars',
      author: 'Mufti Menk',
      duration: '5 min read',
      category: 'Structure',
      color: 'bg-emerald-100 text-emerald-600',
      views: '8.5k'
    },
    {
      id: 3,
      type: 'video',
      title: 'Engaging the Youth: Connecting with Gen Z',
      author: 'Nouman Ali Khan',
      duration: '22 min',
      category: 'Engagement',
      color: 'bg-orange-100 text-orange-600',
      views: '18k'
    },
    {
      id: 4,
      type: 'article',
      title: 'The Fiqh of the Khutbah: What is Mandatory?',
      author: 'Dr. Yasir Qadhi',
      duration: '12 min read',
      category: 'Fiqh',
      color: 'bg-purple-100 text-purple-600',
      views: '5.2k'
    },
    {
      id: 5,
      type: 'video',
      title: 'Voice Modulation and Body Language Techniques',
      author: 'Br. Mohammed',
      duration: '10 min',
      category: 'Delivery',
      color: 'bg-pink-100 text-pink-600',
      views: '3.4k'
    },
    {
      id: 6,
      type: 'article',
      title: 'Preparation Checklist: Before You Step on the Minbar',
      author: 'Imam Zaid Shakir',
      duration: '7 min read',
      category: 'Preparation',
      color: 'bg-teal-100 text-teal-600',
      views: '9.1k'
    }
  ];

  const filteredResources = activeFilter === 'All' 
    ? resources 
    : resources.filter(r => r.category === activeFilter);

  const filters = ['All', 'Delivery', 'Structure', 'Fiqh', 'Engagement', 'Preparation'];

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[2000px] mx-auto p-8 xl:p-12">
          
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 flex items-center gap-4">
                Khutbah Academy
                <span className="bg-cyan-100 text-cyan-700 text-sm px-3 py-1.5 rounded-full uppercase tracking-wide font-bold">Beta</span>
              </h2>
              <p className="text-gray-500 mt-3 text-xl">Master the art of effective sermon delivery with curated resources.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 text-base shadow-sm transition-all">
                <BookOpen size={20} /> My Library
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-cyan-900 to-blue-900 rounded-[2.5rem] p-12 md:p-16 text-white shadow-2xl relative overflow-hidden mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="relative z-10 max-w-4xl">
               <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-8">
                 <Star size={14} fill="currentColor" /> Featured Course
               </div>
               <h3 className="text-5xl md:text-6xl xl:text-7xl font-serif font-bold mb-6 leading-tight">The Art of Storytelling in Islam</h3>
               <p className="text-cyan-100 text-2xl mb-10 leading-relaxed font-light max-w-3xl">
                 Learn how to weave narratives from the Quran and Sunnah to captivate your audience and deliver powerful, memorable messages.
               </p>
               <div className="flex gap-6">
                 <button className="bg-cyan-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-900/20 flex items-center gap-3 text-lg">
                    <Play size={24} fill="currentColor" /> Start Watching
                 </button>
                 <button className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-colors text-lg">
                    View Syllabus
                 </button>
               </div>
             </div>
             
             {/* Decorative Elements */}
             <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
             <div className="absolute top-0 right-32 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
             <GraduationCap className="absolute right-16 top-1/2 -translate-y-1/2 text-white/5 w-96 h-96 rotate-12 pointer-events-none" />
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-12 overflow-x-auto pb-4 custom-scrollbar">
            {filters.map(f => (
                <button 
                  key={f} 
                  onClick={() => setActiveFilter(f)} 
                  className={`
                    px-6 py-3 rounded-full text-base font-bold whitespace-nowrap transition-all border-2
                    ${activeFilter === f 
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  {f}
                </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {filteredResources.map(resource => (
              <div key={resource.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2 overflow-hidden">
                <div className={`h-64 ${resource.color} relative flex items-center justify-center`}>
                   <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300 text-gray-800">
                      {resource.type === 'video' ? <Play size={32} className="ml-1" fill="currentColor"/> : <FileText size={32} />}
                   </div>
                   <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      {resource.type === 'video' ? <Clock size={14}/> : <BookOpen size={14}/>}
                      {resource.duration}
                   </div>
                </div>
                <div className="p-8">
                   <div className="flex justify-between items-start mb-4">
                     <span className={`text-xs uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500`}>
                        {resource.category}
                     </span>
                     <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium">
                        <Eye size={16}/> {resource.views}
                     </div>
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-cyan-700 transition-colors">
                     {resource.title}
                   </h3>
                   <div className="flex items-center gap-3 mt-6">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                        {resource.author.charAt(0)}
                      </div>
                      <span className="text-base font-medium text-gray-500">{resource.author}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  );
};