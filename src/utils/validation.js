// 驗證遊戲 ID
export const validateGameId = (gameId) => {
  if (!gameId || gameId.trim().length === 0) {
    return { valid: false, error: '遊戲 ID 不能為空' };
  }
  if (gameId.length > 50) {
    return { valid: false, error: '遊戲 ID 長度不能超過 50 個字元' };
  }
  
  // 修改：在 regex 裡加入了 \s (允許空格)，這樣 "Iron Man" 也能過
  const validPattern = /^[\w\u4e00-\u9fa5\-_.\s]+$/;
  if (!validPattern.test(gameId)) {
    return { valid: false, error: '遊戲 ID 包含不允許的字元' };
  }
  return { valid: true };
};

// 驗證聯盟名稱 (保持不變)
export const validateAlliance = (alliance) => {
  if (!alliance || alliance.trim().length === 0) {
    return { valid: false, error: '聯盟名稱不能為空' };
  }
  if (alliance.length > 50) {
    return { valid: false, error: '聯盟名稱長度不能超過 50 個字元' };
  }
  return { valid: true };
};

// 驗證戰力數值 (重點修改區！)
export const validatePower = (power, teamName) => {
  // Number() 會把 "12.5" 轉成數字 12.5
  const numPower = Number(power);
  
  if (isNaN(numPower)) {
    return { valid: false, error: `${teamName}必須是數字` };
  }
  if (numPower < 0) {
    return { valid: false, error: `${teamName}不能為負數` };
  }
  if (numPower > 9999999) {
    return { valid: false, error: `${teamName}不能超過 9,999,999` };
  }

  // ▼▼▼ 兇手就是這一行！我們把它刪掉了 ▼▼▼
  // if (!Number.isInteger(numPower)) {
  //   return { valid: false, error: `${teamName}必須是整數` };
  // }
  // ▲▲▲ 刪除結束 ▲▲▲
  
  return { valid: true, value: numPower };
};

// 驗證整個表單 (保持不變)
export const validateForm = (formData) => {
  const errors = {};
  
  const gameIdResult = validateGameId(formData.gameId);
  if (!gameIdResult.valid) errors.gameId = gameIdResult.error;
  
  const allianceResult = validateAlliance(formData.alliance);
  if (!allianceResult.valid) errors.alliance = allianceResult.error;
  
  const team1Result = validatePower(formData.team1Power, '第一隊戰力');
  if (!team1Result.valid) errors.team1Power = team1Result.error;
  
  const team2Result = validatePower(formData.team2Power, '第二隊戰力');
  if (!team2Result.valid) errors.team2Power = team2Result.error;
  
  const team3Result = validatePower(formData.team3Power, '第三隊戰力');
  if (!team3Result.valid) errors.team3Power = team3Result.error;
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// 格式化數字顯示（升級版：支援小數點與千分位）
export const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0';
  
  // 使用 toLocaleString 是處理千分位 + 小數點最穩定的原薩方法
  // maximumFractionDigits: 2 代表最多顯示兩位小數 (你可以自己改)
  return Number(num).toLocaleString('en-US', {
    maximumFractionDigits: 2 
  });
};

// 格式化日期時間 (保持不變)
export const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
// 1. 補上 UserForm 需要的驗證規則物件
export const VALIDATION_RULES = {
  gameId: { required: '遊戲 ID 為必填' },
  alliance: { required: '聯盟名稱為必填' },
  team1Power: { required: '戰力為必填', min: { value: 0, message: '不能為負數' } },
  team2Power: { required: '戰力為必填', min: { value: 0, message: '不能為負數' } },
  team3Power: { required: '戰力為必填', min: { value: 0, message: '不能為負數' } }
};

// 2. 補上 formatPower (對應你 UserForm 裡用的名稱，其實就是呼叫你寫好的 formatNumber)
export const formatPower = (num) => formatNumber(num);

// 3. 補上關鍵的 calculateTotalPower (計算三隊總和)
export const calculateTotalPower = (t1, t2, t3) => {
  return (Number(t1) || 0) + (Number(t2) || 0) + (Number(t3) || 0);
};
