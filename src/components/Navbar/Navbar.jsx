import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { toast } from 'react-toastify';

export default function Navbar({ user, isAdmin, currentView, setCurrentView }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('已登出');
    } catch (error) {
      toast.error('登出失敗');
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">遊戲戰力追蹤</h1>
          </div>

          {/* 導航選單 */}
          <div className="flex items-center gap-4">
            {/* 一般使用者選項 */}
            <button
              onClick={() => setCurrentView('form')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              我的資料
            </button>

            {/* 管理員選項 */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'admin'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                管理面板
              </button>
            )}

            {/* 使用者資訊 */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-800">
                  {user.email}
                </div>
                {isAdmin && (
                  <div className="text-xs text-red-600 font-medium">
                    管理員
                  </div>
                )}
              </div>

              {/* 登出按鈕 */}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
