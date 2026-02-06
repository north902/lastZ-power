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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // 檢查是否為管理員
        const adminCheck = await checkIsAdmin(currentUser.uid);
        setIsAdmin(adminCheck.isAdmin || false);
        setAdminData(adminCheck.isAdmin ? adminCheck.adminData : null);
      } else {
        setIsAdmin(false);
        setAdminData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAdmin, adminData, loading };
};
