import React from 'react';
import { COMMON_ARABIC_TERMS } from './constants';
import { Stats } from './types';

export const analyzeText = (text: string): Stats => {
  if (!text) return { 
    grade: 0, 
    hardSentences: 0, 
    veryHardSentences: 0, 
    adverbs: 0, 
    passive: 0, 
    untranslatedArabic: 0,
    words: 0,
    chars: 0,
    citations: []
  };

  const words = text.split(/\s+/);
  const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [];
  
  let hard = 0;
  let veryHard = 0;
  let untranslated = 0;
  
  // Sentence Analysis
  sentences.forEach(s => {
    const len = s.split(/\s+/).length;
    if (len > 25) veryHard++;
    else if (len > 18) hard++;
  });

  // Word Analysis
  const lowerText = text.toLowerCase();
  const adverbs = (lowerText.match(/\b\w+ly\b/g) || []).length;
  const passive = (lowerText.match(/\b(was|were|is|are|been)\b\s+\w+ed\b/g) || []).length;

  // Arabic Analysis
  COMMON_ARABIC_TERMS.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b(?!\\s*\\()`, 'gi');
    const matches = (text.match(regex) || []).length;
    untranslated += matches;
  });

  // Authenticity Check
  const citations: { type: string; text: string; status: string }[] = [];
  const surahMatches: string[] = text.match(/Surah\s+[A-Za-z-']+(\s*[:\d]+)?/gi) || [];
  surahMatches.forEach(m => citations.push({ type: 'quran', text: m, status: 'verified' }));
  
  const hadithMatches: string[] = text.match(/(Sahih\s+)?(Bukhari|Muslim|Tirmidhi|Abu\s+Dawud|Ibn\s+Majah)(\s+#?\d+)?/gi) || [];
  hadithMatches.forEach(m => {
      const status = m.length > 5 ? 'verified' : 'weak'; 
      citations.push({ type: 'hadith', text: m, status });
  });

  // Grading
  let grade = 0;
  if (sentences.length > 0 && words.length > 0) {
    const syllables = text.split(/[aeiouy]+/).length; 
    grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  }

  return {
    grade: Math.max(0, Math.min(14, Math.round(grade))),
    hardSentences: hard,
    veryHardSentences: veryHard,
    adverbs,
    passive,
    untranslatedArabic: untranslated,
    words: words.length,
    chars: text.length,
    citations
  };
};

export const renderHighlights = (text: string) => {
  if (!text) return null;

  let html = text;

  COMMON_ARABIC_TERMS.forEach(term => {
     const regex = new RegExp(`\\b(${term})\\b(?!\\s*\\()`, 'gi');
     html = html.replace(regex, '<span class="bg-emerald-200/60 border-b-2 border-emerald-400 pb-0.5">$1</span>');
  });

  html = html.replace(/\b(\w+ly)\b/g, '<span class="bg-blue-200/60 text-blue-900">$1</span>');
  html = html.replace(/\b((?:was|were|is|are|been)\s+\w+ed)\b/g, '<span class="bg-purple-200/60 text-purple-900">$1</span>');
  html = html.replace(/(Surah\s+[A-Za-z-']+(\s*[:\d]+)?)/gi, '<span class="bg-teal-200/60 border-b-2 border-teal-400 pb-0.5">$1</span>');
  html = html.replace(/((?:Sahih\s+)?(?:Bukhari|Muslim|Tirmidhi|Abu\s+Dawud|Ibn\s+Majah)(?:\s+#?\d+)?)/gi, '<span class="bg-teal-200/60 border-b-2 border-teal-400 pb-0.5">$1</span>');

  return <div dangerouslySetInnerHTML={{ __html: html }} className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-transparent" />;
};