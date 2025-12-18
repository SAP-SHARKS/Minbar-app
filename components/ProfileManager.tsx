import React, { useState } from 'react';
import { User, LayoutDashboard, Star, Settings, CheckCircle, MapPin } from 'lucide-react';
import { ImamPhotoUpload } from './ImamPhotoUpload';

export const ProfileManager = ({ user }: { user: any }) => {
    const [view, setView] = useState('dashboard');
    const [activeTab, setActiveTab] = useState('Incoming');
    const [profilePhoto, setProfilePhoto] = useState<string | undefined>(user?.user_metadata?.avatar_url);

    const requests = [
        { id: 1, org: 'Masjid Al-Noor', date: 'Dec 14, 2024', topic: 'Youth Issues', status: 'incoming', fee: '£200', initial: 'M', color: 'bg-indigo-500' },
        { id: 2, org: 'Islamic Center East', date: 'Dec 21, 2024', topic: "Guest Jumu'ah", status: 'incoming', fee: 'TBD', initial: 'I', color: 'bg-pink-500' },
        { id: 3, org: 'Downtown Mosque', date: 'Nov 28, 2024', topic: 'Community', status: 'history', fee: '£150', initial: 'D', color: 'bg-blue-500' },
    ];
    const filteredRequests = requests.filter(r => {
        if (activeTab === 'Incoming') return r.status === 'incoming';
        if (activeTab === 'History') return r.status === 'history';
        return false;
    });

    return (
        <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
            <div className="page-container py-8 xl:py-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 w-full">
                    <div><h2 className="text-3xl font-bold text-gray-900">{view === 'dashboard' ? 'My Dashboard' : 'Edit Profile'}</h2><p className="text-gray-500 mt-1">{view === 'dashboard' ? 'Manage your bookings and requests.' : 'Update your public khateeb profile.'}</p></div>
                    {view === 'dashboard' ? (<button onClick={() => setView('edit')} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2 w-full sm:w-auto justify-center"><User size={18} /> Edit Profile</button>) : (<button onClick={() => setView('dashboard')} className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-gray-800 flex items-center gap-2 w-full sm:w-auto justify-center"><LayoutDashboard size={18} /> Back to Dashboard</button>)}
                </div>
                {view === 'dashboard' ? (
                    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center"><div className="text-4xl font-bold text-gray-900 mb-1">142</div><div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Khutbahs Delivered</div></div><div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center"><div className="text-4xl font-bold text-gray-900 mb-1 flex items-center gap-1">4.9 <Star size={24} className="text-yellow-400 fill-current" /></div><div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Average Rating</div></div></div>
                        <div>
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">{['Incoming', 'Sent', 'History'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-gray-500 hover:bg-gray-100'}`}>{tab} {tab === 'Incoming' && <span className="ml-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">2</span>}</button>))}</div>
                            <div className="space-y-4">{filteredRequests.map(req => (<div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4"><div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0 ${req.color}`}>{req.initial}</div><div className="flex-1 min-w-0"><h4 className="font-bold text-gray-900 text-lg truncate">{req.org}</h4><div className="text-sm text-gray-500 flex items-center gap-2"><span>{req.date}</span><span>•</span><span className="text-gray-700 truncate">{req.topic}</span></div><div className="text-xs font-bold text-gray-400 mt-1">{req.fee !== 'TBD' ? `Fee: ${req.fee}` : 'Honorarium: TBD'}</div></div>{activeTab === 'Incoming' && (<div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0"><button className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 text-sm">Decline</button><button className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm text-sm">Accept</button></div>)}</div>))}</div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-8 duration-500 pb-12">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Photo Upload Section in Edit Mode */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 p-3 rounded-full text-blue-600 shrink-0">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Profile Photo</h3>
                                        <p className="text-xs text-gray-500">Update your public avatar</p>
                                    </div>
                                </div>
                                <ImamPhotoUpload 
                                    imamId={user?.id || 'demo-user'} 
                                    currentPhotoUrl={profilePhoto} 
                                    onUploadSuccess={(url) => setProfilePhoto(url)}
                                />
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={20}/> Basic Info</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label><input className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500" defaultValue="Sheikh Abdullah"/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label><input className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500" defaultValue="Imam & Educator"/></div></div><div className="mb-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio</label><textarea className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500 h-24 resize-none" defaultValue="Graduate of Madinah University (2015). Specializes in Fiqh and Youth Issues. Passionate about engaging the next generation."/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zip Code / Area</label><input className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500" defaultValue="SW1A 1AA"/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Travel Distance (Miles)</label><input className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500" defaultValue="50"/></div></div></div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={20}/> Details & Policies</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Honorarium Range</label><input className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500" defaultValue="£150 - 300"/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Response Time</label><select className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-emerald-500"><option>Within 24h</option><option>Within 48h</option><option>1 Week</option></select></div></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Policy Notice</label><input className="w-full bg-amber-50 border border-amber-200 rounded px-3 py-2 outline-none text-amber-800 placeholder-amber-400" defaultValue="2 weeks notice required. Travel expenses for distances over 20 miles."/></div></div>
                        </div>
                        <div className="lg:col-span-1">
                            <h3 className="font-bold text-gray-400 text-sm uppercase mb-4 text-center">Public Preview</h3>
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden relative">
                                <div className="h-24 bg-emerald-600"></div>
                                <div className="px-6 pb-6 relative">
                                    <div className="w-24 h-24 rounded-2xl border-4 border-white absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center text-white text-4xl font-bold shadow-sm bg-emerald-400 overflow-hidden">
                                        {profilePhoto ? (
                                            <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            "S"
                                        )}
                                        <div className="absolute bottom-1 right-1 bg-white rounded-full p-0.5"><CheckCircle size={16} className="text-emerald-500 fill-white"/></div>
                                    </div>
                                    <div className="mt-14 text-center"><h2 className="text-xl font-bold text-gray-900">Sheikh Abdullah</h2><p className="text-emerald-600 font-medium text-sm">Imam & Educator</p><p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1"><MapPin size={10}/> London, UK • 50 mi</p><div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Accepting Requests</div></div><div className="mt-6 text-center"><p className="text-sm text-gray-600 leading-relaxed">Graduate of Madinah University (2015). Specializes in Fiqh and Youth Issues. Passionate about engaging the next generation.</p></div><div className="mt-6 flex flex-wrap justify-center gap-2">{['Fiqh', 'Youth', 'Mental Health'].map(t => (<span key={t} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{t}</span>))}</div><div className="mt-6 pt-6 border-t border-gray-100 space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-500">Honorarium</span><span className="font-bold text-gray-900">£150-300</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Response</span><span className="font-bold text-gray-900">Within 24h</span></div></div><div className="mt-6 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 text-center leading-snug">2 weeks notice required. Travel expenses for distances over 20 miles.</div></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};