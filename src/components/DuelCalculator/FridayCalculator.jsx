import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings,
    Clock,
    Building2,
    FlaskConical,
    Radio,
    Users,
    Gem,
    RotateCcw,
    Save,
    Info,
    Bell,
    Check,
    Percent,
    Lock,
    Unlock,
    ChevronRight,
    X,
    ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const InputCard = ({ icon: Icon, title, name, inputsKey, unit, inputUnit, finalScore, colorClass, value, onChange, score, t }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                    <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
                </div>
                <span className="font-bold text-gray-700 text-sm">{title}</span>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{finalScore} pts / {unit}</span>
        </div>
        <div className="relative">
            <input
                type="text"
                name={inputsKey}
                value={value}
                onChange={onChange}
                placeholder="0"
                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-base"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {inputUnit || unit}
            </div>
        </div>
        <div className="mt-2 flex justify-end">
            <span className="text-xs font-bold text-gray-400">
                {t('est_score')}: <span className="text-blue-600 font-black">{score}</span>
            </span>
        </div>
    </div>
);

const FridayCalculator = () => {
    const { t, lang } = useLanguage();

    // 基本分（遊戲固定值）
    const BASE_SCORES = {
        speedup_1min: 40,
        build_power_10: 1,
        tech_power_10: 1,
        radar_1: 5000,
        soldier_t1: 46,
        soldier_t2: 70,
        soldier_t3: 92,
        soldier_t4: 116,
        soldier_t5: 140,
        soldier_t6: 160,
        soldier_t7: 184,
        soldier_t8: 210,
        soldier_t9: 230,
        soldier_t10: 255,
        diamond_1: 30 // 固定分，不受加成影響
    };

    // 加成設定（存字串以保留輸入中間狀態如 "313."）
    const [bonusSettings, setBonusSettings] = useState({
        global: '313',        // 全局加成 +313%
        build: '100',         // 建築類額外加成 +100%
        tech: '100',          // 科技類額外加成 +100%
        train: '100'          // 訓練類額外加成 +100%
    });

    // 手動覆蓋的最終得分
    const [manualOverrides, setManualOverrides] = useState({});

    const [inputs, setInputs] = useState({
        speedup_d: '',
        speedup_h: '',
        speedup_m: '',
        build_power_start: '',
        build_power_end: '',
        tech_power_start: '',
        tech_power_end: '',
        radar_count: '',
        soldier_count: '',
        selected_tier: '8', // Default to T8
        diamond_count: ''
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [showBonusGuide, setShowBonusGuide] = useState(false);

    // 把字串轉為數字（安全轉換）
    const toNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    useEffect(() => {
        const savedBonus = localStorage.getItem('duel_fri_bonus_settings');
        const savedOverrides = localStorage.getItem('duel_fri_manual_overrides');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_fri');

        if (savedBonus) {
            try {
                const parsed = JSON.parse(savedBonus);
                const strParsed = {};
                for (const k in parsed) {
                    strParsed[k] = String(parsed[k]);
                }
                setBonusSettings(strParsed);
            } catch (e) {
                console.error("Failed to load bonus settings", e);
            }
        }

        if (savedOverrides) {
            try {
                setManualOverrides(JSON.parse(savedOverrides));
            } catch (e) {
                console.error("Failed to load manual overrides", e);
            }
        }

        if (!welcomeDismissed) {
            setShowWelcome(true);
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (value === '' || /^\d+$/.test(value)) {
            setInputs(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleBonusChange = (key, value) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setBonusSettings(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleManualOverrideChange = (key, value) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setManualOverrides(prev => ({ ...prev, [key]: value }));
        }
    };

    const toggleManualOverride = (key) => {
        setManualOverrides(prev => {
            const next = { ...prev };
            if (next[key] !== undefined) {
                delete next[key];
            } else {
                next[key] = String(getFinalScore(key));
            }
            return next;
        });
    };

    const saveSettings = () => {
        localStorage.setItem('duel_fri_bonus_settings', JSON.stringify(bonusSettings));
        localStorage.setItem('duel_fri_manual_overrides', JSON.stringify(manualOverrides));
        setShowSettings(false);
    };

    const handleCloseWelcome = () => {
        if (dontShowAgain) {
            localStorage.setItem('duel_welcome_dismissed_fri', 'true');
        }
        setShowWelcome(false);
    };

    const resetAll = () => {
        setInputs({
            speedup_d: '', speedup_h: '', speedup_m: '',
            build_power_start: '', build_power_end: '',
            tech_power_start: '', tech_power_end: '',
            radar_count: '', soldier_count: '', selected_tier: '8',
            diamond_count: ''
        });
    };

    // 計算單個項目的最終加成後得分
    const getFinalScore = (itemKey) => {
        const base = BASE_SCORES[itemKey] || 0;
        if (itemKey === 'diamond_1') return base; // 鑽石不受加成

        const globalBonus = toNum(bonusSettings.global) / 100;
        let extraBonus = 0;

        if (itemKey === 'build_power_10') {
            extraBonus = toNum(bonusSettings.build) / 100;
        } else if (itemKey === 'tech_power_10') {
            extraBonus = toNum(bonusSettings.tech) / 100;
        } else if (itemKey.startsWith('soldier_t')) {
            extraBonus = toNum(bonusSettings.train) / 100;
        }

        return Math.floor(base * (1 + globalBonus + extraBonus));
    };

    const results = useMemo(() => {
        const getScore = (itemKey) => {
            return manualOverrides[itemKey] !== undefined ? toNum(manualOverrides[itemKey]) : getFinalScore(itemKey);
        };

        const totalSpeedupMinutes = (Number(inputs.speedup_d) || 0) * 1440 +
            (Number(inputs.speedup_h) || 0) * 60 +
            (Number(inputs.speedup_m) || 0);

        const buildPowerDiff = Math.max(0, (Number(inputs.build_power_end) || 0) - (Number(inputs.build_power_start) || 0));
        const techPowerDiff = Math.max(0, (Number(inputs.tech_power_end) || 0) - (Number(inputs.tech_power_start) || 0));

        return {
            speedup: totalSpeedupMinutes * getScore('speedup_1min'),
            build_power: (buildPowerDiff / 10) * getScore('build_power_10'),
            tech_power: (techPowerDiff / 10) * getScore('tech_power_10'),
            radar: (Number(inputs.radar_count) || 0) * getScore('radar_1'),
            soldier: (Number(inputs.soldier_count) || 0) * getScore(`soldier_t${inputs.selected_tier}`),
            diamond: (Number(inputs.diamond_count) || 0) * getScore('diamond_1'),
            totalSpeedupMinutes,
            buildPowerDiff,
            techPowerDiff
        };
    }, [inputs, bonusSettings, manualOverrides]);

    const totalScore = useMemo(() => {
        return Object.values(results).reduce((acc, curr) => typeof curr === 'number' ? acc + curr : acc, 0);
    }, [results]);

    const formatNumber = (num) => {
        if (!num || isNaN(num) || num === 0) return '0';
        return new Intl.NumberFormat('en-US').format(Math.floor(num));
    };

    const tiers = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Notification Modal */}
            {showWelcome && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-green-100">
                        <div className="p-10 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-200 animate-bounce cursor-default relative z-10">
                                    <Bell className="text-white" size={40} />
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-green-400 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                    {t('welcome_title')}
                                </h3>
                                <p className="text-sm font-medium text-gray-500 leading-relaxed px-2 text-center">
                                    {t('welcome_desc').split('{icon}')[0]}
                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded-md text-gray-900 border border-gray-200 align-middle mx-1 -mt-0.5">
                                        <Settings size={12} />
                                    </span>
                                    {t('welcome_desc').split('{icon}')[1]}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center justify-center gap-3 cursor-pointer group select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={dontShowAgain}
                                            onChange={() => setDontShowAgain(!dontShowAgain)}
                                        />
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-green-600 border-green-600' : 'border-gray-200 group-hover:border-green-400'}`}>
                                            {dontShowAgain && <Check size={12} className="text-white stroke-[4]" />}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                                        {t('dont_show_again')}
                                    </span>
                                </label>

                                <button
                                    onClick={handleCloseWelcome}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
                                >
                                    {t('close_guide')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-gray-900 via-green-950 to-emerald-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-green-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-green-400/30">Alliance Duel</div>
                            <div className="px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-400/30">{t('friday')}</div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{t('fri_title')}</h2>
                        <p className="text-green-200/60 text-sm font-medium">{t('fri_desc')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 w-full md:w-auto min-w-[280px]">
                        <div className="text-green-200 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_est_score')}</div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-100 to-emerald-100">{formatNumber(totalScore)}</div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={resetAll} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"><RotateCcw size={14} /> {t('reset_data')}</button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-white text-green-900' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}><Settings size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-green-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200"><Settings className="text-white" size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>

                    {/* 加成設定區 */}
                    <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Percent className="text-green-600" size={18} />
                                <h4 className="font-black text-green-900">{t('tech_bonus_settings')}</h4>
                            </div>
                            <button
                                onClick={() => setShowBonusGuide(!showBonusGuide)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white text-[10px] font-black text-green-600 rounded-lg border border-green-200 hover:bg-green-100 transition-all"
                            >
                                <Info size={12} />
                                {t('tech_bonus_guide_title')}
                            </button>
                        </div>

                        {showBonusGuide && createPortal(
                            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="absolute inset-0" onClick={() => setShowBonusGuide(false)}></div>
                                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-green-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50/50 to-green-50/30 flex-shrink-0 rounded-t-3xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-green-600 rounded-lg text-white shadow-sm">
                                                <Info size={16} />
                                            </div>
                                            <h3 className="font-black text-gray-900 text-sm">{t('tech_bonus_guide_title')}</h3>
                                        </div>
                                        <button onClick={() => setShowBonusGuide(false)} className="p-1.5 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                                            <p className="text-xs text-green-900 font-medium leading-relaxed flex items-start gap-2">
                                                <ChevronRight size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{t('tech_bonus_guide_desc')}</span>
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">遊戲畫面參考 / Screenshot</p>
                                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                                                <img src={`./guide/tech_${lang}.webp`} alt="Tech Bonus Guide" className="w-full h-auto object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0 rounded-b-3xl">
                                        <button onClick={() => setShowBonusGuide(false)} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg">{t('close_guide')}</button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest px-1">{t('global_bonus')}</label>
                                <input type="text" value={bonusSettings.global} onChange={(e) => handleBonusChange('global', e.target.value)} className="w-full bg-white border border-green-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest px-1">{t('building_bonus')}</label>
                                <input type="text" value={bonusSettings.build} onChange={(e) => handleBonusChange('build', e.target.value)} className="w-full bg-white border border-green-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest px-1">{t('tech_power_bonus')}</label>
                                <input type="text" value={bonusSettings.tech} onChange={(e) => handleBonusChange('tech', e.target.value)} className="w-full bg-white border border-green-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest px-1">{t('training_bonus')}</label>
                                <input type="text" value={bonusSettings.train} onChange={(e) => handleBonusChange('train', e.target.value)} className="w-full bg-white border border-green-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* 手動覆蓋區 */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="text-gray-600" size={18} />
                            <h4 className="font-black text-gray-900">{t('advanced_manual_override')}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            {Object.keys(BASE_SCORES).filter(k => k !== 'diamond_1').map(key => {
                                const isOverridden = manualOverrides[key] !== undefined;
                                const finalScore = isOverridden ? manualOverrides[key] : getFinalScore(key);
                                return (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t(key)}</label>
                                            <button onClick={() => toggleManualOverride(key)} className={`p-1 rounded-md transition-all ${isOverridden ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                                {isOverridden ? <Unlock size={12} /> : <Lock size={12} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-500 whitespace-nowrap">{BASE_SCORES[key]} →</div>
                                            <input type="text" value={isOverridden ? manualOverrides[key] : finalScore} onChange={(e) => handleManualOverrideChange(key, e.target.value)} disabled={!isOverridden} className={`flex-1 border rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${isOverridden ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'}`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={saveSettings} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"><Save size={18} /> {t('save_and_apply')}</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Any Speedup */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 border-l-4 border-l-emerald-500 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500 bg-opacity-10"><Clock size={18} className="text-emerald-500" /></div>
                            <span className="font-bold text-gray-700 text-sm font-black text-emerald-700">{t('speedup_accumulate')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{formatNumber(manualOverrides.speedup_1min !== undefined ? manualOverrides.speedup_1min : getFinalScore('speedup_1min'))} pts / {t('unit_min')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['d', 'h', 'm'].map(u => (
                            <div key={u} className="space-y-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t(`unit_${u === 'd' ? 'day' : u === 'h' ? 'hour' : 'min'}`)}</span>
                                <input type="text" name={`speedup_${u}`} value={inputs[`speedup_${u}`]} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-emerald-500/20 transition-all text-base font-mono" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-400 px-1">{t('current_total')}: <span className="text-emerald-600">{formatNumber(results.totalSpeedupMinutes)} {t('unit_min')}</span></span>
                        <span className="text-gray-400">{t('est_score')}: <span className="text-emerald-600 font-black">{formatNumber(results.speedup)}</span></span>
                    </div>
                </div>

                {/* Building Power */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 border-l-4 border-l-orange-500 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500 bg-opacity-10"><Building2 size={18} className="text-orange-500" /></div>
                            <span className="font-bold text-gray-700 text-sm">{t('power_increase')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{formatNumber(manualOverrides.build_power_10 !== undefined ? manualOverrides.build_power_10 : getFinalScore('build_power_10'))} pts / 10 Power</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_start')}</span>
                            <input type="text" name="build_power_start" value={inputs.build_power_start} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 transition-all text-base font-mono" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_end')}</span>
                            <input type="text" name="build_power_end" value={inputs.build_power_end} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 transition-all text-base font-mono" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end text-xs font-bold">
                        <span className="text-gray-400">{t('est_score')}: <span className="text-orange-600 font-black">{formatNumber(results.build_power)}</span></span>
                    </div>
                </div>

                {/* Tech Power */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100 border-l-4 border-l-purple-500 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-purple-500 bg-opacity-10"><FlaskConical size={18} className="text-purple-500" /></div>
                            <span className="font-bold text-gray-700 text-sm">{t('tech_power_increase')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{formatNumber(manualOverrides.tech_power_10 !== undefined ? manualOverrides.tech_power_10 : getFinalScore('tech_power_10'))} pts / 10 Power</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_start')}</span>
                            <input type="text" name="tech_power_start" value={inputs.tech_power_start} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-purple-500/20 transition-all text-base font-mono" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_end')}</span>
                            <input type="text" name="tech_power_end" value={inputs.tech_power_end} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-purple-500/20 transition-all text-base font-mono" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end text-xs font-bold">
                        <span className="text-gray-400">{t('est_score')}: <span className="text-purple-600 font-black">{formatNumber(results.tech_power)}</span></span>
                    </div>
                </div>

                {/* Training Soldier */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 border-l-4 border-l-orange-500 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500 bg-opacity-10"><Users size={18} className="text-orange-500" /></div>
                            <span className="font-bold text-gray-700 text-sm">{t('soldier_title')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            {formatNumber(manualOverrides[`soldier_t${inputs.selected_tier}`] !== undefined ? manualOverrides[`soldier_t${inputs.selected_tier}`] : getFinalScore(`soldier_t${inputs.selected_tier}`))} pts / {t('unit_soldier')}
                        </span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <select
                                value={inputs.selected_tier}
                                onChange={(e) => setInputs(prev => ({ ...prev, selected_tier: e.target.value }))}
                                className="w-full appearance-none bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-orange-500/20 transition-all text-sm cursor-pointer"
                            >
                                {tiers.map(t_num => (
                                    <option key={t_num} value={t_num}>T{t_num} {t('soldiers')}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                name="soldier_count"
                                value={inputs.soldier_count}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-base"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                                {t('unit_soldier')}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end text-xs font-bold">
                        <span className="text-gray-400">{t('est_score')}: <span className="text-orange-600 font-black">{formatNumber(results.soldier)}</span></span>
                    </div>
                </div>

                <InputCard icon={Radio} title={t('radar_title')} name="radar" inputsKey="radar_count" unit={t('unit_radar')} finalScore={formatNumber(manualOverrides.radar_1 !== undefined ? manualOverrides.radar_1 : getFinalScore('radar_1'))} colorClass="bg-blue-600" value={inputs.radar_count} onChange={handleInputChange} score={formatNumber(results.radar)} t={t} />
                <InputCard icon={Gem} title={t('diamond_gift')} name="diamond" inputsKey="diamond_count" unit={t('unit_item')} finalScore={BASE_SCORES.diamond_1} colorClass="bg-cyan-500" value={inputs.diamond_count} onChange={handleInputChange} score={formatNumber(results.diamond)} t={t} />
            </div>

            <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100 flex gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><Info size={16} className="text-green-600" /></div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-green-900 underline decoration-green-200 decoration-2 underline-offset-2">{t('tips_title')}</p>
                    <p className="text-xs text-green-700 leading-relaxed font-medium">{t('tips_desc')}</p>
                </div>
            </div>
        </div>
    );
};

export default FridayCalculator;
