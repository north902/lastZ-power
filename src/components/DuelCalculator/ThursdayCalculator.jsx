import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Settings,
    Users,
    Shield,
    UserPlus,
    Zap,
    Sword,
    Layers,
    BookOpen,
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
    X
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

const ThursdayCalculator = () => {
    const { t, lang } = useLanguage();

    // 基本分（遊戲固定值）
    const BASE_SCORES = {
        hero_frag_orange: 5000,
        hero_frag_purple: 1700,
        hero_frag_blue: 500,
        exclusive_frag: 5000,
        adv_recruit: 500,
        energy_core: 400,
        gear_upgrade: 300000,
        alloy_10: 3,
        skill_manual: 10,
        diamond_1: 30 // 固定分，不受加成影響
    };

    // 加成設定（存字串以保留輸入中間狀態如 "313."）
    const [bonusSettings, setBonusSettings] = useState({
        global: '313',        // 全局加成 +313%
        recruit: '100',       // 招募類額外加成 +100%
        energy_core: '100'    // 能源核心額外加成 +100%
    });

    // 手動覆蓋的最終得分（如果使用者想自己改）
    const [manualOverrides, setManualOverrides] = useState({});

    const [inputs, setInputs] = useState({
        frag_orange_count: '',
        frag_purple_count: '',
        frag_blue_count: '',
        excl_frag_count: '',
        recruit_count: '',
        core_count: '',
        gear_count: '',
        alloy_count: '',
        manual_count: '',
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
        const savedBonus = localStorage.getItem('duel_thu_bonus_settings');
        const savedOverrides = localStorage.getItem('duel_thu_manual_overrides');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_thu');

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
        // 允許空值、整數、小數點、完整小數（如：313、313.、313.5）
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setBonusSettings(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleManualOverrideChange = (key, value) => {
        // 允許空值、整數、小數點、完整小數
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setManualOverrides(prev => ({ ...prev, [key]: Number(value) || 0 }));
        }
    };

    const toggleManualOverride = (key) => {
        setManualOverrides(prev => {
            const newOverrides = { ...prev };
            if (newOverrides[key] !== undefined) {
                delete newOverrides[key];
            } else {
                newOverrides[key] = getFinalScore(key);
            }
            return newOverrides;
        });
    };

    // 計算最終得分（基本分 × 加成）
    const getFinalScore = (itemKey) => {
        const baseScore = BASE_SCORES[itemKey];

        // 鑽石禮包固定分，不受加成影響
        if (itemKey === 'diamond_1') {
            return baseScore;
        }

        let totalBonus = toNum(bonusSettings.global); // 從全局加成開始

        // 疊加特定項目加成
        if (itemKey === 'adv_recruit') {
            totalBonus += toNum(bonusSettings.recruit);
        }
        if (itemKey === 'energy_core') {
            totalBonus += toNum(bonusSettings.energy_core);
        }

        return Math.floor(baseScore * (1 + totalBonus / 100));
    };

    const saveSettings = () => {
        localStorage.setItem('duel_thu_bonus_settings', JSON.stringify(bonusSettings));
        localStorage.setItem('duel_thu_manual_overrides', JSON.stringify(manualOverrides));
        setShowSettings(false);
    };

    const handleCloseWelcome = () => {
        if (dontShowAgain) {
            localStorage.setItem('duel_welcome_dismissed_thu', 'true');
        }
        setShowWelcome(false);
    };

    const resetAll = () => {
        setInputs({
            frag_orange_count: '',
            frag_purple_count: '',
            frag_blue_count: '',
            excl_frag_count: '',
            recruit_count: '',
            core_count: '',
            gear_count: '',
            alloy_count: '',
            manual_count: '',
            diamond_count: ''
        });
    };

    const results = useMemo(() => {
        const getScore = (itemKey) => {
            return manualOverrides[itemKey] !== undefined ? manualOverrides[itemKey] : getFinalScore(itemKey);
        };

        return {
            frag_orange: (Number(inputs.frag_orange_count) || 0) * getScore('hero_frag_orange'),
            frag_purple: (Number(inputs.frag_purple_count) || 0) * getScore('hero_frag_purple'),
            frag_blue: (Number(inputs.frag_blue_count) || 0) * getScore('hero_frag_blue'),
            excl_frag: (Number(inputs.excl_frag_count) || 0) * getScore('exclusive_frag'),
            recruit: (Number(inputs.recruit_count) || 0) * getScore('adv_recruit'),
            core: (Number(inputs.core_count) || 0) * getScore('energy_core'),
            gear: (Number(inputs.gear_count) || 0) * getScore('gear_upgrade'),
            alloy: (Math.floor((Number(inputs.alloy_count) || 0) / 10)) * getScore('alloy_10'),
            manual: (Number(inputs.manual_count) || 0) * getScore('skill_manual'),
            diamond: (Number(inputs.diamond_count) || 0) * getScore('diamond_1')
        };
    }, [inputs, bonusSettings, manualOverrides]);

    const totalScore = useMemo(() => {
        return Object.values(results).reduce((acc, curr) => acc + curr, 0);
    }, [results]);

    const formatNumber = (num) => {
        if (!num || isNaN(num) || num === 0) return '0';
        return new Intl.NumberFormat('en-US').format(Math.floor(num));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Notification Modal */}
            {showWelcome && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-blue-100">
                        <div className="p-10 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-orange-200 animate-bounce cursor-default relative z-10">
                                    <Bell className="text-white" size={40} />
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-orange-400 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
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
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-orange-600 border-orange-600' : 'border-gray-200 group-hover:border-orange-400'}`}>
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
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-gray-900 via-orange-950 to-red-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-400/30">Alliance Duel</div>
                            <div className="px-3 py-1 bg-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-400/30">{t('thursday')}</div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{t('thu_title')}</h2>
                        <p className="text-orange-200/60 text-sm font-medium">{t('thu_desc')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 w-full md:w-auto min-w-[280px]">
                        <div className="text-orange-200 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_est_score')}</div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-100 to-red-100">{formatNumber(totalScore)}</div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={resetAll} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"><RotateCcw size={14} /> {t('reset_data')}</button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-white text-orange-900' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}><Settings size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-orange-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200"><Settings className="text-white" size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>

                    {/* 加成設定區 */}
                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Percent className="text-orange-600" size={18} />
                                <h4 className="font-black text-orange-900">{t('tech_bonus_settings')}</h4>
                            </div>
                            <button
                                onClick={() => setShowBonusGuide(!showBonusGuide)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white text-[10px] font-black text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 transition-all"
                            >
                                <Info size={12} />
                                {t('tech_bonus_guide_title')}
                            </button>
                        </div>

                        {showBonusGuide && createPortal(
                            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                                {/* Backdrop overlay to close when clicking outside */}
                                <div className="absolute inset-0" onClick={() => setShowBonusGuide(false)}></div>

                                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-orange-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-orange-50/30 flex-shrink-0 rounded-t-3xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-600 rounded-lg text-white shadow-sm">
                                                <Info size={16} />
                                            </div>
                                            <h3 className="font-black text-gray-900 text-sm">{t('tech_bonus_guide_title')}</h3>
                                        </div>
                                        <button
                                            onClick={() => setShowBonusGuide(false)}
                                            className="p-1.5 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                                            <p className="text-xs text-orange-900 font-medium leading-relaxed flex items-start gap-2">
                                                <ChevronRight size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                                <span>{t('tech_bonus_guide_desc')}</span>
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">遊戲畫面參考 / Screenshot</p>
                                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-white shadow-sm">
                                                <img
                                                    src={`./guide/tech_${lang}.webp`}
                                                    alt="Tech Bonus Guide"
                                                    className="w-full h-auto object-contain"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0 rounded-b-3xl">
                                        <button
                                            onClick={() => setShowBonusGuide(false)}
                                            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg"
                                        >
                                            {t('close_guide')}
                                        </button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest px-1">{t('global_bonus')}</label>
                                <input
                                    type="text"
                                    value={bonusSettings.global}
                                    onChange={(e) => handleBonusChange('global', e.target.value)}
                                    className="w-full bg-white border border-orange-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest px-1">{t('recruit_bonus')}</label>
                                <input
                                    type="text"
                                    value={bonusSettings.recruit}
                                    onChange={(e) => handleBonusChange('recruit', e.target.value)}
                                    className="w-full bg-white border border-orange-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest px-1">{t('energy_core_bonus')}</label>
                                <input
                                    type="text"
                                    value={bonusSettings.energy_core}
                                    onChange={(e) => handleBonusChange('energy_core', e.target.value)}
                                    className="w-full bg-white border border-orange-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 手動覆蓋區 */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="text-gray-600" size={18} />
                            <h4 className="font-black text-gray-900">{t('advanced_manual_override')}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            {Object.keys(BASE_SCORES).map(key => {
                                const isOverridden = manualOverrides[key] !== undefined;
                                const finalScore = isOverridden ? manualOverrides[key] : getFinalScore(key);
                                return (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t(key)}</label>
                                            <button
                                                onClick={() => toggleManualOverride(key)}
                                                className={`p-1 rounded-md transition-all ${isOverridden ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                title={isOverridden ? '解除手動覆蓋' : '手動覆蓋'}
                                            >
                                                {isOverridden ? <Unlock size={12} /> : <Lock size={12} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs text-gray-500 whitespace-nowrap">{BASE_SCORES[key]} →</div>
                                            <input
                                                type="text"
                                                value={isOverridden ? manualOverrides[key] : finalScore}
                                                onChange={(e) => handleManualOverrideChange(key, e.target.value)}
                                                disabled={!isOverridden}
                                                className={`flex-1 border rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${isOverridden ? 'bg-white border-orange-200' : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'}`}
                                            />
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
                <InputCard icon={Users} title={t('hero_frag_orange')} name="frag_orange" inputsKey="frag_orange_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.hero_frag_orange !== undefined ? manualOverrides.hero_frag_orange : getFinalScore('hero_frag_orange'))} colorClass="bg-orange-500" value={inputs.frag_orange_count} onChange={handleInputChange} score={formatNumber(results.frag_orange)} t={t} />
                <InputCard icon={Users} title={t('hero_frag_purple')} name="frag_purple" inputsKey="frag_purple_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.hero_frag_purple !== undefined ? manualOverrides.hero_frag_purple : getFinalScore('hero_frag_purple'))} colorClass="bg-purple-500" value={inputs.frag_purple_count} onChange={handleInputChange} score={formatNumber(results.frag_purple)} t={t} />
                <InputCard icon={Users} title={t('hero_frag_blue')} name="frag_blue" inputsKey="frag_blue_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.hero_frag_blue !== undefined ? manualOverrides.hero_frag_blue : getFinalScore('hero_frag_blue'))} colorClass="bg-blue-500" value={inputs.frag_blue_count} onChange={handleInputChange} score={formatNumber(results.frag_blue)} t={t} />
                <InputCard icon={Shield} title={t('exclusive_frag')} name="excl_frag" inputsKey="excl_frag_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.exclusive_frag !== undefined ? manualOverrides.exclusive_frag : getFinalScore('exclusive_frag'))} colorClass="bg-red-500" value={inputs.excl_frag_count} onChange={handleInputChange} score={formatNumber(results.excl_frag)} t={t} />
                <InputCard icon={UserPlus} title={t('adv_recruit')} name="recruit" inputsKey="recruit_count" unit={t('unit_recruit')} finalScore={formatNumber(manualOverrides.adv_recruit !== undefined ? manualOverrides.adv_recruit : getFinalScore('adv_recruit'))} colorClass="bg-yellow-500" value={inputs.recruit_count} onChange={handleInputChange} score={formatNumber(results.recruit)} t={t} />
                <InputCard icon={Zap} title={t('energy_core')} name="core" inputsKey="core_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.energy_core !== undefined ? manualOverrides.energy_core : getFinalScore('energy_core'))} colorClass="bg-cyan-500" value={inputs.core_count} onChange={handleInputChange} score={formatNumber(results.core)} t={t} />
                <InputCard icon={Sword} title={t('gear_upgrade')} name="gear" inputsKey="gear_count" unit={t('unit_item')} finalScore={formatNumber(manualOverrides.gear_upgrade !== undefined ? manualOverrides.gear_upgrade : getFinalScore('gear_upgrade'))} colorClass="bg-orange-600" value={inputs.gear_count} onChange={handleInputChange} score={formatNumber(results.gear)} t={t} />
                <InputCard icon={Layers} title={t('alloy_title')} name="alloy" inputsKey="alloy_count" unit={`10 ${t('unit_alloy')}`} inputUnit={t('unit_alloy')} finalScore={formatNumber(manualOverrides.alloy_10 !== undefined ? manualOverrides.alloy_10 : getFinalScore('alloy_10'))} colorClass="bg-gray-500" value={inputs.alloy_count} onChange={handleInputChange} score={formatNumber(results.alloy)} t={t} />
                <InputCard icon={BookOpen} title={t('skill_manual')} name="manual" inputsKey="manual_count" unit={t('unit_manual')} finalScore={formatNumber(manualOverrides.skill_manual !== undefined ? manualOverrides.skill_manual : getFinalScore('skill_manual'))} colorClass="bg-green-500" value={inputs.manual_count} onChange={handleInputChange} score={formatNumber(results.manual)} t={t} />
                <InputCard icon={Gem} title={t('diamond_gift')} name="diamond" inputsKey="diamond_count" unit={t('unit_item')} finalScore={BASE_SCORES.diamond_1} colorClass="bg-cyan-500" value={inputs.diamond_count} onChange={handleInputChange} score={formatNumber(results.diamond)} t={t} />
            </div>

            <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100 flex gap-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0"><Info size={16} className="text-orange-600" /></div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-900 underline decoration-orange-200 decoration-2 underline-offset-2">{t('tips_title')}</p>
                    <p className="text-xs text-orange-700 leading-relaxed font-medium">{t('tips_desc')}</p>
                </div>
            </div>
        </div>
    );
};

export default ThursdayCalculator;
