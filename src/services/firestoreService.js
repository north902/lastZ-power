import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from "../config/firebase";

// 儲存或更新使用者資料
export const saveUserData = async (userId, formData) => {
  try {
    // 1. 處理 Game ID：去頭去尾空白
    let cleanGameId = formData.gameId.trim();

    // 2. 安全性處理：如果有人 ID 包含斜線 '/'，會導致路徑錯誤，我們把它換成底線 '_'
    // 例如 "KTX/阿明" 會變成 "KTX_阿明"
    cleanGameId = cleanGameId.replace(/\//g, '_');

    // 檢查處理完是否為空
    if (!cleanGameId) {
      throw new Error("Game ID 不能為空");
    }

    // 3. 【關鍵修改】使用 Game ID 當作文件 ID (Document ID)
    // 這樣不管用手機還是電腦，只要輸入同一個 ID，就會存到同一個位置！
    const userRef = doc(db, 'users', cleanGameId);

    // 準備要寫入的資料
    const userData = {
      // 這裡存原本輸入的 ID (包含斜線也沒關係，顯示用)
      gameId: formData.gameId.trim(),
      alliance: formData.alliance.trim(),
      team1Power: Number(formData.team1Power),
      team2Power: Number(formData.team2Power),
      team3Power: Number(formData.team3Power),
      updatedAt: serverTimestamp(),
      submittedAt: serverTimestamp()
    };

    // 使用 setDoc + merge (盲寫模式)
    // 如果資料已存在就更新，不存在就建立，且不需要讀取權限
    await setDoc(userRef, userData, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('儲存資料失敗:', error);
    return { success: false, error: error.message };
  }
};

// 取得使用者資料
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    console.error('讀取資料失敗:', error);
    return { success: false, error: error.message };
  }
};

// 取得所有使用者資料（僅管理員）
export const getAllUsersData = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('讀取所有資料失敗:', error);
    return { success: false, error: error.message };
  }
};

// 檢查是否為管理員
export const checkIsAdmin = async (userId) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    const docSnap = await getDoc(adminRef);

    if (docSnap.exists() && docSnap.data().isActive) {
      return { success: true, isAdmin: true, adminData: docSnap.data() };
    } else {
      return { success: true, isAdmin: false };
    }
  } catch (error) {
    console.error('檢查管理員權限失敗:', error);
    return { success: false, error: error.message };
  }
};

// 新增管理員（需手動執行，或由現有管理員執行）
export const addAdmin = async (userId, email, allowedAlliances = ['*']) => {
  try {
    const adminRef = doc(db, 'admins', userId);

    await setDoc(adminRef, {
      email: email,
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      allowedAlliances: allowedAlliances, // 例如 ['聯盟A'] 或 ['*'] 表示全部
      addedAt: serverTimestamp(),
      isActive: true
    });

    return { success: true };
  } catch (error) {
    console.error('新增管理員失敗:', error);
    return { success: false, error: error.message };
  }
};

// 刪除使用者資料（僅管理員）
export const deleteUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return { success: true };
  } catch (error) {
    console.error('刪除資料失敗:', error);
    return { success: false, error: error.message };
  }
};

// 計算統計資訊
export const calculateStats = (usersData) => {
  if (!usersData || usersData.length === 0) {
    return {
      totalUsers: 0,
      avgTeam1: 0,
      avgTeam2: 0,
      avgTeam3: 0,
      maxTeam1: 0,
      maxTeam2: 0,
      maxTeam3: 0
    };
  }

  const team1Powers = usersData.map(u => u.team1Power || 0);
  const team2Powers = usersData.map(u => u.team2Power || 0);
  const team3Powers = usersData.map(u => u.team3Power || 0);

  return {
    totalUsers: usersData.length,
    avgTeam1: Math.round(team1Powers.reduce((a, b) => a + b, 0) / usersData.length),
    avgTeam2: Math.round(team2Powers.reduce((a, b) => a + b, 0) / usersData.length),
    avgTeam3: Math.round(team3Powers.reduce((a, b) => a + b, 0) / usersData.length),
    maxTeam1: Math.max(...team1Powers),
    maxTeam2: Math.max(...team2Powers),
    maxTeam3: Math.max(...team3Powers)
  };
};
