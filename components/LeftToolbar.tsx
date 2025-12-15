import React from 'react';
import { 
  FileText, Target, RefreshCw, Bookmark, 
  Sparkles, Settings 
} from 'lucide-react';

interface LeftToolbarProps {
  onToolSelect: (toolId: string | null) => void;
  activeTool: string | null;
}

export function LeftToolbar({ onToolSelect, activeTool }: LeftToolbarProps) {
  const tools = [
    { id: 'template', icon: FileText, label: 'Templates', color: 'text-green-600' },
    { id: 'topic', icon: Target, label: 'Topic', color: 'text-blue-600' },
    { id: 'rewrite', icon: RefreshCw, label: 'Rewrite', color: 'text-purple-600' },
    { id: 'snippets', icon: Bookmark, label: 'Snippets', color: 'text-orange-600' },
    // Images removed as per request
    { id: 'ai', icon: Sparkles, label: 'AI Assist', color: 'text-indigo-600' },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 flex-shrink-0 z-30">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => onToolSelect(isActive ? null : tool.id)}
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
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tool.label}
            </div>
          </button>
        );
      })}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Settings at bottom */}
      <button
        onClick={() => onToolSelect('settings')}
        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 mb-2"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  );
}