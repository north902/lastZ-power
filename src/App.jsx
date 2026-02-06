import React, { useState, useEffect } from 'react';
import { signOut, signInAnonymously } from 'firebase/auth';
import { auth } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { useLanguage } from './contexts/LanguageContext';
import Login from './components/Auth/AuthForm';
import PowerForm from './components/UserForm/UserForm';
import AdminPanel from './components/AdminPanel/AdminPanel';
import {
  LogOut,
  ShieldCheck,
  Layout,
  ChevronRight,
  Loader2,
  Sword,
  Map as MapIcon,
  Languages
} from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const { user, isAdmin, loading } = useAuth();
  const { lang, t, toggleLang } = useLanguage();

  useEffect(() => {
    const storedLoginMode = localStorage.getItem('isLoginMode') === 'true';

    if (!loading && !user && !isLoginMode && !storedLoginMode) {
      signInAnonymously(auth).catch((error) => {
        console.error("匿名登入失敗:", error);
      });
    }

    if (!user && storedLoginMode) {
      setIsLoginMode(true);
    }
  }, [user, loading, isLoginMode]);

  useEffect(() => {
    if (user) {
      localStorage.removeItem('isLoginMode');
      setIsLoginMode(false);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isLoginMode');
      setIsLoginMode(false);
      await signOut(auth);
    } catch (error) {
      console.error('登出錯誤:', error);
    }
  };

  const switchToAdminLogin = async () => {
    localStorage.setItem('isLoginMode', 'true');
    setIsLoginMode(true);
    await signOut(auth);
  };

  const handleBackToGuest = () => {
    localStorage.removeItem('isLoginMode');
    setIsLoginMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">{t('loading_system')}</p>
      </div>
    );
  }

  if (isLoginMode && !user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-indigo-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Login />
          <button
            onClick={handleBackToGuest}
            className="w-full mt-6 py-3 text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-gray-200 rounded-xl"
          >
            {t('back_to_guest')}
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <Sword className="w-12 h-12 text-blue-600 animate-bounce" />
        <div className="text-gray-600 font-black tracking-widest uppercase text-xs">{t('preparing_env')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 頂級導航欄 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform duration-300">
              <Sword className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">{t('title')}</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1 opacity-80">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 語系切換 */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 bg-gray-50 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Languages size={14} className="text-blue-500" />
              {lang === 'zh' ? 'English' : '繁體中文'}
            </button>

            <div className="hidden md:flex items-center gap-4 py-1.5 px-3 bg-gray-50 rounded-full border border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user.isAnonymous ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs font-bold text-gray-600 tracking-wide">
                  {user.isAnonymous ? t('guest_mode') : user.email?.split('@')[0]}
                </span>
              </div>
              {isAdmin && (
                <span className="bg-indigo-600 text-[10px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">
                  {t('admin_tag')}
                </span>
              )}
            </div>

            {!user.isAnonymous && (
              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                title={t('logout')}
              >
                <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          {isAdmin && (
            <div className="inline-flex p-1 bg-white border border-gray-200 rounded-2xl mb-10 shadow-sm">
              <button
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'form'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Layout size={18} /> {t('personal_entry')}
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'admin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <ShieldCheck size={18} /> {t('all_management')}
              </button>
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'planner'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <MapIcon size={18} /> {t('view_planner')}
              </button>
            </div>
          )}

          <div className="relative">
            {activeTab === 'admin' && isAdmin && <AdminPanel />}
            {activeTab === 'planner' && isAdmin && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AdminPanel forcePlanner={true} />
              </div>
            )}
            {activeTab === 'form' && <PowerForm user={user} />}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2 opacity-30 grayscale">
              <Sword size={20} />
              <span className="font-black text-lg tracking-tighter uppercase whitespace-nowrap">{t('title')}</span>
            </div>
            <p className="text-gray-400 text-xs font-medium">{t('footer_text')}</p>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] hidden sm:block">
              Intel Status: <span className="text-green-500">{t('status_operational')}</span>
            </div>
            {user.isAnonymous && (
              <button
                onClick={switchToAdminLogin}
                className="group flex items-center gap-2 py-2 px-4 rounded-full border border-gray-200 text-[11px] font-black text-gray-500 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
              >
                {t('admin_login_gate')} <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </footer>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        theme="light"
      />
    </div>
  );
}


export default App;