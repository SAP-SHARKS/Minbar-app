import React, { useState } from 'react';
import { 
  FileText, Target, RefreshCw, Bookmark, 
  Sparkles, Settings, Menu, X 
} from 'lucide-react';

interface LeftToolbarProps {
  onToolSelect: (toolId: string | null) => void;
  activeTool: string | null;
}

export function LeftToolbar({ onToolSelect, activeTool }: LeftToolbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tools = [
    { id: 'template', icon: FileText, label: 'Templates', color: 'text-green-600' },
    { id: 'topic', icon: Target, label: 'Topic', color: 'text-blue-600' },
    { id: 'rewrite', icon: RefreshCw, label: 'Rewrite', color: 'text-purple-600' },
    { id: 'snippets', icon: Bookmark, label: 'Snippets', color: 'text-orange-600' },
    { id: 'ai', icon: Sparkles, label: 'AI Assist', color: 'text-indigo-600' },
  ];

  const handleToolClick = (toolId: string) => {
    const isActive = activeTool === toolId;
    onToolSelect(isActive ? null : toolId);
    if (!isActive) {
      setIsMobileMenuOpen(false); // Close mobile menu when selecting a tool
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button - Top Left */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-3 rounded-xl shadow-lg border border-gray-200"
      >
        {isMobileMenuOpen ? <X size={24} className="text-gray-700" /> : <Menu size={24} className="text-gray-700" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Toolbar + Mobile Slide-in Menu */}
      <div
        className={`
          fixed md:relative
          top-0 left-0
          h-full
          w-16 
          bg-white 
          border-r border-gray-200 
          flex flex-col items-center 
          py-4 gap-2 
          flex-shrink-0 
          z-40 md:z-30
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mobile Menu Header - Only visible on mobile when open */}
        <div className="md:hidden w-full px-2 mb-4 mt-12">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase text-center tracking-widest">Editor Tools</h3>
        </div>

        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-gray-100 shadow-sm' 
                  : 'hover:bg-gray-50'
                }
              `}
              title={tool.label}
            >
              <Icon 
                size={20} 
                className={isActive ? tool.color : 'text-gray-500 group-hover:text-gray-700'} 
              />
              
              {/* Tooltip - Hidden on mobile */}
              <div className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {tool.label}
              </div>

              {/* Mobile Label - Shows below icon on mobile */}
              <div className="md:hidden absolute top-full mt-1 text-[8px] text-gray-400 font-bold uppercase whitespace-nowrap">
                {tool.label.split(' ')[0]}
              </div>
            </button>
          );
        })}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Settings at bottom */}
        <button
          onClick={() => handleToolClick('settings')}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 mb-2 group relative"
          title="Settings"
        >
          <Settings size={20} />
          
          {/* Mobile Label */}
          <div className="md:hidden absolute top-full mt-1 text-[8px] text-gray-400 font-bold uppercase">
            Settings
          </div>
        </button>
      </div>
    </>
  );
}