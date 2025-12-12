import React, { useState } from 'react';
import { 
  Clock, Calendar as CalendarIcon, MapPin, ChevronLeft, ChevronRight, 
  CheckCircle, FileText, Check, X as XIcon 
} from 'lucide-react';

export const Scheduler = ({ user }: { user: any }) => {
  const [pendingRequests, setPendingRequests] = useState([
    { id: 3, org: "Islamic Center West", date: "Friday, Dec 22", time: "1:00 PM", topic: "Family Rights", fee: "$200" },
    { id: 4, org: "University MSA", date: "Wednesday, Dec 20", time: "5:00 PM", topic: "Exam Stress", fee: "Volunteer" }
  ]);

  const handleAction = (id: number) => {
      setPendingRequests(pendingRequests.filter(req => req.id !== id));
  };

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden mb-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="relative z-10 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300 font-bold uppercase tracking-wider text-[10px] mb-4"><Clock size={12}/> Next Engagement</div>
                        <h3 className="text-4xl md:text-5xl font-serif font-bold mb-3 leading-tight">Jumu'ah Khutbah</h3>
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-gray-300 text-lg">
                            <span className="flex items-center gap-2"><CalendarIcon size={20}/> Friday, Dec 15</span>
                            <span className="hidden md:inline">•</span>
                            <span className="flex items-center gap-2"><Clock size={20}/> 1:00 PM</span>
                            <span className="hidden md:inline">•</span>
                            <span className="flex items-center gap-2"><MapPin size={20}/> Masjid Al-Huda</span>
                        </div>
                    </div>
                    <div className="relative z-10 mt-6 md:mt-0 flex flex-col items-center gap-2">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[120px]">
                            <div className="text-5xl font-bold text-white mb-1">15</div>
                            <div className="text-sm font-bold uppercase text-emerald-400 tracking-widest">Dec</div>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">December 2024</h2>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"><ChevronLeft size={20} className="text-gray-600"/></button>
                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"><ChevronRight size={20} className="text-gray-600"/></button>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-7 border-b border-gray-100">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>))}</div>
                            <div className="grid grid-cols-7 grid-rows-5 h-[500px]">
                                {Array.from({length: 35}).map((_, i) => {
                                    const day = i + 1 <= 31 ? i + 1 : '';
                                    const isToday = day === 12;
                                    const hasEvent = day === 15 || day === 22;
                                    return (
                                        <div key={i} className={`p-2 border-r border-b border-gray-50 relative group transition-colors hover:bg-gray-50 ${day ? '' : 'bg-gray-50/30'}`}>
                                            {day && (<><span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${isToday ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>{day}</span>{hasEvent && (<div className="mt-2 text-[10px] bg-emerald-100 text-emerald-800 p-1.5 rounded font-bold truncate border border-emerald-200">1:00 PM Khutbah</div>)}</>)}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-gray-900 text-lg">Khutbah Requests</h3><span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{pendingRequests.length} New</span></div>
                            {pendingRequests.length === 0 ? (<div className="text-center py-8 text-gray-400"><CheckCircle size={32} className="mx-auto mb-2 opacity-20"/><p className="text-sm">All caught up!</p></div>) : (<div className="space-y-4">{pendingRequests.map(req => (<div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors group"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-gray-900">{req.org}</h4><span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100">{req.fee}</span></div><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CalendarIcon size={12}/> {req.date}</p><p className="text-xs text-gray-700 font-medium mb-4 flex items-center gap-1"><FileText size={12}/> {req.topic}</p><div className="flex gap-2"><button onClick={() => handleAction(req.id)} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"><Check size={14}/> Accept</button><button onClick={() => handleAction(req.id)} className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"><XIcon size={14}/> Pass</button></div></div>))}</div>)}
                            <button className="w-full mt-6 text-xs font-bold text-gray-400 hover:text-gray-600 py-2">View Past Requests</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
