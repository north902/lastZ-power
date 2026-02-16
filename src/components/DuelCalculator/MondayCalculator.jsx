import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings,
    Wrench,
    Scroll,
    Radio,
    Box,
    Cpu,
    Target,
    Skull,
    Coins,
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

const MultiInputCard = ({ icon: Icon, title, items, colorClass, t, lang, subtotal, gridCols = 'lg:grid-cols-7', colSpan = 'lg:col-span-3' }) => (
    <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all md:col-span-2 ${colSpan}`}>
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 shadow-sm`}>
                <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
            </div>
            <h3 className="font-black text-gray-900 leading-tight">{title}</h3>
        </div>

        <div className={`grid grid-cols-2 md:grid-cols-4 ${gridCols} gap-4`}>
            {items.map((item) => (
                <div key={item.key} className="space-y-1.5">
                    <div className="flex justify-between items-end px-1 gap-1">
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter leading-none">{item.label}</span>
                        <span className={`${lang === 'en' ? 'text-[8px] tracking-tighter' : 'text-[10px]'} font-bold text-gray-400 whitespace-nowrap uppercase leading-none pb-[1px]`}>
                            {item.pts} PTS / {item.unit}
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            name={item.key}
                            value={item.value}
                            onChange={item.onChange}
                            placeholder="0"
                            className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-2 pr-7 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-center shadow-inner"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded shadow-sm pointer-events-none">
                            {item.unit}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-end">
            <span className="text-xs font-bold text-gray-400">
                {t('est_score')}: <span className={`${colorClass.replace('bg-', 'text-')} font-black text-[15px]`}>{subtotal}</span>
            </span>
        </div>
    </div>
);

const InputCard = ({ icon: Icon, title, name, inputsKey, unit, inputUnit, finalScore, colorClass, value, onChange, score, t, lang }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
        <div className="flex items-center justify-between gap-1 mb-3">
            <div className="flex items-center gap-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 flex-shrink-0`}>
                    <Icon size={16} className={colorClass.replace('bg-', 'text-')} />
                </div>
                <span className="font-bold text-gray-700 text-sm whitespace-nowrap">{title}</span>
            </div>
            <span className={`${lang === 'en' ? 'text-[8.5px] tracking-tight' : 'text-[9px] bg-gray-50 px-1.5 border border-gray-100'} font-black text-gray-400 uppercase rounded-full whitespace-nowrap flex-shrink-0`}>
                {finalScore} PTS / {unit}
            </span>
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                {inputUnit || unit}
            </div>
        </div>
        <div className="mt-2 flex justify-end">
            <span className="text-xs font-bold text-gray-400">
                {t('est_score')}: <span className="text-blue-600 font-black text-[15px]">{score}</span>
            </span>
        </div>
    </div>
);

const MondayCalculator = () => {
    const { t, lang } = useLanguage();

    const BASE_SCORES = {
        drawing_1: 20,
        wrench_1: 5000,
        radar_1: 5000,
        module_L1: 500,
        module_L2: 1500,
        module_L3: 4500,
        module_L4: 13500,
        module_L5: 40500,
        module_L6: 121500,
        module_L7: 364500,
        plugin_green: 3000,
        plugin_blue: 12500,
        plugin_purple: 50000,
        plugin_orange: 250000,
        sl_10: 500,
        sl_20: 600,
        sl_30: 700,
        sl_40: 800,
        sl_50: 1000,
        sl_60: 1200,
        pz_10: 1000,
        pz_20: 1200,
        pz_30: 1400,
        pz_40: 1600,
        pz_50: 2000,
        pz_60: 2400,
        gather_coin_1k: 3,
        gather_res_1k: 1,
        diamond_1: 30
    };

    const [bonusSettings, setBonusSettings] = useState({
        global: '313',
        drawing: '100',
        wrench: '100',
        monster: '100',
        gather: '100'
    });

    const [manualOverrides, setManualOverrides] = useState({});

    const [inputs, setInputs] = useState({
        drawing_count: '',
        wrench_count: '',
        radar_count: '',
        module_L1: '', module_L2: '', module_L3: '', module_L4: '', module_L5: '', module_L6: '', module_L7: '',
        plugin_green: '', plugin_blue: '', plugin_purple: '', plugin_orange: '',
        sl_count: '',
        sl_level: '60',
        pz_count: '',
        pz_level: '60',
        gather_coin: '',
        gather_res: '',
        diamond_count: ''
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [showBonusGuide, setShowBonusGuide] = useState(false);

    const toNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    useEffect(() => {
        const savedBonus = localStorage.getItem('duel_mon_bonus_settings');
        const savedOverrides = localStorage.getItem('duel_mon_manual_overrides');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_mon');

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
            setManualOverrides(prev => ({ ...prev, [key]: Number(value) || 0 }));
        }
    };

    const toggleManualOverride = (key) => {
        setManualOverrides(prev => {
            const next = { ...prev };
            if (next[key] !== undefined) {
                delete next[key];
            } else {
                next[key] = getFinalScore(key);
            }
            return next;
        });
    };

    const getFinalScore = (itemKey) => {
        const base = BASE_SCORES[itemKey] || 0;
        if (itemKey === 'diamond_1') return base;

        const globalBonus = toNum(bonusSettings.global) / 100;
        let extraBonus = 0;

        if (itemKey === 'drawing_1') {
            extraBonus = toNum(bonusSettings.drawing) / 100;
        } else if (itemKey === 'wrench_1') {
            extraBonus = toNum(bonusSettings.wrench) / 100;
        } else if (itemKey.startsWith('sl_') || itemKey.startsWith('pz_')) {
            extraBonus = toNum(bonusSettings.monster) / 100;
        } else if (itemKey.startsWith('gather_')) {
            extraBonus = toNum(bonusSettings.gather) / 100;
        }

        return Math.floor(base * (1 + globalBonus + extraBonus));
    };

    const saveSettings = () => {
        localStorage.setItem('duel_mon_bonus_settings', JSON.stringify(bonusSettings));
        localStorage.setItem('duel_mon_manual_overrides', JSON.stringify(manualOverrides));
        setShowSettings(false);
    };

    const handleCloseWelcome = () => {
        if (dontShowAgain) {
            localStorage.setItem('duel_welcome_dismissed_mon', 'true');
        }
        setShowWelcome(false);
    };

    const resetAll = () => {
        setInputs({
            drawing_count: '',
            wrench_count: '',
            radar_count: '',
            module_L1: '', module_L2: '', module_L3: '', module_L4: '', module_L5: '', module_L6: '', module_L7: '',
            plugin_green: '', plugin_blue: '', plugin_purple: '', plugin_orange: '',
            sl_count: '',
            sl_level: '60',
            pz_count: '',
            pz_level: '60',
            gather_coin: '',
            gather_res: '',
            diamond_count: ''
        });
    };

    const results = useMemo(() => {
        const getScore = (itemKey) => {
            return manualOverrides[itemKey] !== undefined ? manualOverrides[itemKey] : getFinalScore(itemKey);
        };

        let moduleTotal = 0;
        for (let i = 1; i <= 7; i++) {
            moduleTotal += (Number(inputs[`module_L${i}`]) || 0) * getScore(`module_L${i}`);
        }

        let pluginTotal = 0;
        ['green', 'blue', 'purple', 'orange'].forEach(color => {
            pluginTotal += (Number(inputs[`plugin_${color}`]) || 0) * getScore(`plugin_${color}`);
        });

        return {
            drawing: (Number(inputs.drawing_count) || 0) * getScore('drawing_1'),
            wrench: (Number(inputs.wrench_count) || 0) * getScore('wrench_1'),
            radar: (Number(inputs.radar_count) || 0) * getScore('radar_1'),
            module: moduleTotal,
            plugin: pluginTotal,
            sl: (Number(inputs.sl_count) || 0) * getScore(`sl_${inputs.sl_level}`),
            pz: (Number(inputs.pz_count) || 0) * getScore(`pz_${inputs.pz_level}`),
            gather_coin: Math.floor((Number(inputs.gather_coin) || 0) / 1000) * getScore('gather_coin_1k'),
            gather_res: Math.floor((Number(inputs.gather_res) || 0) / 1000) * getScore('gather_res_1k'),
            diamond: (Number(inputs.diamond_count) || 0) * getScore('diamond_1')
        };
    }, [inputs, bonusSettings, manualOverrides]);

    const totalScore = useMemo(() => {
        return Object.values(results).reduce((acc, curr) => {
            return typeof curr === 'number' ? acc + curr : acc;
        }, 0);
    }, [results]);

    const formatNumber = (num) => {
        if (!num || isNaN(num) || num === 0) return '0';
        return new Intl.NumberFormat('en-US').format(Math.floor(num));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Modal */}
            {showWelcome && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-cyan-100">
                        <div className="p-10 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-cyan-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-cyan-200 animate-bounce cursor-default relative z-10">
                                    <Bell className="text-white" size={40} />
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-cyan-400 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-gray-900 leading-tight">{t('welcome_title')}</h3>
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
                                        <input type="checkbox" className="sr-only" checked={dontShowAgain} onChange={() => setDontShowAgain(!dontShowAgain)} />
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-cyan-600 border-cyan-600' : 'border-gray-200 group-hover:border-cyan-400'}`}>
                                            {dontShowAgain && <Check size={12} className="text-white stroke-[4]" />}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">{t('dont_show_again')}</span>
                                </label>
                                <button onClick={handleCloseWelcome} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200">
                                    {t('close_guide')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-400/30">Alliance Duel</div>
                            <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-400/30">{t('monday')}</div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{t('mon_title')}</h2>
                        <p className="text-slate-200/60 text-sm font-medium">{t('mon_desc')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 w-full md:w-auto min-w-[280px]">
                        <div className="text-slate-200 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_est_score')}</div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-cyan-100">{formatNumber(totalScore)}</div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={resetAll} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"><RotateCcw size={14} /> {t('reset_data')}</button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-white text-slate-900' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}><Settings size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200"><Settings className="text-white" size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>

                    <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Percent className="text-slate-600" size={18} />
                                <h4 className="font-black text-slate-900">{t('tech_bonus_settings')}</h4>
                            </div>
                            <button
                                onClick={() => setShowBonusGuide(!showBonusGuide)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white text-[10px] font-black text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all"
                            >
                                <Info size={12} />
                                {t('tech_bonus_guide_title')}
                            </button>
                        </div>

                        {showBonusGuide && createPortal(
                            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="absolute inset-0" onClick={() => setShowBonusGuide(false)}></div>
                                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-slate-50/30 flex-shrink-0 rounded-t-3xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-800 rounded-lg text-white shadow-sm">
                                                <Info size={16} />
                                            </div>
                                            <h3 className="font-black text-gray-900 text-sm">{t('tech_bonus_guide_title')}</h3>
                                        </div>
                                        <button onClick={() => setShowBonusGuide(false)} className="p-1.5 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                            <p className="text-xs text-slate-900 font-medium leading-relaxed flex items-start gap-2">
                                                <ChevronRight size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">{t('global_bonus')}</label>
                                <input type="text" value={bonusSettings.global} onChange={(e) => handleBonusChange('global', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">{t('drawing_bonus')}</label>
                                <input type="text" value={bonusSettings.drawing} onChange={(e) => handleBonusChange('drawing', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">{t('wrench_bonus')}</label>
                                <input type="text" value={bonusSettings.wrench} onChange={(e) => handleBonusChange('wrench', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">{t('monster_bonus')}</label>
                                <input type="text" value={bonusSettings.monster} onChange={(e) => handleBonusChange('monster', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">{t('gather_bonus')}</label>
                                <input type="text" value={bonusSettings.gather} onChange={(e) => handleBonusChange('gather', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                        </div>
                    </div>

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
                                            <button onClick={() => toggleManualOverride(key)} className={`p-1 rounded-md transition-all ${isOverridden ? 'bg-slate-100 text-slate-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                                {isOverridden ? <Unlock size={12} /> : <Lock size={12} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-500 whitespace-nowrap">{BASE_SCORES[key]} →</div>
                                            <input type="text" value={isOverridden ? manualOverrides[key] : finalScore} onChange={(e) => handleManualOverrideChange(key, e.target.value)} disabled={!isOverridden} className={`flex-1 border rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all ${isOverridden ? 'bg-white border-slate-200' : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'}`} />
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
                <InputCard icon={Scroll} title={t('drawing_title')} name="drawing" inputsKey="drawing_count" unit={t('unit_drawing')} finalScore={formatNumber(manualOverrides.drawing_1 !== undefined ? manualOverrides.drawing_1 : getFinalScore('drawing_1'))} colorClass="bg-amber-600" value={inputs.drawing_count} onChange={handleInputChange} score={formatNumber(results.drawing)} t={t} lang={lang} />
                <InputCard icon={Wrench} title={t('wrench_title')} name="wrench" inputsKey="wrench_count" unit={t('unit_wrench')} finalScore={formatNumber(manualOverrides.wrench_1 !== undefined ? manualOverrides.wrench_1 : getFinalScore('wrench_1'))} colorClass="bg-amber-500" value={inputs.wrench_count} onChange={handleInputChange} score={formatNumber(results.wrench)} t={t} lang={lang} />
                <InputCard icon={Radio} title={t('radar_title')} name="radar" inputsKey="radar_count" unit={t('unit_times')} finalScore={formatNumber(manualOverrides.radar_1 !== undefined ? manualOverrides.radar_1 : getFinalScore('radar_1'))} colorClass="bg-blue-600" value={inputs.radar_count} onChange={handleInputChange} score={formatNumber(results.radar)} t={t} lang={lang} />

                {/* Module Chests */}
                <MultiInputCard
                    icon={Box}
                    title={t('module_case')}
                    colorClass="bg-cyan-600"
                    t={t}
                    lang={lang}
                    subtotal={formatNumber(results.module)}
                    gridCols="lg:grid-cols-4"
                    colSpan="lg:col-span-3"
                    items={[1, 2, 3, 4, 5, 6, 7].map(lv => ({
                        key: `module_L${lv}`,
                        label: `${t('level_label')} ${lv}`,
                        pts: formatNumber(manualOverrides[`module_L${lv}`] !== undefined ? manualOverrides[`module_L${lv}`] : getFinalScore(`module_L${lv}`)),
                        unit: t('unit_item'),
                        value: inputs[`module_L${lv}`],
                        onChange: handleInputChange
                    }))}
                />

                {/* Tactical Plugin Chests */}
                <MultiInputCard
                    icon={Cpu}
                    title={t('tactical_plugin')}
                    colorClass="bg-indigo-600"
                    t={t}
                    lang={lang}
                    subtotal={formatNumber(results.plugin)}
                    gridCols="lg:grid-cols-2"
                    colSpan="lg:col-span-1"
                    items={['green', 'blue', 'purple', 'orange'].map(c => ({
                        key: `plugin_${c}`,
                        label: t(`color_${c}`),
                        pts: formatNumber(manualOverrides[`plugin_${c}`] !== undefined ? manualOverrides[`plugin_${c}`] : getFinalScore(`plugin_${c}`)),
                        unit: t('unit_case'),
                        value: inputs[`plugin_${c}`],
                        onChange: handleInputChange
                    }))}
                />

                {/* Snow Leopard (SL) */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-1 mb-4">
                        <div className="flex items-center gap-1 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-800 bg-opacity-10 shadow-sm flex-shrink-0"><Target size={16} className="text-slate-800" /></div>
                            <span className="font-black text-gray-700 text-sm whitespace-nowrap">{t('snow_leopard')}</span>
                        </div>
                        <span className={`${lang === 'en' ? 'text-[8.5px] tracking-tight' : 'text-[9px] bg-gray-50 px-1.5 border border-gray-100'} font-black text-gray-400 uppercase rounded-full whitespace-nowrap flex-shrink-0`}>
                            {formatNumber(manualOverrides[`sl_${inputs.sl_level}`] !== undefined ? manualOverrides[`sl_${inputs.sl_level}`] : getFinalScore(`sl_${inputs.sl_level}`))} PTS / {t('unit_monster')}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div className="relative group">
                            <select value={inputs.sl_level} onChange={(e) => setInputs(prev => ({ ...prev, sl_level: e.target.value }))} className="w-full appearance-none bg-gray-50 border-2 border-transparent group-hover:border-slate-200 rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-slate-500/20 transition-all text-sm cursor-pointer shadow-inner">
                                {['10', '20', '30', '40', '50', '60'].map(lv => (
                                    <option key={lv} value={lv}>{t('level_label')} {Number(lv) - 9}-{lv}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                        <div className="relative">
                            <input type="text" name="sl_count" value={inputs.sl_count} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-2 border-transparent focus:border-slate-300 rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-slate-500/20 transition-all text-base font-mono text-center shadow-inner" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                {t('unit_monster')}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <span className="text-xs font-bold text-gray-400">
                            {t('est_score')}: <span className="text-slate-800 font-black text-[15px]">{formatNumber(results.sl)}</span>
                        </span>
                    </div>
                </div>

                {/* Polar Zombie (PZ) */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-1 mb-4">
                        <div className="flex items-center gap-1 min-w-0">
                            <div className="p-1.5 rounded-lg bg-blue-800 bg-opacity-10 shadow-sm flex-shrink-0"><Skull size={16} className="text-blue-800" /></div>
                            <span className="font-black text-gray-700 text-sm whitespace-nowrap">{t('polar_zombie')}</span>
                        </div>
                        <span className={`${lang === 'en' ? 'text-[8.5px] tracking-tight' : 'text-[9px] bg-gray-50 px-1.5 border border-gray-100'} font-black text-gray-400 uppercase rounded-full whitespace-nowrap flex-shrink-0`}>
                            {formatNumber(manualOverrides[`pz_${inputs.pz_level}`] !== undefined ? manualOverrides[`pz_${inputs.pz_level}`] : getFinalScore(`pz_${inputs.pz_level}`))} PTS / {t('unit_monster')}
                        </span>
                    </div>
                    <div className="space-y-4">
                        <div className="relative group">
                            <select value={inputs.pz_level} onChange={(e) => setInputs(prev => ({ ...prev, pz_level: e.target.value }))} className="w-full appearance-none bg-gray-50 border-2 border-transparent group-hover:border-blue-200 rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-sm cursor-pointer shadow-inner">
                                {['10', '20', '30', '40', '50', '60'].map(lv => (
                                    <option key={lv} value={lv}>{t('level_label')} {Number(lv) - 9}-{lv}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                        <div className="relative">
                            <input type="text" name="pz_count" value={inputs.pz_count} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-300 rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-base font-mono text-center shadow-inner" />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                                {t('unit_monster')}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <span className="text-xs font-bold text-gray-400">
                            {t('est_score')}: <span className="text-blue-800 font-black text-[15px]">{formatNumber(results.pz)}</span>
                        </span>
                    </div>
                </div>

                {/* Resource Gathering */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Coins size={80} className="text-green-900" />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2.5 rounded-xl bg-green-500 bg-opacity-10 shadow-sm"><Coins size={20} className="text-green-500" /></div>
                        <span className="font-black text-gray-900 leading-tight">{t('gathering_title')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-green-700 uppercase">{t('gathering_coin')}</span>
                                <span className={`${lang === 'en' ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100`}>{formatNumber(manualOverrides.gather_coin_1k !== undefined ? manualOverrides.gather_coin_1k : getFinalScore('gather_coin_1k'))} PTS / 1K</span>
                            </div>
                            <div className="relative">
                                <input type="text" name="gather_coin" value={inputs.gather_coin} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 pl-3 pr-8 text-gray-900 font-bold focus:ring-2 focus:ring-green-500/20 transition-all text-sm font-mono text-center shadow-inner" />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-green-600 bg-green-50 px-1 py-0.5 rounded uppercase">1K</div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-green-700 uppercase">{t('gathering_res')}</span>
                                <span className={`${lang === 'en' ? 'text-[8px]' : 'text-[9px]'} font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100`}>{formatNumber(manualOverrides.gather_res_1k !== undefined ? manualOverrides.gather_res_1k : getFinalScore('gather_res_1k'))} PTS / 1K</span>
                            </div>
                            <div className="relative">
                                <input type="text" name="gather_res" value={inputs.gather_res} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 pl-3 pr-8 text-gray-900 font-bold focus:ring-2 focus:ring-green-500/20 transition-all text-sm font-mono text-center shadow-inner" />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-green-600 bg-green-50 px-1 py-0.5 rounded uppercase">1K</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <span className="text-xs font-bold text-gray-400">
                            {t('est_score')}: <span className="text-green-600 font-black text-[15px]">{formatNumber(results.gather_coin + results.gather_res)}</span>
                        </span>
                    </div>
                </div>

                <InputCard icon={Gem} title={t('diamond_gift')} name="diamond" inputsKey="diamond_count" unit={t('unit_item')} finalScore={BASE_SCORES.diamond_1} colorClass="bg-cyan-500" value={inputs.diamond_count} onChange={handleInputChange} score={formatNumber(results.diamond)} t={t} lang={lang} />
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex gap-4">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0"><Info size={16} className="text-slate-600" /></div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-2">{t('tips_title')}</p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{t('tips_desc')}</p>
                </div>
            </div>
        </div>
    );
};

export default MondayCalculator;
