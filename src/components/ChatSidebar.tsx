import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/themes';

interface ChatSidebarProps {
  theme: Theme;
}

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

const MESSAGE_MAX_LENGTH = 200;
// const MESSAGE_COOLDOWN = 1500; // 1.5 seconds

export default function ChatSidebar({ theme }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(1.5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cooldownInterval = useRef<number | null>(null);

  if (error) return <></>

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            content,
            created_at,
            profiles:author_id(username)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setMessages((data || []).reverse());

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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

    // Realtime subscription
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  const startCooldown = () => {
    setCooldown(true);
    setCooldownTime(1.5);

    if (cooldownInterval.current) {
      clearInterval(cooldownInterval.current);
    }

    cooldownInterval.current = window.setInterval(() => {
      setCooldownTime((prev) => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          setCooldown(false);
          clearInterval(cooldownInterval.current!);
          return 0;
        }
        return Number(newTime.toFixed(1));
      });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      setError('Mesaj göndermek için giriş yapmalısınız');
      return;
    }

    if (cooldown) {
      setError(`Lütfen ${cooldownTime.toFixed(1)} saniye bekleyin`);
      return;
    }

    if (!newMessage.trim()) {
      return;
    }

    if (newMessage.length > MESSAGE_MAX_LENGTH) {
      setError(`Mesaj en fazla ${MESSAGE_MAX_LENGTH} karakter olabilir`);
      return;
    }

    try {
      const newMessageData = {
        id: crypto.randomUUID(),
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          username: currentUser.user_metadata?.username,
        },
      };

      setMessages((prev) => [...prev, newMessageData]);

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: newMessage.trim(),
          author_id: currentUser.id
        });

      if (error) throw error;

      setNewMessage('');
      setError(null);
      startCooldown();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Mesaj gönderilirken bir hata oluştu');
    }
  };

  return (
    <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col h-[500px] lg:h-[calc(100vh-8rem)]`}>
      <h2 className="text-xl font-bold text-white mb-4">Canlı Sohbet</h2>

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
              <span>{new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={currentUser ? "Mesajınızı yazın..." : "Mesaj göndermek için giriş yapın"}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !currentUser || cooldown}
            className={`px-4 ${theme.accentColor} ${theme.accentHover} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
