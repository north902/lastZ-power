import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getAllUsers, 
  deleteUserData, 
  calculateStatistics,
  exportToCSV,
  downloadCSV 
} from '../../services/adminService';
import { formatPower, formatDateTime, calculateTotalPower } from '../../utils/validation';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, totalPower, gameId

  // 載入所有使用者資料
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
      
      // 計算統計資料
      const stats = calculateStatistics(data);
      setStatistics(stats);
    } catch (error) {
      toast.error('載入資料失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 刪除使用者
  const handleDelete = async (userId, gameId) => {
    if (!window.confirm(`確定要刪除 ${gameId} 的資料嗎？`)) {
      return;
    }

    try {
      await deleteUserData(userId);
      toast.success('刪除成功');
      loadUsers(); // 重新載入
    } catch (error) {
      toast.error('刪除失敗：' + error.message);
    }
  };

  // 匯出 CSV
  const handleExport = () => {
    try {
      const csv = exportToCSV(filteredUsers);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `game-power-data-${timestamp}.csv`);
      toast.success('匯出成功！');
    } catch (error) {
      toast.error('匯出失敗：' + error.message);
    }
  };

  // 篩選與排序
  const filteredUsers = users
    .filter(user => 
      user.gameId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.alliance.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'updatedAt') {
        return b.updatedAt?.toMillis() - a.updatedAt?.toMillis();
      } else if (sortBy === 'totalPower') {
        const totalA = calculateTotalPower(a.team1Power, a.team2Power, a.team3Power);
        const totalB = calculateTotalPower(b.team1Power, b.team2Power, b.team3Power);
        return totalB - totalA;
      } else if (sortBy === 'gameId') {
        return a.gameId.localeCompare(b.gameId);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">管理員面板</h2>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            管理員
          </span>
        </div>

        {/* 統計資訊 */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">總使用者數</div>
              <div className="text-2xl font-bold text-blue-600">{statistics.totalUsers}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">平均總戰力</div>
              <div className="text-2xl font-bold text-green-600">
                {formatPower(statistics.averageTotalPower)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">最高總戰力</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatPower(statistics.maxTotalPower)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">最低總戰力</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatPower(statistics.minTotalPower)}
              </div>
            </div>
          </div>
        )}

        {/* 操作列 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="搜尋遊戲ID或聯盟..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="updatedAt">依更新時間</option>
            <option value="totalPower">依總戰力</option>
            <option value="gameId">依遊戲ID</option>
          </select>

          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            匯出 CSV
          </button>
        </div>

        {/* 使用者列表 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">遊戲ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">聯盟</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">第一隊</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">第二隊</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">第三隊</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">總戰力</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">更新時間</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? '找不到符合的資料' : '尚無使用者資料'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const total = calculateTotalPower(user.team1Power, user.team2Power, user.team3Power);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.gameId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.alliance}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatPower(user.team1Power)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatPower(user.team2Power)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatPower(user.team3Power)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                        {formatPower(total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(user.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(user.id, user.gameId)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 顯示筆數 */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          顯示 {filteredUsers.length} / {users.length} 筆資料
        </div>
      </div>
    </div>
  );
}
