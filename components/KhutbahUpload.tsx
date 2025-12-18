
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, FileText, CheckCircle, AlertCircle, 
  Loader2, UploadCloud, Plus, Check, User, ExternalLink, AlertTriangle, Info, Play, RefreshCw, Upload
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Imam } from '../types';

interface KhutbahUploadProps {
  onSuccess: () => void;
}

// --- Utilities ---

const normalizeSpeaker = (s: string) => {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2019']/g, "")        // apostrophes
    .replace(/[^a-z0-9\s]/g, " ")     // remove punctuation
    .replace(/\s+/g, " ")            // collapse spaces
    .trim();
};

const fetchApi = async (url: string, body: any, retries = 3, delay = 2000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.status === 429) {
         console.warn(`Rate limited (429). Retrying in ${delay * (i + 1)}ms...`);
         await new Promise(r => setTimeout(r, delay * (i + 1)));
         continue;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Server Error (${response.status})`);
      }
      return await response.json();
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

// --- Excel Import Section ---

const ExcelImportSection = ({ onSuccess }: { onSuccess: () => void }) => {
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, skipped: 0, errors: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImams();
  }, []);

  async function fetchImams() {
    const { data } = await supabase.from('imams').select('*').order('name');
    if (data) setImams(data);
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setErrorMsg('');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      let sheetName = workbook.SheetNames.find(n => n.includes('Detail Cheklist')) || workbook.SheetNames[0];
      let sheet = workbook.Sheets[sheetName];
      
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (rawRows.length < 2) throw new Error('File is empty');

      const mapped = rawRows.slice(1).map((row, index) => {
        // Deterministic Mapping: Col 0 = Index, Col 2 = Speaker, Col 3 = Topic, Col 6 = Tags
        const fileIndexRaw = row[0];
        const speakerRaw = String(row[2] || '').trim();
        const topicRaw = String(row[3] || '').trim();
        const tagsRaw = String(row[6] || '').trim();

        if (!speakerRaw && !topicRaw) return null;

        const speakerKey = normalizeSpeaker(speakerRaw);
        const tagsParsed = tagsRaw.split(',').map(t => t.trim()).filter(t => !!t);

        return {
          title: topicRaw || 'Untitled Khutbah',
          topic: topicRaw,
          author: speakerRaw,
          speaker_key: speakerKey,
          speaker_file_index: parseInt(fileIndexRaw) || null,
          tags: tagsParsed.length > 0 ? tagsParsed : ['General'],
          youtube_url: String(row[4] || '').trim() || null,
          duration: String(row[5] || '').trim() || null,
          rating: 4.8,
          created_at: new Date().toISOString(),
          _status: 'ready'
        };
      }).filter(Boolean);
      
      setKhutbahs(mapped);
      setShowPreview(true);
    } catch (err: any) {
        setErrorMsg("Failed to parse Excel: " + err.message);
    }
  }

  async function importToDatabase() {
    setIsImporting(true);
    let success = 0; let skipped = 0; let errors = 0;

    try {
      const { data: existing } = await supabase.from('khutbahs').select('speaker_key, speaker_file_index');
      const existingKeys = new Set((existing as any[])?.map(e => `${e.speaker_key}|${e.speaker_file_index}`));

      for (let i = 0; i < khutbahs.length; i++) {
        const item = khutbahs[i];
        const matchKey = `${item.speaker_key}|${item.speaker_file_index}`;

        if (existingKeys.has(matchKey)) {
          skipped++;
          continue;
        }

        // Resolve Imam
        let { data: imam } = await supabase.from('imams').select('id').eq('name', item.author).maybeSingle();
        if (!imam) {
            const { data: newImam } = await supabase.from('imams').insert({ 
                name: item.author, 
                slug: item.speaker_key.replace(/\s+/g, '-') 
            }).select().single();
            imam = newImam;
        }

        const { _status, ...payload } = item;
        const { error } = await supabase.from('khutbahs').insert({ ...payload, imam_id: imam?.id });

        if (error) errors++; else success++;
        setImportProgress(i + 1);
      }

      setImportResults({ success, skipped, errors });
      setImportComplete(true);
    } catch (err) {
      setErrorMsg("Sync failed. Check logs.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2">Import Excel Metadata</h2>
      {!showPreview && !importComplete && (
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-2xl p-20 text-center hover:border-emerald-500 cursor-pointer transition-all">
          <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
          <FileSpreadsheet size={40} className="mx-auto mb-4 text-emerald-600"/>
          <p className="font-bold">Select Master Excel</p>
          <p className="text-gray-400 text-sm mt-2">Click to browse your computer</p>
        </div>
      )}

      {showPreview && !importComplete && (
        <div>
          <div className="overflow-x-auto max-h-[400px] border rounded-xl mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b">
                <tr><th className="p-3 text-left">Index</th><th className="p-3 text-left">Speaker</th><th className="p-3 text-left">Topic</th></tr>
              </thead>
              <tbody>
                {khutbahs.map((k, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 font-mono text-gray-400">{k.speaker_file_index}</td>
                    <td className="p-3 font-bold">{k.author}</td>
                    <td className="p-3 text-gray-600">{k.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
             <button onClick={() => setShowPreview(false)} className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
             <button onClick={importToDatabase} disabled={isImporting} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                {isImporting ? <Loader2 className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                Confirm Sync ({khutbahs.length})
             </button>
          </div>
        </div>
      )}

      {importComplete && (
        <div className="text-center p-10 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in duration-300">
          <CheckCircle className="mx-auto mb-4 text-emerald-600" size={48}/>
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">Metadata Synced</h3>
          <div className="flex justify-center gap-8 font-bold">
            <div className="text-emerald-700">Created: {importResults.success}</div>
            <div className="text-amber-700">Skipped: {importResults.skipped}</div>
          </div>
          <button onClick={onSuccess} className="mt-8 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">Back to Library</button>
        </div>
      )}
    </div>
  );
};

// --- PDF Processing Section ---

const PdfUploadSection = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('imams').select('*').then(({ data }) => data && setImams(data as Imam[]));
  }, []);

  const parsePdfFilename = (name: string) => {
    const m = name.match(/^\s*(\d{1,4})\s*[_\-\s]+\s*([^_]+)_/i);
    if (!m) {
      const parts = name.replace(/\.pdf$/i, '').split(/[_\-]/);
      return { 
        index: parseInt(parts[0]) || null, 
        speaker: parts[1]?.trim() || null 
      };
    }
    return { index: parseInt(m[1]), speaker: m[2].trim() };
  };

  const addFilesToList = (fileList: File[]) => {
    const selected = fileList.map((file) => {
      const parsed = parsePdfFilename(file.name);
      return {
        file,
        name: file.name,
        parsedIndex: parsed.index,
        parsedSpeaker: parsed.speaker,
        speakerKey: parsed.speaker ? normalizeSpeaker(parsed.speaker) : null,
        status: 'queued' as 'queued' | 'processing' | 'done' | 'failed' | 'updated',
        error: null as string | null
      };
    });
    setFiles(prev => [...prev, ...selected]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFilesToList(Array.from(e.target.files));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFilesToList(Array.from(e.dataTransfer.files));
    }
  };

  async function processAllFiles() {
    setIsProcessing(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done' || files[i].status === 'updated') continue;
      
      setCurrentIndex(i);
      setFiles(prev => {
        const next = [...prev];
        next[i].status = 'processing';
        return next;
      });

      try {
        const item = files[i];
        if (!item.parsedIndex || !item.speakerKey) throw new Error("Invalid filename format. Expected: Index_Speaker_...pdf");

        // 1. Resolve Imam
        const { data: imam } = await supabase.from('imams').select('id').eq('name', item.parsedSpeaker).maybeSingle();
        if (!imam) throw new Error(`Unrecognized imam: ${item.parsedSpeaker}`);

        // 2. Matching logic
        const { data: match } = await supabase
          .from('khutbahs')
          .select('id, title')
          .eq('imam_id', imam.id)
          .eq('speaker_file_index', item.parsedIndex)
          .maybeSingle();

        // 3. Extract Text
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(item.file);
        });
        const { text: rawText } = await fetchApi('/api/extract-pdf', { base64, fileName: item.name });

        // 4. Update or Insert
        let khutbahId;
        let action: 'updated' | 'done';

        if (match) {
          khutbahId = (match as any).id;
          action = 'updated';
          console.log(`[PDF] Updating matched khutbah ${khutbahId} for ${item.name}`);
        } else {
          console.log(`[PDF] No match for ${item.name}. Creating new row.`);
          const { data: newRow, error: insErr } = await supabase.from('khutbahs').insert({
            title: item.name.replace('.pdf', '').replace(/_/g, ' '),
            imam_id: imam.id,
            author: item.parsedSpeaker,
            speaker_key: item.speakerKey,
            speaker_file_index: item.parsedIndex,
            rating: 4.8
          }).select().single();
          if (insErr) throw insErr;
          khutbahId = (newRow as any).id;
          action = 'done';
        }

        // 5. AI Formatting & Summary
        const formatData = await fetchApi('/api/process-khutbah', { 
            content: rawText, type: 'format', khutbahId: khutbahId 
        });
        await fetchApi('/api/process-khutbah', { 
            content: formatData.result, type: 'cards', khutbahId: khutbahId 
        });

        setFiles(prev => {
          const next = [...prev];
          next[i].status = action;
          return next;
        });

        // Small delay between items
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        console.error(`[PDF] Error processing ${files[i].name}:`, err);
        setFiles(prev => {
          const next = [...prev];
          next[i].status = 'failed';
          next[i].error = err.message;
          return next;
        });
      }
    }
    setIsProcessing(false);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-end">
         <div>
            <h2 className="text-xl font-bold text-gray-900">Attach PDFs to Excel Records</h2>
            <p className="text-gray-500 text-sm">Matching by: Imam ID + Speaker File Index</p>
         </div>
         {files.length > 0 && (
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold hover:bg-emerald-100 transition-all border border-emerald-100">
              <Plus size={18}/> Add More
           </button>
         )}
      </div>

      <input ref={fileInputRef} type="file" multiple accept=".pdf" onChange={handleFileSelect} className="hidden" />

      {files.length > 0 ? (
        <div className="animate-in fade-in duration-300">
          <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white mb-6 max-h-[500px] shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr><th className="p-4 text-left font-bold text-gray-400 uppercase text-[10px] tracking-wider">Filename</th><th className="p-4 text-left font-bold text-gray-400 uppercase text-[10px] tracking-wider">Match Info</th><th className="p-4 text-left font-bold text-gray-400 uppercase text-[10px] tracking-wider">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {files.map((item, i) => (
                  <tr key={i} className={`transition-colors ${currentIndex === i ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="p-4 font-medium max-w-[240px] truncate text-gray-900">{item.name}</td>
                    <td className="p-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Index: {item.parsedIndex || '??'}</div>
                      <div className="text-xs font-bold text-gray-700">{item.parsedSpeaker || 'Unknown'}</div>
                    </td>
                    <td className="p-4">
                      {item.status === 'processing' && <span className="text-blue-500 font-bold animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> PROCESSING</span>}
                      {item.status === 'updated' && <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded w-fit"><Check size={14}/> UPDATED ROW</span>}
                      {item.status === 'done' && <span className="text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded w-fit"><Plus size={14}/> CREATED NEW</span>}
                      {item.status === 'failed' && <span className="text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded w-fit" title={item.error}><AlertCircle size={14}/> FAILED</span>}
                      {item.status === 'queued' && <span className="text-gray-400 font-bold uppercase text-[10px] bg-gray-100 px-2 py-0.5 rounded w-fit">Queued</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
             <button onClick={() => setFiles([])} disabled={isProcessing} className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Clear All</button>
             <button onClick={processAllFiles} disabled={isProcessing || files.length === 0} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                Start Processing
             </button>
          </div>
        </div>
      ) : (
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
                py-24 text-center rounded-[2rem] border-2 border-dashed transition-all cursor-pointer group
                ${isDragging 
                  ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/30'
                }
            `}
          >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all shadow-sm ${isDragging ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 group-hover:scale-110'}`}>
                <Upload size={32} />
              </div>
              <p className="text-gray-900 text-xl font-bold mb-2">Drop PDFs here or click to browse</p>
              <p className="text-gray-400 font-medium">Standard naming: <code className="bg-gray-200/50 px-1.5 py-0.5 rounded text-gray-600 font-mono text-xs">12_Hamza Yusuf_...pdf</code></p>
              {isDragging && (
                  <div className="mt-4 inline-block px-4 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full animate-bounce">
                    Ready to drop!
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export const KhutbahUpload: React.FC<KhutbahUploadProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'excel' | 'pdf'>('excel');

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
         <div className="w-full">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Sync Manager</h2>
              <p className="text-gray-500 mt-2 text-lg">Clean deduplication between Excel metadata and PDF source files.</p>
            </div>

            <div className="flex p-1 bg-gray-200/60 rounded-2xl w-fit mb-10 border border-gray-200">
                <button onClick={() => setMode('excel')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'excel' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileSpreadsheet size={18}/> Phase 1: Excel</button>
                <button onClick={() => setMode('pdf')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pdf' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileText size={18}/> Phase 2: PDF</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[500px] mb-12">
                {mode === 'excel' ? <ExcelImportSection onSuccess={onSuccess} /> : <PdfUploadSection />}
            </div>
         </div>
      </div>
    </div>
  );
};
