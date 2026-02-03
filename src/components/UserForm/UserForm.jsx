import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { saveUserData, getUserData } from '../../services/userService';
import { VALIDATION_RULES, formatPower, formatDateTime, calculateTotalPower } from '../../utils/validation';

export default function UserForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [existingData, setExistingData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();

  // 監聽表單數值變化以計算總戰力
  const team1Power = watch('team1Power', 0);
  const team2Power = watch('team2Power', 0);
  const team3Power = watch('team3Power', 0);
  const totalPower = calculateTotalPower(team1Power, team2Power, team3Power);

  // 載入現有資料
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData(user.uid);
        if (data) {
          setExistingData(data);
          reset({
            gameId: data.gameId,
            alliance: data.alliance,
            team1Power: data.team1Power,
            team2Power: data.team2Power,
            team3Power: data.team3Power
          });
        }
      } catch (error) {
        console.error('載入資料失敗:', error);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user, reset]);

  // 提交表單
  const onSubmit = async (data) => {
    setLoading(true);

    try {
      await saveUserData(user.uid, data);
      toast.success('資料儲存成功！');
      setShowConfirmation(true);
      
      // 重新載入資料
      const updatedData = await getUserData(user.uid);
      setExistingData(updatedData);
      
      // 3秒後關閉確認視窗
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      toast.error(error.message || '儲存失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {existingData ? '更新戰力資料' : '填寫戰力資料'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 遊戲ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              遊戲ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('gameId', VALIDATION_RULES.gameId)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.gameId ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="請輸入遊戲ID"
            />
            {errors.gameId && (
              <p className="mt-1 text-sm text-red-500">{errors.gameId.message}</p>
            )}
          </div>

          {/* 聯盟 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              聯盟 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('alliance', VALIDATION_RULES.alliance)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.alliance ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="請輸入聯盟名稱"
            />
            {errors.alliance && (
              <p className="mt-1 text-sm text-red-500">{errors.alliance.message}</p>
            )}
          </div>

          {/* 第一隊戰力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              第一隊戰力 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...register('team1Power', VALIDATION_RULES.team1Power)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.team1Power ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.team1Power && (
              <p className="mt-1 text-sm text-red-500">{errors.team1Power.message}</p>
            )}
          </div>

          {/* 第二隊戰力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              第二隊戰力 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...register('team2Power', VALIDATION_RULES.team2Power)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.team2Power ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.team2Power && (
              <p className="mt-1 text-sm text-red-500">{errors.team2Power.message}</p>
            )}
          </div>

          {/* 第三隊戰力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              第三隊戰力 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...register('team3Power', VALIDATION_RULES.team3Power)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.team3Power ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {errors.team3Power && (
              <p className="mt-1 text-sm text-red-500">{errors.team3Power.message}</p>
            )}
          </div>

          {/* 總戰力顯示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">總戰力：</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatPower(totalPower)}
              </span>
            </div>
          </div>

          {/* 提交按鈕 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '儲存中...' : (existingData ? '更新資料' : '提交資料')}
          </button>
        </form>

        {/* 現有資料顯示 */}
        {existingData && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">目前資料</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">遊戲ID：</span>
                <span className="font-medium">{existingData.gameId}</span>
              </div>
              <div>
                <span className="text-gray-600">聯盟：</span>
                <span className="font-medium">{existingData.alliance}</span>
              </div>
              <div>
                <span className="text-gray-600">第一隊：</span>
                <span className="font-medium">{formatPower(existingData.team1Power)}</span>
              </div>
              <div>
                <span className="text-gray-600">第二隊：</span>
                <span className="font-medium">{formatPower(existingData.team2Power)}</span>
              </div>
              <div>
                <span className="text-gray-600">第三隊：</span>
                <span className="font-medium">{formatPower(existingData.team3Power)}</span>
              </div>
              <div>
                <span className="text-gray-600">更新時間：</span>
                <span className="font-medium">{formatDateTime(existingData.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 確認訊息 */}
        {showConfirmation && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">資料已成功儲存！</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
