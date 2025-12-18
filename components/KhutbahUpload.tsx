import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, FileText, CheckCircle, AlertCircle, 
  Loader2, ChevronRight, UploadCloud, X, Plus,
  Check, AlertTriangle, Sparkles, Play, Search, User
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

interface KhutbahUploadProps {
  onSuccess: () => void;
}

// --- Excel Import Section ---
const ExcelImportSection = ({ onSuccess }: { onSuccess: () => void }) => {
  const [khutbahs, setKhutbahs] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, errors: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setErrorMsg('');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      let sheet = workbook.Sheets['Detail Cheklist'] || workbook.Sheets[workbook.SheetNames[0]];
      
      if (!sheet) {
          setErrorMsg('Could not find any sheets in the Excel file.');
          return;
      }
      
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      const validRows = rows.filter(row => row['Topic'] && String(row['Topic']).trim() !== '');
      
      if (validRows.length === 0) {
        setErrorMsg('No valid rows found. Ensure the Excel has a "Topic" column.');
        return;
      }

      const mapped = validRows.map(row => ({
        title: String(row['Topic'] || '').trim(),
        author: String(row['Speaker'] || '').trim(),
        topic: String(row['Category'] || 'General').trim(),
        tags: row['Tags'] ? String(row['Tags']).split(',').map((t: string) => t.trim()) : ['General'],
        youtube_url: row['Youtube link'] ? String(row['Youtube link']).trim() : null,
        duration: row['Duration of khutbah'] ? String(row['Duration of khutbah']).trim() : null,
        rating: 4.8,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      }));
      
      setKhutbahs(mapped);
      setShowPreview(true);
    } catch (err: any) {
        setErrorMsg("Failed to parse Excel file.");
    }
  }

  async function importToDatabase() {
    setIsImporting(true);
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < khutbahs.length; i += batchSize) {
      const batch = khutbahs.slice(i, i + batchSize);
      const { error } = await supabase.from('khutbahs').insert(batch);
      if (error) errorCount += batch.length;
      else successCount += batch.length;
      setImportProgress(Math.min(i + batchSize, khutbahs.length));
    }
    
    setIsImporting(false);
    setImportComplete(true);
    setImportResults({ success: successCount, errors: errorCount });
    if (onSuccess) setTimeout(onSuccess, 2000);
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2 text-gray-900">Import Master Excel</h2>
      <p className="text-gray-600 mb-6">Upload your master spreadsheet to create database entries.</p>

      {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20}/> {errorMsg}
          </div>
      )}
      
      {!showPreview && !importComplete && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-emerald-500 hover:bg-gray-50 transition-all cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
             <FileSpreadsheet size={40} />
          </div>
          <p className="text-xl font-bold text-gray-900">Select Excel file</p>
          <p className="text-gray-400 mt-2 text-sm">Schema: Topic, Speaker, Category, Tags</p>
        </div>
      )}
      
      {showPreview && !importComplete && (
        <div className="animate-in fade-in duration-300">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl mb-6 custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Title</th>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Speaker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {khutbahs.slice(0, 50).map((k, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{k.title}</td>
                    <td className="p-3 text-gray-600">{k.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4">
            <button onClick={importToDatabase} disabled={isImporting} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
              {isImporting ? <Loader2 className="animate-spin" size={18} /> : null}
              Import {khutbahs.length} Khutbahs
            </button>
            <button onClick={() => { setShowPreview(false); setKhutbahs([]); }} className="bg-gray-100 px-8 py-3 rounded-xl font-bold text-gray-600">Cancel</button>
          </div>
        </div>
      )}
      
      {importComplete && (
        <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100">
          <h4 className="font-bold text-emerald-900 text-2xl mb-2 flex items-center gap-2"><CheckCircle className="text-emerald-600"/> Import Complete!</h4>
          <p className="text-emerald-800">Success: {importResults.success} | Errors: {importResults.errors}</p>
          <button onClick={onSuccess} className="mt-6 bg-white text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-bold">View Library</button>
        </div>
      )}
    </div>
  );
};

// --- PDF Upload Section ---
const PdfUploadSection = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const [matchResults, setMatchResults] = useState<Record<number, any>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUniqueAuthors();
  }, []);

  async function fetchUniqueAuthors() {
    const { data } = await supabase.from('khutbahs').select('author').not('author', 'is', null);
    if (data) {
        const unique = Array.from(new Set(data.map(i => i.author))).filter(Boolean).sort() as string[];
        setAuthors(unique);
    }
  }

  async function findMatchingKhutbah(fileName: string, author: string) {
    if (!author) return null;
    
    // Clean the filename
    const cleanTitle = fileName
      .replace(/^\d+_/, '')              // Remove leading numbers
      .replace(/_/g, ' ')                // Replace underscores
      .replace(/\.pdf$/i, '')            // Remove .pdf
      .replace(new RegExp(author, 'gi'), '') // Remove author name if in filename
      .replace(/\s+/g, ' ')              // Normalize spaces
      .trim();
    
    if (!cleanTitle) return null;

    // Search ONLY this author's khutbahs
    const { data: matches } = await supabase
      .from('khutbahs')
      .select('*')
      .eq('author', author)
      .ilike('title', `%${cleanTitle}%`);
    
    return matches && matches.length > 0 ? matches[0] : null;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    const startIdx = files.length;
    setFiles(prev => [...prev, ...selectedFiles]);
    
    // Auto-match for newly selected files
    const newMatches: Record<number, any> = { ...matchResults };
    for (let i = 0; i < selectedFiles.length; i++) {
        newMatches[startIdx + i] = await findMatchingKhutbah(selectedFiles[i].name, selectedAuthor);
    }
    setMatchResults(newMatches);
  };

  useEffect(() => {
    async function reMatch() {
        if (files.length > 0 && selectedAuthor) {
            const matches: Record<number, any> = {};
            for (let i = 0; i < files.length; i++) {
                matches[i] = await findMatchingKhutbah(files[i].name, selectedAuthor);
            }
            setMatchResults(matches);
        }
    }
    reMatch();
  }, [selectedAuthor]);

  async function processAllFiles() {
    if (!selectedAuthor) return;
    setIsUploading(true);
    setCurrentFileIndex(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = matchResults[i];
      setCurrentFileIndex(i + 1);
      
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 'Uploading...' }));
        const safeAuthor = selectedAuthor.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const storagePath = `${safeAuthor}/${Date.now()}_${file.name.replace(/[^\w\s\-_.]/g, '')}`;
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
        const extractRes = await fetch('/api/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64 })
        });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error);
        const rawText = extractData.text;

        setUploadProgress(prev => ({ ...prev, [i]: 'Formatting...' }));
        const formatRes = await fetch('/api/process-khutbah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: rawText, type: 'format' })
        });
        const formatData = await formatRes.json();
        if (!formatRes.ok) throw new Error(formatData.error);
        const formattedHtml = formatData.result;

        await new Promise(r => setTimeout(r, 1000));

        setUploadProgress(prev => ({ ...prev, [i]: 'Cards...' }));
        const cardsRes = await fetch('/api/process-khutbah', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: formattedHtml, type: 'cards' })
        });
        const cardsData = await cardsRes.json();
        if (!cardsRes.ok) throw new Error(cardsData.error);
        const cards = JSON.parse(cardsData.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

        let khutbahId: string;
        if (match) {
          khutbahId = match.id;
          const { error: upErr } = await supabase.from('khutbahs').update({ 
              content: formattedHtml,
              extracted_text: formattedHtml,
              file_url: publicUrl,
              file_path: storagePath
          }).eq('id', khutbahId);
          if (upErr) throw upErr;
        } else {
          const { data: newKhutbah, error: createError } = await supabase.from('khutbahs').insert({
              title: file.name.replace('.pdf', '').replace(/_/g, ' '),
              author: selectedAuthor,
              content: formattedHtml,
              extracted_text: formattedHtml,
              file_url: publicUrl,
              file_path: storagePath,
              rating: 4.8,
              likes_count: 0
          }).select().single();
          if (createError) throw createError;
          khutbahId = newKhutbah.id;
        }

        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbahId);
        const cardsWithId = cards.map((card: any) => ({ ...card, khutbah_id: khutbahId }));
        await supabase.from('khutbah_cards').insert(cardsWithId);

        setUploadProgress(prev => ({ ...prev, [i]: 'Done!' }));
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (error: any) {
        setUploadProgress(prev => ({ ...prev, [i]: 'Error: ' + error.message }));
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
              <User size={16} className="text-emerald-600"/> Select Author
            </label>
            <select 
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">-- Choose Author --</option>
              {authors.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
             <p className="text-xs text-gray-400 mt-8">Matching logic: Author → Filename → Database Title</p>
          </div>
        </div>
      </div>

      {!selectedAuthor ? (
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
                      className="bg-emerald-600 h-full transition-all duration-500"
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
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
         <div className="max-w-6xl mx-auto p-8 xl:p-12">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Bulk Upload Manager</h2>
              <p className="text-gray-500 mt-2 text-lg">Match PDFs to Authors and process via AI.</p>
            </div>

            <div className="flex p-1 bg-gray-200/60 rounded-2xl w-fit mb-10 border border-gray-200">
                <button onClick={() => setMode('pdf')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pdf' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileText size={18}/> PDF Upload & AI</button>
                <button onClick={() => setMode('excel')} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'excel' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}><FileSpreadsheet size={18}/> Excel Import</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[600px]">
                {mode === 'excel' ? <ExcelImportSection onSuccess={onSuccess} /> : <PdfUploadSection />}
            </div>
         </div>
      </div>
    </div>
  );
};