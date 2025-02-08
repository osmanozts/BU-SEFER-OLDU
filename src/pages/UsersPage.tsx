import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/themes';

interface UsersPageProps {
  theme: Theme;
}

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_vip: boolean;
  created_at: string;
}

export default function UsersPage({ theme }: UsersPageProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı ara..."
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Users List */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h2 className="text-xl font-bold text-white mb-4">Kullanıcılar</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-white/60">Yükleniyor...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => navigate(`/profil/${user.username}`)}
                className="p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                    alt={user.username}
                    className="w-12 h-12 rounded-full bg-slate-800"
                  />
                  <div>
                    <h3 className="text-white font-semibold">@{user.username}</h3>
                    <p className="text-white/60 text-sm">
                      Katılım: {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
                {user.bio && (
                  <p className="mt-2 text-white/80 text-sm line-clamp-2">{user.bio}</p>
                )}
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-white/60">Kullanıcı bulunamadı.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}