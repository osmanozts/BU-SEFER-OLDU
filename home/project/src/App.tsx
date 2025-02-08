import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Home, Users, Crown, User, X, Mail, Lock, ChevronDown } from 'lucide-react';
import { supabase } from './lib/supabase';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import TopicPage from './pages/TopicPage';
import ChatSidebar from './components/ChatSidebar';

// Define categories array
const categories = [
  'Teknoloji',
  'Spor',
  'Oyunlar',
  'Bilim',
  'Sanat',
  'Müzik',
  'Seyahat'
];

// Constants for character limits
const TITLE_MAX_LENGTH = 100;
const CONTENT_MAX_LENGTH = 2000;

function App() {
  const navigate = useNavigate();
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    if (title.length > TITLE_MAX_LENGTH) {
      setFormError(`Başlık en fazla ${TITLE_MAX_LENGTH} karakter olabilir`);
      return;
    }

    if (content.length > CONTENT_MAX_LENGTH) {
      setFormError(`İçerik en fazla ${CONTENT_MAX_LENGTH} karakter olabilir`);
      return;
    }

    try {
      // Get category ID
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', selectedCategory)
        .single();

      if (categoryError) throw categoryError;

      // Create new topic
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .insert({
          title,
          content,
          author_id: currentUser.id,
          category_id: categoryData.id,
        })
        .select()
        .single();

      if (topicError) throw topicError;

      // Reset form and close modal
      setTitle('');
      setContent('');
      setSelectedCategory('');
      setShowNewTopicModal(false);

      // Navigate to the new topic
      navigate(`/konu/${topicData.id}`);
    } catch (error) {
      console.error('Error creating topic:', error);
      setFormError(error instanceof Error ? error.message : 'Konu oluşturulurken bir hata oluştu');
    }
  };

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= TITLE_MAX_LENGTH) {
      setTitle(newTitle);
      setFormError(null);
    }
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= CONTENT_MAX_LENGTH) {
      setContent(newContent);
      setFormError(null);
    }
  }, []);

  const AuthModal = () => (
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
  );

  const NewTopicModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-8 w-full max-w-2xl relative">
        <button 
          onClick={() => setShowNewTopicModal(false)}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Yeni Konu Oluştur</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 mb-2">
              Başlık
              <span className="text-sm text-white/60 ml-2">
                ({title.length}/{TITLE_MAX_LENGTH})
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
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
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
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
              <span className="text-sm text-white/60 ml-2">
                ({content.length}/{CONTENT_MAX_LENGTH})
              </span>
            </label>
            <textarea
              value={content}
              onChange={handleContentChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 min-h-[200px] resize-y"
              placeholder="Konu içeriği..."
            />
          </div>

          {formError && (
            <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded-lg">
              {formError}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowNewTopicModal(false)}
              className="px-4 py-2 text-white/60 hover:text-white"
            >
              İptal
            </button>
            <button
              onClick={handleCreateTopic}
              disabled={!title || !content || !selectedCategory}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Paylaş
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 p-4 relative z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 
            onClick={() => navigate('/')} 
            className="text-2xl font-bold text-white cursor-pointer hover:text-purple-400 transition-colors"
          >
            Forum
          </h1>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Bell className="w-6 h-6 text-white" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
            {currentUser ? (
              <div className="relative group">
                <button 
                  onClick={() => navigate(`/profil/${currentUser.user_metadata.username}`)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <User className="w-6 h-6 text-white" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl invisible group-hover:visible">
                  <button
                    onClick={() => navigate(`/profil/${currentUser.user_metadata.username}`)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors rounded-t-lg"
                  >
                    Profil
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors rounded-b-lg"
                  >
                    Çıkış Yap
                  </button>
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

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-2">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center space-x-3 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>Ana Sayfa</span>
            </button>
            <div className="relative">
              <button 
                className={`w-full flex items-center space-x-3 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors ${showCategories ? 'bg-white/20' : ''}`}
                onClick={() => setShowCategories(!showCategories)}
              >
                <Users className="w-5 h-5" />
                <span>Kategoriler</span>
              </button>
              <div 
                className={`absolute left-0 w-full mt-2 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl transform transition-all duration-200 ease-in-out origin-top ${
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
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <button className="w-full flex items-center space-x-3 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">
              <Crown className="w-5 h-5" />
              <span>VIP Bölüm</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage onNewTopic={() => setShowNewTopicModal(true)} />} />
            <Route path="/kategori/:category" element={<CategoryPage />} />
            <Route path="/profil/:username" element={<ProfilePage />} />
            <Route path="/konu/:topicId" element={<TopicPage />} />
          </Routes>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 flex-shrink-0">
          <ChatSidebar />
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal />}
      {showNewTopicModal && <NewTopicModal />}
    </div>
  );
}

export default App;