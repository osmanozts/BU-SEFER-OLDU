import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/themes';

interface CategoryPageProps {
  theme: Theme;
}

interface Topic {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

export default function CategoryPage({ theme }: CategoryPageProps) {
  const { category } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<any>(null);

  useEffect(() => {
    fetchCategoryTopics();
  }, [category]);

  const fetchCategoryTopics = async () => {
    try {
      // Get category info
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .ilike('name', category || '')
        .single();

      if (categoryError) throw categoryError;
      setCategoryInfo(categoryData);

      // Get topics for this category
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          *,
          profiles:author_id(username)
        `)
        .eq('category_id', categoryData.id)
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);
    } catch (error) {
      console.error('Error fetching category topics:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h1 className="text-2xl font-bold text-white mb-4 capitalize">{category}</h1>
        <p className="text-white/80">{categoryInfo?.description || 'Bu kategorideki en güncel tartışmaları burada bulabilirsiniz.'}</p>
      </div>

      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="space-y-4">
          {topics.map((topic) => (
            <div 
              key={topic.id}
              onClick={() => navigate(`/konu/${topic.id}`)}
              className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{topic.title}</h3>
              <p className="text-white/80 mb-3 line-clamp-2">{topic.content}</p>
              <div className="flex justify-between items-center text-sm text-white/60">
                <span>@{topic.profiles.username}</span>
                <span>{formatDate(topic.created_at)}</span>
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <div className="p-4 bg-black/20 rounded-lg">
              <p className="text-white/90">Bu kategoride henüz konu bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}