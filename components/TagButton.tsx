import React from 'react';
import { Tag } from '../types';

interface TagButtonProps {
  tag: Tag;
  onNavigate: (slug: string) => void;
  size?: 'xs' | 'sm' | 'md';
  active?: boolean;
}

const getTagStyles = (tag: string) => {
  const styles = [
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-teal-100 text-teal-800 border-teal-200',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return styles[Math.abs(hash) % styles.length];
};

export const TagButton: React.FC<TagButtonProps> = ({ tag, onNavigate, size = 'sm', active = false }) => {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[9px]',
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-4 py-2 text-xs'
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(tag.slug);
      }}
      className={`
        ${sizeClasses[size]}
        ${getTagStyles(tag.name)}
        rounded-xl font-black uppercase tracking-widest border transition-all cursor-pointer
        hover:scale-105 hover:underline decoration-2 underline-offset-2
        ${active ? 'ring-2 ring-emerald-500 ring-offset-2 scale-105' : 'opacity-90 hover:opacity-100'}
      `}
    >
      {tag.name}
    </button>
  );
};