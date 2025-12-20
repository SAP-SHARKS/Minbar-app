
export type CategoryId = 'quran' | 'hadith' | 'opening' | 'closing' | 'stories' | 'quotes';

export interface BlockItem {
  id: string;
  arabic: string;
  english: string;
  reference: string;
  title?: string;
  category?: string;
  status?: string; // e.g., Sahih
  type: CategoryId;
}

export interface CategoryTile {
  id: CategoryId;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}
