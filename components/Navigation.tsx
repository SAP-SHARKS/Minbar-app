import React from 'react';
import { 
  LayoutDashboard, FileText, Mic, Calendar as CalendarIcon, 
  MessageSquare, User, LogOut, Play, GraduationCap, UploadCloud, Book, Sparkles
} from 'lucide-react';
import { KhateebIcon } from './Icons';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, unreadCount }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Library', color: 'emerald' },
    { id: 'my-khutbahs', icon: Book, label: 'My Khutbahs', color: 'rose' },
    { id: 'live', icon: Play, label: 'Live Mode', special: true, color: 'red' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar', color: 'blue' }, 
    { id: 'finder', icon: KhateebIcon, label: 'Khateeb DB', color: 'purple' },
    { id: 'upload', icon: UploadCloud, label: 'Upload', color: 'cyan' },
    { id: 'messages', icon: MessageSquare, label: 'Chat', badge: unreadCount, color: 'indigo' },
    { id: 'editor', icon: FileText, label: 'Composer', color: 'amber' },
    { id: 'practice', icon: Mic, label: 'Coach', color: 'orange' },
    { id: 'learn', icon: GraduationCap, label: 'Academy', color: 'teal' },
    { id: 'profile', icon: User, label: 'Profile', color: 'teal' },
  ];

  return (
    <nav className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 h-screen fixed left-0 top-0 z-30 shadow-sm hidden md:flex">
      <div className="h-14"></div>
      <div className="flex-1 flex flex-col gap-3 w-full px-2 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          
          let activeClasses = "";
          if (isActive) {
             switch (item.color) {
               case 'emerald': activeClasses = "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm"; break;
               case 'rose': activeClasses = "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"; break;
               case 'red': activeClasses = "bg-red-50 text-red-600 border-red-200 shadow-sm"; break;
               case 'blue': activeClasses = "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"; break;
               case 'purple': activeClasses = "bg-purple-50 text-purple-600 border-purple-200 shadow-sm"; break;
               case 'indigo': activeClasses = "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"; break;
               case 'amber': activeClasses = "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"; break;
               case 'orange': activeClasses = "bg-orange-50 text-orange-600 border-orange-200 shadow-sm"; break;
               case 'teal': activeClasses = "bg-teal-50 text-teal-600 border-teal-200 shadow-sm"; break;
               case 'cyan': activeClasses = "bg-cyan-50 text-cyan-600 border-cyan-200 shadow-sm"; break;
               default: activeClasses = "bg-gray-900 text-white";
             }
          } else {
             activeClasses = "text-gray-400 hover:bg-gray-50 hover:text-gray-600 border-transparent";
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                relative w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group border-2 shrink-0
                ${activeClasses}
              `}
            >
              <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge ? (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              ) : null}
              <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
      <button className="mt-auto w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
        <LogOut size={20} />
      </button>
    </nav>
  );
};