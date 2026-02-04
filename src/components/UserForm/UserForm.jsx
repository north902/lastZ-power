import { useState, useEffect } from 'react';
import { saveUserData } from '../../services/firestoreService';
import { User, Shield, Swords, Users, Trophy, ChevronRight, Save, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLanguage } from '../../contexts/LanguageContext';

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '0';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-TW'); // Keep locale for specific display
};

const UserForm = ({ user }) => {
  const { t } = useLanguage();
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

  const validate = (data) => {
    const errs = {};
    if (!data.gameId?.trim()) errs.gameId = t('id_required');
    if (!data.alliance?.trim()) errs.alliance = t('alliance_required');
    return {
      valid: Object.keys(errs).length === 0,
      errors: errs
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validate(formData);
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
        toast.success(t('save_success'));
        setLastSubmitTime(now);
        localStorage.setItem('game_power_last_entry', JSON.stringify(formData));
        localStorage.setItem('game_power_last_time', now);
      } else {
        toast.error(t('save_failed') + result.error);
        setErrors({ submit: t('save_failed') + result.error });
      }
    } catch (error) {
      toast.error(t('error_occurred') + error.message);
      setErrors({ submit: t('error_occurred') + error.message });
    } finally {
      setLoading(false);
    }
  };

  const totalPower = Number(formData.team1Power || 0) + Number(formData.team2Power || 0) + Number(formData.team3Power || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-2">
          <Trophy className="text-yellow-500" /> {t('form_title')}
        </h2>
        <p className="text-gray-500">{t('form_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 space-y-6">

            {errors.submit && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-pulse">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> {t('game_id')} *
                </label>
                <input
                  type="text"
                  name="gameId"
                  value={formData.gameId}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 outline-none focus:ring-2 ${errors.gameId ? 'border-red-300 ring-red-100 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300'
                    }`}
                  placeholder={t('game_id_placeholder')}
                />
                {errors.gameId && <p className="text-xs text-red-500 mt-1">{errors.gameId}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={16} className="text-green-500" /> {t('alliance')} *
                </label>
                <input
                  type="text"
                  name="alliance"
                  value={formData.alliance}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 outline-none focus:ring-2 ${errors.alliance ? 'border-red-300 ring-red-100 bg-red-50' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-300'
                    }`}
                  placeholder={t('alliance_placeholder')}
                />
                {errors.alliance && <p className="text-xs text-red-500 mt-1">{errors.alliance}</p>}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

            <div className="space-y-5">
              <div className="flex items-center gap-2 text-gray-700 font-bold mb-2 text-sm uppercase tracking-wide">
                <Swords className="text-red-500" size={18} /> {t('combat_details')}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'team1Power', label: t('team1'), color: 'blue' },
                  { name: 'team2Power', label: t('team2'), color: 'indigo' },
                  { name: 'team3Power', label: t('team3'), color: 'purple' },
                ].map((team) => (
                  <div key={team.name} className="relative group">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Shield size={12} /> {team.label}
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
                  {t('saving')}
                </div>
              ) : (
                <>
                  <Save size={18} /> {t('save_data')}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between h-[180px] relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest opacity-80">{t('current_total')}</p>
              <h3 className="text-4xl font-black mt-2 tracking-tighter tabular-nums leading-none">
                {formatNumber(totalPower)}
              </h3>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] text-indigo-100/60 uppercase font-bold tracking-wider">{t('game_id')}</p>
                <p className="font-bold truncate max-w-[120px] text-sm tabular-nums">{formData.gameId || '---'}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2.5 flex items-center gap-2 border border-white/20">
                <LayoutDashboard size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">STATUS OK</span>
              </div>
            </div>

            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-black text-gray-800 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <LayoutDashboard size={14} className="text-gray-400" /> {t('data_preview')}
              </h4>
              {lastSubmitTime && (
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                  {t('last_updated')} {formatDateTime(lastSubmitTime).split(' ')[1]}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {[
                { label: t('game_id'), value: formData.gameId },
                { label: t('alliance'), value: formData.alliance },
                { label: t('team1'), value: formatNumber(formData.team1Power), emphasize: true },
                { label: t('team2'), value: formatNumber(formData.team2Power), emphasize: true },
                { label: t('team3'), value: formatNumber(formData.team3Power), emphasize: true },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs group">
                  <span className="text-gray-400 font-bold uppercase tracking-wider group-hover:text-gray-600 transition-colors">{item.label}</span>
                  <span className={`font-black ${item.emphasize ? 'text-gray-700 font-mono text-sm' : 'text-gray-800'}`}>
                    {item.value || (idx < 2 ? '---' : '0')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-dashed border-gray-200">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 uppercase tracking-tight">
                <Shield size={14} />
                <span>{t('sync_notice')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserForm;