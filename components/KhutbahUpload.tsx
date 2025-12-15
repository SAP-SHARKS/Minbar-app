import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, FileText, CheckCircle, AlertCircle, 
  Loader2, ChevronRight, UploadCloud, X, File,
  Check, AlertTriangle, Sparkles, Play
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

interface KhutbahUploadProps {
  onSuccess: () => void;
}

// --- Process Section (AI Batch) ---
const ProcessSection = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [results, setResults] = useState<any[]>([]);

  // Check if content already has HTML formatting
  const isAlreadyFormatted = (content: string) => {
    if (!content) return false;
    return content.includes('<h1>') || content.includes('<h2>') || content.includes('<blockquote');
  };

  const processAll = async () => {
    setProcessing(true);
    setResults([]);
    
    // Get all khutbahs
    const { data: allKhutbahs } = await supabase
      .from('khutbahs')
      .select('id, title, content');
    
    if (!allKhutbahs) {
        setProcessing(false);
        return;
    }

    // Filter out already formatted ones
    const khutbahs = allKhutbahs.filter(k => !isAlreadyFormatted(k.content));
    const skipped = allKhutbahs.length - khutbahs.length;
    
    if (skipped > 0) {
      setResults([{ title: `Skipped ${skipped} already formatted khutbahs`, success: true, skipped: true }]);
    }
    
    setProgress({ current: 0, total: khutbahs.length, currentTitle: '' });
    
    for (let i = 0; i < khutbahs.length; i++) {
      const khutbah = khutbahs[i];
      setProgress({ current: i + 1, total: khutbahs.length, currentTitle: khutbah.title });
      
      try {
        // Step 1: Format HTML
        const formatRes = await fetch('/api/process-khutbah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: khutbah.content, type: 'format' })
        });
        const formatData = await formatRes.json();
        const html = formatData.result;
        
        if (!formatRes.ok) throw new Error(formatData.error || 'Format failed');

        // Update khutbah content with formatted HTML
        await supabase.from('khutbahs').update({ content: html, extracted_text: html }).eq('id', khutbah.id);
        
        // Step 2: Generate cards
        const cardsRes = await fetch('/api/process-khutbah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: html, type: 'cards' })
        });
        const cardsData = await cardsRes.json();
        
        if (!cardsRes.ok) throw new Error(cardsData.error || 'Cards failed');

        let cardsJsonString = cardsData.result;
        // Clean markdown if present
        cardsJsonString = cardsJsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const cards = JSON.parse(cardsJsonString);
        
        // Delete existing cards for this khutbah
        await supabase.from('khutbah_cards').delete().eq('khutbah_id', khutbah.id);
        
        // Insert new cards with khutbah_id
        const cardsWithId = cards.map((card: any) => ({ ...card, khutbah_id: khutbah.id }));
        await supabase.from('khutbah_cards').insert(cardsWithId);
        
        setResults(prev => [...prev, { title: khutbah.title, success: true, cards: cards.length }]);
        
        // 2 second delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (error: any) {
        setResults(prev => [...prev, { title: khutbah.title, success: false, error: error.message }]);
      }
    }
    
    setProcessing(false);
  };

  return (
    <div className="mt-12 pt-10 border-t border-gray-200">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
           <div>
               <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                   <Sparkles className="text-purple-600" size={24}/> 
                   Process Existing Khutbahs
               </h3>
               <p className="text-gray-500 mt-1">
                   Use AI to format HTML content and generate summary cards for khutbahs already in the database.
               </p>
           </div>
           
           {!processing && (
               <button
                   onClick={processAll}
                   className="mt-4 md:mt-0 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center gap-2"
               >
                   <Play size={18} fill="currentColor" /> Process All
               </button>
           )}
       </div>

       {/* Progress Display */}
       {processing && (
           <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 mb-6">
               <div className="flex items-center gap-4 mb-2">
                   <Loader2 size={24} className="animate-spin text-purple-600"/>
                   <div>
                       <h4 className="font-bold text-purple-900">Processing Khutbahs...</h4>
                       <p className="text-sm text-purple-700">
                           {progress.current} of {progress.total} • Current: <strong>{progress.currentTitle}</strong>
                       </p>
                   </div>
               </div>
               {/* Progress Bar */}
               <div className="w-full bg-purple-200 rounded-full h-2.5 mt-2">
                   <div 
                       className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                       style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                   ></div>
               </div>
           </div>
       )}

       {/* Results Log */}
       {results.length > 0 && (
           <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
               <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Processing Log</h4>
               <div className="space-y-2">
                   {results.map((r, i) => (
                       <div key={i} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${r.skipped ? 'bg-blue-50 text-blue-800 border-blue-100' : r.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                           <div className="flex items-center gap-2">
                               {r.skipped ? <span>⏭️</span> : r.success ? <CheckCircle size={14}/> : <X size={14}/>} 
                               <span className="font-medium">{r.title}</span>
                           </div>
                           <div>
                               {r.success && !r.skipped && <span className="bg-white/50 px-2 py-0.5 rounded text-xs border border-green-200">{r.cards} cards</span>}
                               {r.skipped && <span className="text-xs opacity-70">Already formatted</span>}
                               {!r.success && !r.skipped && <span className="text-xs font-bold">{r.error}</span>}
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}
    </div>
  );
};

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
      
      // Get "Detail Cheklist" sheet
      let sheet = workbook.Sheets['Detail Cheklist'];
      
      // Fallback if specific sheet not found
      if (!sheet) {
         console.warn('"Detail Cheklist" sheet not found, trying first sheet.');
         if (workbook.SheetNames.length > 0) {
             sheet = workbook.Sheets[workbook.SheetNames[0]];
         } else {
             setErrorMsg('Could not find any sheets in the Excel file.');
             return;
         }
      }
      
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      
      // Filter rows that have a Topic (title)
      const validRows = rows.filter(row => row['Topic'] && String(row['Topic']).trim() !== '');
      
      if (validRows.length === 0) {
        setErrorMsg('No valid rows found. Ensure the Excel has a "Topic" column.');
        return;
      }

      // Map to database structure
      const mapped = validRows.map(row => ({
        title: String(row['Topic'] || '').trim(),
        author: String(row['Speaker'] || '').trim(),
        topic: String(row['Category'] || 'General').trim(),
        tags: row['Tags'] ? String(row['Tags']).split(',').map((t: string) => t.trim()) : ['General'],
        youtube_url: row['Youtube link'] ? String(row['Youtube link']).trim() : null,
        duration: row['Duration of khutbah'] ? String(row['Duration of khutbah']).trim() : null,
        file_url: null,
        file_path: null,
        rating: 4.8,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      }));
      
      setKhutbahs(mapped);
      setShowPreview(true);
    } catch (err: any) {
        console.error("Excel parse error", err);
        setErrorMsg("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
    }
  }

  async function importToDatabase() {
    setIsImporting(true);
    setImportProgress(0);
    
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < khutbahs.length; i += batchSize) {
      const batch = khutbahs.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('khutbahs')
        .insert(batch);
      
      if (error) {
        console.error('Batch error:', error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
      
      setImportProgress(Math.min(i + batchSize, khutbahs.length));
    }
    
    setIsImporting(false);
    setImportComplete(true);
    setImportResults({ success: successCount, errors: errorCount });
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2 text-gray-900">Import Master Excel</h2>
      <p className="text-gray-600 mb-6">
        Upload your master spreadsheet to create database entries. Then upload PDFs to match.
      </p>

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
             <FileSpreadsheet size={40} />
          </div>
          <p className="text-xl font-bold text-gray-900">Click to select Excel file</p>
          <p className="text-gray-500 mt-2">Supports .xlsx and .xls files</p>
        </div>
      )}
      
      {showPreview && !importComplete && (
        <div className="animate-in fade-in duration-300">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             Preview <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">{khutbahs.length} khutbahs</span>
          </h3>
          
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl mb-6 custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">#</th>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Title</th>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Speaker</th>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Category</th>
                  <th className="p-3 text-left font-bold text-gray-500 uppercase text-xs">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {khutbahs.slice(0, 50).map((k, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-400">{i + 1}</td>
                    <td className="p-3 font-medium text-gray-900">{k.title}</td>
                    <td className="p-3 text-gray-600">{k.author}</td>
                    <td className="p-3">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                        {k.topic}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{k.duration || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-gray-400 text-xs italic mb-6">
            Showing first 50 of {khutbahs.length} rows
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={importToDatabase}
              disabled={isImporting}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all"
            >
              {isImporting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Importing... ({importProgress}/{khutbahs.length})
                </>
              ) : (
                `Import All ${khutbahs.length} Khutbahs`
              )}
            </button>
            <button
              onClick={() => {
                setShowPreview(false);
                setKhutbahs([]);
              }}
              className="bg-gray-100 px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {importComplete && (
        <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in duration-300">
          <h4 className="font-bold text-emerald-900 text-2xl mb-2 flex items-center gap-2"><CheckCircle className="text-emerald-600"/> Import Complete!</h4>
          <p className="text-emerald-800 mb-6 text-lg">
            <span className="font-bold">{importResults.success}</span> khutbahs imported successfully.
            {importResults.errors > 0 && (
              <span className="text-red-600 ml-2 font-bold">
                ({importResults.errors} errors)
              </span>
            )}
          </p>
          <div className="flex gap-4">
             <button onClick={onSuccess} className="bg-white text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100">View Library</button>
             {/* Note: The user can manually switch tab if they want to proceed to PDF upload */}
          </div>
        </div>
      )}
    </div>
  );
};

// --- PDF Upload Section ---
const PdfUploadSection = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [matchResults, setMatchResults] = useState<Record<number, any>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse filename to get speaker and title
  function parseFilename(filename: string) {
    const nameWithoutExt = filename.replace('.pdf', '');
    
    // Pattern: Number_Speaker_Title
    const pattern1 = /^(\d+)_([^_]+)_(.+)$/;
    const match1 = nameWithoutExt.match(pattern1);
    if (match1) {
      return { speaker: match1[2].trim(), title: match1[3].trim() };
    }
    
    // Pattern: Speaker_Title
    const pattern2 = /^([^_]+)_(.+)$/;
    const match2 = nameWithoutExt.match(pattern2);
    if (match2) {
      return { speaker: match2[1].trim(), title: match2[2].trim() };
    }
    
    return { speaker: 'Unknown', title: nameWithoutExt.trim() };
  }

  // Find matching database entry
  async function findMatch(speaker: string, title: string) {
    // Clean the title for matching (remove punctuation, lowercase)
    const cleanTitle = title
      .toLowerCase()
      .replace(/[?!.,'":\-]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ')          // Normalize spaces
      .trim();
    
    // Get all khutbahs without file_url that match the speaker
    const { data: candidates } = await supabase
      .from('khutbahs')
      .select('id, title, author')
      .ilike('author', `%${speaker}%`)
      .is('file_url', null);
    
    // If no candidates found with speaker filter, try searching all records
    if (!candidates || candidates.length === 0) {
      // Try without speaker filter
      const { data: allCandidates } = await supabase
        .from('khutbahs')
        .select('id, title, author')
        .is('file_url', null);
      
      if (!allCandidates) return null;
      
      // Find best title match in all candidates
      const match = allCandidates.find((k: any) => {
        const dbTitle = k.title
          .toLowerCase()
          .replace(/[?!.,'":\-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return dbTitle === cleanTitle || dbTitle.includes(cleanTitle) || cleanTitle.includes(dbTitle);
      });
      
      return match || null;
    }
    
    // Find best title match from speaker candidates
    const match = candidates.find((k: any) => {
      const dbTitle = k.title
        .toLowerCase()
        .replace(/[?!.,'":\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Exact match after cleaning
      if (dbTitle === cleanTitle) return true;
      
      // One contains the other
      if (dbTitle.includes(cleanTitle) || cleanTitle.includes(dbTitle)) return true;
      
      return false;
    });
    
    return match || null;
  }

  // When files are selected, find matches
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    setFiles(selectedFiles);
    
    // Find matches for each file
    const matches: Record<number, any> = {};
    for (let i = 0; i < selectedFiles.length; i++) {
      const parsed = parseFilename(selectedFiles[i].name);
      const match = await findMatch(parsed.speaker, parsed.title);
      matches[i] = match;
    }
    setMatchResults(matches);
  }

  // Upload and update existing rows
  async function uploadAllFiles() {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = matchResults[i];
      
      if (!match) {
        setUploadProgress(prev => ({ ...prev, [i]: 'no-match' }));
        continue;
      }
      
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));
        
        // Create folder from speaker name
        const parsed = parseFilename(file.name);
        const folderName = parsed.speaker.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Clean filename for storage (remove special characters)
        const cleanFilename = file.name
          .replace(/['']/g, "'")  // Normalize apostrophes
          .replace(/[^\w\s\-_.]/g, '');  // Remove special chars except basic ones

        const filePath = `${folderName}/${cleanFilename}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('khutbahs')
          .upload(filePath, file, { 
            upsert: true,
            contentType: 'application/pdf'
          });
        
        if (uploadError) {
          throw new Error(`Storage error: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('khutbahs')
          .getPublicUrl(filePath);
        
        // UPDATE existing row (not insert)
        const { error: dbError } = await supabase
          .from('khutbahs')
          .update({ 
            file_path: filePath,
            file_url: urlData.publicUrl 
          })
          .eq('id', match.id);
        
        if (dbError) {
             throw dbError;
        }
        
        setUploadProgress(prev => ({ ...prev, [i]: 'done' }));
        
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        
        // Show the actual error message to user
        alert(`Error uploading ${file.name}: ${error.message || JSON.stringify(error)}`);
        
        setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
      }
    }
    
    setIsUploading(false);
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-2 text-gray-900">Upload PDFs</h2>
      <p className="text-gray-600 mb-6">
        Upload PDF files to match with existing database entries.
      </p>
      
      {/* Drag and drop zone */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-emerald-500 hover:bg-gray-50 transition-all cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
           <FileText size={40} />
        </div>
        <p className="text-xl font-bold text-gray-900">Drop PDFs here or click to browse</p>
        <p className="text-gray-500 mt-2">Select multiple files at once</p>
      </div>
      
      {/* File list with match status */}
      {files.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Files to Upload <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{files.length}</span></h3>
          
          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm mb-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">File</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Parsed Speaker</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Parsed Title</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Database Match</th>
                  <th className="p-4 text-left font-bold text-gray-500 uppercase text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file, index) => {
                  const parsed = parseFilename(file.name);
                  const match = matchResults[index];
                  const status = uploadProgress[index];
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-xs text-gray-600 font-medium max-w-[200px] truncate flex items-center gap-2">
                        <File size={14} className="shrink-0 text-gray-400"/> {file.name}
                      </td>
                      <td className="p-4 text-gray-700">{parsed.speaker}</td>
                      <td className="p-4 text-gray-700">{parsed.title}</td>
                      <td className="p-4">
                        {match ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/> {match.title}</span>
                        ) : (
                          <span className="text-red-500 font-bold flex items-center gap-1.5"><X size={14}/> No match</span>
                        )}
                      </td>
                      <td className="p-4">
                        {status === 'done' && <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={14}/> Uploaded</span>}
                        {status === 'uploading' && <span className="text-blue-600 font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> Uploading...</span>}
                        {status === 'error' && <span className="text-red-600 font-bold flex items-center gap-1"><AlertCircle size={14}/> Error</span>}
                        {status === 'no-match' && <span className="text-amber-500 font-bold flex items-center gap-1"><AlertTriangle size={14}/> Skipped</span>}
                        {!status && match && <span className="text-gray-400 font-medium">Ready</span>}
                        {!status && !match && <span className="text-gray-300 italic">Will skip</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
             <div className="text-sm font-medium text-gray-600">
                <span className="text-emerald-600 font-bold">{Object.values(matchResults).filter(m => m).length}</span> of <span className="font-bold">{files.length}</span> files matched to database entries
             </div>
             
             <div className="flex gap-4">
                <button
                onClick={() => {
                    setFiles([]);
                    setMatchResults({});
                    setUploadProgress({});
                }}
                className="bg-white border border-gray-300 px-6 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                Clear
                </button>
                <button
                onClick={uploadAllFiles}
                disabled={isUploading || Object.values(matchResults).filter(m => m).length === 0}
                className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                >
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                {isUploading ? 'Uploading...' : 'Upload Matched Files'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Main Component ---
export const KhutbahUpload: React.FC<KhutbahUploadProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'pdf' | 'excel'>('excel');

  return (
    <div className="flex h-screen md:pl-20 bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
         <div className="max-w-6xl mx-auto p-8 xl:p-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Bulk Upload Manager</h2>
                  <p className="text-gray-500 mt-1">Manage your khutbah library via bulk import.</p>
                </div>
            </div>

            {/* Toggle */}
            <div className="flex p-1.5 bg-gray-200/60 rounded-xl w-fit mb-8 border border-gray-200">
                <button
                    onClick={() => setMode('excel')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mode === 'excel' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                    <FileSpreadsheet size={18} /> Import Excel
                </button>
                <button
                    onClick={() => setMode('pdf')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mode === 'pdf' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                    <FileText size={18} /> Upload PDFs
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden min-h-[600px]">
                {mode === 'excel' ? <ExcelImportSection onSuccess={onSuccess} /> : <PdfUploadSection />}
            </div>

            {/* New Process Existing Section */}
            <ProcessSection />
         </div>
      </div>
    </div>
  );
};