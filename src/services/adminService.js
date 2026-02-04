import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc,
  getDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ==================== 管理員功能 ====================

/**
 * 取得所有使用者資料（僅管理員）
 * @returns {Promise<Array>}
 */
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    // 確保這裡的 updatedAt 欄位在 Firebase 裡真的存在
    const q = query(usersRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users; // 回傳純陣列
  } catch (error) {
    console.error('取得所有使用者資料失敗:', error);
    // 這裡拋出錯誤，會被 AdminPanel 的 catch 抓到
    throw new Error(error.message || '取得資料失敗，請確認管理員權限');
  }
};

/**
 * 刪除使用者資料（僅管理員）
 * @param {string} userId - 要刪除的使用者 ID
 * @returns {Promise<void>}
 */
export const deleteUserData = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return { success: true };
  } catch (error) {
    console.error('刪除使用者資料失敗:', error);
    throw new Error('刪除資料失敗，請確認您的管理員權限');
  }
};

/**
 * 檢查是否為管理員
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export const checkIsAdmin = async (userId) => {
  try {
    const adminRef = doc(db, 'admins', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      return data.isActive === true;
    }
    
    return false;
  } catch (error) {
    console.error('檢查管理員權限失敗:', error);
    return false;
  }
};

/**
 * 計算統計資料
 * @param {Array} users - 使用者陣列
 * @returns {Object}
 */
export const calculateStatistics = (users) => {
  if (!users || users.length === 0) {
    return {
      totalUsers: 0,
      averageTeam1Power: 0,
      averageTeam2Power: 0,
      averageTeam3Power: 0,
      averageTotalPower: 0,
      maxTotalPower: 0,
      minTotalPower: 0
    };
  }
  
  const powers = users.map(user => {
    const t1 = Number(user.team1Power) || 0;
    const t2 = Number(user.team2Power) || 0;
    const t3 = Number(user.team3Power) || 0;
    return {
      team1: t1,
      team2: t2,
      team3: t3,
      total: t1 + t2 + t3
    };
  });
  
  const sumTeam1 = powers.reduce((sum, p) => sum + p.team1, 0);
  const sumTeam2 = powers.reduce((sum, p) => sum + p.team2, 0);
  const sumTeam3 = powers.reduce((sum, p) => sum + p.team3, 0);
  const sumTotal = powers.reduce((sum, p) => sum + p.total, 0);
  
  const totalPowers = powers.map(p => p.total);
  
  return {
    totalUsers: users.length,
    averageTeam1Power: Math.round(sumTeam1 / users.length),
    averageTeam2Power: Math.round(sumTeam2 / users.length),
    averageTeam3Power: Math.round(sumTeam3 / users.length),
    averageTotalPower: Math.round(sumTotal / users.length),
    maxTotalPower: Math.max(...totalPowers),
    minTotalPower: Math.min(...totalPowers)
  };
};

/**
 * 匯出資料為 CSV
 * @param {Array} users - 使用者陣列
 * @returns {string} CSV 字串
 */
export const exportToCSV = (users) => {
  // CSV 標題
  const headers = [
    '遊戲ID',
    '聯盟',
    '第一隊戰力',
    '第二隊戰力',
    '第三隊戰力',
    '總戰力',
    '建立時間',
    '更新時間'
  ].join(',');
  
  // CSV 資料列
  const rows = users.map(user => {
    const total = (Number(user.team1Power) || 0) + 
                  (Number(user.team2Power) || 0) + 
                  (Number(user.team3Power) || 0);
    
    const createdAt = user.createdAt?.toDate?.() || new Date(user.createdAt);
    const updatedAt = user.updatedAt?.toDate?.() || new Date(user.updatedAt);
    
    return [
      `"${user.gameId}"`,
      `"${user.alliance}"`,
      user.team1Power,
      user.team2Power,
      user.team3Power,
      total,
      `"${createdAt.toLocaleString('zh-TW')}"`,
      `"${updatedAt.toLocaleString('zh-TW')}"`
    ].join(',');
  });
  
  return [headers, ...rows].join('\n');
};

/**
 * 下載 CSV 檔案
 * @param {string} csvContent - CSV 內容
 * @param {string} filename - 檔案名稱
 */
export const downloadCSV = (csvContent, filename = 'game-power-data.csv') => {
  // 加上 BOM 讓 Excel 正確識別 UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};
