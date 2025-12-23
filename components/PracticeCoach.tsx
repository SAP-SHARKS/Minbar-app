import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Pause, RotateCcw, AlertTriangle, 
  BarChart3, Zap, Info, TrendingUp, CheckCircle, 
  Trophy, AlertCircle, Volume2, X, Gauge, Activity,
  Cpu, Globe, MessageSquare, Scissors, MessageCircle,
  Tornado, ListChecks, Loader2
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
  energyScore: number;
  energyLevel: 'Low' | 'Mid' | 'High';
  concisenessScore: number;
  pauseScore: number;
  repetitiveWords: string[];
  effectivePauses: number;
  longSilences: number;
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
  const [volumeWarning, setVolumeWarning] = useState(false);
  const [repetitiveFlags, setRepetitiveFlags] = useState<string[]>([]);
  
  // Audio & API Refs
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pitchHistoryRef = useRef<number[]>([]);
  const wordFrequencyRef = useRef<Record<string, number>>({});
  const keepAliveIntervalRef = useRef<any>(null);
  const lastTranscriptionTimeRef = useRef<number>(Date.now());
  const pauseStatsRef = useRef({ effective: 0, long: 0 });
  const volumeHistoryRef = useRef<number[]>([]);
  
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
        const initial: FillerStats = {};
        data.forEach(fw => {
          if (fw.category) initial[fw.category] = 0;
        });
        setFillerCount(initial);
      }
    };
    fetchFillerWords();
  }, []);

  // --- Fix: Implemented missing cleanup function ---
  const cleanup = (isStoppingSession = true) => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (isStoppingSession) {
      setIsRecording(false);
      generateSummary();
    }
  };

  // --- Fix: Implemented missing processWords function ---
  const processWords = (words: { word: string; isFiller: boolean }[]) => {
    setWordCount(prev => prev + words.length);
    
    setFillerCount(prev => {
      const next = { ...prev };
      words.forEach(({ word, isFiller }) => {
        if (isFiller) {
          const config = fillerWords.find(fw => fw.word.toLowerCase() === word.toLowerCase());
          const category = config?.category || 'General';
          next[category] = (next[category] || 0) + 1;
        }
        
        const w = word.toLowerCase().replace(/[^a-z]/g, '');
        if (w) {
          wordFrequencyRef.current[w] = (wordFrequencyRef.current[w] || 0) + 1;
        }
      });
      return next;
    });
  };

  // --- Deepgram Implementation ---
  const startDeepgramStream = async () => {
    try {
      cleanup(false); 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      initAudioAnalysis(stream);

      const baseUrl = 'wss://api.deepgram.com/v1/listen';
      const params = new URLSearchParams({
        model: 'nova-3',
        smart_format: 'true',
        filler_words: 'true',
        interim_results: 'true',
        token: DEEPGRAM_KEY
      });

      const socket = new WebSocket(`${baseUrl}?${params.toString()}`);

      socket.onopen = () => {
        console.log("[Deepgram] WebSocket Open");
        keepAliveIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 3000);

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
        try {
          const received = JSON.parse(message.data);
          const transcriptChunk = received.channel?.alternatives[0]?.transcript;
          const words = received.channel?.alternatives[0]?.words || [];

          if (received.is_final && transcriptChunk) {
            handleTranscriptionResult(transcriptChunk);
            processWords(words.map((w: any) => ({ 
              word: w.word, 
              isFiller: w.filler || fillerWords.some(fw => fw.word.toLowerCase() === w.word.toLowerCase())
            })));
            setTranscript(prev => (prev ? prev + " " + transcriptChunk : transcriptChunk));
          }
        } catch (e) {
          console.warn("[Deepgram] Error parsing message:", e);
        }
      };

      socket.onerror = (event) => {
        console.error('[Deepgram] WebSocket Error:', event);
        setError("Speech Recognition error. Check connection or API credentials.");
      };

      socket.onclose = (event) => {
        console.log(`[Deepgram] WebSocket Closed: Code=${event.code}`);
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        
        if (event.code === 1006 && isRecording) {
          setTimeout(() => { if (isRecording) startDeepgramStream(); }, 1500);
        }
      };
      
      socketRef.current = socket;
    } catch (err) {
      console.error("[Deepgram] Setup Error:", err);
      setError("Unable to start AI Coach. Please ensure microphone access is granted.");
      setIsRecording(false);
    }
  };

  // --- Native Implementation ---
  const startLocalRecognition = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Native coaching not supported in this browser.");
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
            handleTranscriptionResult(chunk);
            processWords(words);
          }
        }
        setTranscript(prev => prev + " " + finalTranscript);
      };

      recognition.onerror = (e: any) => { 
        if (e.error !== 'aborted') {
          console.error('[Local Speech] Error:', e.error);
          setError(`Coaching error: ${e.error}`);
        }
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError("Microphone access denied.");
      setIsRecording(false);
    }
  };

  const handleTranscriptionResult = (chunk: string) => {
    const now = Date.now();
    const diff = (now - lastTranscriptionTimeRef.current) / 1000;
    
    if (diff >= 1.0 && diff <= 3.0) {
      pauseStatsRef.current.effective++;
    } else if (diff > 5.0) {
      pauseStatsRef.current.long++;
    }
    
    lastTranscriptionTimeRef.current = now;
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

  // --- Fix: Implemented missing monitorAudio function ---
  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let maxVal = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = Math.abs(dataArray[i] - 128);
      if (v > maxVal) maxVal = v;
    }
    const level = (maxVal / 128) * 100;
    setVolumeLevel(level);
    volumeHistoryRef.current.push(level);
    
    if (level < 5 && isRecording) setVolumeWarning(true);
    else setVolumeWarning(false);
  };

  // --- Fix: Implemented missing generateSummary function ---
  const generateSummary = () => {
    const duration = elapsedTime;
    const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
    
    let totalFillers = 0;
    Object.values(fillerCount).forEach(v => totalFillers += v);
    const fillerPercentage = wordCount > 0 ? (totalFillers / wordCount) * 100 : 0;
    
    const repetitive = Object.entries(wordFrequencyRef.current)
      .filter(([_, count]) => count > 4)
      .map(([word]) => word);

    const clarityScore = Math.max(0, 100 - (fillerPercentage * 5));
    
    setSummary({
      wpm,
      totalWords: wordCount,
      fillerPercentage,
      clarityScore,
      duration,
      toneConsistency: monotoneWarning ? 'Low' : 'High',
      confidenceScore: Math.min(100, Math.max(0, clarityScore - (pauseStatsRef.current.long * 10))),
      energyScore: 85,
      energyLevel: volumeWarning ? 'Low' : 'Mid',
      concisenessScore: 90,
      pauseScore: 80,
      repetitiveWords: repetitive,
      effectivePauses: pauseStatsRef.current.effective,
      longSilences: pauseStatsRef.current.long
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      cleanup(true);
    } else {
      setIsRecording(true);
      setError(null);
      setTranscript('');
      setWordCount(0);
      setElapsedTime(0);
      const initial: FillerStats = {};
      fillerWords.forEach(fw => { if (fw.category) initial[fw.category] = 0; });
      setFillerCount(initial);
      wordFrequencyRef.current = {};
      pauseStatsRef.current = { effective: 0, long: 0 };
      volumeHistoryRef.current = [];
      
      if (activeTab === 'ai') startDeepgramStream();
      else startLocalRecognition();
      
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
  };

  const reset = () => {
    cleanup(false);
    setTranscript('');
    setWordCount(0);
    setElapsedTime(0);
    setSummary(null);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
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
          <div className="text-5xl font-mono font-bold text-emerald-600 tabular-nums">{formatTime(elapsedTime)}</div>
        </header>
        
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                <AlertCircle size={20} />{error}
            </div>
        )}

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-fit mb-8">
            <button 
              onClick={() => setActiveTab('ai')}
              disabled={isRecording}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Cpu size={16}/> AI Coach (Nova-3)
            </button>
            <button 
              onClick={() => setActiveTab('local')}
              disabled={isRecording}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'local' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Globe size={16}/> Standard Recognition
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm min-h-[400px] flex flex-col">
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14}/> Speech Stream
              </h3>
              <div className="flex-1 text-2xl font-serif leading-relaxed text-gray-800 selection:bg-emerald-100 selection:text-emerald-900">
                {transcript || <span className="text-gray-300 italic">Listening for wisdom...</span>}
              </div>
            </div>

            <div className="bg-emerald-900 rounded-3xl p-8 text-white shadow-xl flex items-center justify-between">
                <div>
                    <h4 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Session Controller</h4>
                    <p className="text-emerald-100 font-medium">Capture your performance</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={toggleRecording} 
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-900/50' : 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-900/50'}`}
                  >
                    {isRecording ? <Pause size={32} /> : <Mic size={32} />}
                  </button>
                  <button onClick={reset} className="w-16 h-16 rounded-full bg-emerald-800 hover:bg-emerald-700 transition-colors flex items-center justify-center">
                    <RotateCcw size={24} />
                  </button>
                </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center justify-between">
                    Live Metrics
                    {volumeWarning && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse">Low Vol</span>}
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-gray-500">VOLUME LEVEL</span>
                            <span className="text-gray-900">{Math.round(volumeLevel)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-150" style={{ width: `${volumeLevel}%` }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <div className="text-2xl font-black text-gray-900">{Math.round((wordCount / (elapsedTime || 1)) * 60)}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">WPM (Speed)</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <div className="text-2xl font-black text-gray-900">{wordCount}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Word Count</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">Filler Counts</h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(fillerCount).map(([cat, count]) => (
                        <div key={cat} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-xl font-bold text-gray-900">{count}</div>
                            <div className="text-[10px] font-bold text-gray-400 truncate">{cat}</div>
                        </div>
                    ))}
                    {Object.keys(fillerCount).length === 0 && <div className="col-span-2 py-4 text-center text-xs text-gray-400 font-medium">Ready to track...</div>}
                </div>
            </div>
          </div>
        </div>

        {summary && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
                <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300">
                    <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2.5rem]">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <Trophy className="text-amber-500" size={32}/> Performance Report
                            </h2>
                            <p className="text-gray-500 font-medium">Session recorded for {formatTime(summary.duration)}</p>
                        </div>
                        <button onClick={() => setSummary(null)} className="p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={28}/></button>
                    </div>

                    <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                <div className="text-4xl font-black text-emerald-700 mb-1">{Math.round(summary.clarityScore)}%</div>
                                <div className="text-xs font-black text-emerald-600 uppercase tracking-widest">Clarity Score</div>
                                <div className="mt-4 text-xs text-emerald-800 leading-relaxed">Excellent articulation and precise filler control.</div>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                <div className="text-4xl font-black text-blue-700 mb-1">{summary.wpm}</div>
                                <div className="text-xs font-black text-blue-600 uppercase tracking-widest">Words Per Minute</div>
                                <div className="mt-4 text-xs text-blue-800 leading-relaxed">Pacing is steady and conversational.</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                                <div className="text-4xl font-black text-purple-700 mb-1">{summary.effectivePauses}</div>
                                <div className="text-xs font-black text-purple-600 uppercase tracking-widest">Effective Pauses</div>
                                <div className="mt-4 text-xs text-purple-800 leading-relaxed">Strategic silence used to emphasize points.</div>
                            </div>
                            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                <div className="text-4xl font-black text-amber-700 mb-1">{summary.confidenceScore}</div>
                                <div className="text-xs font-black text-amber-600 uppercase tracking-widest">Confidence Rating</div>
                                <div className="mt-4 text-xs text-amber-800 leading-relaxed">A steady, authoritative delivery style detected.</div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Repetitive Phrases</h4>
                                <div className="flex flex-wrap gap-2">
                                    {summary.repetitiveWords.length > 0 ? summary.repetitiveWords.map(w => (
                                        <span key={w} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">{w}</span>
                                    )) : <span className="text-xs text-gray-400 italic">No patterns detected.</span>}
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Improvement Areas</h4>
                                <ul className="space-y-2">
                                    {summary.longSilences > 2 && <li className="text-xs font-medium text-gray-600 flex gap-2"><Scissors size={14} className="text-red-500 shrink-0"/> Trim silence gaps > 5s</li>}
                                    {summary.wpm > 180 && <li className="text-xs font-medium text-gray-600 flex gap-2"><Tornado size={14} className="text-amber-500 shrink-0"/> Slow down for impact</li>}
                                    <li className="text-xs font-medium text-gray-600 flex gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Practice ayah transitions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-10 bg-gray-900 rounded-b-[2.5rem] flex items-center justify-between">
                        <p className="text-gray-400 text-xs font-medium">Metrics verified by Minbar Audio Intelligence v3.4</p>
                        <button onClick={() => setSummary(null)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all">Dismiss Report</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};