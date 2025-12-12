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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // We use Promise.all to fetch data in parallel
        const [latest, trending, classics, topics, imams] = await Promise.all([
          // Latest
          supabase
            .from('khutbahs')
            .select('id, title, author, topic, tags, likes_count, comments_count, created_at, rating')
            .order('created_at', { ascending: false })
            .limit(6),
          // Trending (Most Liked recently - simulated by likes for now)
          supabase
            .from('khutbahs')
            .select('id, title, author, topic, tags, likes_count, comments_count, created_at, rating')
            .order('likes_count', { ascending: false })
            .limit(6),
          // Classics / Most Used (High engagement, older or just generally popular)
          supabase
            .from('khutbahs')
            .select('id, title, author, topic, tags, likes_count, comments_count, created_at, rating')
            .gt('likes_count', 10) // Mock filter for "classics"
            .limit(6),
          // Topics - Increased limit to 12 to fill 2 rows of 6
          supabase
            .from('topics')
            .select('*')
            .order('khutbah_count', { ascending: false })
            .limit(12),
          // Imams - Increased limit to 15
          supabase
            .from('imams')
            .select('*')
            .order('khutbah_count', { ascending: false })
            .limit(15),
        ]);

        // Map data safely
        const mapKhutbah = (item: any): KhutbahPreview => ({
            id: item.id,
            title: item.title,
            author: item.author,
            topic: item.topic,
            labels: item.tags,
            likes: item.likes_count,
            comments_count: item.comments_count,
            published_at: item.created_at,
            rating: item.rating || (4.5 + Math.random() * 0.5).toFixed(1) // Mock rating
        });

        setData({
          latest: (latest.data || []).map(mapKhutbah),
          trending: (trending.data || []).map(mapKhutbah),
          classics: (classics.data || []).map(mapKhutbah),
          featured: (trending.data || []).slice(0, 3).map(mapKhutbah), // reuse trending as featured for now
          topics: (topics.data || []),
          imams: (imams.data || []),
        });
      } catch (error) {
        console.error("Error loading homepage data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading };
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
      .select('id, title, author, topic, tags, likes_count, comments_count, created_at, rating', { count: 'exact' });

    // Filters
    if (filters.search) {
       query = query.or(`title.ilike.%${filters.search}%,author.ilike.%${filters.search}%`);
    }
    if (filters.topic && filters.topic !== 'All') query = query.eq('topic', filters.topic);
    if (filters.imam) query = query.eq('author', filters.imam);

    // Sorting
    if (filters.sort === 'trending') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
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
            published_at: item.created_at,
            rating: item.rating || (4.5 + Math.random() * 0.5).toFixed(1)
        }));

        setData(prev => reset ? mappedResults : [...prev, ...mappedResults]);
        setCount(totalCount || 0);
        setPage(pageNum);
        setHasMore(results.length === PAGE_SIZE);
    }
    
    setIsLoading(false);
  }, [filters]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchPage(page + 1);
    }
  };

  const refresh = () => fetchPage(0, true);

  return { data, count, hasMore, isLoading, loadMore, refresh };
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