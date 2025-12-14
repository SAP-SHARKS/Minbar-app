import React, { useState } from 'react';
import { X } from 'lucide-react';

import { Navigation } from './components/Navigation';
import { LiveMinbar } from './components/LiveMinbar';
import { KhutbahLibrary } from './components/KhutbahLibrary';
import { Scheduler } from './components/Scheduler';
import { KhutbahEditor } from './components/KhutbahEditor';
import { PracticeCoach } from './components/PracticeCoach';
import { MessageCenter } from './components/MessageCenter';
import { KhateebFinder } from './components/KhateebFinder';
import { ProfileManager } from './components/ProfileManager';
import { LearningSection } from './components/LearningSection';
import { KhutbahUpload } from './components/KhutbahUpload';
import { MyKhutbahs } from './components/MyKhutbahs';
import { UserMenu } from './components/UserMenu';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Navigation State
  const [liveKhutbahId, setLiveKhutbahId] = useState<string | null>(null);
  const [editorKhutbahId, setEditorKhutbahId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
      <div className="w-12 h-12 bg-emerald-600 rounded-xl animate-pulse"></div>
      <div className="text-emerald-800 font-bold tracking-wider">LOADING MINBAR</div>
    </div>
  );

  return (
    <div className="font-sans antialiased text-gray-900 h-screen overflow-hidden flex bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={2} />

      {activeTab !== 'live' && (
        <div className="fixed top-0 md:left-20 left-0 right-0 h-14 bg-gray-900 text-white flex items-center justify-between px-6 z-20 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 px-2 py-0.5 rounded font-bold animate-pulse">NEW</span>
            <span className="truncate max-w-md">Imam Conference 2024: Registration is now open! Early bird discounts end Friday.</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="hover:text-gray-300 flex items-center gap-1 text-gray-400">
              <X size={14} /> Dismiss
            </button>

            <UserMenu />
          </div>
        </div>
      )}

      <main className={`flex-1 h-full ${activeTab !== 'live' ? 'pt-16' : ''}`}>
        {activeTab === 'dashboard' && (
          <KhutbahLibrary 
            user={user} 
            showHero={true}
            onStartLive={(id) => {
              // Usually from Library we view details, then add to My Khutbahs
              // But if we want to support direct live (read only), we could
              // For now, let's keep Library navigation internal
            }} 
            onAddToMyKhutbahs={(id) => {
               setEditorKhutbahId(id);
               setActiveTab('editor');
            }}
          />
        )}
        
        {activeTab === 'my-khutbahs' && (
          <MyKhutbahs 
            user={user}
            onEdit={(id) => {
              setEditorKhutbahId(id);
              setActiveTab('editor');
            }}
            onLive={(id) => {
              setLiveKhutbahId(id);
              setActiveTab('live');
            }}
            onNavigateLibrary={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'calendar' && <Scheduler user={user} />}
        
        {activeTab === 'editor' && (
          <KhutbahEditor 
            user={user} 
            khutbahId={editorKhutbahId} 
            onGoLive={(id) => {
                setLiveKhutbahId(id);
                setActiveTab('live');
            }}
          />
        )}
        
        {activeTab === 'practice' && <PracticeCoach user={user} />}
        {activeTab === 'learn' && <LearningSection user={user} />}
        
        {activeTab === 'live' && (
          <LiveMinbar 
            user={user} 
            khutbahId={liveKhutbahId}
            onExit={() => {
              setActiveTab('my-khutbahs');
              setLiveKhutbahId(null);
            }} 
          />
        )}
        
        {activeTab === 'messages' && <MessageCenter />}
        {activeTab === 'profile' && <ProfileManager user={user} />}
        {activeTab === 'finder' && <KhateebFinder onNavigateProfile={() => setActiveTab('profile')} />}
        {activeTab === 'upload' && <KhutbahUpload onSuccess={() => setActiveTab('dashboard')} />}
      </main>
    </div>
  );
}