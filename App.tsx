import React, { useState, useEffect } from 'react';
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
import { LoginModal } from './components/LoginModal';
import { ImamProfile } from './components/ImamProfile';
import { ImamDetails } from './components/ImamDetails';
import { TopicPage } from './components/TopicPage';

export default function App() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Navigation State
  const [liveKhutbahId, setLiveKhutbahId] = useState<string | null>(null);
  const [editorKhutbahId, setEditorKhutbahId] = useState<string | null>(null);
  const [selectedImamId, setSelectedImamId] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);
  const [librarySelectedKhutbahId, setLibrarySelectedKhutbahId] = useState<string | null>(null);

  // Helper to change tab and clear sub-state
  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'imam-profile' && tab !== 'imam-details' && tab !== 'topic-view' && tab !== 'dashboard') {
      setSelectedImamId(null);
      setSelectedTopicName(null);
      setLibrarySelectedKhutbahId(null);
    }
  };

  const handleNavigateImam = (id: string) => {
    setSelectedImamId(id);
    setSelectedTopicName(null);
    setActiveTab('imam-profile');
  };

  const handleNavigateTopic = (name: string) => {
    setSelectedTopicName(name);
    setSelectedImamId(null);
    setActiveTab('topic-view');
  };

  const handleViewImamDetails = (id: string) => {
    setSelectedImamId(id);
    setActiveTab('imam-details');
  };

  // Supabase Diagnostics
  useEffect(() => {
    const metaEnv = (import.meta as any).env;
    console.log('[ENV] SUPABASE URL:', metaEnv?.VITE_SUPABASE_URL);
    console.log('[ENV] SUPABASE ANON KEY exists:', !!metaEnv?.VITE_SUPABASE_ANON_KEY);
  }, []);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
      <div className="w-12 h-12 bg-emerald-600 rounded-xl animate-pulse"></div>
      <div className="text-emerald-800 font-bold tracking-wider">LOADING MINBAR</div>
    </div>
  );

  return (
    <div className="font-sans antialiased text-gray-900 h-screen overflow-hidden flex bg-gray-50 w-full relative">
      {/* Global Modal */}
      <LoginModal />

      <Navigation activeTab={activeTab} setActiveTab={navigateToTab} unreadCount={2} />

      {activeTab !== 'live' && (
        <div className="fixed top-0 md:left-20 left-0 right-0 h-14 bg-gray-900 text-white flex items-center justify-between px-6 z-20 text-xs shadow-md w-auto">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 px-2 py-0.5 rounded font-bold animate-pulse">NEW</span>
            <span className="truncate max-w-[200px] sm:max-w-md">Imam Conference 2024: Registration is now open! Early bird discounts end Friday.</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="hover:text-gray-300 hidden sm:flex items-center gap-1 text-gray-400">
              <X size={14} /> Dismiss
            </button>

            <UserMenu />
          </div>
        </div>
      )}

      <main className={`flex-1 h-full w-full overflow-hidden ${activeTab !== 'live' ? 'pt-16' : ''}`}>
        {activeTab === 'dashboard' && (
          <KhutbahLibrary 
            user={user} 
            showHero={true}
            onStartLive={(id) => {}} 
            onAddToMyKhutbahs={(id) => {
               setEditorKhutbahId(id);
               setActiveTab('editor');
            }}
            onNavigateImam={handleNavigateImam}
            onNavigateTopic={handleNavigateTopic}
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
            onSaveNew={(id) => {
              setEditorKhutbahId(id);
            }}
          />
        )}
        
        {activeTab === 'practice' && <PracticeCoach user={user} />}
        {activeTab === 'learn' && <LearningSection user={user} />}
        
        {activeTab === 'imam-profile' && selectedImamId && (
          <ImamProfile 
            imamId={selectedImamId} 
            onBack={() => setActiveTab('finder')}
            onViewDetails={() => setActiveTab('imam-details')}
            onNavigateImam={handleNavigateImam}
          />
        )}

        {activeTab === 'imam-details' && selectedImamId && (
          <ImamDetails 
            imamId={selectedImamId} 
            onBack={() => setActiveTab('imam-profile')}
          />
        )}

        {activeTab === 'topic-view' && selectedTopicName && (
          <TopicPage 
            topicName={selectedTopicName}
            onBack={() => setActiveTab('dashboard')}
            onSelectKhutbah={(id) => {
              // Trigger detail view logic within Library if possible, 
              // but for now simplest is to pass the state to Library and switch back
              setLibrarySelectedKhutbahId(id);
              setActiveTab('dashboard');
            }}
            onNavigateImam={handleNavigateImam}
            onNavigateTopic={handleNavigateTopic}
          />
        )}

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
        {activeTab === 'finder' && <KhateebFinder onNavigateImam={handleNavigateImam} onNavigateProfile={() => setActiveTab('profile')} />}
        {activeTab === 'upload' && <KhutbahUpload onSuccess={() => setActiveTab('dashboard')} />}
      </main>
    </div>
  );
}
