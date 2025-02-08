import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Bell, MessageCircle, Home, Users, Crown, User, X, Mail, Lock, ChevronDown, Shield } from 'lucide-react';
import { supabase } from './lib/supabase';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import TopicPage from './pages/TopicPage';
import UsersPage from './pages/UsersPage';
import VIPPage from './pages/VIPPage';
import AdminPanel from './pages/AdminPanel';
import ChatSidebar from './components/ChatSidebar';
import ThemeSwitcher from './components/ThemeSwitcher';
import { themes, Theme } from './lib/themes';
import PageTransition from './components/PageTransition';

const categories = [
  'Teknoloji',
  'Spor',
  'Oyunlar',
  'Bilim',
  'Sanat',
  'Müzik',
  'Seyahat'
];

const TITLE_MAX_LENGTH = 100;
const CONTENT_MAX_LENGTH = 2000;

const defaultTheme = themes.find(t => t.id === 'dark') || themes[0];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [showCategories, setShowCategories] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userStats, setUserStats] = useState({ totalUsers: 0, onlineUsers: 0 });
  const [isStaff, setIsStaff] = useState(false);
  const [userRoleLevel, setUserRoleLevel] = useState(0);

  useEffect(() => {
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

    checkUserRole();
  }, [currentUser]);

  useEffect(() => {
    const checkStaffRole = async () => {
      if (currentUser) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            role:roles(
              id,
              name,
              level
            )
          `)
          .eq('user_id', currentUser.id);

        const highestRole = userRoles?.reduce((prev, curr) => {
          return (curr.role.level > prev.role.level) ? curr : prev;
        }, userRoles?.[0]);

        setIsStaff(highestRole?.role.level >= 7);
      } else {
        setIsStaff(false);
      }
    };

    checkStaffRole();
  }, [currentUser]);

  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
      const theme = themes.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    fetchUserStats();
    const statsInterval = setInterval(fetchUserStats, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const fetchUserStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: onlineUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', fiveMinutesAgo);

      setUserStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme.id);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!username) {
          setFormError('Kullanıcı adı gereklidir');
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        });
        if (error) throw error;
      }

      setShowAuthModal(false);
    } catch (error) {
      console.error('Auth error:', error);
      setFormError(error instanceof Error ? error.message : 'Bir hata oluştu');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateTopic = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      setShowNewTopicModal(false);
      return;
    }

    if (!title.trim() || !content.trim() || !selectedCategory) {
      setFormError('Lütfen tüm alanları doldurun');
      return;
    }

    const isVipSection = location.pathname === '/vip';
    if (isVipSection && userRoleLevel < 3) {
      setFormError('VIP bölümünde konu açmak için VIP üye olmanız gerekmektedir');
      return;
    }

    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', selectedCategory)
        .single();

      if (categoryError) throw categoryError;

      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert({
          title: title.trim(),
          content: content.trim(),
          author_id: currentUser.id,
          category_id: categoryData.id,
          is_vip: isVipSection
        })
        .select()
        .single();

      if (topicError) throw topicError;

      setTitle('');
      setContent('');
      setSelectedCategory('');
      setShowNewTopicModal(false);
      setFormError(null);

      navigate(`/konu/${topicData.id}`);
    } catch (error) {
      console.error('Error creating topic:', error);
      setFormError(error instanceof Error ? error.message : 'Konu oluşturulurken bir hata oluştu');
    }
  };

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (newTitle.length > TITLE_MAX_LENGTH) {
      setFormError(`Başlık en fazla ${TITLE_MAX_LENGTH} karakter olabilir`);
    } else {
      setFormError(null);
    }
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (newContent.length > CONTENT_MAX_LENGTH) {
      setFormError(`İçerik en fazla ${CONTENT_MAX_LENGTH} karakter olabilir`);
    } else {
      setFormError(null);
    }
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-r ${currentTheme.gradient}`}>
      <header className={`${currentTheme.headerBg} backdrop-blur-sm border-b border-white/10 p-4 relative z-40`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto">
            <h1 
              onClick={() => navigate('/')} 
              className="text-2xl font-bold text-white cursor-pointer hover:text-purple-400 transition-colors"
            >
              Forum
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <span className="text-white text-sm">
                  Çevrimiçi: <span className="font-bold text-green-400">{userStats.onlineUsers}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-white text-sm">
                  Toplam: <span className="font-bold text-purple-400">{userStats.totalUsers}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={handleThemeChange} />
            {currentUser ? (
              <div className="relative group">
                <button 
                  onClick={() => navigate(`/profil/${currentUser.user_metadata.username}`)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <User className="w-6 h-6 text-white" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <button
                      onClick={() => navigate(`/profil/${currentUser.user_metadata.username}`)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors"
                    >
                      Profil
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <User className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 lg:flex-shrink-0 order-2 lg:order-1">
          <nav className="flex lg:flex-col gap-2">
            <button 
              onClick={() => navigate('/')}
              className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 ${currentTheme.cardBg} rounded-lg text-white ${currentTheme.hoverBg} transition-colors`}
            >
              <Home className="w-5 h-5" />
              <span>Ana Sayfa</span>
            </button>
            <div className="relative flex-1 lg:flex-none">
              <button 
                className={`w-full flex items-center gap-3 px-4 py-3 ${currentTheme.cardBg} rounded-lg text-white ${currentTheme.hoverBg} transition-colors ${showCategories ? 'bg-white/20' : ''}`}
                onClick={() => setShowCategories(!showCategories)}
              >
                <Users className="w-5 h-5" />
                <span>Kategoriler</span>
              </button>
              <div 
                className={`absolute left-0 w-full mt-2 py-2 ${currentTheme.cardBg} backdrop-blur-sm border border-white/10 rounded-lg shadow-xl transform transition-all duration-200 ease-in-out origin-top z-50 ${
                  showCategories 
                    ? 'opacity-100 scale-y-100 translate-y-0' 
                    : 'opacity-0 scale-y-0 -translate-y-2 pointer-events-none'
                }`}
              >
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(`/kategori/${category.toLowerCase()}`);
                      setShowCategories(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-white ${currentTheme.hoverBg} transition-colors`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => navigate('/kullanicilar')}
              className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 ${currentTheme.cardBg} rounded-lg text-white ${currentTheme.hoverBg} transition-colors`}
            >
              <Users className="w-5 h-5" />
              <span>Kullanıcılar</span>
            </button>
            <button 
              onClick={() => navigate('/vip')}
              className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 ${currentTheme.cardBg} rounded-lg text-white ${currentTheme.hoverBg} transition-colors`}
            >
              <Crown className="w-5 h-5" />
              <span>VIP Bölüm</span>
            </button>
            {isStaff && (
              <button 
                onClick={() => navigate('/panel')}
                className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 ${currentTheme.cardBg} rounded-lg text-white ${currentTheme.hoverBg} transition-colors`}
              >
                <Shield className="w-5 h-5" />
                <span>Panel</span>
              </button>
            )}
          </nav>
        </div>

        <div className="flex-1 order-1 lg:order-2">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <PageTransition>
                  <HomePage onNewTopic={() => setShowNewTopicModal(true)} theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/vip" element={
                <PageTransition>
                  <VIPPage onNewTopic={() => setShowNewTopicModal(true)} theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/kategori/:category" element={
                <PageTransition>
                  <CategoryPage theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/profil/:username" element={
                <PageTransition>
                  <ProfilePage theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/konu/:topicId" element={
                <PageTransition>
                  <TopicPage theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/kullanicilar" element={
                <PageTransition>
                  <UsersPage theme={currentTheme} />
                </PageTransition>
              } />
              <Route path="/panel" element={
                <PageTransition>
                  <AdminPanel theme={currentTheme} />
                </PageTransition>
              } />
            </Routes>
          </AnimatePresence>
        </div>

        <div className="w-full lg:w-80 lg:flex-shrink-0 order-3">
          <ChatSidebar theme={currentTheme} />
        </div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-8 w-full max-w-md relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">
              {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </h2>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-white/80 mb-2" htmlFor="username">
                    Kullanıcı Adı
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      id="username"
                      name="username"
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                      placeholder="kullanici_adi"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-white/80 mb-2" htmlFor="email">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-white/80 mb-2" htmlFor="password">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {formError && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {formError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 transition-colors"
              >
                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormError(null);
                }}
                className="text-white/60 hover:text-white text-sm"
              >
                {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-8 w-full max-w-2xl relative">
            <button 
              onClick={() => {
                setShowNewTopicModal(false);
                setTitle('');
                setContent('');
                setSelectedCategory('');
                setFormError(null);
              }}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">Yeni Konu Oluştur</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">
                  Başlık
                  <span className={`text-sm ml-2 ${title.length > TITLE_MAX_LENGTH ? 'text-red-400' : 'text-white/60'}`}>
                    ({title.length}/{TITLE_MAX_LENGTH})
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  className={`w-full bg-white/5 border rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none transition-colors ${
                    title.length > TITLE_MAX_LENGTH 
                      ? 'border-red-500 focus:border-red-600' 
                      : 'border-white/10 focus:border-purple-500'
                  }`}
                  placeholder="Konu başlığı"
                />
              </div>

              <div className="relative">
                <label className="block text-white/80 mb-2">Kategori</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-left flex justify-between items-center focus:outline-none focus:border-purple-500"
                >
                  <span className={selectedCategory ? 'text-white' : 'text-white/40'}>
                    {selectedCategory || 'Kategori seçin'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-lg">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-white/80 mb-2">
                  İçerik
                  <span className={`text-sm ml-2 ${content.length > CONTENT_MAX_LENGTH ? 'text-red-400' : 'text-white/60'}`}>
                    ({content.length}/{CONTENT_MAX_LENGTH})
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  className={`w-full bg-white/5 border rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none transition-colors min-h-[200px] resize-y ${
                    content.length > CONTENT_MAX_LENGTH 
                      ? 'border-red-500 focus:border-red-600' 
                      : 'border-white/10 focus:border-purple-500'
                  }`}
                  placeholder="Konu içeriği..."
                />
              </div>

              {formError && (
                <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
                  {formError}
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNewTopicModal(false);
                    setTitle('');
                    setContent('');
                    setSelectedCategory('');
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateTopic}
                  disabled={!title.trim() || !content.trim() || !selectedCategory || title.length > TITLE_MAX_LENGTH || content.length > CONTENT_MAX_LENGTH}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Paylaş
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;