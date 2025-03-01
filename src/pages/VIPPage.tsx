import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Theme } from '../lib/themes';

interface VIPPageProps {
  onNewTopic: () => void;
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
  categories: {
    name: string;
  };
}

export default function VIPPage({ onNewTopic, theme }: VIPPageProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [userRoleLevel, setUserRoleLevel] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from('topics')
          .select(`
            *,
            profiles:author_id(username),
            categories:category_id(name)
          `)
          .eq('is_vip', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTopics(data || []);
      } catch (error) {
        console.error('Error fetching VIP topics:', error);
      }
    };

    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            role:roles(
              level
            )
          `)
          .eq('user_id', user.id);

        const highestRole = userRoles?.reduce((prev, curr) => {
          return (curr.role.level > prev.role.level) ? curr : prev;
        }, userRoles?.[0]);

        setUserRoleLevel(highestRole?.role.level || 0);
      }
    };

    fetchTopics();
    checkUserRole();
  }, []);

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

  if (userRoleLevel < 3) {
    return (
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h2 className="text-xl font-bold text-white mb-4">VIP Bölümü</h2>
        <p className="text-white/80">Bu bölümü görüntülemek için VIP üye olmanız gerekmektedir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">VIP Tartışmalar</h2>
          {userRoleLevel >= 3 && (
            <button 
              onClick={onNewTopic}
              className={`flex items-center space-x-2 px-4 py-2 ${theme.accentColor} ${theme.accentHover} rounded-lg text-white transition-colors`}
            >
              <Plus className="w-5 h-5" />
              <span>Yeni VIP Konu</span>
            </button>
          )}
        </div>
        <div className="space-y-4">
          {topics.map((topic) => (
            <div 
              key={topic.id} 
              onClick={() => navigate(`/konu/${topic.id}`)}
              className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-white">{topic.title}</h3>
                <span className="text-sm text-purple-400 hover:text-purple-300">
                  {topic.categories.name}
                </span>
              </div>
              <p className="text-white/80 mb-3 line-clamp-2">{topic.content}</p>
              <div className="flex justify-between items-center text-sm text-white/60">
                <span>@{topic.profiles.username}</span>
                <span>{formatDate(topic.created_at)}</span>
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <div className="p-4 bg-black/20 rounded-lg">
              <p className="text-white/90">Henüz VIP konu bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}