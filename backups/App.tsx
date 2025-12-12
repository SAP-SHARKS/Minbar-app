import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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

// Safe Firebase Initialization
const initFirebase = () => {
  try {
    const firebaseConfigStr = (window as any).__firebase_config;
    if (!firebaseConfigStr) {
      console.warn("No firebase config found. Running in offline/demo mode.");
      return null;
    }
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    return null;
  }
};

const app = initFirebase();
const auth = app ? getAuth(app) : null;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | { uid: string, isAnonymous: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) {
        // Fallback for demo mode without firebase
        setUser({ uid: 'demo-user', isAnonymous: true });
        setLoading(false);
        return;
      }

      try {
        const token = (window as any).__initial_auth_token;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth failed:", error);
        // Fallback
        setUser({ uid: 'demo-user', isAnonymous: true });
      }
    };

    initAuth();

    if (auth) {
      const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return (
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

            <button
              onClick={() => setActiveTab('profile')}
              className="bg-gray-800 p-1 rounded-full border border-gray-700 hover:bg-gray-700 transition-all group"
              title="My Profile"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner group-hover:scale-105 transition-transform">
                S
              </div>
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 h-full ${activeTab !== 'live' ? 'pt-16' : ''}`}>
        {activeTab === 'dashboard' && <KhutbahLibrary user={user} showHero={true} onStartLive={() => setActiveTab('live')} />}
        {activeTab === 'calendar' && <Scheduler user={user} />}
        {activeTab === 'editor' && <KhutbahEditor user={user} />}
        {activeTab === 'practice' && <PracticeCoach user={user} />}
        {activeTab === 'learn' && <LearningSection user={user} />}
        {activeTab === 'live' && <LiveMinbar user={user} onExit={() => setActiveTab('dashboard')} />}
        {activeTab === 'messages' && <MessageCenter />}
        {activeTab === 'profile' && <ProfileManager user={user} />}
        {activeTab === 'finder' && <KhateebFinder onNavigateProfile={() => setActiveTab('profile')} />}
        {activeTab === 'upload' && <KhutbahUpload onSuccess={() => setActiveTab('dashboard')} />}
      </main>
    </div>
  );
}