
export interface Comment {
  user: string;
  text: string;
  date: string;
}

export interface KhutbahPreview {
  id: string;
  title: string;
  author: string;
  topic?: string;
  labels?: string[];
  view_count?: number;
  published_at?: string;
  likes: number;
  comments_count?: number;
  rating?: number;
}

export interface Khutbah {
  id: string;
  title: string;
  author: string;
  topic: string;
  labels?: string[];
  likes: number;
  content: string;
  style: string;
  date?: string;
  comments?: Comment[];
  file_url?: string;
  view_count?: number;
  rating?: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  khutbah_count: number;
}

export interface Imam {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  mosque?: string;
  city?: string;
  khutbah_count: number;
  is_verified?: boolean;
}

export interface AuthorData {
  name: string;
  title: string;
  location: string;
  bio: string;
  stats: {
    khutbahs: number;
    likes: string | number;
    followers: string;
  };
  imageColor: string;
  initial: string;
}

export interface Stats {
  grade: number;
  hardSentences: number;
  veryHardSentences: number;
  adverbs: number;
  passive: number;
  untranslatedArabic: number;
  words: number;
  chars: number;
  citations: { type: string; text: string; status: string }[];
}

export interface KhateebProfile {
  id: number;
  initial: string;
  name: string;
  rating: number;
  title: string;
  location: string;
  tags: string[];
  color: string;
  stats: { khutbahs: number; likes: number; reviews: number };
  bio: string;
  reviewsList: { id: number; user: string; rating: number; text: string }[];
  khutbahsList: { id: number; title: string; date: string; likes: number }[];
}
