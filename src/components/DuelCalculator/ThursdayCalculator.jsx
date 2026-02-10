import React, { useState, useEffect, useMemo } from 'react';
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
    ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const InputCard = ({ icon: Icon, title, name, inputsKey, unit, inputUnit, pts, colorClass, value, onChange, score, t }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                    <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
                </div>
                <span className="font-bold text-gray-700 text-sm">{title}</span>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{pts} pts / {unit}</span>
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
    const { t } = useLanguage();

    const [baseValues, setBaseValues] = useState({
        hero_frag_orange: 20500,
        hero_frag_purple: 7100,
        hero_frag_blue: 2000,
        exclusive_frag: 20500,
        adv_recruit: 2500,
        energy_core: 2000,
        gear_upgrade: 1200000,
        alloy_10: 12,
        skill_manual: 41,
        diamond_1: 30
    });

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

    useEffect(() => {
        const saved = localStorage.getItem('duel_thu_base_values');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_thu');

        if (saved) {
            try {
                setBaseValues(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load base values", e);
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

    const handleBaseValueChange = (name, value) => {
        if (value === '' || /^\d+(\.\d+)?$/.test(value)) {
            setBaseValues(prev => ({ ...prev, [name]: Number(value) || 0 }));
        }
    };

    const saveSettings = () => {
        localStorage.setItem('duel_thu_base_values', JSON.stringify(baseValues));
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
        return {
            frag_orange: (Number(inputs.frag_orange_count) || 0) * baseValues.hero_frag_orange,
            frag_purple: (Number(inputs.frag_purple_count) || 0) * baseValues.hero_frag_purple,
            frag_blue: (Number(inputs.frag_blue_count) || 0) * baseValues.hero_frag_blue,
            excl_frag: (Number(inputs.excl_frag_count) || 0) * baseValues.exclusive_frag,
            recruit: (Number(inputs.recruit_count) || 0) * baseValues.adv_recruit,
            core: (Number(inputs.core_count) || 0) * baseValues.energy_core,
            gear: (Number(inputs.gear_count) || 0) * baseValues.gear_upgrade,
            alloy: (Math.floor((Number(inputs.alloy_count) || 0) / 10)) * baseValues.alloy_10,
            manual: (Number(inputs.manual_count) || 0) * baseValues.skill_manual,
            diamond: (Number(inputs.diamond_count) || 0) * baseValues.diamond_1
        };
    }, [inputs, baseValues]);

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
                            <div className="px-3 py-1 bg-red-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-400/30">{t('thursday')}</div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
                        {Object.keys(baseValues).map(key => (
                            <div key={key} className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t(key)}</label>
                                <input type="text" value={baseValues[key]} onChange={(e) => handleBaseValueChange(key, e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" />
                            </div>
                        ))}
                    </div>
                    <button onClick={saveSettings} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"><Save size={18} /> {t('save_and_apply')}</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputCard icon={Users} title={t('hero_frag_orange')} name="frag_orange" inputsKey="frag_orange_count" unit={t('unit_item')} pts={formatNumber(baseValues.hero_frag_orange)} colorClass="bg-orange-500" value={inputs.frag_orange_count} onChange={handleInputChange} score={formatNumber(results.frag_orange)} t={t} />
                <InputCard icon={Users} title={t('hero_frag_purple')} name="frag_purple" inputsKey="frag_purple_count" unit={t('unit_item')} pts={formatNumber(baseValues.hero_frag_purple)} colorClass="bg-purple-500" value={inputs.frag_purple_count} onChange={handleInputChange} score={formatNumber(results.frag_purple)} t={t} />
                <InputCard icon={Users} title={t('hero_frag_blue')} name="frag_blue" inputsKey="frag_blue_count" unit={t('unit_item')} pts={formatNumber(baseValues.hero_frag_blue)} colorClass="bg-blue-500" value={inputs.frag_blue_count} onChange={handleInputChange} score={formatNumber(results.frag_blue)} t={t} />
                <InputCard icon={Shield} title={t('exclusive_frag')} name="excl_frag" inputsKey="excl_frag_count" unit={t('unit_item')} pts={formatNumber(baseValues.exclusive_frag)} colorClass="bg-red-500" value={inputs.excl_frag_count} onChange={handleInputChange} score={formatNumber(results.excl_frag)} t={t} />
                <InputCard icon={UserPlus} title={t('adv_recruit')} name="recruit" inputsKey="recruit_count" unit={t('unit_recruit')} pts={formatNumber(baseValues.adv_recruit)} colorClass="bg-yellow-500" value={inputs.recruit_count} onChange={handleInputChange} score={formatNumber(results.recruit)} t={t} />
                <InputCard icon={Zap} title={t('energy_core')} name="core" inputsKey="core_count" unit={t('unit_item')} pts={formatNumber(baseValues.energy_core)} colorClass="bg-cyan-500" value={inputs.core_count} onChange={handleInputChange} score={formatNumber(results.core)} t={t} />
                <InputCard icon={Sword} title={t('gear_upgrade')} name="gear" inputsKey="gear_count" unit={t('unit_item')} pts={formatNumber(baseValues.gear_upgrade)} colorClass="bg-orange-600" value={inputs.gear_count} onChange={handleInputChange} score={formatNumber(results.gear)} t={t} />
                <InputCard icon={Layers} title={t('alloy_title')} name="alloy" inputsKey="alloy_count" unit={`10 ${t('unit_alloy')}`} inputUnit={t('unit_alloy')} pts={formatNumber(baseValues.alloy_10)} colorClass="bg-gray-500" value={inputs.alloy_count} onChange={handleInputChange} score={formatNumber(results.alloy)} t={t} />
                <InputCard icon={BookOpen} title={t('skill_manual')} name="manual" inputsKey="manual_count" unit={t('unit_manual')} pts={formatNumber(baseValues.skill_manual)} colorClass="bg-green-500" value={inputs.manual_count} onChange={handleInputChange} score={formatNumber(results.manual)} t={t} />
                <InputCard icon={Gem} title={t('diamond_gift')} name="diamond" inputsKey="diamond_count" unit={t('unit_item')} pts={baseValues.diamond_1} colorClass="bg-cyan-500" value={inputs.diamond_count} onChange={handleInputChange} score={formatNumber(results.diamond)} t={t} />
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
