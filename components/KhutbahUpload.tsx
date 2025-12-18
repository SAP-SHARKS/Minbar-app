import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, FileText, CheckCircle, AlertCircle, 
  Loader2, UploadCloud, Plus, Check, User, ExternalLink, AlertTriangle, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { Imam } from '../types';

interface KhutbahUploadProps {
  onSuccess: () => void;
}

// Robust fetch helper that handles JSON or Text errors
const fetchApi = async (url: string, body: any) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorInfo = `Server Error (${response.status})`;
      try {
        const data = await response.json();
        errorInfo = data.error || data.message || errorInfo;
        if (data.stack) console.error('[Server Stack]:', data.stack);
      } catch (e) {
        const text = await response.text();
        errorInfo = text || errorInfo;
      }
      throw new Error(errorInfo);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[fetchApi] Failed at ${url}:`, err);
    throw err;
  }
};

const isValidUrl = (url: string) => {
  try {
    if (!url) return false;
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
};

// --- Excel Import Section ---
const ExcelImportSection = ({ onSuccess }: { onSuccess: () => void }) => {
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [selectedImamId, setSelectedImamId] = useState<string>('');
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
      
      if (!sheet) {
          setErrorMsg('Could not find a valid sheet in the Excel file.');
          return;
      }
      
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rawRows.length < 2) {
        setErrorMsg('The Excel file appears to be empty or missing data rows.');
        return;
      }

      const dataRows = rawRows.slice(1);
      const selectedImam = imams.find(i => i.id === selectedImamId);

      console.log(`[Import] Initial processing of ${dataRows.length} rows.`);

      const mapped = dataRows.map((row, index) => {
        const speakerRaw = row[2]; // Column C
        const topicRaw = row[3];   // Column D
        const youtubeRaw = row[4]; // Column E
        const durationRaw = row[5];// Column F
        const tagsRaw = row[6];    // Column G

        let tagsParsed: string[] = [];
        if (tagsRaw) {
          tagsParsed = String(tagsRaw)
            .split(/[,;]/)
            .map(t => t.trim())
            .filter(t => t.length > 0);
          tagsParsed = [...new Set(tagsParsed)];
        }
        
        const finalTags = tagsParsed.length > 0 ? tagsParsed : ['General'];
        const topic = String(topicRaw || '').trim();
        const youtubeUrl = String(youtubeRaw || '').trim();

        const item = {
          title: topic || 'Untitled Khutbah',
          imam_id: selectedImamId || null,
          author: selectedImam ? selectedImam.name : String(speakerRaw || 'Unknown').trim(),
          topic: topic,
          tags: finalTags,
          youtube_url: youtubeUrl || null,
          duration: durationRaw ? String(durationRaw).trim() : null,
          rating: 4.8,
          likes_count: 0,
          comments_count: 0,
          created_at: new Date().toISOString(),
          // UI Validation & Duplicate check helpers
          _isValidUrl: youtubeUrl ? isValidUrl(youtubeUrl) : true,
          _tagsDefaulted: tagsParsed.length === 0,
          _missingTopic: !topic,
          _status: 'ready' as 'ready' | 'importing' | 'created' | 'skipped_existing' | 'error'
        };

        if (index < 3) {
          console.log(`[Import Debug] Data Row ${index + 1}:`, { topic, author: item.author, tagsRaw });
        }

        return item;
      });
      
      const filtered = mapped.filter(k => k.topic !== '' || k.author !== 'Unknown');
      setKhutbahs(filtered);
      setShowPreview(true);
    } catch (err: any) {
        console.error("[Import] Critical Parse Error:", err);
        setErrorMsg("Failed to parse Excel file. Ensure it is a valid .xlsx file.");
    }
  }

  async function importToDatabase() {
    setIsImporting(true);
    setErrorMsg('');
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      // 1. Pre-fetch existing metadata to avoid row-by-row queries
      console.log(`[Import] Fetching existing metadata for deduplication...`);
      const { data: existing, error: fetchErr } = await supabase
        .from('khutbahs')
        .select('youtube_url, title, author');
      
      if (fetchErr) throw fetchErr;

      // 2. Build local sets/maps for fast lookup
      const existingUrls = new Set((existing || []).filter(e => e.youtube_url).map(e => e.youtube_url));
      const existingTitlesAuthors = new Set((existing || []).map(e => `${e.title.toLowerCase()}|${e.author.toLowerCase()}`));

      // 3. Process the list
      const toInsert: any[] = [];
      const updatedKhutbahs = [...khutbahs];

      updatedKhutbahs.forEach((item, idx) => {
        // PRIORITY 1: Youtube Link
        if (item.youtube_url && existingUrls.has(item.youtube_url)) {
          updatedKhutbahs[idx]._status = 'skipped_existing';
          skippedCount++;
          return;
        }

        // PRIORITY 2: Title + Author
        const key = `${item.title.toLowerCase()}|${item.author.toLowerCase()}`;
        if (existingTitlesAuthors.has(key)) {
          updatedKhutbahs[idx]._status = 'skipped_existing';
          skippedCount++;
          return;
        }

        // New record
        updatedKhutbahs[idx]._status = 'importing';
        toInsert.push({ index: idx, data: item });
      });

      // Update UI with initial statuses
      setKhutbahs(updatedKhutbahs);

      // 4. Batch insert the NEW records
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const dataToInsert = batch.map(b => {
          const { _isValidUrl, _tagsDefaulted, _missingTopic, _status, ...clean } = b.data;
          return clean;
        });

        const { error: insErr } = await supabase.from('khutbahs').insert(dataToInsert);

        if (insErr) {
          console.error("[Import] Batch insert failed:", insErr);
          batch.forEach(b => { updatedKhutbahs[b.index]._status = 'error'; });
          errorCount += batch.length;
        } else {
          batch.forEach(b => { updatedKhutbahs[b.index]._status = 'created'; });
          successCount += batch.length;
        }
        
        setImportProgress(Math.min(i + batchSize, toInsert.length));
        setKhutbahs([...updatedKhutbahs]);
      }

      setImportResults({ success: successCount, skipped: skippedCount, errors: errorCount });
      setImportComplete(true);
      if (successCount > 0) setTimeout(onSuccess, 3000);

    } catch (err: any) {
      console.error("[Import] Import logic failed:", err);
      setErrorMsg("Import failed: " + (err.message || "Unknown error during database sync."));
    } finally {
      setIsImporting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><Check size={10}/> CREATED</span>;
      case 'skipped_existing': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"><Info size={10}/> SKIPPED</span>;
      case 'error': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">ERROR</span>;
      case 'importing': return <span className="text-blue-500 flex items-center gap-1 text-[10px] font-bold animate-pulse">IMPORTING...</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2 text-gray-900">Import Master Excel</h2>
      <p className="text-gray-600 mb-6">Targeting columns: C (Speaker), D (Topic), E (Youtube), F (Duration), G (Tags). Duplicates will be skipped automatically.</p>

      <div className="mb-8 max-w-md">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Override Author</label>
        <select 
          value={selectedImamId}
          onChange={(e) => setSelectedImamId(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
        >
          <option value="">-- Use speaker names found in Column C --</option>
          {imams.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <AlertCircle size={20}/> {errorMsg}
          </div>
      )}
      
      {!showPreview && !importComplete && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-2xl p-20 text-center hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
             <FileSpreadsheet size={40} />
          </div>
          <p className="text-xl font-bold text-gray-900">Upload Spreadsheet</p>
          <p className="text-sm text-gray-400 mt-2">Deduplication will be performed by Youtube Link and (Title + Author).</p>
        </div>
      )}
      
      {showPreview && !importComplete && (
        <div className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-800 text-lg">Batch Preview ({khutbahs.length} entries)</h3>
             <div className="flex gap-2 text-[10px] font-bold">
                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">NEW READY</span>
                <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">AUTO-CLEANED</span>
             </div>
          </div>
          
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto border border-gray-200 rounded-2xl mb-8 custom-scrollbar bg-white shadow-xl shadow-gray-200/50">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Speaker (Col C)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic (Col D)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags (Col G)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Link (Col E)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {khutbahs.map((k, i) => (
                  <tr key={i} className={`hover:bg-gray-50/80 transition-colors ${k._status === 'skipped_existing' ? 'opacity-50' : ''}`}>
                    <td className="p-4 w-28 shrink-0">{getStatusBadge(k._status)}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">{k.author}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${k._missingTopic ? 'text-red-500 italic' : 'text-gray-700'}`}>
                          {k._missingTopic ? 'Missing topic' : k.title}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {k.tags.map((t: string, ti: number) => (
                          <span key={ti} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100 font-bold uppercase text-[9px] shadow-sm">
                            {t}
                          </span>
                        ))}
                      </div>
                      {k._tagsDefaulted && (
                        <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1.5 bg-amber-50 w-fit px-1.5 py-0.5 rounded border border-amber-100">
                          <AlertTriangle size={10}/> (defaults to General)
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {k.youtube_url ? (
                        <div className="flex flex-col">
                           <a href={k.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 transition-colors">
                             <ExternalLink size={12}/> View Video
                           </a>
                           {!k._isValidUrl && (
                             <span className="text-[10px] text-red-500 font-black mt-1.5 flex items-center gap-1">
                               <AlertCircle size={10}/> Invalid URL
                             </span>
                           )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{k.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <button 
              onClick={importToDatabase} 
              disabled={isImporting} 
              className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black flex items-center gap-3 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20}/>}
              Perform Duplicate Check & Import
            </button>
            <button 
                onClick={() => { setShowPreview(false); setKhutbahs([]); }} 
                className="bg-white border border-gray-200 px-8 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors shadow-sm"
            >
                Cancel
            </button>
            {isImporting && (
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                        <span>Database Sync</span>
                        <span>{Math.round((importProgress / Math.max(1, khutbahs.length)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(importProgress / Math.max(1, khutbahs.length)) * 100}%` }} />
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
      
      {importComplete && (
        <div className="p-10 bg-white rounded-[2rem] border border-emerald-100 text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle size={40} />
          </div>
          <h4 className="font-bold text-gray-900 text-3xl mb-3">Sync Complete</h4>
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm mx-auto">
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600">{importResults.success}</div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Created</div>
             </div>
             <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <div className="text-2xl font-black text-amber-600">{importResults.skipped}</div>
                <div className="text-[10px] font-bold text-amber-700 uppercase">Skipped</div>
             </div>
             <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <div className="text-2xl font-black text-red-600">{importResults.errors}</div>
                <div className="text-[10px] font-bold text-red-700 uppercase">Errors</div>
             </div>
          </div>
          <button 
              onClick={onSuccess} 
              className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all transform active:scale-95"
          >
              Done
          </button>
        </div>
      )}
    </div>
  );
};

// --- PDF Upload Section ---
const PdfUploadSection = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [selectedImamId, setSelectedImamId] = useState<string>('');
  const [matchResults, setMatchResults] = useState<Record<number, any>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImams();
  }, []);

  async function fetchImams() {
    const { data, error } = await supabase
      .from('imams')
      .select('*')
      .order('name');
    
    if (data && !error) {
        setImams(data);
    } else if (error) {
        console.error("Error fetching imams:", error);
    }
  }

  async function findMatchingKhutbah(fileName: string, imamId: string) {
    if (!imamId) return null;
    
    const cleanTitle = fileName
      .replace(/^\d+_/, '')
      .replace(/_/g, ' ')
      .replace(/\.pdf$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!cleanTitle) return null;

    const { data: matches } = await supabase
      .from('khutbahs')
      .select('*')
      .eq('imam_id', imamId)
      .ilike('title', `%${cleanTitle}%`);
    
    return matches && matches.length > 0 ? matches[0] : null;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    const startIdx = files.length;
    setFiles(prev => [...prev, ...selectedFiles]);
    
    const newMatches: Record<number, any> = { ...matchResults };
    for (let i = 0; i < selectedFiles.length; i++) {
        newMatches[startIdx + i] = await findMatchingKhutbah(selectedFiles[i].name, selectedImamId);
    }
    setMatchResults(newMatches);
  };

  useEffect(() => {
    async function reMatch() {
        if (files.length > 0 && selectedImamId) {
            const matches: Record<number, any> = {};
            for (let i = 0; i < files.length; i++) {
                matches[i] = await findMatchingKhutbah(files[i].name, selectedImamId);
            }
            setMatchResults(matches);
        }
    }
    reMatch();
  }, [selectedImamId]);

  async function processAllFiles() {
    if (!selectedImamId) return;
    const selectedImam = imams.find(i => i.id === selectedImamId);
    if (!selectedImam) return;

    setIsUploading(true);
    setCurrentFileIndex(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = matchResults[i];
      setCurrentFileIndex(i + 1);
      
      try {
        console.log(`[Upload] Starting process for ${file.name}...`);
        setUploadProgress(prev => ({ ...prev, [i]: 'Uploading...' }));
        
        const safeImamName = selectedImam.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const storagePath = `${safeImamName}/${Date.now()}_${file.name.replace(/[^\w\s\-_.]/g, '')}`;
        
        const { error: uploadError } = await supabase.storage.from('khutbahs').upload(storagePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('khutbahs').getPublicUrl(storagePath);
        console.log(`[Upload] File uploaded to: ${publicUrl}`);

        setUploadProgress(prev => ({ ...prev, [i]: 'Extracting text...' }));
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        
        const extractData = await fetchApi('/api/extract-pdf', { base64, fileName: file.name });
        const rawText = extractData.text;
        console.log(`[Upload] Text extracted. Length: ${rawText?.length}`);

        let khutbahId: string;
        if (match) {
          khutbahId = match.id;
        } else {
          console.log(`[Upload] Creating temporary database entry for processing...`);
          const { data: newKhutbah, error: createError } = await supabase.from('khutbahs').insert({
              title: file.name.replace('.pdf', '').replace(/_/g, ' '),
              imam_id: selectedImamId,
              author: selectedImam.name,
              content: 'Processing...',
              file_url: publicUrl,
              file_path: storagePath,
              rating: 4.8,
              likes_count: 0
          }).select().single();
          if (createError) throw createError;
          khutbahId = newKhutbah.id;
        }

        setUploadProgress(prev => ({ ...prev, [i]: 'Formatting with AI...' }));
        const formatData = await fetchApi('/api/process-khutbah', { 
            content: rawText, 
            type: 'format',
            khutbahId: khutbahId,
            fileUrl: publicUrl
        });
        const formattedHtml = formatData.result;
        console.log(`[Upload] HTML formatted and saved to database.`);

        await new Promise(r => setTimeout(r, 1000));

        setUploadProgress(prev => ({ ...prev, [i]: 'Generating summary...' }));
        await fetchApi('/api/process-khutbah', { 
            content: formattedHtml, 
            type: 'cards',
            khutbahId: khutbahId
        });
        console.log(`[Upload] Summary cards generated and saved.`);

        setUploadProgress(prev => ({ ...prev, [i]: 'Done!' }));
        console.log(`[Upload] Finished processing ${file.name}`);
        
      } catch (error: any) {
        console.error(`[Upload] Failed to process ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [i]: 'Error: ' + (error.message || 'Processing failed') }));
      }
    }
    setIsUploading(false);
  }

  const matchedCount = Object.values(matchResults).filter(m => m).length;
  const newCount = files.length - matchedCount;

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Upload & Process PDFs</h2>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <User size={16} className="text-emerald-600"/> Select Imam / Author
            </label>
            <select 
              value={selectedImamId}
              onChange={(e) => setSelectedImamId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- Choose Author --</option>
              {imams.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
             <p className="text-xs text-gray-400 pb-2">All files in this batch will be assigned to the selected Imam.</p>
          </div>
        </div>
      </div>

      {!selectedImamId ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
          <User size={48} className="mx-auto mb-4 opacity-20"/>
          <p className="text-lg font-medium">Please select an author above to begin</p>
        </div>
      ) : (
        <>
          <div 
            className="border-2 border-dashed border-emerald-200 rounded-2xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer group transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all shadow-sm">
              <FileText size={32} />
            </div>
            <p className="font-bold text-gray-900 text-lg">Drop PDFs here or click to browse</p>
          </div>

          {files.length > 0 && (
            <div className="mt-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-end px-2">
                <h3 className="text-lg font-bold text-gray-900">Upload Preview</h3>
                <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                  {matchedCount} matched • {newCount} new
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">File Name</th>
                      <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Action</th>
                      <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {files.map((file, index) => {
                      const match = matchResults[index];
                      const status = uploadProgress[index];
                      const isCurrent = isUploading && currentFileIndex === (index + 1);
                      return (
                        <tr key={index} className={`hover:bg-gray-50 ${isCurrent ? 'bg-emerald-50/50' : ''}`}>
                          <td className="p-4 text-xs font-medium truncate max-w-[200px]">{file.name}</td>
                          <td className="p-4">
                            {match ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/> Will update: {match.title}</span>
                            ) : (
                              <span className="text-blue-600 font-bold flex items-center gap-1.5"><Plus size={14}/> Will create new</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`font-bold flex items-center gap-2 ${status?.includes('Error') ? 'text-red-500' : status === 'Done!' ? 'text-emerald-600' : 'text-blue-600'}`}>
                              {status && !status.includes('Done') && !status.includes('Error') && <Loader2 size={14} className="animate-spin"/>}
                              {status === 'Done!' && <Check size={16}/>}
                              {status || 'Ready'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isUploading && (
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-emerald-900">Total Progress</span>
                    <span className="text-sm font-black text-emerald-600">{Math.round((currentFileIndex / files.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${(currentFileIndex / files.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button 
                  onClick={() => { setFiles([]); setUploadProgress({}); setMatchResults({}); }} 
                  className="bg-white border border-gray-300 px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Clear All
                </button>
                <button 
                  onClick={processAllFiles} 
                  disabled={isUploading || files.length === 0} 
                  className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                  Process {files.length} PDFs
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const KhutbahUpload: React.FC<KhutbahUploadProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'pdf' | 'excel'>('pdf');

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
         <div className="w-full">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Bulk Upload Manager</h2>
              <p className="text-gray-500 mt-2 text-lg">Match PDFs to Authors and process via AI.</p>
            </div>

            <div className="flex p-1 bg-gray-200/60 rounded-2xl w-fit mb-10 border border-gray-200">
                <button onClick={() => setMode('pdf')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pdf' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileText size={18}/> PDF Upload & AI</button>
                <button onClick={() => setMode('excel')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'excel' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileSpreadsheet size={18}/> Excel Import</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[600px] mb-12">
                {mode === 'excel' ? <ExcelImportSection onSuccess={onSuccess} /> : <PdfUploadSection />}
            </div>
         </div>
      </div>
    </div>
  );
};