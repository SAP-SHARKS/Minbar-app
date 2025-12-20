
export type CategoryId = 'quran' | 'hadith' | 'opening' | 'closing' | 'stories' | 'quotes';

export interface BlockItem {
  id: string;
  arabic: string;
  english: string;
  reference: string;
  title?: string;
  category?: string;
  status?: string; 
  length?: 'Short' | 'Medium' | 'Long';
  bookSlug?: string;
  hadithNumber?: string;
  book?: string;
  type: CategoryId;
}

export interface CategoryTile {
  id: CategoryId;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}
