import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link as LinkIcon, 
  Undo, Redo, Sparkles, ChevronRight, 
  X, ChevronLeft, Type,
  BookOpen, Globe, Quote, Smile,
  MoreHorizontal, Printer, Minus, Plus,
  FileText, CheckCircle
} from 'lucide-react';

// --- Mock AI Analysis Data ---
const MOCK_AI_DATA = {
  readability: { score: 72, label: "Good", detail: "Grade 8 reading level" },
  arabic: { count: 2, text: "untranslated terms found" },
  citations: { count: 3, text: "verified Hadiths detected" },
  tone: { label: "Inspirational", detail: "High emotional resonance" }
};

export const KhutbahEditor = ({ user }: { user: any }) => {
  const [content, setContent] = useState<string>(`
    <h1>The Power of Patience (Sabr)</h1>
    <p>In the name of Allah, the Most Gracious, the Most Merciful.</p>
    <p><br></p>
    <p>My dear brothers and sisters, today we wish to speak about a quality that liberates the heart: <strong>Patience (Sabr)</strong>. It is often seen as a weakness, but in reality, it is the ultimate strength.</p>
    <p><br></p>
    <p>Look at the story of Prophet Yusuf (AS). After years of betrayal and separation caused by his brothers, what did he say when he had power over them? "No blame will there be upon you today." He chose peace over revenge.</p>
    <p><br></p>
    <h3>The Three Types of Sabr</h3>
    <ul>
      <li>Patience in obeying Allah</li>
      <li>Patience in abstaining from sins</li>
      <li>Patience during calamities</li>
    </ul>
    <p><br></p>
    <p>As the Prophet (SAW) said: "Patience is at the first stroke of a calamity." (Sahih Bukhari)</p>
  `);
  
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fontSize, setFontSize] = useState(11);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Toolbar Actions ---
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleAiCheck = () => {
    setShowAiPanel(true);
    setIsAiLoading(true);
    // Simulate AI thinking time
    setTimeout(() => {
      setIsAiLoading(false);
    }, 1500);
  };

  // Circular Progress Component for Readability
  const CircleProgress = ({ score }: { score: number }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="transform -rotate-90 w-20 h-20">
          <circle
            className="text-gray-200"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="40"
            cy="40"
          />
          <circle
            className={`${score > 70 ? 'text-emerald-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="40"
            cy="40"
          />
        </svg>
        <span className="absolute text-lg font-bold text-gray-700">{score}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FBFD] overflow-hidden">
      
      {/* --- Google Docs Style Header & Toolbar --- */}
      <div className="bg-white px-4 pt-3 pb-2 shadow-sm z-20 border-b border-gray-200 flex flex-col gap-3">
        
        {/* Top Row: Title & Menu */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  defaultValue="Jumu'ah Khutbah - Dec 15" 
                  className="font-medium text-lg text-gray-800 outline-none hover:border-gray-300 border border-transparent px-1 rounded transition-colors"
                />
                <span className="text-gray-400 text-xs px-2 py-0.5 border border-gray-300 rounded-md">Saved</span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'].map(menu => (
                  <button key={menu} className="hover:bg-gray-100 px-2 rounded -ml-2 transition-colors">{menu}</button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={handleAiCheck}
               className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all shadow-sm ${showAiPanel ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'}`}
             >
               <Sparkles size={16} fill="currentColor" className={isAiLoading ? "animate-spin" : ""} />
               {isAiLoading ? 'Analyzing...' : 'Check with AI'}
             </button>
             <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold border border-purple-200">
               {user?.email?.[0]?.toUpperCase() || 'U'}
             </div>
          </div>
        </div>

        {/* Bottom Row: Formatting Toolbar */}
        <div className="flex items-center gap-1 bg-[#EDF2FA] p-1.5 rounded-full w-fit mx-auto md:mx-4">
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
            <button onClick={() => execCmd('undo')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Undo size={16}/></button>
            <button onClick={() => execCmd('redo')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Redo size={16}/></button>
            <button className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Printer size={16}/></button>
          </div>
          
          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
             <div className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:bg-gray-50">
               <span className="text-sm font-medium mr-2">Normal text</span>
               <ChevronRight size={12} className="rotate-90 text-gray-500"/>
             </div>
             <div className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:bg-gray-50">
               <span className="text-sm font-medium mr-2">Arial</span>
               <ChevronRight size={12} className="rotate-90 text-gray-500"/>
             </div>
             <div className="flex items-center gap-2 px-2">
                <button onClick={() => setFontSize(s => Math.max(8, s-1))} className="text-gray-600 hover:bg-gray-200 rounded p-0.5"><Minus size={12}/></button>
                <span className="w-6 text-center text-sm font-medium border border-gray-300 rounded bg-white">{fontSize}</span>
                <button onClick={() => setFontSize(s => Math.min(72, s+1))} className="text-gray-600 hover:bg-gray-200 rounded p-0.5"><Plus size={12}/></button>
             </div>
          </div>

          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
             <button onClick={() => execCmd('bold')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold"><Bold size={16}/></button>
             <button onClick={() => execCmd('italic')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic"><Italic size={16}/></button>
             <button onClick={() => execCmd('underline')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 underline"><Underline size={16}/></button>
             <button className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><Type size={16}/></button>
          </div>

          <div className="flex items-center gap-1 px-2 border-r border-gray-300">
             <button onClick={() => execCmd('justifyLeft')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><AlignLeft size={16}/></button>
             <button onClick={() => execCmd('justifyCenter')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><AlignCenter size={16}/></button>
             <button onClick={() => execCmd('justifyRight')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><AlignRight size={16}/></button>
          </div>
          
          <div className="flex items-center gap-1 px-2">
             <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><List size={16}/></button>
             <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><ListOrdered size={16}/></button>
             <button className="p-1.5 hover:bg-gray-200 rounded text-gray-700"><LinkIcon size={16}/></button>
          </div>
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Editor Area (Left 70%) */}
        <div className={`flex-1 overflow-y-auto bg-[#F9FBFD] relative transition-all duration-300 ${showAiPanel ? 'mr-0' : 'mr-0'}`}>
           <div className="min-h-full py-8 flex justify-center cursor-text" onClick={() => editorRef.current?.focus()}>
              {/* The "Page" */}
              <div 
                ref={editorRef}
                className="bg-white w-full max-w-[816px] min-h-[1056px] shadow-sm my-4 p-[96px] outline-none text-gray-800 leading-relaxed font-serif"
                contentEditable
                suppressContentEditableWarning
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{ __html: content }}
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
              />
           </div>
        </div>

        {/* AI Sidebar (Right 30%) */}
        <div className={`
            bg-white border-l border-gray-200 shadow-xl z-10 flex flex-col transition-all duration-300 ease-in-out
            ${showAiPanel ? 'w-80 md:w-96 translate-x-0' : 'w-0 translate-x-full opacity-0 overflow-hidden'}
        `}>
           <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Sparkles className="text-purple-600" size={18} fill="currentColor"/> 
                 AI Assistant
              </h3>
              <button onClick={() => setShowAiPanel(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                 <X size={18}/>
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isAiLoading ? (
                 <div className="space-y-4 animate-pulse">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>)}
                 </div>
              ) : (
                 <>
                    {/* Readability Score */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-emerald-200 transition-colors">
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                             <BookOpen size={16} className="text-emerald-500"/> Readability
                          </h4>
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">
                             {MOCK_AI_DATA.readability.label}
                          </span>
                       </div>
                       <div className="flex items-center gap-6 mt-4">
                          <CircleProgress score={MOCK_AI_DATA.readability.score} />
                          <div className="flex-1">
                             <p className="text-sm font-medium text-gray-800">{MOCK_AI_DATA.readability.detail}</p>
                             <p className="text-xs text-gray-400 mt-1">Target: Grade 6-9</p>
                          </div>
                       </div>
                    </div>

                    {/* Arabic Check */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-blue-200 transition-colors">
                       <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                             <Globe size={16} className="text-blue-500"/> Arabic Check
                          </h4>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                             {MOCK_AI_DATA.arabic.count}
                          </div>
                          <div>
                             <p className="text-sm font-medium text-gray-800">{MOCK_AI_DATA.arabic.text}</p>
                             <button className="text-xs text-blue-600 font-bold mt-1 hover:underline">Add translations</button>
                          </div>
                       </div>
                    </div>

                    {/* Citations */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-teal-200 transition-colors">
                       <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                             <Quote size={16} className="text-teal-500"/> Citations
                          </h4>
                          <CheckCircle className="text-teal-500" size={16} />
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                             {MOCK_AI_DATA.citations.count}
                          </div>
                          <div>
                             <p className="text-sm font-medium text-gray-800">{MOCK_AI_DATA.citations.text}</p>
                             <p className="text-xs text-gray-400 mt-1">Bukhari, Muslim sources checked</p>
                          </div>
                       </div>
                    </div>

                    {/* Tone Analysis */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-purple-200 transition-colors">
                       <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                             <Smile size={16} className="text-purple-500"/> Tone
                          </h4>
                       </div>
                       <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-purple-900 font-bold text-sm">{MOCK_AI_DATA.tone.label}</p>
                          <p className="text-purple-700 text-xs mt-1">{MOCK_AI_DATA.tone.detail}</p>
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                       <h4 className="font-bold text-indigo-900 text-sm mb-2">AI Suggestion</h4>
                       <p className="text-sm text-indigo-800 leading-relaxed">
                          Your introduction is strong, but consider adding a brief story about Sabr from the Seerah to connect emotionally before moving to the Fiqh points.
                       </p>
                       <div className="mt-3 flex gap-2">
                          <button className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50">Generate Story</button>
                          <button className="text-xs text-indigo-500 font-bold px-2 hover:text-indigo-700">Dismiss</button>
                       </div>
                    </div>
                 </>
              )}
           </div>
           
           <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                 Run Full Audit <ChevronRight size={16} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};