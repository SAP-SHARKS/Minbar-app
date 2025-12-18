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
        const fileIndexRaw = row[0]; // Column A: Numeric Index
        const speakerRaw = row[2];   // Column C: Speaker
        const topicRaw = row[3];     // Column D: Topic
        const youtubeRaw = row[4];   // Column E: Youtube
        const durationRaw = row[5];  // Column F: Duration
        const tagsRaw = row[6];      // Column G: Tags

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
        const speakerFileIndex = parseInt(fileIndexRaw) || null;

        const item = {
          title: topic || 'Untitled Khutbah',
          imam_id: selectedImamId || null,
          author: selectedImam ? selectedImam.name : String(speakerRaw || 'Unknown').trim(),
          topic: topic,
          tags: finalTags,
          youtube_url: youtubeUrl || null,
          duration: durationRaw ? String(durationRaw).trim() : null,
          speaker_file_index: speakerFileIndex,
          rating: 4.8,
          likes_count: 0,
          comments_count: 0,
          created_at: new Date().toISOString(),
          // UI Validation helpers
          _isValidUrl: youtubeUrl ? isValidUrl(youtubeUrl) : true,
          _tagsDefaulted: tagsParsed.length === 0,
          _missingTopic: !topic,
          _status: 'ready' as any
        };

        if (index < 3) {
          console.log(`[Import Debug] Data Row ${index + 1}:`, { topic, author: item.author, speaker_file_index: item.speaker_file_index });
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
      console.log(`[Import] Fetching existing metadata for deduplication...`);
      const { data: existing, error: fetchErr } = await supabase
        .from('khutbahs')
        .select('youtube_url, title, author');
      
      if (fetchErr) throw fetchErr;

      const existingUrls = new Set((existing || []).filter(e => e.youtube_url).map(e => e.youtube_url));
      const existingTitlesAuthors = new Set((existing || []).map(e => `${e.title.toLowerCase()}|${e.author.toLowerCase()}`));

      const toInsert: any[] = [];
      const updatedKhutbahs = [...khutbahs];

      updatedKhutbahs.forEach((item, idx) => {
        if (item.youtube_url && existingUrls.has(item.youtube_url)) {
          updatedKhutbahs[idx]._status = 'skipped_existing';
          skippedCount++;
          return;
        }

        const key = `${item.title.toLowerCase()}|${item.author.toLowerCase()}`;
        if (existingTitlesAuthors.has(key)) {
          updatedKhutbahs[idx]._status = 'skipped_existing';
          skippedCount++;
          return;
        }

        updatedKhutbahs[idx]._status = 'importing';
        toInsert.push({ index: idx, data: item });
      });

      setKhutbahs(updatedKhutbahs);

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
      <p className="text-gray-600 mb-6">Targeting columns: A (Index), C (Speaker), D (Topic), E (Youtube), F (Duration), G (Tags).</p>

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
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Index (Col A)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Speaker (Col C)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic (Col D)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags (Col G)</th>
                  <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Link (Col E)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {khutbahs.map((k, i) => (
                  <tr key={i} className={`hover:bg-gray-50/80 transition-colors ${k._status === 'skipped_existing' ? 'opacity-50' : ''}`}>
                    <td className="p-4 w-28 shrink-0">{getStatusBadge(k._status)}</td>
                    <td className="p-4 text-xs font-mono text-gray-400">{k.speaker_file_index || '—'}</td>
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
                    </td>
                    <td className="p-4">
                      {k.youtube_url ? (
                        <div className="flex flex-col">
                           <a href={k.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 transition-colors">
                             <ExternalLink size={12}/> View Video
                           </a>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
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
              Start Excel Sync ({khutbahs.length})
            </button>
            <button 
                onClick={() => { setShowPreview(false); setKhutbahs([]); }} 
                className="bg-white border border-gray-200 px-8 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors shadow-sm"
            >
                Cancel
            </button>
          </div>
        </div>
      )}
      
      {importComplete && (
        <div className="p-10 bg-white rounded-[2rem] border border-emerald-100 text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle size={40} />
          </div>
          <h4 className="font-bold text-gray-900 text-3xl mb-3">Sync Complete</h4>
          <p className="text-gray-500 mb-8">Excel metadata has been recorded. You can now upload PDFs to attach files to these records.</p>
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
  const [matchResults, setMatchResults] = useState<Record<number, any>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImams();
  }, []);

  async function fetchImams() {
    const { data } = await supabase.from('imams').select('*').order('name');
    if (data) setImams(data);
  }

  // Parse filename like: "12_Joe Bradford_Moving Forward.pdf"
  const parseFilename = (filename: string) => {
    const regex = /^(\d+)_([^_]+)_/;
    const match = filename.match(regex);
    if (!match) return null;
    return {
      index: parseInt(match[1]),
      speaker: match[2].trim()
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    setFiles(prev => [...prev, ...selectedFiles]);
    
    // Preliminary check for matches (just for UI)
    const newMatches: Record<number, any> = { ...matchResults };
    const startIdx = files.length;
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const parsed = parseFilename(file.name);
        if (!parsed) {
          newMatches[startIdx + i] = { error: "Filename format invalid (Expected: Index_Speaker_...)" };
          continue;
        }

        const imam = imams.find(im => im.name.toLowerCase() === parsed.speaker.toLowerCase());
        if (!imam) {
          newMatches[startIdx + i] = { error: `Imam "${parsed.speaker}" not found in database` };
          continue;
        }

        const { data: match } = await supabase
          .from('khutbahs')
          .select('id, title')
          .eq('imam_id', imam.id)
          .eq('speaker_file_index', parsed.index)
          .maybeSingle();
        
        newMatches[startIdx + i] = match || { error: "No matching Excel record found (Check Index & Speaker)" };
    }
    setMatchResults(newMatches);
  };

  async function processAllFiles() {
    setIsUploading(true);
    setCurrentFileIndex(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      
      try {
        const parsed = parseFilename(file.name);
        if (!parsed) throw new Error("Filename format invalid. Expected: Index_Speaker_Rest.pdf");

        // 1. Resolve Imam
        const imam = imams.find(im => im.name.toLowerCase() === parsed.speaker.toLowerCase());
        if (!imam) throw new Error(`Unrecognized imam name "${parsed.speaker}" in filename`);

        setUploadProgress(prev => ({ ...prev, [i]: 'Matching record...' }));

        // 2. Find existing khutbah by imam + index
        const { data: match } = await supabase
          .from('khutbahs')
          .select('id, title')
          .eq('imam_id', imam.id)
          .eq('speaker_file_index', parsed.index)
          .maybeSingle();

        let khutbahId: string;
        let actionTaken: 'updated_existing' | 'inserted_new';

        if (match) {
          khutbahId = match.id;
          actionTaken = 'updated_existing';
          console.log(`[PDF Match] Found record ID: ${khutbahId} for filename ${file.name}`);
        } else {
          // If no match found, we insert a new one as fallback (though ideally Excel import is done first)
          console.log(`[PDF Match] No match found. Creating new row for ${file.name}`);
          const { data: newRow, error: insErr } = await supabase.from('khutbahs').insert({
            title: file.name.replace('.pdf', '').replace(/_/g, ' '),
            imam_id: imam.id,
            author: imam.name,
            speaker_file_index: parsed.index,
            rating: 4.8
          }).select().single();
          if (insErr) throw insErr;
          khutbahId = newRow.id;
          actionTaken = 'inserted_new';
        }

        console.log(`[PDF Upload] Filename: ${file.name} | Action: ${actionTaken} | ID: ${khutbahId}`);

        setUploadProgress(prev => ({ ...prev, [i]: 'Uploading PDF...' }));
        const safeImamName = imam.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const storagePath = `${safeImamName}/${Date.now()}_${file.name.replace(/[^\w\s\-_.]/g, '')}`;
        
        const { error: uploadError } = await supabase.storage.from('khutbahs').upload(storagePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('khutbahs').getPublicUrl(storagePath);

        setUploadProgress(prev => ({ ...prev, [i]: 'Extracting text...' }));
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        const extractData = await fetchApi('/api/extract-pdf', { base64, fileName: file.name });
        
        setUploadProgress(prev => ({ ...prev, [i]: 'Processing AI formatting...' }));
        // API handles the database update (now correctly targeting the ID)
        await fetchApi('/api/process-khutbah', { 
            content: extractData.text, 
            type: 'format',
            khutbahId: khutbahId,
            fileUrl: publicUrl
        });

        setUploadProgress(prev => ({ ...prev, [i]: 'Generating AI summary...' }));
        await fetchApi('/api/process-khutbah', { 
            content: 'Wait...', // Placeholder, server uses updated text
            type: 'cards',
            khutbahId: khutbahId
        });

        setUploadProgress(prev => ({ ...prev, [i]: actionTaken === 'updated_existing' ? 'Updated!' : 'Created!' }));
        
      } catch (error: any) {
        console.error(`[Upload Fail] ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [i]: 'Error: ' + error.message }));
      }
    }
    setIsUploading(false);
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Upload & Attach PDFs</h2>
      <p className="text-sm text-gray-500 mb-8">Filenames must start with <code className="bg-gray-100 px-1 font-bold">Index_SpeakerName_</code> (e.g. "12_Joe Bradford_...pdf").</p>
      
      <div 
        className="border-2 border-dashed border-emerald-200 rounded-2xl p-12 text-center hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer group transition-all mb-8"
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf" onChange={handleFileSelect} className="hidden" />
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all shadow-sm">
          <FileText size={32} />
        </div>
        <p className="font-bold text-gray-900 text-lg">Select PDFs to attach</p>
      </div>

      {files.length > 0 && (
        <div className="animate-in fade-in duration-300">
          <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">File Name</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Matching Rule</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file, index) => {
                  const match = matchResults[index];
                  const status = uploadProgress[index];
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="p-4 font-medium truncate max-w-[200px]">{file.name}</td>
                      <td className="p-4">
                        {match?.error ? (
                          <span className="text-red-500 font-bold text-[10px] flex items-center gap-1"><AlertTriangle size={12}/> {match.error}</span>
                        ) : match?.id ? (
                          <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1"><CheckCircle size={12}/> Found: {match.title}</span>
                        ) : (
                          <span className="text-blue-500 font-bold text-[10px] flex items-center gap-1"><Plus size={12}/> Will create new row</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold flex items-center gap-2 text-xs ${status?.includes('Error') ? 'text-red-500' : status?.includes('!') ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {status && !status.includes('!') && !status.includes('Error') && <Loader2 size={12} className="animate-spin"/>}
                          {status || 'Ready'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4">
             <button onClick={processAllFiles} disabled={isUploading} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2">
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                Start PDF Processing
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const KhutbahUpload: React.FC<KhutbahUploadProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'pdf' | 'excel'>('excel');

  return (
    <div className="flex h-full md:pl-20 bg-gray-50 overflow-y-auto w-full">
      <div className="page-container py-8 xl:py-12">
         <div className="w-full">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Bulk Upload Manager</h2>
              <p className="text-gray-500 mt-2 text-lg">Phase 1: Import Excel metadata. Phase 2: Attach PDFs via numeric index.</p>
            </div>

            <div className="flex p-1 bg-gray-200/60 rounded-2xl w-fit mb-10 border border-gray-200">
                <button onClick={() => setMode('excel')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'excel' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileSpreadsheet size={18}/> Excel Metadata</button>
                <button onClick={() => setMode('pdf')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pdf' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileText size={18}/> PDF Processing</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[600px] mb-12">
                {mode === 'excel' ? <ExcelImportSection onSuccess={onSuccess} /> : <PdfUploadSection />}
            </div>
         </div>
      </div>
    </div>
  );
};