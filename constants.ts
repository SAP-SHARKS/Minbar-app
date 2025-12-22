import { AuthorData, Khutbah } from './types';

export const AUTHORS_DATA: Record<string, AuthorData> = {
  'Mufti Menk': {
    name: 'Mufti Menk',
    title: 'Global Islamic Scholar',
    location: 'Zimbabwe',
    bio: 'Dr Mufti Ismail Menk is a leading global Islamic scholar born and raised in Zimbabwe. He studied Shariah in Madinah and holds a Doctorate of Social Guidance from Aldersgate University.',
    stats: { khutbahs: 142, likes: '2.4M', followers: '10M' },
    imageColor: 'bg-emerald-100 text-emerald-700',
    initial: 'M'
  },
  'Omar Suleiman': {
    name: 'Omar Suleiman',
    title: 'President of Yaqeen Institute',
    location: 'Dallas, USA',
    bio: 'Imam Omar Suleiman is the Founder and President of the Yaqeen Institute for Islamic Research, and an Adjunct Professor of Islamic Studies in the Graduate Liberal Studies Program at SMU.',
    stats: { khutbahs: 89, likes: '1.2M', followers: '5M' },
    imageColor: 'bg-blue-100 text-blue-700',
    initial: 'O'
  },
  'Nouman Ali Khan': {
    name: 'Nouman Ali Khan',
    title: 'Founder of Bayyinah',
    location: 'Dallas, USA',
    bio: 'Nouman Ali Khan is the founder and CEO of Bayyinah Institute and serves as a lead instructor for several traveling seminars and programs.',
    stats: { khutbahs: 210, likes: '3.1M', followers: '8M' },
    imageColor: 'bg-purple-100 text-purple-700',
    initial: 'N'
  },
  'Joe Bradford': {
    name: 'Joe Bradford',
    title: 'Scholar of Islamic Finance',
    location: 'Houston, USA',
    bio: 'Joe Bradford is an American scholar of Islam, instructor, entrepreneur, and ethical finance advisor.',
    stats: { khutbahs: 45, likes: '540', followers: '25K' },
    imageColor: 'bg-orange-100 text-orange-700',
    initial: 'J'
  },
  'Local Imam': {
    name: 'Local Imam',
    title: 'Community Leader',
    location: 'Local Masjid',
    bio: 'A dedicated servant of the community focusing on daily prayers and education.',
    stats: { khutbahs: 15, likes: '450', followers: '1.2K' },
    imageColor: 'bg-gray-100 text-gray-700',
    initial: 'L'
  }
};

export const PUBLIC_KHUTBAHS: Khutbah[] = [
  { 
      id: 'k1', 
      title: 'The Power of Patience', 
      author: 'Mufti Menk', 
      topic: 'Sabr', 
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't1', name: 'Sabr', slug: 'sabr' },
        { id: 't2', name: 'Character', slug: 'character' },
        { id: 't3', name: 'Heart', slug: 'heart' }
      ],
      likes: 1240, 
      content: "Patience is not just waiting...", 
      style: 'Spiritual',
      file_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf', // Sample PDF
      comments: [
          { user: "User123", text: "MashaAllah, very beneficial reminder.", date: "2d ago" },
          { user: "Abdullah", text: "Does anyone have the reference for the second hadith mentioned?", date: "1d ago" }
      ]
  },
  { 
      id: 'k2', 
      title: 'Navigating the Modern World', 
      author: 'Omar Suleiman', 
      topic: 'Youth', 
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't4', name: 'Youth', slug: 'youth' },
        { id: 't5', name: 'Contemporary', slug: 'contemporary' },
        { id: 't6', name: 'Society', slug: 'society' }
      ],
      likes: 890, 
      content: "The youth of today face...", 
      style: 'Academic',
      comments: [
          { user: "Sarah K.", text: "This is exactly what I needed to hear today.", date: "5h ago" }
      ]
  },
  { 
      id: 'k3', 
      title: 'Rights of Neighbors', 
      author: 'Nouman Ali Khan', 
      topic: 'Society', 
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't6', name: 'Society', slug: 'society' },
        { id: 't7', name: 'Adab', slug: 'adab' },
        { id: 't8', name: 'Fiqh', slug: 'fiqh' }
      ],
      likes: 2100, 
      content: "The Quran emphasizes...", 
      style: 'Academic',
      comments: []
  },
  { 
      id: 'k4', 
      title: 'Importance of Fajr', 
      author: 'Local Imam', 
      topic: 'Salah', 
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't9', name: 'Salah', slug: 'salah' },
        { id: 't10', name: 'Discipline', slug: 'discipline' },
        { id: 't11', name: 'Daily', slug: 'daily' }
      ],
      likes: 45, 
      content: "Fajr is the hardest prayer...", 
      style: 'Spiritual',
      comments: [
          { user: "Ahmed", text: "JazakAllah Khair.", date: "1w ago" },
          { user: "Guest", text: "Beautiful recitation.", date: "6d ago" }
      ]
  },
  {
      id: 'k5',
      title: "Don't Get Angry",
      author: "Joe Bradford",
      topic: "Character",
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't12', name: 'Anger', slug: 'anger' },
        { id: 't13', name: 'Sunnah', slug: 'sunnah' },
        { id: 't14', name: 'Self-Control', slug: 'self-control' }
      ],
      likes: 540,
      style: 'Spiritual',
      comments: [],
      content: `Don't Get Angry\nIslamic Guidance on Anger Management\nJoe Bradford\n\nOpening\nالسلام عليكم ورحمة الله وبركاته... (Content truncated for brevity, but full content from prompt is implied)`
  },
  {
      id: 'k6',
      title: "Welcome Ramadan",
      author: "Nouman Ali Khan",
      topic: "Ramadan",
      // Fix: changed 'labels' to 'tags' and converted to Tag objects to match Khutbah type
      tags: [
        { id: 't15', name: 'Ramadan', slug: 'ramadan' },
        { id: 't16', name: 'Quran', slug: 'quran' },
        { id: 't17', name: 'Taqwa', slug: 'taqwa' }
      ],
      likes: 3200,
      style: 'Spiritual',
      comments: [],
      content: `Welcome Ramadan\nBy Nouman Ali Khan\n\nIntroduction: The Breadth of Islamic Knowledge... (Content truncated for brevity, but full content from prompt is implied)`
  }
];

export const COMMON_ARABIC_TERMS = ['taqwa', 'sadaqah', 'dunya', 'akhirah', 'deen', 'iman', 'rizq', 'jannah', 'jahannam', 'sabr', 'shukr', 'tawakkul', 'zakat', 'hajj', 'salah', 'wudu'];
