import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const ProcessKhutbahs = () => {
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
    <div className="p-8 max-w-3xl mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Process Khutbahs</h1>
      <p className="text-gray-600 mb-6">
        This will format all khutbahs with proper HTML and generate summary cards using AI.
      </p>
      
      <button
        onClick={processAll}
        disabled={processing}
        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
      >
        {processing ? `Processing ${progress.current}/${progress.total}...` : 'Process All Khutbahs'}
      </button>
      
      {processing && progress.currentTitle && (
        <p className="mt-4 text-gray-600 animate-pulse">
          Currently processing: <strong>{progress.currentTitle}</strong>
        </p>
      )}
      
      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="font-bold text-lg mb-3">Results:</h2>
          {results.map((r, i) => (
            <div key={i} className={`p-3 rounded border ${r.skipped ? 'bg-blue-50 text-blue-800 border-blue-100' : r.success ? 'bg-green-50 text-green-800 border-green-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
              {r.skipped ? '⏭️' : r.success ? '✅' : '❌'} <span className="font-medium">{r.title}</span> 
              {r.success && !r.skipped && <span className="text-green-600 ml-2 text-sm">({r.cards} cards generated)</span>}
              {!r.success && !r.skipped && <span className="text-red-600 ml-2 text-sm">- {r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};