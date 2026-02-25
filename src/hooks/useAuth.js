import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from "../config/firebase";
import { checkIsAdmin } from '../services/firestoreService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // 先解除 loading，頁面馬上出現

      // 匿名用戶直接跳過，不查 Firestore（大部分用戶走這條，loading 立刻結束）
      // 只有真實登入的用戶才查 admin
      if (currentUser && !currentUser.isAnonymous) {
        checkIsAdmin(currentUser.uid)
          .then(adminCheck => {
            setIsAdmin(adminCheck.isAdmin || false);
            setAdminData(adminCheck.isAdmin ? adminCheck.adminData : null);
          })
          .catch(err => {
            console.error('Admin check failed:', err);
            setIsAdmin(false);
            setAdminData(null);
          });
      } else {
        setIsAdmin(false);
        setAdminData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, isAdmin, adminData, loading };
};