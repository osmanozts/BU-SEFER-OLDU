import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Camera, Image as ImageIcon, Shield, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Theme } from '../lib/themes';

interface ProfilePageProps {
  theme: Theme;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  banner_url: string | null;
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
  content: string;
  created_at: string;
  categories: {
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  level: number;
}

export default function ProfilePage({ theme }: ProfilePageProps) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [editForm, setEditForm] = useState({
    bio: '',
    avatar_url: '',
    banner_url: '',
  });

  useEffect(() => {
    const fetchProfileAndTopics = async () => {
      try {
        // Fetch profile with roles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            roles:user_roles!user_roles_user_id_fkey(
              role:roles(
                id,
                name,
                level
              )
            )
          `)
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        setProfile(profiles);

        if (profiles) {
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select(`
              id,
              title,
              content,
              created_at,
              categories:category_id(name)
            `)
            .eq('author_id', profiles.id)
            .order('created_at', { ascending: false });

          if (topicsError) throw topicsError;
          setTopics(topicsData || []);
        }

        // Get current user and their roles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: currentUserRoles } = await supabase
            .from('user_roles')
            .select(`
              role:roles(
                id,
                name,
                level
              )
            `)
            .eq('user_id', user.id);

          // Kullanıcının en yüksek seviyeli rolünü bul
          const highestRole = currentUserRoles?.reduce((prev, curr) => {
            return (curr.role.level > prev.role.level) ? curr : prev;
          }, currentUserRoles[0]);

          // Fetch available roles based on user's highest role level
          if (highestRole) {
            const { data: roles } = await supabase
              .from('roles')
              .select('*')
              .lt('level', highestRole.role.level)
              .order('level', { ascending: false });
            
            setAvailableRoles(roles || []);
          }

          setCurrentUser({
            ...user,
            highestRoleLevel: highestRole?.role.level || 0
          });
        }

        if (profiles) {
          setEditForm({
            bio: profiles.bio || '',
            avatar_url: profiles.avatar_url || '',
            banner_url: profiles.banner_url || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndTopics();
  }, [username, navigate]);

  const handleGrantRole = async () => {
    if (!selectedRole || !profile) {
      setRoleError('Lütfen bir rol seçin');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profile.id,
          role_id: selectedRole,
          granted_by: currentUser.id
        });

      if (error) throw error;

      // Refresh profile to show new role
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:user_roles!user_roles_user_id_fkey(
            role:roles(
              id,
              name,
              level
            )
          )
        `)
        .eq('id', profile.id)
        .single();

      setProfile(updatedProfile);
      setShowRoleModal(false);
      setSelectedRole('');
      setRoleError(null);
      setIsRoleDropdownOpen(false);
    } catch (error) {
      console.error('Error granting role:', error);
      setRoleError('Rol verme işlemi başarısız oldu');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: editForm.bio,
          avatar_url: editForm.avatar_url,
          banner_url: editForm.banner_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-white">Profil bulunamadı</h2>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const canGrantRoles = currentUser?.highestRoleLevel >= 7;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src={profile.banner_url || 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74'}
          alt="Banner"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-20 px-6">
        <div className="relative inline-block">
          <img
            src={profile.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
            alt={profile.username}
            className="w-32 h-32 rounded-full border-4 border-slate-900 bg-slate-800"
          />
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
            {profile.roles && profile.roles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.roles.map(({ role }) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300"
                  >
                    <Shield className="w-3 h-3" />
                    {role.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {canGrantRoles && !isOwnProfile && (
              <button
                onClick={() => setShowRoleModal(true)}
                className={`flex items-center space-x-2 px-4 py-2 ${theme.accentColor} ${theme.accentHover} rounded-lg text-white transition-colors`}
              >
                <Shield className="w-4 h-4" />
                <span>Rol Ver</span>
              </button>
            )}
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center space-x-2 px-4 py-2 ${theme.accentColor} ${theme.accentHover} rounded-lg text-white transition-colors`}
              >
                <Edit2 className="w-4 h-4" />
                <span>Profili Düzenle</span>
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Hakkımda</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                className={`w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500`}
                rows={4}
                placeholder="Kendinizden bahsedin..."
              />
            </div>

            <div>
              <label className="block text-white/80 mb-2">Profil Fotoğrafı URL</label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className={`w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500`}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/80 mb-2">Banner Fotoğrafı URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="url"
                  value={editForm.banner_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, banner_url: e.target.value }))}
                  className={`w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500`}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-white/60 hover:text-white"
              >
                İptal
              </button>
              <button
                type="submit"
                className={`px-4 py-2 ${theme.accentColor} ${theme.accentHover} text-white rounded-lg transition-colors`}
              >
                Kaydet
              </button>
            </div>
          </form>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-white/80">{profile.bio || 'Henüz bir biyografi eklenmemiş.'}</p>
          </div>
        )}
      </div>

      {/* User's Topics */}
      <div className={`${theme.cardBg} backdrop-blur-sm border border-white/10 rounded-xl p-6`}>
        <h2 className="text-xl font-bold text-white mb-4">Konular</h2>
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
              <div className="text-sm text-white/60">
                {formatDate(topic.created_at)}
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <div className="p-4 bg-black/20 rounded-lg">
              <p className="text-white/90">Henüz konu açılmamış.</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Rol Ver</h3>
            
            <div className="space-y-4">
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

              {roleError && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {roleError}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedRole('');
                    setRoleError(null);
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