import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, Pause, RotateCcw, AlertTriangle, 
  BarChart3, Zap, Info, TrendingUp, CheckCircle, 
  Trophy, AlertCircle, Volume2, X, Gauge, Activity,
  Cpu, Globe, MessageSquare, Scissors, MessageCircle,
  Tornado, ListChecks, Loader2, Play
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

  const generateSummary = () => {
    const duration = elapsedTime;
    if (duration === 0) return;

    const wpmResult = Math.round((wordCount / duration) * 60);
    // Explicit casting to handle potential 'unknown' type in some environments
    const totalFillers = Object.values(fillerCount).reduce((a, b) => (a as number) + (b as number), 0) as number;
    const fillerPercentage = wordCount > 0 ? (totalFillers / wordCount) * 100 : 0;

    const repetitive = Object.entries(wordFrequencyRef.current)
      .filter(([word, count]) => (count as number) > 3 && word.length > 3)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([word]) => word);

    const volVariance = volumeHistoryRef.current.length > 0 
      ? Math.max(...volumeHistoryRef.current) - Math.min(...volumeHistoryRef.current)
      : 0;

    setSummary({
      wpm: wpmResult,
      totalWords: wordCount,
      fillerPercentage,
      clarityScore: Math.max(0, Math.min(100, Math.round(100 - (fillerPercentage * 10)))),
      duration,
      toneConsistency: volVariance > 25 ? "Dynamic" : "Stable",
      confidenceScore: Math.max(0, Math.min(100, Math.round(100 - (totalFillers * 3) - (pauseStatsRef.current.long * 5)))),
      energyScore: Math.min(100, Math.round(volVariance * 2)),
      energyLevel: volVariance > 40 ? 'High' : volVariance > 20 ? 'Mid' : 'Low',
      concisenessScore: Math.max(0, Math.min(100, 100 - repetitive.length * 5)),
      pauseScore: Math.min(100, Math.round((pauseStatsRef.current.effective / (duration / 60)) * 5)),
      repetitiveWords: repetitive.slice(0, 5),
      effectivePauses: pauseStatsRef.current.effective,
      longSilences: pauseStatsRef.current.long
    });
  };

  const cleanup = (isStoppingSession = true) => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
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

  const initAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    volumeIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setVolumeLevel(average);
      volumeHistoryRef.current.push(average);
      
      if (volumeHistoryRef.current.length > 50) {
        const recent = volumeHistoryRef.current.slice(-50);
        const max = Math.max(...recent);
        const min = Math.min(...recent);
        if (max - min < 10) setMonotoneWarning(true);
        else setMonotoneWarning(false);
      }
    }, 100);
  };

  const handleTranscriptionResult = (transcriptChunk: string) => {
    const now = Date.now();
    const timeSinceLast = (now - lastTranscriptionTimeRef.current) / 1000;
    lastTranscriptionTimeRef.current = now;

    if (timeSinceLast > 3) {
      pauseStatsRef.current.long++;
    } else if (timeSinceLast > 1.2) {
      pauseStatsRef.current.effective++;
    }

    const words = transcriptChunk.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return;

    const currentWpm = (words.length / (timeSinceLast || 1)) * 60;
    
    if (currentWpm > 180) {
      setPacingAlert({ text: "Slow down slightly", color: "text-red-500" });
    } else if (currentWpm < 110 && currentWpm > 0) {
      setPacingAlert({ text: "Pick up the pace", color: "text-amber-500" });
    } else {
      setPacingAlert(null);
    }
  };

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
        // Improved error reporting to avoid [object Object]
        const errInfo = (event as any).message || "Connection failed";
        console.error('[Deepgram] WebSocket Error:', errInfo);
        setError(`Speech Recognition error: ${errInfo}. Check connection or credentials.`);
      };

      socket.onclose = (event) => {
        console.log(`[Deepgram] WebSocket Closed: Code=${event.code}, Reason=${event.reason || 'None'}`);
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        
        if (event.code === 1006 && isRecording) {
          setTimeout(() => { if (isRecording) startDeepgramStream(); }, 1500);
        }
      };
      
      socketRef.current = socket;
    } catch (err: any) {
      const errMsg = err.message || "Unknown error";
      console.error("[Deepgram] Setup Error:", errMsg);
      setError(`Unable to start AI Coach: ${errMsg}`);
      setIsRecording(false);
    }
  };

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
            const wordsArr = chunk.trim().split(/\s+/).map((w: string) => ({
              word: w,
              isFiller: fillerWords.some(fw => fw.word.toLowerCase() === w.toLowerCase())
            }));
            handleTranscriptionResult(chunk);
            processWords(wordsArr);
          }
        }
        setTranscript(prev => prev + " " + finalTranscript);
      };

      recognition.onerror = (err: any) => setError("Speech Recognition Error: " + err.error);
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError("Microphone access denied.");
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      cleanup(true);
    } else {
      setError(null);
      setSummary(null);
      setTranscript('');
      setWordCount(0);
      setElapsedTime(0);
      wordFrequencyRef.current = {};
      volumeHistoryRef.current = [];
      pauseStatsRef.current = { effective: 0, long: 0 };
      
      const initial: FillerStats = {};
      fillerWords.forEach(fw => { if (fw.category) initial[fw.category] = 0; });
      setFillerCount(initial);

      setIsRecording(true);
      timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
      
      if (activeTab === 'ai') startDeepgramStream();
      else startLocalRecognition();
    }
  };

  const reset = () => {
    cleanup(false);
    setTranscript('');
    setElapsedTime(0);
    setWordCount(0);
    setFillerCount({});
    setSummary(null);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const wpm = elapsedTime > 0 ? Math.round((wordCount / elapsedTime) * 60) : 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
        <header className="flex justify-between items-center mb-10">
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
                <AlertCircle size={20} />{error}
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded-3xl p-8 border border-gray-200 flex flex-col shadow-sm min-h-[400px]">
             <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Mic size={14}/> Live Transcription</h3>
             <div ref={scrollRef} className="flex-1 overflow-y-auto text-2xl leading-relaxed font-serif text-gray-800 p-6 bg-gray-50 rounded-2xl border border-gray-100 custom-scrollbar">
                {transcript || <span className="text-gray-400 italic">Press the microphone to start speaking...</span>}
             </div>
             {pacingAlert && (
               <div className={`mt-4 flex items-center gap-2 font-bold animate-bounce ${pacingAlert.color}`}>
                  <Zap size={16} /> {pacingAlert.text}
               </div>
             )}
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Live Metrics</h3>
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('ai')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>AI PRO</button>
                    <button onClick={() => setActiveTab('local')} className={`px-3 py-1 rounded text-xs font-bold ${activeTab === 'local' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>BASIC</button>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 {Object.entries(fillerCount).map(([cat, count]) => (
                   <div key={cat} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <div className="text-4xl font-bold text-gray-900 mb-1">{count}</div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{cat} Words</div>
                   </div>
                 ))}
                 <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <div className={`text-4xl font-bold mb-1 ${wpm > 180 ? 'text-red-500' : 'text-emerald-600'}`}>{wpm}</div>
                    <div className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Words / Minute</div>
                 </div>
               </div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-10">
               <button onClick={toggleRecording} className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-red-200 ring-8 ring-red-50 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 ring-8 ring-emerald-50'}`}>
                   {isRecording ? <Pause size={40} className="text-white" /> : <Mic size={40} className="text-white" />}
               </button>
               <button onClick={reset} className="w-16 h-16 rounded-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center text-gray-500 transition-all shadow-md">
                   <RotateCcw size={24} />
               </button>
            </div>
          </div>
        </div>

        {summary && (
          <section className="mt-16 bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-gray-900 p-10 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-bold mb-2">Performance Summary</h3>
                <p className="text-gray-400">Analysis complete for {formatTime(summary.duration)} session</p>
              </div>
              <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-2xl">
                 Score: {summary.confidenceScore}/100
              </div>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pacing</div>
                <div className="text-2xl font-bold">{summary.wpm} WPM</div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (summary.wpm/150)*100)}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Fillers</div>
                <div className="text-2xl font-bold">{summary.fillerPercentage.toFixed(1)}%</div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, summary.fillerPercentage*10)}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Energy Level</div>
                <div className="text-2xl font-bold">{summary.energyLevel}</div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${summary.energyScore}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Tone</div>
                <div className="text-2xl font-bold">{summary.toneConsistency}</div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};