import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/Auth/AuthForm';
import Navbar from './components/Navbar/Navbar';
import UserForm from './components/UserForm/UserForm';
import AdminPanel from './components/AdminPanel/AdminPanel';

function App() {
  const { user, loading, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('form'); // 'form' or 'admin'

  // 載入中畫面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入：顯示登入/註冊表單
  if (!user) {
    return (
      <>
        <AuthForm />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </>
    );
  }

  // 已登入：顯示主應用程式
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      
      <main className="py-8">
        {currentView === 'form' && <UserForm user={user} />}
        {currentView === 'admin' && isAdmin && <AdminPanel />}
      </main>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;
