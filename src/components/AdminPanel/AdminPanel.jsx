import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getAllUsers,
  deleteUserData,
  calculateStatistics,
} from '../../services/adminService';
import { formatPower, formatDateTime } from '../../utils/validation';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  RefreshCw,
  Download,
  Search,
  Trash2,
  Users,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Filter,
  BarChart3,
  Calendar
} from 'lucide-react';

const AdminPanel = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAllUsers();
      if (Array.isArray(data)) {
        setUsers(data);
        setStats(calculateStatistics(data));
      }
    } catch (err) {
      setError(t('error_occurred') + err.message);
      toast.error(t('error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = async (userId, gameId) => {
    if (!window.confirm(t('delete_confirm').replace('{id}', gameId))) {
      return;
    }

    try {
      const result = await deleteUserData(userId);
      if (result.success) {
        toast.success(t('delete_success'));
        loadAllUsers();
      } else {
        toast.error(t('error_occurred') + result.error);
      }
    } catch (err) {
      toast.error(t('error_occurred') + err.message);
    }
  };

  const processedUsers = users
    .filter(u =>
      u.gameId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.alliance?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      if (sortConfig.key === 'totalPower') {
        aValue = (a.team1Power || 0) + (a.team2Power || 0) + (a.team3Power || 0);
        bValue = (b.team1Power || 0) + (b.team2Power || 0) + (b.team3Power || 0);
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const currentStats = {
    totalUsers: processedUsers.length,
    avgTeam1: processedUsers.length > 0
      ? Math.round(processedUsers.reduce((sum, u) => sum + (u.team1Power || 0), 0) / processedUsers.length)
      : 0,
    avgTeam2: processedUsers.length > 0
      ? Math.round(processedUsers.reduce((sum, u) => sum + (u.team2Power || 0), 0) / processedUsers.length)
      : 0,
    avgTeam3: processedUsers.length > 0
      ? Math.round(processedUsers.reduce((sum, u) => sum + (u.team3Power || 0), 0) / processedUsers.length)
      : 0,
  };

  const handleExport = () => {
    const headers = [t('member_id'), t('alliance_label'), t('team1'), t('team2'), t('team3'), t('total_eval'), t('update_record')];
    const rows = processedUsers.map(u => [
      u.gameId,
      u.alliance,
      u.team1Power,
      u.team2Power,
      u.team3Power,
      (u.team1Power || 0) + (u.team2Power || 0) + (u.team3Power || 0),
      formatDateTime(u.submittedAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `戰力資料_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.info(t('preparing_export'));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <RefreshCw size={12} className="opacity-20 translate-y-[2px]" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center animate-in fade-in transition-all duration-700">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-400 font-black tracking-widest uppercase text-[10px]">{t('loading_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
            <BarChart3 className="text-indigo-600" /> {t('admin_title')}
          </h2>
          <p className="text-sm text-gray-500">{t('admin_desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAllUsers}
            className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw size={14} /> <span className="hidden sm:inline">{t('refresh')}</span>
          </button>
          <button
            onClick={handleExport}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <Download size={14} /> {t('export_csv')}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('display_count'), value: processedUsers.length, icon: <Users />, color: 'blue' },
            { label: t('avg_s1'), value: formatPower(currentStats.avgTeam1), icon: <TrendingUp />, color: 'green' },
            { label: t('avg_s2'), value: formatPower(currentStats.avgTeam2), icon: <TrendingUp />, color: 'indigo' },
            { label: t('avg_s3'), value: formatPower(currentStats.avgTeam3), icon: <TrendingUp />, color: 'purple' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors`}>
                <div className="text-indigo-600 group-hover:scale-110 transition-transform">{item.icon}</div>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-xl font-black text-gray-800 tracking-tighter tabular-nums leading-none mt-1">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-xs font-bold"
            />
          </div>
          <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:bg-gray-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Filter size={14} /> {t('filter_options')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                {[
                  { key: 'gameId', label: t('member_id') },
                  { key: 'alliance', label: t('alliance_label') },
                  { key: 'team1Power', label: t('s1_power') },
                  { key: 'team2Power', label: t('s2_power') },
                  { key: 'team3Power', label: t('s3_power') },
                  { key: 'totalPower', label: t('total_eval'), focus: true },
                  { key: 'submittedAt', label: t('update_record') },
                ].map((th) => (
                  <th
                    key={th.key}
                    onClick={() => handleSort(th.key)}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 transition-colors select-none ${th.focus ? 'text-indigo-600 bg-indigo-50/10' : 'text-gray-400'}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {th.label}
                      {getSortIcon(th.key)}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-4 opacity-20">
                      <Search size={48} />
                      <p className="font-bold uppercase text-xs tracking-widest">{searchTerm ? t('no_results') : t('no_data')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedUsers.map((user) => {
                  const total = (user.team1Power || 0) + (user.team2Power || 0) + (user.team3Power || 0);
                  return (
                    <tr key={user.id} className="group hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 border border-gray-200">
                            {user.gameId?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-800 tracking-tight">{user.gameId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                        {user.alliance}
                      </td>
                      <td className="px-6 py-5 font-mono text-sm text-gray-400 tabular-nums">{formatPower(user.team1Power)}</td>
                      <td className="px-6 py-5 font-mono text-sm text-gray-400 tabular-nums">{formatPower(user.team2Power)}</td>
                      <td className="px-6 py-5 font-mono text-sm text-gray-400 tabular-nums">{formatPower(user.team3Power)}</td>
                      <td className="px-6 py-5">
                        <span className="font-black text-indigo-600 font-mono text-base tabular-nums tracking-tighter">
                          {formatPower(total)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tabular-nums">
                          <Calendar size={12} />
                          {formatDateTime(user.submittedAt).split(' ')[0]}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDelete(user.id, user.gameId)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] flex justify-between items-center">
          <span>{t('intel_v2')}</span>
          <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400">
            {t('data_count')}: {processedUsers.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
