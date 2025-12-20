
import React from 'react';
import { Plus, Settings, Layers, MousePointer2, Type, LayoutTemplate } from 'lucide-react';

interface RightSidebarProps {
  onOpenLibrary: () => void;
}

export function RightSidebar({ onOpenLibrary }: RightSidebarProps) {
  const tools = [
    { id: 'elements', icon: Plus, label: 'Add Element', primary: true, onClick: onOpenLibrary },
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'typography', icon: Type, label: 'Global Styling' },
    { id: 'layers', icon: Layers, label: 'Layer Manager' },
  ];

  return (
    <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-6 gap-3 flex-shrink-0 z-[100] fixed right-0 top-0 h-full shadow-lg">
      <div className="mb-4">
        <MousePointer2 size={18} className="text-gray-300" />
      </div>

      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={tool.onClick}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              transition-all duration-200 group relative
              ${tool.primary 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700' 
                : 'hover:bg-gray-50 text-gray-500'
              }
            `}
            title={tool.label}
          >
            <Icon size={20} strokeWidth={isActive => isActive ? 2.5 : 2} />
            
            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tool.label.toUpperCase()}
            </div>
          </button>
        );
      })}
      
      <div className="flex-1" />
      
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 mb-2 transition-colors group relative"
      >
        <Settings size={20} />
        <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          SETTINGS
        </div>
      </button>
    </div>
  );
}
