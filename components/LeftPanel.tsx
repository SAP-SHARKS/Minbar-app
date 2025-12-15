import React from 'react';
import { X } from 'lucide-react';

interface LeftPanelProps {
  activeTool: string | null;
  onClose: () => void;
}

export function LeftPanel({ activeTool, onClose }: LeftPanelProps) {
  if (!activeTool) return null;

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col animate-in slide-in-from-left-4 duration-200 shadow-xl z-20 absolute left-16 h-full top-0">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">
          {activeTool === 'template' && '📝 Templates'}
          {activeTool === 'topic' && '🎯 Topic & Occasion'}
          {activeTool === 'rewrite' && '🔄 AI Rewrite'}
          {activeTool === 'snippets' && '💾 Snippets'}
          {activeTool === 'ai' && '✨ AI Assist'}
          {activeTool === 'settings' && '⚙️ Settings'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTool === 'template' && <TemplatePanel />}
        {activeTool === 'topic' && <TopicPanel />}
        {activeTool === 'rewrite' && <RewritePanel />}
        {activeTool === 'snippets' && <SnippetsPanel />}
        {activeTool === 'ai' && <AIAssistPanel />}
        {activeTool === 'settings' && <div className="text-gray-500 text-sm text-center py-10">Editor Settings</div>}
      </div>
    </div>
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
      <p className="text-sm text-gray-500">Choose a template to start:</p>
      {templates.map(t => (
        <button
          key={t.id}
          className="w-full p-3 text-left border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
        >
          <div className="font-medium text-gray-800">{t.name}</div>
          <div className="text-xs text-gray-500">{t.description}</div>
        </button>
      ))}
    </div>
  );
}

// Topic & Occasion Panel
function TopicPanel() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Occasion</label>
        <select className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option>Jummah</option>
          <option>Eid ul-Fitr</option>
          <option>Eid ul-Adha</option>
          <option>Ramadan</option>
          <option>Islamic New Year</option>
          <option>General</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Topic</label>
        <input 
          type="text"
          placeholder="e.g. Patience, Gratitude..."
          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tone</label>
        <select className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option>Inspirational</option>
          <option>Educational</option>
          <option>Admonishing</option>
          <option>Comforting</option>
          <option>Celebratory</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Length</label>
        <select className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option>Short (10-15 min)</option>
          <option>Medium (15-25 min)</option>
          <option>Long (25-35 min)</option>
        </select>
      </div>

      <button className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm text-sm">
        Generate Khutbah
      </button>
    </div>
  );
}

// AI Rewrite Panel
function RewritePanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Select text in the editor, then choose:</p>
      
      {[
        { label: 'Make it simpler', icon: '📖' },
        { label: 'Make it more eloquent', icon: '✨' },
        { label: 'Add more detail', icon: '📝' },
        { label: 'Shorten it', icon: '✂️' },
        { label: 'Add hadith reference', icon: '📚' },
        { label: 'Add Quran reference', icon: '📗' },
        { label: 'Translate to Arabic', icon: '🌙' },
      ].map((option) => (
        <button
          key={option.label}
          className="w-full p-3 text-left border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center gap-3 text-sm"
        >
          <span>{option.icon}</span>
          <span className="font-medium text-gray-700">{option.label}</span>
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
    <div className="space-y-3">
      <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-500 hover:text-emerald-600 text-sm font-medium">
        + Save Selection as Snippet
      </button>
      
      <div className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Your Snippets</div>
      
      {snippets.map(s => (
        <div
          key={s.id}
          className="p-3 border border-gray-200 rounded-xl hover:border-emerald-500 cursor-pointer bg-gray-50"
        >
          <div className="font-medium text-gray-800 text-sm">{s.title}</div>
          <div className="text-xs text-gray-500 truncate mt-1 font-serif">{s.preview}</div>
        </div>
      ))}
    </div>
  );
}

// AI Assist Panel
function AIAssistPanel() {
    return (
        <div className="text-center py-10">
            <p className="text-sm text-gray-500">AI Assistant is ready.</p>
        </div>
    )
}