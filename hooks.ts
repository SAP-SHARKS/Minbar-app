import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { KhutbahPreview, Topic, Imam } from './types';

export function useHomepageData() {
  const [data, setData] = useState<{
    latest: KhutbahPreview[];
    trending: KhutbahPreview[];
    classics: KhutbahPreview[];
    featured: KhutbahPreview[];
    topics: Topic[];
    imams: Imam[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [latestRes, trendingRes, classicsRes, topicsRes, imamsRes] = await Promise.all([
        supabase
          .from('khutbahs')
          .select(`
            id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating,
            imams ( name, slug )
          `)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('khutbahs')
          .select(`
            id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating,
            imams ( name, slug )
          `)
          .order('likes_count', { ascending: false })
          .limit(6),
        supabase
          .from('khutbahs')
          .select(`
            id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating,
            imams ( name, slug )
          `)
          .gt('likes_count', 10)
          .limit(6),
        supabase
          .from('topics')
          .select('id, name, slug, khutbah_count')
          .order('khutbah_count', { ascending: false })
          .limit(25),
        supabase
          .from('imams')
          .select('*')
          .order('khutbah_count', { ascending: false })
          .limit(15),
      ]);

      const rawTopics = topicsRes.data || [];
      const rawImams = imamsRes.data || [];

      const imamCounts = await Promise.all(
        rawImams.map(i => 
          supabase.from('khutbahs').select('*', { count: 'exact', head: true }).eq('author', i.name)
        )
      );

      const mapKhutbah = (item: any): KhutbahPreview => ({
          id: item.id,
          title: item.title,
          author: item.author,
          topic: item.topic,
          labels: item.tags,
          likes: item.likes_count,
          comments_count: item.comments_count,
          view_count: item.view_count || 0,
          published_at: item.created_at,
          rating: typeof item.rating === 'number' ? item.rating : parseFloat(item.rating || '4.8'),
          imam_slug: item.imams?.slug
      });

      setData({
        latest: (latestRes.data || []).map(mapKhutbah),
        trending: (trendingRes.data || []).map(mapKhutbah),
        classics: (classicsRes.data || []).map(mapKhutbah),
        featured: (trendingRes.data || []).slice(0, 3).map(mapKhutbah),
        topics: rawTopics,
        imams: rawImams.map((i, idx) => ({
          ...i,
          khutbah_count: imamCounts[idx].count ?? 0
        })).sort((a, b) => b.khutbah_count - a.khutbah_count),
      });
    } catch (error) {
      console.error("Error loading homepage data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, refresh: fetchData, setData };
}

const PAGE_SIZE = 20;

export function usePaginatedKhutbahs(filters: { topic?: string; imam?: string; sort?: string; search?: string }) {
  const [data, setData] = useState<KhutbahPreview[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    setIsLoading(true);

    let query = supabase
      .from('khutbahs')
      .select(`
        id, title, author, topic, tags, likes_count, comments_count, view_count, created_at, rating,
        imams ( name, slug )
      `, { count: 'exact' });

    if (filters.search && filters.search.trim().length > 0) {
       const term = filters.search.trim();
       // Using weighted full-text search as requested
       query = query.textSearch('fts_weighted', term, { config: 'english', type: 'websearch' });
    }

    if (filters.topic && filters.topic !== 'All') query = query.eq('topic', filters.topic);
    if (filters.imam) query = query.eq('author', filters.imam);

    // Sorting Logic: Prioritize FTS relevance ranking if searching
    if (filters.search) {
       query = query.order('fts_weighted', { ascending: false });
    } else if (filters.sort === 'trending') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: results, count: totalCount, error } = await query;

    if (!error && results) {
        const mappedResults: KhutbahPreview[] = results.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            topic: item.topic,
            labels: item.tags,
            likes: item.likes_count,
            comments_count: item.comments_count,
            view_count: item.view_count || 0,
            published_at: item.created_at,
            rating: typeof item.rating === 'number' ? item.rating : parseFloat(item.rating || '4.8'),
            imam_slug: item.imams?.slug
        }));

        setData(prev => reset ? mappedResults : [...prev, ...mappedResults]);
        setCount(totalCount || 0);
        setPage(pageNum);
        setHasMore(results.length === PAGE_SIZE);
    }
    
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchPage(page + 1);
    }
  };

  const refresh = () => fetchPage(0, true);

  return { data, setData, count, hasMore, isLoading, loadMore, refresh };
}

export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean, isLoading: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node || !hasMore) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    observerRef.current.observe(node);
  }, [onLoadMore, hasMore, isLoading]);

  return lastElementRef;
}