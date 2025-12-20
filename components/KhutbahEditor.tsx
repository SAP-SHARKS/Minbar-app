
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Loader2, Save, Sparkles, X, LayoutList,
  PlusCircle, Trash2, ChevronUp, ChevronDown, Edit3, Palette,
  CheckCircle2, Clock, AlignLeft, Languages
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { RichTextEditor, EditorToolbar } from './RichTextEditor';
import { LeftToolbar } from './LeftToolbar';
import { LeftPanel } from './LeftPanel';
import { RightSidebar } from './RightSidebar';
import { BlockLibrary } from './BlockLibrary/BlockLibrary';
import { CategoryId, BlockItem } from './BlockLibrary/types';

interface KhutbahEditorProps {
  user: any;
  khutbahId: string | null;
  onGoLive?: (id: string) => void;
  onSaveNew?: (id: string) => void;
}

// --- Card Editing Modal Component ---
function CardEditModal({ card, onSave, onClose, isSaving }: { card: any, onSave: (updated: any) => void, onClose: () => void, isSaving: boolean }) {
  const [editedCard, setEditedCard] = useState({ ...card });

  const addPoint = () => {
    setEditedCard({ ...editedCard, bullet_points: [...(editedCard.bullet_points || []), ''] });
  };

  const updatePoint = (idx: number, val: string) => {
    const pts = [...editedCard.bullet_points];
    pts[idx] = val;
    setEditedCard({ ...editedCard, bullet_points: pts });
  };

  const removePoint = (idx: number) => {
    setEditedCard({ ...editedCard, bullet_points: editedCard.bullet_points.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Edit Summary Card</h2>
          <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Section Type</label>
              <select 
                value={editedCard.section_label}
                onChange={(e) => setEditedCard({...editedCard, section_label: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
              >
                <option value="INTRO">Introduction</option>
                <option value="MAIN">Main Point</option>
                <option value="HADITH">Hadith</option>
                <option value="QURAN">Quran</option>
                <option value="STORY">Story</option>
                <option value="PRACTICAL">Practical</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
              <input 
                value={editedCard.title}
                onChange={(e) => setEditedCard({...editedCard, title: e.target.value})}
                placeholder="Section Title"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
              Bullet Points <span>{editedCard.bullet_points?.length || 0}</span>
            </label>
            {(editedCard.bullet_points || []).map((pt: string, i: number) => (
              <div key={i} className="flex gap-2 group">
                <input 
                  value={pt}
                  onChange={(e) => updatePoint(i, e.target.value)}
                  placeholder={`Point ${i+1}`}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button onClick={() => removePoint(i)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => addPoint()}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all"
            >
              + ADD TALKING POINT
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arabic Text (Optional)</label>
            <textarea 
              value={editedCard.arabic_text || ''}
              onChange={(e) => setEditedCard({...editedCard, arabic_text: e.target.value})}
              dir="rtl"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-serif text-xl h-24 resize-none"
              placeholder="إِنَّ الْحَمْدَ لِلَّهِ..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/30">
          <button onClick={() => onClose()} className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
          <button 
            onClick={() => onSave(editedCard)} 
            disabled={isSaving}
            className="flex-[2] py-3 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
}

export function KhutbahEditor({ user, khutbahId, onGoLive, onSaveNew }: KhutbahEditorProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [khutbahTitle, setKhutbahTitle] = useState("Untitled Khutbah");
  const [activeKhutbahId, setActiveKhutbahId] = useState<string | null>(khutbahId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [fontSize, setFontSize] = useState(16);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  
  // Block Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // Summary Cards State
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isCardModalSaving, setIsCardModalSaving] = useState(false);

  // Block Context Toolbar State
  const [selectedBlockEl, setSelectedBlockEl] = useState<HTMLElement | null>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (khutbahId) {
        fetchKhutbahData(khutbahId);
    } else {
        setKhutbahTitle("Untitled Khutbah");
        setContent("");
        setCards([]);
        setSaveStatus('unsaved');
    }
  }, [khutbahId]);

  const fetchKhutbahData = async (id: string) => {
        const { data: kData } = await supabase.from('user_khutbahs').select('*').eq('id', id).single();
        if (kData) {
            setKhutbahTitle(kData.title);
            setContent(kData.content || '');
            setSaveStatus('saved');
            setActiveKhutbahId(id);
            fetchCards(id);
        }
  };

  const fetchCards = async (id: string) => {
    const { data } = await supabase
      .from('user_khutbah_cards')
      .select('*')
      .eq('user_khutbah_id', id)
      .order('card_number', { ascending: true });
    if (data) setCards(data);
  };

  const handleSave = async () => {
      if (!user) return alert("Please sign in to save.");
      setIsSaving(true);
      setSaveStatus('saving');
      try {
          if (activeKhutbahId) {
              await supabase.from('user_khutbahs')
