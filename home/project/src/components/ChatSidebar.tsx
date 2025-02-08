import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

const MESSAGE_MAX_LENGTH = 200;

export default function ChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:author_id(username)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setMessages(data?.reverse() || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchMessages();
    getUser();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload: any) => {
          // Fetch the complete message with profile info
          const { data, error } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles:author_id(username)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentUser) {
      setError('Mesaj göndermek için giriş yapmalısınız');
      return;
    }

    if (newMessage.length > MESSAGE_MAX_LENGTH) {
      setError(`Mesaj en fazla ${MESSAGE_MAX_LENGTH} karakter olabilir`);
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: newMessage,
          author_id: currentUser.id
        });

      if (error) throw error;

      setNewMessage('');
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Mesaj gönderilirken bir hata oluştu');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-xl font-bold text-white mb-4">Canlı Sohbet</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${message.profiles.username === currentUser?.user_metadata?.username
                ? 'bg-purple-500/20 ml-8'
                : 'bg-black/20 mr-8'
              }`}
          >
            <p className="text-white/90 break-words">{message.content}</p>
            <div className="flex justify-between items-center mt-1 text-xs text-white/60">
              <span>@{message.profiles.username}</span>
              <span>{formatTime(message.created_at)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              if (e.target.value.length <= MESSAGE_MAX_LENGTH) {
                setNewMessage(e.target.value);
                setError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={currentUser ? "Mesajınızı yazın..." : "Mesaj göndermek için giriş yapın"}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !currentUser}
            className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}