import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';
import { Theme } from '../lib/themes';

interface TopicPageProps {
  theme: Theme;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
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

const COMMENT_MAX_LENGTH = 500;

export default function TopicPage({ theme }: TopicPageProps) {
  const { topicId } = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .select(`
            *,
            profiles:author_id(username),
            categories:category_id(name)
          `)
          .eq('id', topicId)
          .single();

        if (topicError) throw topicError;
        setTopic(topicData);

        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:author_id(username)
          `)
          .eq('topic_id', topicId)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;
        setComments(commentsData || []);
      } catch (error) {
        console.error('Error fetching topic:', error);
      }
    };

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchTopic();
    getUser();
  }, [topicId]);

  const handleCommentSubmit = async () => {
    if (!currentUser) {
      setError('Yorum yapmak için giriş yapmalısınız');
      return;
    }

    if (newComment.length > COMMENT_MAX_LENGTH) {
      setError(`Yorum en fazla ${COMMENT_MAX_LENGTH} karakter olabilir`);
      return;
    }

    try {
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: newComment,
          author_id: currentUser.id,
          topic_id: topicId
        })
        .select(`
          *,
          profiles:author_id(username)
        `)
        .single();

      if (commentError) throw commentError;

      setComments([...comments, comment]);
      setNewComment('');
      setError(null);
    } catch (error) {
      console.error('Error posting comment:', error);
      setError('Yorum gönderilirken bir hata oluştu');
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

  if (!topic) {
    return (
      <div className="text-center py-8">
        <p className="text-white">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topic */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-white">{topic.title}</h1>
          <span className="text-purple-400">{topic.categories.name}</span>
        </div>
        <p className="text-white/80 whitespace-pre-wrap mb-4">{topic.content}</p>
        <div className="flex justify-between items-center text-sm text-white/60">
          <span>@{topic.profiles.username}</span>
          <span>{formatDate(topic.created_at)}</span>
        </div>
      </div>

      {/* Comments */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h2 className="text-xl font-bold text-white mb-4">Yorumlar</h2>
        
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 bg-black/20 rounded-lg">
              <p className="text-white/80 mb-3">{comment.content}</p>
              <div className="flex justify-between items-center text-sm text-white/60">
                <span>@{comment.profiles.username}</span>
                <span>{formatDate(comment.created_at)}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-white/60 text-center py-4">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
          )}
        </div>

        {/* New Comment Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 mb-2">
              Yorum Yaz
              <span className="text-sm text-white/60 ml-2">
                ({newComment.length}/{COMMENT_MAX_LENGTH})
              </span>
            </label>
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => {
                  if (e.target.value.length <= COMMENT_MAX_LENGTH) {
                    setNewComment(e.target.value);
                    setError(null);
                  }
                }}
                placeholder="Yorumunuzu yazın..."
                className={`flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-y`}
                rows={3}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || !currentUser}
                className={`px-4 ${theme.accentColor} ${theme.accentHover} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}