import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Pause, RotateCcw, AlertTriangle, 
  BarChart3, Zap, Info, TrendingUp, CheckCircle, 
  Trophy, AlertCircle, Volume2, X, Gauge, Activity,
  Cpu, Globe, MessageSquare
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface FillerWordConfig {
  id: string;
  word: string;
  category: string;
}

interface FillerStats {
  [key: string]: number;
}

interface SessionSummary {
  wpm: number;
  totalWords: number;
  fillerPercentage: number;
  clarityScore: number;
  duration: number;
  toneConsistency: string;
  confidenceScore: number;
  repetitiveWords: string[];
}

// Hardcoded API Key for testing/sandbox stability
const DEEPGRAM_KEY = 'a4a849d30b5edbcd6150dd47834442e12a9413ee';

export const PracticeCoach = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'local'>('ai');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fillerWords, setFillerWords] = useState<FillerWordConfig[]>([]);
  const [fillerCount, setFillerCount] = useState<FillerStats>({});
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [pacingAlert, setPacingAlert] = useState<{ text: string; color: string } | null>(null);
  const [monotoneWarning, setMonotoneWarning] = useState(false);
  const [repetitiveFlags, setRepetitiveFlags] = useState<string[]>([]);
  
  // Audio & API Refs
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pitchHistoryRef = useRef<number[]>([]);
  const wordFrequencyRef = useRef<Record<string, number>>({});
  const keepAliveIntervalRef = useRef<any>(null);
  
  // Volume/Tone state
  const [volumeLevel, setVolumeLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<any>(null);

  // Fetch dynamic filler words from Supabase
  useEffect(() => {
    const fetchFillerWords = async () => {
      const { data, error } = await supabase
        .from('filler_words')
        .select('*');
      
      if (!error && data) {
        setFillerWords(data);
        // Initialize counts
        const initial: FillerStats = {};
        data.forEach(fw => {
          if (fw.category) initial[fw.category] = 0;
        });
        setFillerCount(initial);
      }
    };
    fetchFillerWords();
  }, []);

  // --- Deepgram Implementation ---
  const startDeepgramStream = async () => {
    try {
      // Ensure existing resources are cleaned before a fresh start
      cleanup(false); // don't stop the session time if it's just a reconnect

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initAudioAnalysis(stream);

      // Secure WebSocket URL with direct authentication token
      const baseUrl = 'wss://api.deepgram.com/v1/listen';
      const params = new URLSearchParams({
        model: 'nova-3',
        smart_format: 'true',
        filler_words: 'true',
        interim_results: 'true',
        token: DEEPGRAM_KEY
      });

      console.log('[Deepgram] Initializing secure connection...');
      const socket = new WebSocket(`${baseUrl}?${params.toString()}`);

      socket.onopen = () => {
        console.log('[Deepgram] WebSocket connection opened');
        
        // ADDED: 1-second Keep-Alive ping to prevent proxy/idle timeouts (Fix for 1006)
        keepAliveIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 1000);

        const mimeType = MediaRecorder.isTypeSupported('audio/webm; codecs=opus') ? 'audio/webm; codecs=opus' : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        });
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      };

      socket.onmessage = (message) => {
        const received = JSON.parse(message.data);
        const transcriptChunk = received.channel?.alternatives[0]?.transcript;
        const words = received.channel?.alternatives[0]?.words || [];

        if (received.is_final && transcriptChunk) {
          setTranscript(prev => (prev ? prev + " " + transcriptChunk : transcriptChunk));
          processWords(words.map((w: any) => ({ 
            word: w.word, 
            isFiller: w.filler || fillerWords.some(fw => fw.word.toLowerCase() === w.word.toLowerCase())
          })));
        }
      };

      socket.onerror = (event) => {
        console.error('[Deepgram] WebSocket Error:', event);
        setError("Transcription engine encountered an error.");
      };

      socket.onclose = (event) => {
        // Clear keep-alive on close
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        
        console.log(`[Deepgram] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        
        // ADDED: Reconnection logic for Error 1006
        if (event.code === 1006 && isRecording) {
          console.warn("[Deepgram] Abnormal closure (1006). Attempting silent reconnection...");
          // Short delay before reconnecting to prevent loops
          setTimeout(() => {
            if (isRecording) startDeepgramStream();
          }, 1000);
        } else if (event.code === 4001 || event.code === 4003) {
          setError("Deepgram Auth failed. Please verify API key.");
          setIsRecording(false);
        }
      };
      
      socketRef.current = socket;
    } catch (err) {
      console.error('[Deepgram] Setup Error:', err);
      setError("Microphone access denied or connection failed.");
      setIsRecording(false);
    }
  };

  // --- Native Implementation ---
  const startLocalRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Native Speech Recognition not supported in this browser.");
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initAudioAnalysis(stream);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const chunk = event.results[i][0].transcript;
            finalTranscript += chunk;
            const words = chunk.trim().split(/\s+/).map((w: string) => ({
              word: w,
              isFiller: fillerWords.some(fw => fw.word.toLowerCase() === w.toLowerCase())
            }));
            processWords(words);
          }
        }
        setTranscript(prev => prev + " " + finalTranscript);
      };

      recognition.onerror = (e: any) => {
        console.error('[Local Speech] Error:', e.error);
        setError(`Local Recognition Error: ${e.error}`);
      };
      
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError("Mic access denied.");
      setIsRecording(false);
    }
  };

  const initAudioAnalysis = (stream: MediaStream) => {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;
    
    const source = ctx.createMediaStreamSource(stream);
    const analyzer = ctx.createAnalyser();
    analyserRef.current = analyzer;
    analyzer.fftSize = 2048;
    source.connect(analyzer);
    
    volumeIntervalRef.current = setInterval(monitorAudio, 150);
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    let maxVal = 0, maxIdx = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
      if (dataArray[i] > maxVal) { maxVal = dataArray[i]; maxIdx = i; }
    }
    setVolumeLevel(Math.min(100, (sum / bufferLength / 128) * 100));

    if (maxVal > 35) {
      pitchHistoryRef.current.push(maxIdx);
      if (pitchHistoryRef.current.length > 70) pitchHistoryRef.current.shift();
      if (pitchHistoryRef.current.length >= 50) {
        const mean = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length;
        const variance = pitchHistoryRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pitchHistoryRef.current.length;
        setMonotoneWarning(variance < 1.6);
      }
    }
  };

  const processWords = (words: { word: string; isFiller: boolean }[]) => {
    setWordCount(prev => prev + words.length);
    
    const newFillerCounts = { ...fillerCount };
    const fillerWordMap = fillerWords.reduce((acc, fw) => ({ ...acc, [fw.word.toLowerCase()]: fw.category }), {} as Record<string, string>);

    words.forEach(({ word, isFiller }) => {
      const lower = word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      
      if (isFiller) {
        const category = fillerWordMap[lower] || 'um'; // Default category
        newFillerCounts[category] = (newFillerCounts[category] || 0) + 1;
      } else if (lower.length > 3) {
        // Frequency check for non-filler words
        wordFrequencyRef.current[lower] = (wordFrequencyRef.current[lower] || 0) + 1;
      }
    });

    setFillerCount(newFillerCounts);

    // After 1 minute, flag repetitive non-filler words
    if (elapsedTime > 60) {
      const repetitive = (Object.entries(wordFrequencyRef.current) as [string, number][])
        .filter(([_, count]) => count > 3)
        .map(([w]) => w);
      setRepetitiveFlags(repetitive);
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
      activeTab === 'ai' ? startDeepgramStream() : startLocalRecognition();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isRecording, activeTab]);

  const cleanup = (fullCleanup = true) => {
    if (fullCleanup && timerRef.current) clearInterval(timerRef.current);
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
    
    // Safety narrowed checks for refs
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== 'closed') {
      try { ctx.close(); } catch (e) {}
    }

    setVolumeLevel(0);
    setMonotoneWarning(false);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  const wpm = elapsedTime > 0 ? Math.round((wordCount / elapsedTime) * 60) : 0;

  useEffect(() => {
    if (!isRecording || elapsedTime < 4) { setPacingAlert(null); return; }
    if (wpm > 160) setPacingAlert({ text: "Slow Down", color: "text-red-500" });
    else if (wpm < 105 && wpm > 0) setPacingAlert({ text: "Speed Up", color: "text-amber-500" });
    else setPacingAlert({ text: "Perfect Pacing", color: "text-emerald-500" });
  }, [wpm, isRecording, elapsedTime]);

  const generateSummary = () => {
    const totalFillers = (Object.values(fillerCount) as number[]).reduce((a, b) => a + b, 0);
    const fillerPct = wordCount > 0 ? (totalFillers / wordCount) * 100 : 0;
    const clarity = Math.max(0, 100 - (fillerPct * 3));
    const confidence = Math.min(100, Math.round(clarity + (volumeLevel > 35 ? 10 : 0) + (!monotoneWarning ? 15 : 0)));

    setSummary({
      wpm: wpm,
      totalWords: wordCount,
      fillerPercentage: Math.round(fillerPct),
      clarityScore: Math.round(clarity),
      duration: elapsedTime,
      toneConsistency: !monotoneWarning ? 'Dynamic' : 'Measured',
      confidenceScore: confidence,
      repetitiveWords: repetitiveFlags
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      generateSummary();
    } else {
      setSummary(null);
      setError(null);
      setTranscript('');
      setWordCount(0);
      setElapsedTime(0);
      wordFrequencyRef.current = {};
      setRepetitiveFlags([]);
      pitchHistoryRef.current = [];
      setIsRecording(true);
    }
  };

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-end mb-8 shrink-0">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                Practice Coach 
                {isRecording && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
            </h2>
            <div className="flex bg-gray-200/60 p-1 rounded-xl w-fit mt-4 border border-gray-200">
                <button onClick={() => !isRecording && setActiveTab('ai')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}><Cpu size={14}/> AI Coach (Deepgram)</button>
                <button onClick={() => !isRecording && setActiveTab('local')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'local' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'} ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}><Globe size={14}/> Local Coach (Free)</button>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-6xl font-mono font-bold text-emerald-600 tabular-nums leading-none mb-1">
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Session</div>
          </div>
        </header>
        
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={24} className="mt-1 shrink-0" />
                <div className="flex flex-col"><span className="font-bold text-lg">Connection Issue</span><span className="text-sm opacity-80">{error}</span></div>
            </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-10 border border-gray-200 flex flex-col shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
                <div className={`h-full transition-all duration-300 ${activeTab === 'ai' ? 'bg-indigo-500' : 'bg-emerald-500'}`} style={{ width: `${volumeLevel}%` }}></div>
             </div>
             
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className={activeTab === 'ai' ? "text-indigo-500" : "text-emerald-500"}/> 
                    {activeTab === 'ai' ? 'Deepgram Nova-3 Stream' : 'Browser Speech Engine'}
                </h3>
                {pacingAlert && (
                    <div className={`flex items-center gap-2 text-sm font-black uppercase tracking-wider animate-pulse ${pacingAlert.color}`}>
                        {pacingAlert.text.includes("Slow") ? <TrendingUp className="rotate-45" /> : <TrendingUp className="-rotate-45" />} {pacingAlert.text}
                    </div>
                )}
             </div>

             <div ref={scrollRef} className="flex-1 overflow-y-auto text-2xl md:text-3xl leading-relaxed font-serif text-gray-800 p-8 bg-gray-50/50 rounded-3xl border border-gray-100 custom-scrollbar">
                {transcript || (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center gap-4">
                        <Volume2 size={48} strokeWidth={1} className="opacity-20" />
                        <p className="text-xl italic font-sans">{isRecording ? "Listening..." : "Click record to begin coaching session."}</p>
                    </div>
                )}
             </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            {summary && (
                <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Trophy size={20} className="text-amber-400" /> Toastmasters Summary</h3>
                            <button onClick={() => setSummary(null)} className="text-white/40 hover:text-white"><X size={18}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="text-4xl font-black">{summary.confidenceScore}%</div>
                                <div className="text-[9px] uppercase font-bold text-indigo-300 tracking-widest mt-1">Confidence</div>
                            </div>
                            <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="text-4xl font-black">{summary.wpm}</div>
                                <div className="text-[9px] uppercase font-bold text-indigo-300 tracking-widest mt-1">Avg WPM</div>
                            </div>
                        </div>
                        {summary.repetitiveWords.length > 0 && (
                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-red-300 uppercase tracking-tighter">Repetitive Phrases:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {summary.repetitiveWords.slice(0, 5).map(w => <span key={w} className="px-2 py-0.5 bg-red-500/20 text-red-100 rounded text-[10px] font-bold uppercase">{w}</span>)}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setIsRecording(false)} className="w-full mt-4 py-3 bg-white text-indigo-900 rounded-xl font-black text-sm uppercase shadow-lg hover:bg-indigo-50 transition-all">New Practice</button>
                    </div>
                    <BarChart3 size={120} className="absolute -bottom-4 -right-4 text-white/5 pointer-events-none" />
                </div>
            )}

            {!summary && (
              <>
                <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Gauge size={14} className="text-emerald-500" /> Real-time Performance
                  </h3>
                  
                  <div className="relative h-32 flex flex-col items-center justify-center mb-6">
                    <div className="text-5xl font-black text-gray-900 mb-1">{wpm}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Words / Minute</div>
                    <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-1000 ${wpm > 160 ? 'bg-red-500' : wpm < 105 && wpm > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (wpm / 220) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Live Filler Counter</h4>
                    <div className="grid grid-cols-3 gap-3">
                        {['um', 'yaani', 'like'].map(cat => (
                            <div key={cat} className={`text-center p-2 rounded-lg ${cat === 'um' ? 'bg-red-50 text-red-600' : cat === 'yaani' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                <div className="text-lg font-black">{fillerCount[cat] || 0}</div>
                                <div className="text-[8px] font-black uppercase">{cat.toUpperCase()}</div>
                            </div>
                        ))}
                        <div className="text-center p-2 rounded-lg bg-purple-50 col-span-3 flex justify-between px-4 items-center">
                            <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Voice Intensity</span>
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-2 h-4 rounded-sm ${i < Math.round(volumeLevel / 20) ? 'bg-purple-600' : 'bg-purple-200'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-gray-50 rounded-[2.5rem] border-4 border-dashed border-gray-200 p-8 transition-all hover:bg-gray-100/50">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={toggleRecording} 
                      className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 group relative ${isRecording ? 'bg-red-500 hover:bg-red-600 ring-8 ring-red-100' : 'bg-emerald-600 hover:bg-emerald-700 ring-8 ring-emerald-100'}`}
                    >
                        {isRecording ? <Pause size={32} fill="white" className="text-white" /> : <Mic size={32} fill="white" className="text-white" />}
                        {isRecording && <span className="absolute -bottom-10 whitespace-nowrap text-red-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Analysis Active</span>}
                    </button>
                    <button onClick={() => { cleanup(); setIsRecording(false); setTranscript(''); setWordCount(0); setElapsedTime(0); setFillerCount({}); setRepetitiveFlags([]); }} className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 hover:bg-gray-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-all shadow-lg active:scale-90">
                        <RotateCcw size={24} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};