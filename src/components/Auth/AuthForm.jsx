import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { toast } from 'react-toastify';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AuthForm() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t('login_success'));
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success(t('register_success'));
      }
    } catch (error) {
      console.error('Authentication error:', error);

      let errorMessage = t('op_failed');
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('email_in_use');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('invalid_email');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('weak_password');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = t('auth_failed');
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = t('auth_failed');
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      toast.success(t('login_success'));
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error(t('google_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in duration-500">
        <h1 className="text-3xl font-black text-center text-gray-900 mb-8 tracking-tighter uppercase">
          {t('system_name')}
        </h1>

        <div className="mb-8">
          <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
            <button
              className={`flex-1 py-2.5 text-center text-sm font-black rounded-lg transition-all duration-300 ${isLogin
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              onClick={() => setIsLogin(true)}
            >
              {t('login')}
            </button>
            <button
              className={`flex-1 py-2.5 text-center text-sm font-black rounded-lg transition-all duration-300 ${!isLogin
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              onClick={() => setIsLogin(false)}
            >
              {t('register')}
            </button>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all text-sm font-bold"
              placeholder="commander@alliance.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {t('password_label')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all text-sm font-bold"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-100 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none transform active:scale-[0.98]"
          >
            {loading ? t('processing') : (isLogin ? t('login') : t('register'))}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
            <span className="px-3 bg-white text-gray-300">{t('or_text')}</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-600 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5 translate-y-[-1px]" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
          </svg>
          {t('google_login')}
        </button>
      </div>
    </div>
  );
}
