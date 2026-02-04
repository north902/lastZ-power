import { useState, useEffect } from 'react';
import { saveUserData } from '../../services/firestoreService';
import { User, Shield, Swords, Users, Trophy, ChevronRight, Save, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-toastify';


const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-TW');
};

const localValidate = (data) => {
  const errors = {};
  if (!data.gameId?.trim()) errors.gameId = '遊戲 ID 為必填';
  if (!data.alliance?.trim()) errors.alliance = '聯盟名稱為必填';
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

const UserForm = ({ user }) => {
  const [formData, setFormData] = useState({
    gameId: '',
    alliance: '',
    team1Power: '',
    team2Power: '',
    team3Power: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);

  useEffect(() => {
    const localData = localStorage.getItem('game_power_last_entry');
    const localTime = localStorage.getItem('game_power_last_time');
    if (localData) setFormData(JSON.parse(localData));
    if (localTime) setLastSubmitTime(localTime);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = localValidate(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = {
        gameId: formData.gameId,
        alliance: formData.alliance,
        team1Power: Number(formData.team1Power || 0),
        team2Power: Number(formData.team2Power || 0),
        team3Power: Number(formData.team3Power || 0)
      };

      const result = await saveUserData(user.uid, dataToSubmit);

      if (result.success) {
        const now = new Date().toISOString();
        toast.success('✅ 資料已成功儲存！');
        setLastSubmitTime(now);
        localStorage.setItem('game_power_last_entry', JSON.stringify(formData));
        localStorage.setItem('game_power_last_time', now);
      } else {
        toast.error('儲存失敗：' + result.error);
        setErrors({ submit: '儲存失敗：' + result.error });
      }
    } catch (error) {
      toast.error('發生錯誤：' + error.message);
      setErrors({ submit: '發生錯誤：' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const totalPower = Number(formData.team1Power || 0) + Number(formData.team2Power || 0) + Number(formData.team3Power || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 頁面標題 */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-2">
          <Trophy className="text-yellow-500" /> 填寫戰力資料
        </h2>
        <p className="text-gray-500">請輸入您的最新英雄戰力資訊，讓盟友掌握戰場動態</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 表單區塊 */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 space-y-6">

            {/* 錯誤訊息 */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-pulse">
                {errors.submit}
              </div>
            )}

            {/* 遊戲資訊設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> 遊戲 ID *
                </label>
                <input
                  type="text"
                  name="gameId"
                  value={formData.gameId}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 outline-none focus:ring-2 ${errors.gameId ? 'border-red-300 ring-red-100 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300'
                    }`}
                  placeholder="例如: KingArthas"
                />
                {errors.gameId && <p className="text-xs text-red-500 mt-1">{errors.gameId}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={16} className="text-green-500" /> 聯盟 *
                </label>
                <input
                  type="text"
                  name="alliance"
                  value={formData.alliance}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 outline-none focus:ring-2 ${errors.alliance ? 'border-red-300 ring-red-100 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300'
                    }`}
                  placeholder="例如: LastHope"
                />
                {errors.alliance && <p className="text-xs text-red-500 mt-1">{errors.alliance}</p>}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

            {/* 戰力數值設定 */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
                <Swords className="text-red-500" size={18} /> 隊伍戰力詳情
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'team1Power', label: '第一隊戰力', icon: <Shield size={16} />, color: 'blue' },
                  { name: 'team2Power', label: '第二隊戰力', icon: <Shield size={16} />, color: 'indigo' },
                  { name: 'team3Power', label: '第三隊戰力', icon: <Shield size={16} />, color: 'purple' },
                ].map((team) => (
                  <div key={team.name} className="relative group">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        {team.icon} {team.label}
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        name={team.name}
                        value={formData[team.name]}
                        onChange={handleChange}
                        className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all hover:border-gray-300 font-mono text-lg"
                        placeholder="0"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold italic group-hover:text-indigo-400 transition-colors">
                        S{team.name.charAt(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  儲存中...
                </div>
              ) : (
                <>
                  <Save size={18} /> 儲存資料
                </>
              )}
            </button>
          </div>
        </form>

        {/* 預覽區塊 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between h-[180px] relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium opacity-80">當前統計總戰力</p>
              <h3 className="text-4xl font-black mt-2 tracking-tighter tabular-nums">
                {formatNumber(totalPower)}
              </h3>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-xs text-indigo-100 opacity-60">遊戲 ID</p>
                <p className="font-bold truncate max-w-[120px]">{formData.gameId || '尚未輸入'}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 flex items-center gap-2 border border-white/20">
                <LayoutDashboard size={16} />
                <span className="text-xs font-bold uppercase tracking-widest leading-none">Status</span>
              </div>
            </div>

            {/* 背景裝飾 */}
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase">
                <LayoutDashboard size={14} className="text-gray-400" /> 資料預覽
              </h4>
              {lastSubmitTime && (
                <span className="text-[10px] text-gray-400 font-medium">
                  {formatDateTime(lastSubmitTime)} 更新
                </span>
              )}
            </div>

            <div className="space-y-3">
              {[
                { label: '遊戲 ID', value: formData.gameId },
                { label: '所屬聯盟', value: formData.alliance },
                { label: '第一路戰隊', value: formatNumber(formData.team1Power), emphasize: true },
                { label: '第二路戰隊', value: formatNumber(formData.team2Power), emphasize: true },
                { label: '第三路戰隊', value: formatNumber(formData.team3Power), emphasize: true },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm group">
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">{item.label}</span>
                  <span className={`font-bold ${item.emphasize ? 'text-gray-700 font-mono' : 'text-gray-800'}`}>
                    {item.value || (idx < 2 ? '---' : '0')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Shield size={14} />
                <span>資料將同步至聯盟大數據庫</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserForm;