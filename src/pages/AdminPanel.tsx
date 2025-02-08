import { useState, useEffect } from 'react';
import { Shield, Clock, MessageSquareOff, UserX, Trash2, ChevronDown, Check, MessageSquare, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/themes';
import { useNavigate } from 'react-router-dom';

interface AdminPanelProps {
  theme: Theme;
}

interface User {
  id: string;
  username: string;
  created_at: string;
  is_banned: boolean;
  is_muted: boolean;
  roles: {
    role: {
      id: string;
      name: string;
      level: number;
    };
  }[];
}

interface Topic {
  id: string;
  title: string;
  created_at: string;
  author: {
    username: string;
  };
}

interface Role {
  id: string;
  name: string;
  level: number;
}

export default function AdminPanel({ theme }: AdminPanelProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showDeleteTopicModal, setShowDeleteTopicModal] = useState(false);
  const [showTopicsTab, setShowTopicsTab] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [muteDuration, setMuteDuration] = useState('');
  const [customBanDuration, setCustomBanDuration] = useState('');
  const [customMuteDuration, setCustomMuteDuration] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  // const [currentUserLevel, setCurrentUserLevel] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user's highest role level
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select(`
              role:roles(
                id,
                name,
                level
              )
            `)
            .eq('user_id', user.id);

          const highestRole = userRoles?.reduce((prev, curr) => {
            return (curr.role.level > prev.role.level) ? curr : prev;
          }, userRoles?.[0]);

          // setCurrentUserLevel(highestRole?.role.level || 0);

          // Fetch available roles based on user's level
          if (highestRole) {
            const { data: roles } = await supabase
              .from('roles')
              .select('*')
              .lt('level', highestRole.role.level)
              .order('level', { ascending: false });

            setAvailableRoles(roles || []);
          }
        }

        // Fetch users with roles - using explicit relationship
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            created_at,
            is_banned,
            is_muted,
            roles:user_roles!user_roles_user_id_fkey(
              role:roles(
                id,
                name,
                level
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Fetch topics
        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .select(`
            id,
            title,
            created_at,
            author:author_id(username)
          `)
          .order('created_at', { ascending: false });

        if (topicsError) throw topicsError;
        setTopics(topicsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleDeleteTopic = async () => {
    if (!selectedTopic) return;

    try {
      const { error } = await supabase.rpc('delete_topic', {
        topic_id: selectedTopic.id
      });

      if (error) throw error;

      setTopics(topics.filter(t => t.id !== selectedTopic.id));
      setShowDeleteTopicModal(false);
      setSelectedTopic(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting topic:', error);
      setError('Konu silme işlemi başarısız oldu');
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    try {
      const duration = banDuration === 'custom' ? customBanDuration : banDuration;
      const { error } = await supabase.rpc('ban_user', {
        user_id: selectedUser.id,
        ban_duration: duration
      });

      if (error) throw error;

      const { data: updatedUser } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          is_banned,
          is_muted,
          roles:user_roles!user_roles_user_id_fkey(
            role:roles(
              id,
              name,
              level
            )
          )
        `)
        .eq('id', selectedUser.id)
        .single();

      if (updatedUser) {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      }

      setShowBanModal(false);
      setSelectedUser(null);
      setBanDuration('');
      setCustomBanDuration('');
      setError(null);
    } catch (error) {
      console.error('Error banning user:', error);
      setError('Kullanıcı yasaklama işlemi başarısız oldu');
    }
  };

  const handleMuteUser = async () => {
    if (!selectedUser) return;

    try {
      const duration = muteDuration === 'custom' ? customMuteDuration : muteDuration;
      const { error } = await supabase.rpc('mute_user', {
        user_id: selectedUser.id,
        mute_duration: duration
      });

      if (error) throw error;

      const { data: updatedUser } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          is_banned,
          is_muted,
          roles:user_roles!user_roles_user_id_fkey(
            role:roles(
              id,
              name,
              level
            )
          )
        `)
        .eq('id', selectedUser.id)
        .single();

      if (updatedUser) {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      }

      setShowMuteModal(false);
      setSelectedUser(null);
      setMuteDuration('');
      setCustomMuteDuration('');
      setError(null);
    } catch (error) {
      console.error('Error muting user:', error);
      setError('Kullanıcı susturma işlemi başarısız oldu');
    }
  };

  const handleGrantRole = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Lütfen bir rol seçin');
      return;
    }

    try {
      const { error } = await supabase.rpc('grant_role', {
        target_user_id: selectedUser.id,
        role_id: selectedRole
      });

      if (error) throw error;

      const { data: updatedUser } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          is_banned,
          is_muted,
          roles:user_roles!user_roles_user_id_fkey(
            role:roles(
              id,
              name,
              level
            )
          )
        `)
        .eq('id', selectedUser.id)
        .single();

      if (updatedUser) {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      }

      setShowRoleModal(false);
      setSelectedRole('');
      setSelectedUser(null);
      setError(null);
      setIsRoleDropdownOpen(false);
    } catch (error) {
      console.error('Error granting role:', error);
      setError('Rol verme işlemi başarısız oldu');
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

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h1 className="text-2xl font-bold text-white mb-2">Yönetim Paneli</h1>
        <p className="text-white/80">Kullanıcı yönetimi ve site moderasyonu</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowTopicsTab(false)}
          className={`px-4 py-2 rounded-lg transition-colors ${!showTopicsTab
            ? `${theme.accentColor} text-white`
            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Kullanıcılar</span>
          </div>
        </button>
        <button
          onClick={() => setShowTopicsTab(true)}
          className={`px-4 py-2 rounded-lg transition-colors ${showTopicsTab
            ? `${theme.accentColor} text-white`
            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span>Konular</span>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={showTopicsTab ? "Konu ara..." : "Kullanıcı ara..."}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <div className="space-y-4">
          {showTopicsTab ? (
            // Topics List
            topics
              .filter(topic =>
                topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                topic.author.username.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 bg-black/20 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{topic.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                        <span>@{topic.author.username}</span>
                        <span>•</span>
                        <span>{formatDate(topic.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTopic(topic);
                        setShowDeleteTopicModal(true);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                      title="Konuyu Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
          ) : (
            // Users List
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-black/20 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">@{user.username}</h3>
                      {user.roles?.map(({ role }) => (
                        <span
                          key={role.name}
                          className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-white/60">
                      <span>Katılım: {formatDate(user.created_at)}</span>
                      {user.is_banned && (
                        <span className="text-red-400">• Yasaklı</span>
                      )}
                      {user.is_muted && (
                        <span className="text-orange-400">• Susturulmuş</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-purple-400 hover:text-purple-300"
                      title="Rol Ver"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowMuteModal(true);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-orange-400 hover:text-orange-300"
                      title="Sustur"
                    >
                      <MessageSquareOff className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowBanModal(true);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                      title="Yasakla"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Kullanıcı Yasakla</h3>

            <div className="space-y-4">
              <p className="text-white/80">
                <span className="font-semibold">@{selectedUser.username}</span> kullanıcısını yasaklamak istediğinize emin misiniz?
              </p>

              <div>
                <label className="block text-white/80 mb-2">Yasaklama Süresi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBanDuration('1h')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${banDuration === '1h'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>1 Saat</span>
                  </button>
                  <button
                    onClick={() => setBanDuration('24h')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${banDuration === '24h'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>24 Saat</span>
                  </button>
                  <button
                    onClick={() => setBanDuration('7d')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${banDuration === '7d'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>7 Gün</span>
                  </button>
                  <button
                    onClick={() => setBanDuration('permanent')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${banDuration === 'permanent'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Süresiz</span>
                  </button>
                  <button
                    onClick={() => setBanDuration('custom')}
                    className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${banDuration === 'custom'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Özel Süre</span>
                  </button>
                </div>

                {banDuration === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customBanDuration}
                      onChange={(e) => setCustomBanDuration(e.target.value)}
                      placeholder="Örn: 12h, 3d, 2w"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    />
                    <p className="mt-1 text-xs text-white/60">
                      h: saat, d: gün, w: hafta (Örn: 12h, 3d, 2w)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setSelectedUser(null);
                    setBanDuration('');
                    setCustomBanDuration('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={!banDuration || (banDuration === 'custom' && !customBanDuration)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Yasakla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mute Modal */}
      {showMuteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Kullanıcı Sustur</h3>

            <div className="space-y-4">
              <p className="text-white/80">
                <span className="font-semibold">@{selectedUser.username}</span> kullanıcısını susturmak istediğinize emin misiniz?
              </p>

              <div>
                <label className="block text-white/80 mb-2">Susturma Süresi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMuteDuration('1h')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${muteDuration === '1h'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>1 Saat</span>
                  </button>
                  <button
                    onClick={() => setMuteDuration('24h')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${muteDuration === '24h'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>24 Saat</span>
                  </button>
                  <button
                    onClick={() => setMuteDuration('7d')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${muteDuration === '7d'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>7 Gün</span>
                  </button>
                  <button
                    onClick={() => setMuteDuration('permanent')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${muteDuration === 'permanent'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Süresiz</span>
                  </button>
                  <button
                    onClick={() => setMuteDuration('custom')}
                    className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${muteDuration === 'custom'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Özel Süre</span>
                  </button>
                </div>

                {muteDuration === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customMuteDuration}
                      onChange={(e) => setCustomMuteDuration(e.target.value)}
                      placeholder="Örn: 12h, 3d, 2w"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    />
                    <p className="mt-1 text-xs text-white/60">
                      h: saat, d: gün, w: hafta (Örn: 12h, 3d, 2w)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMuteModal(false);
                    setSelectedUser(null);
                    setMuteDuration('');
                    setCustomMuteDuration('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleMuteUser}
                  disabled={!muteDuration || (muteDuration === 'custom' && !customMuteDuration)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sustur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Topic Modal */}
      {showDeleteTopicModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Konuyu Sil</h3>

            <div className="space-y-4">
              <p className="text-white/80">
                <span className="font-semibold">{selectedTopic.title}</span> başlıklı konuyu silmek istediğinize emin misiniz?
              </p>

              <p className="text-white/60 text-sm">
                Bu işlem geri alınamaz ve konuya ait tüm yorumlar da silinecektir.
              </p>

              {error && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteTopicModal(false);
                    setSelectedTopic(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteTopic}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Rol Ver</h3>

            <div className="space-y-4">
              <p className="text-white/80">
                <span className="font-semibold">@{selectedUser.username}</span> kullanıcısına rol vermek istiyor musunuz?
              </p>

              <div>
                <label className="block text-white/80 mb-2">Rol Seç</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-left flex items-center justify-between text-white focus:outline-none focus:border-purple-500 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>
                        {selectedRole
                          ? availableRoles.find(r => r.id === selectedRole)?.name
                          : "Rol seçin"}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 py-1 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl">
                      {availableRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role.id);
                            setIsRoleDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-400" />
                            <span>{role.name}</span>
                          </div>
                          {selectedRole === role.id && (
                            <Check className="w-4 h-4 text-purple-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedRole('');
                    setSelectedUser(null);
                    setError(null);
                    setIsRoleDropdownOpen(false);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleGrantRole}
                  disabled={!selectedRole}
                  className={`px-4 py-2 ${theme.accentColor} ${theme.accentHover} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Rol Ver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}