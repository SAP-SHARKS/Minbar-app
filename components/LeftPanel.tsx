import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface LeftPanelProps {
  activeTool: string | null;
  onClose: () => void;
}

export function LeftPanel({ activeTool, onClose }: LeftPanelProps) {
  if (!activeTool) return null;

  return (
    <>
      {/* Mobile Overlay - only show on mobile when panel is open */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-full md:w-72 bg-white border-r border-gray-200 flex flex-col animate-in slide-in-from-left-4 duration-200 shadow-xl z-40 md:z-20 absolute left-0 md:left-16 h-full top-0">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            {activeTool === 'template' && '📝 Templates'}
            {activeTool === 'topic' && '🎯 Topic & Occasion'}
            {activeTool === 'rewrite' && '🔄 AI Rewrite'}
            {activeTool === 'snippets' && '💾 Snippets'}
            {activeTool === 'ai' && '✨ AI Assist'}
            {activeTool === 'settings' && '⚙️ Settings'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTool === 'template' && <TemplatePanel />}
          {activeTool === 'topic' && <TopicPanel />}
          {activeTool === 'rewrite' && <RewritePanel />}
          {activeTool === 'snippets' && <SnippetsPanel />}
          {activeTool === 'ai' && <AIAssistPanel />}
          {activeTool === 'settings' && <div className="text-gray-500 text-sm text-center py-10 font-bold uppercase tracking-widest opacity-30">Editor Settings</div>}
        </div>
      </div>
    </>
  );
}

// Template Selection Panel
function TemplatePanel() {
  const templates = [
    { id: 'jummah', name: 'Jummah Khutbah', description: 'Standard Friday sermon structure' },
    { id: 'eid', name: 'Eid Khutbah', description: 'For Eid ul-Fitr or Eid ul-Adha' },
    { id: 'nikah', name: 'Nikah Khutbah', description: 'Wedding sermon' },
    { id: 'janazah', name: 'Janazah Reminder', description: 'Funeral service' },
    { id: 'ramadan', name: 'Ramadan Special', description: 'For the blessed month' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Choose a structure:</p>
      {templates.map(t => (
        <button
          key={t.id}
          className="w-full p-4 text-left border border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
        >
          <div className="font-bold text-gray-800 group-hover:text-emerald-700">{t.name}</div>
          <div className="text-xs text-gray-400 group-hover:text-emerald-600/70">{t.description}</div>
        </button>
      ))}
    </div>
  );
}

// Topic & Occasion Panel
function TopicPanel() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Occasion</label>
        <select className="w-full p-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option>Jummah</option>
          <option>Eid ul-Fitr</option>
          <option>Eid ul-Adha</option>
          <option>Ramadan</option>
          <option>Islamic New Year</option>
          <option>General</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Topic</label>
        <input 
          type="text"
          placeholder="e.g. Patience, Gratitude..."
          className="w-full p-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tone</label>
        <select className="w-full p-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option>Inspirational</option>
          <option>Educational</option>
          <option>Admonishing</option>
          <option>Comforting</option>
          <option>Celebratory</option>
        </select>
      </div>

      <button className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all text-sm uppercase tracking-widest">
        Generate Outline
      </button>
    </div>
  );
}

// AI Rewrite Panel
function RewritePanel() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Refine selected text:</p>
      
      {[
        { label: 'Make it simpler', icon: '📖' },
        { label: 'Make it more eloquent', icon: '✨' },
        { label: 'Add more detail', icon: '📝' },
        { label: 'Shorten it', icon: '✂️' },
        { label: 'Add Hadith reference', icon: '📚' },
        { label: 'Add Quran reference', icon: '📗' },
        { label: 'Translate to Arabic', icon: '🌙' },
      ].map((option) => (
        <button
          key={option.label}
          className="w-full p-4 text-left border border-gray-100 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center gap-3 group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">{option.icon}</span>
          <span className="font-bold text-gray-700 group-hover:text-purple-700 text-sm">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// Snippets Panel
function SnippetsPanel() {
  const snippets = [
    { id: 1, title: 'Opening Dua', preview: 'إِنَّ الْحَمْدَ لِلَّهِ...' },
    { id: 2, title: 'Taqwa Reminder', preview: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ...' },
    { id: 3, title: 'Closing Dua', preview: 'رَبَّنَا آتِنَا فِي الدُّنْيَا...' },
  ];

  return (
    <div className="space-y-4">
      <button className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase tracking-widest transition-all">
        + Save Selection
      </button>
      
      <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mt-8 mb-2">Saved Fragments</div>
      
      {snippets.map(s => (
        <div
          key={s.id}
          className="p-4 border border-gray-100 rounded-2xl hover:border-emerald-500 cursor-pointer bg-gray-50/50 hover:bg-white transition-all group shadow-sm hover:shadow-md"
        >
          <div className="font-bold text-gray-800 text-sm mb-1 group-hover:text-emerald-600">{s.title}</div>
          <div className="text-xs text-gray-400 truncate font-serif">{s.preview}</div>
        </div>
      ))}
    </div>
  );
}

// AI Assist Panel
function AIAssistPanel() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              {/* Fix: Sparkles is now imported from lucide-react */}
              <Sparkles size={32} />
            </div>
            <p className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">AI Assistant Active</p>
            <p className="text-xs text-gray-400 px-4">Highlight text or use the prompts to generate content automatically.</p>
        </div>
    )
}