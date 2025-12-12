import React, { useState, useEffect, useRef } from 'react';
import { Mic, Pause, RotateCcw, AlertTriangle } from 'lucide-react';

export const PracticeCoach = ({ user }: { user: any }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fillerCount, setFillerCount] = useState({ um: 0, uh: 0, yaani: 0, like: 0 });
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support Speech Recognition. Please try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; 

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscriptChunk = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscriptChunk += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscriptChunk) updateTranscriptAndStats(finalTranscriptChunk);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please allow permissions.");
        setIsRecording(false);
      }
    };
    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  useEffect(() => {
    if (isRecording) timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  const updateTranscriptAndStats = (newText: string) => {
    const lowerText = newText.toLowerCase();
    setTranscript(prev => prev + " " + newText);
    const umCount = (lowerText.match(/\b(um|umm)\b/g) || []).length;
    const uhCount = (lowerText.match(/\b(uh|er)\b/g) || []).length;
    const likeCount = (lowerText.match(/\b(like)\b/g) || []).length;
    const yaaniCount = (lowerText.match(/\b(yaani|yani|yani)\b/g) || []).length;
    setFillerCount(prev => ({
      um: prev.um + umCount, uh: prev.uh + uhCount, like: prev.like + likeCount, yaani: prev.yaani + yaaniCount
    }));
    const words = newText.trim().split(/\s+/).length;
    setWordCount(prev => prev + words);
  };

  const toggleRecording = () => {
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else { setError(null); try { recognitionRef.current.start(); setIsRecording(true); } catch (err) { console.error("Mic start error", err); } }
  };

  const reset = () => {
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    setElapsedTime(0); setFillerCount({ um: 0, uh: 0, yaani: 0, like: 0 }); setTranscript(''); setWordCount(0); setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const wpm = elapsedTime > 0 ? Math.round((wordCount / elapsedTime) * 60) : 0;

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                Practice Coach
                {isRecording && (
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </h2>
            <p className="text-gray-500 mt-1">Rehearse your delivery. AI is listening for pacing and fillers.</p>
          </div>
          <div className="text-6xl font-mono font-bold text-emerald-600 tabular-nums">{formatTime(elapsedTime)}</div>
        </header>
        
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                <AlertTriangle size={20} />{error}
            </div>
        )}
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
          <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col shadow-sm">
             <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Mic size={14}/> Live Transcription</h3>
             <div ref={scrollRef} className="flex-1 overflow-y-auto text-2xl leading-relaxed font-serif text-gray-800 p-6 bg-gray-50 rounded-2xl border border-gray-100 custom-scrollbar">
                {transcript || <span className="text-gray-400 italic">Press the microphone to start speaking...</span>}
             </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
               <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6">Filler Word Counter</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                    <div className="text-5xl font-bold text-amber-500 mb-2">{fillerCount.yaani}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Yaani</div>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                    <div className="text-5xl font-bold text-red-500 mb-2">{fillerCount.um + fillerCount.uh}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Um / Uh</div>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                    <div className="text-5xl font-bold text-blue-500 mb-2">{fillerCount.like}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Like</div>
                 </div>
                 <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                    <div className={`text-5xl font-bold mb-2 ${wpm > 160 ? 'text-red-500' : 'text-emerald-500'}`}>{wpm}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Words / Min</div>
                 </div>
               </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
               <button onClick={toggleRecording} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-red-200 ring-4 ring-red-100 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 ring-4 ring-emerald-100'}`}>
                   {isRecording ? <Pause size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
               </button>
               <button onClick={reset} className="w-16 h-16 rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center text-gray-500 transition-all shadow-sm">
                   <RotateCcw size={24} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};