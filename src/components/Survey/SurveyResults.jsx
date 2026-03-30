import React, { useState, useEffect } from 'react';
import { fetchSurveyResponses, getSurveyConfig, updateSurveyConfig } from '../../services/surveyService';
import {
  RefreshCw, Users, BarChart3, Save, Eye, EyeOff,
  Settings, ChevronDown, ChevronUp, MessageSquare, Trash2
} from 'lucide-react';

// ── Label maps ────────────────────────────────────────────────────────────────
const Q_LABELS = {
  q0_spending: { title: '課金狀況', A: '無課', B: '偶爾課', C: '穩定課' },
  q0_activity: { title: '活躍程度', A: '高', B: '中', C: '低' },
  q1_playstyle: { title: '玩法偏好', A: '競技', B: '穩定', C: '自由' },
  q2_migration: { title: '移民意願', A: '願意跟', B: '視情況', C: '不想移' },
  q3_role: { title: '聯盟角色重視度', A: '很重要', B: '普通', C: '不重要' },
  q4_discipline: { title: '紀律接受度', A: '高', B: '中', C: '低' },
  q5_split: { title: '分團接受度', A: '可以', B: '視情況', C: '不太能接受' },
  q6_merge: { title: '合併後接受度', A: '可以', B: '視情況', C: '不行' },
  q7_power: { title: '主隊戰力區間', A: '<100', B: '100-149', C: '150-199', D: '200+' },
  q8_followup: { title: '願意後續聯絡', A: '可以', B: '不需要' },
};

const BAR_COLORS = {
  A: 'bg-emerald-500',
  B: 'bg-amber-400',
  C: 'bg-rose-400',
  D: 'bg-purple-400',
};

// ── Chart: horizontal bar chart for one question ──────────────────────────────
function QuestionChart({ qKey, label, responses }) {
  const counts = {};
  responses.forEach(r => {
    const v = r[qKey];
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  const total = responses.length;
  const options = Object.keys(Q_LABELS[qKey]).filter(k => k !== 'title');

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="space-y-2.5">
        {options.map(opt => {
          const count = counts[opt] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={opt}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-600">
                  <span className="inline-block w-5 font-black text-gray-800">{opt}.</span>{' '}
                  {Q_LABELS[qKey][opt]}
                </span>
                <span className="text-xs font-black text-gray-500 tabular-nums">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[opt] || 'bg-blue-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Open-ended responses list ─────────────────────────────────────────────────
function OpenResponses({ qKey, title, responses }) {
  const [expanded, setExpanded] = useState(true);
  const filtered = responses.filter(r => r[qKey]?.trim());

  if (filtered.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-xs text-gray-300 italic">- 無回應 -</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-bold">{filtered.length} 則</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {filtered.map((r, i) => (
            <div key={r.id || i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              {r.q0_name && (
                <p className="text-[10px] font-black text-indigo-500 mb-1">👤 {r.q0_name}</p>
              )}
              <p className="text-sm text-gray-700 leading-relaxed">{r[qKey]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Responses table ───────────────────────────────────────────────────────────
function ResponseTable({ responses }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-indigo-500" />
          <span className="text-xs font-black text-gray-600 uppercase tracking-wide">原始回答列表</span>
          <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">{responses.length}</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">名稱</th>
                <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">語言</th>
                {Object.keys(Q_LABELS).map(k => (
                  <th key={k} className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {Q_LABELS[k].title}
                  </th>
                ))}
                <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">提交時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {responses.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-700">{r.q0_name || <span className="text-gray-300">匿名</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono uppercase">{r.lang || '-'}</td>
                  {Object.keys(Q_LABELS).map(k => (
                    <td key={k} className="px-4 py-3 text-xs font-black text-center">
                      <span className={`px-1.5 py-0.5 rounded ${
                        r[k] === 'A' ? 'bg-emerald-100 text-emerald-700' :
                        r[k] === 'B' ? 'bg-amber-100 text-amber-700' :
                        r[k] === 'C' ? 'bg-rose-100 text-rose-700' :
                        r[k] === 'D' ? 'bg-purple-100 text-purple-700' : 'text-gray-300'
                      }`}>
                        {r[k] || '-'}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-[10px] text-gray-400 font-mono whitespace-nowrap">
                    {r.submittedAt?.toDate?.()?.toLocaleString('zh-TW').slice(0, 16) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin Config Panel ────────────────────────────────────────────────────────
function ConfigPanel({ config, onSave }) {
  const [code, setCode] = useState(config?.inviteCode || '');
  const [active, setActive] = useState(config?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ inviteCode: code, isActive: active });
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={14} className="text-indigo-500" />
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">問卷設定</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">邀請碼</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-black tracking-widest outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setActive(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-bold text-gray-600">{active ? '問卷開放中' : '問卷已關閉'}</span>
          </label>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
      >
        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
        儲存設定
      </button>
    </div>
  );
}

// ── Main SurveyResults component ──────────────────────────────────────────────
export default function SurveyResults() {
  const [responses, setResponses] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [res, cfg] = await Promise.all([fetchSurveyResponses(), getSurveyConfig()]);
    setResponses(res);
    setConfig(cfg);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleConfigSave = async (newCfg) => {
    await updateSurveyConfig(newCfg);
    setConfig(prev => ({ ...prev, ...newCfg }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm text-gray-400 font-bold">載入問卷資料中...</span>
      </div>
    );
  }

  // Summary stats
  const langCounts = { zh: 0, en: 0, es: 0 };
  responses.forEach(r => { if (r.lang && langCounts[r.lang] !== undefined) langCounts[r.lang]++; });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-500" size={20} /> 問卷分析
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">v2026-03-30 · 合併/移民意願調查</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
            <Users size={13} className="text-indigo-500" />
            <span className="text-sm font-black text-indigo-600">{responses.length} 份回應</span>
          </div>
          <button
            onClick={load}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
            title="重新整理"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Language distribution */}
      <div className="grid grid-cols-3 gap-3">
        {[['zh', '繁中', '🇹🇼'], ['en', 'English', '🇬🇧'], ['es', 'Español', '🇪🇸']].map(([k, name, flag]) => (
          <div key={k} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <div className="text-xl mb-1">{flag}</div>
            <div className="text-2xl font-black text-gray-800">{langCounts[k]}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{name}</div>
          </div>
        ))}
      </div>

      {/* Config panel */}
      {config && <ConfigPanel config={config} onSave={handleConfigSave} />}

      {/* Charts grid */}
      {responses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(Q_LABELS).map(k => (
              <QuestionChart key={k} qKey={k} label={Q_LABELS[k].title} responses={responses} />
            ))}
          </div>

          {/* Open-ended */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-indigo-400" />
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">開放題回答</p>
            </div>
            <OpenResponses qKey="q9_feedback" title="最不滿意 / 可改善之處" responses={responses} />
            <OpenResponses qKey="q10_other" title="其他想法與建議" responses={responses} />
          </div>

          {/* Raw table */}
          <ResponseTable responses={responses} />
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center text-gray-300">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold uppercase text-xs tracking-widest">尚無問卷回應</p>
        </div>
      )}
    </div>
  );
}
