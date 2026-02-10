import React, { useState, useEffect, useMemo } from 'react';
import {
    Settings,
    Clock,
    Target,
    Truck,
    RotateCcw,
    Save,
    Info,
    Bell,
    Check
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
                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-red-500/20 transition-all font-mono text-base"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                {inputUnit || unit}
            </div>
        </div>
        <div className="mt-2 flex justify-end">
            <span className="text-xs font-bold text-gray-400">
                {t('est_score')}: <span className="text-red-600 font-black">{score}</span>
            </span>
        </div>
    </div>
);

const SaturdayCalculator = () => {
    const { t } = useLanguage();

    const [baseValues, setBaseValues] = useState({
        speedup_1min: 41,
        bounty_orange: 49300,
        trade_orange: 61700
    });

    const [inputs, setInputs] = useState({
        speedup_d: '',
        speedup_h: '',
        speedup_m: '',
        bounty_count: '',
        trade_count: ''
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('duel_sat_base_values');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_sat');

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
        localStorage.setItem('duel_sat_base_values', JSON.stringify(baseValues));
        setShowSettings(false);
    };

    const handleCloseWelcome = () => {
        if (dontShowAgain) {
            localStorage.setItem('duel_welcome_dismissed_sat', 'true');
        }
        setShowWelcome(false);
    };

    const resetAll = () => {
        setInputs({
            speedup_d: '', speedup_h: '', speedup_m: '',
            bounty_count: '', trade_count: ''
        });
    };

    const results = useMemo(() => {
        const totalSpeedupMinutes = (Number(inputs.speedup_d) || 0) * 1440 +
            (Number(inputs.speedup_h) || 0) * 60 +
            (Number(inputs.speedup_m) || 0);

        return {
            speedup: totalSpeedupMinutes * baseValues.speedup_1min,
            bounty: (Number(inputs.bounty_count) || 0) * baseValues.bounty_orange,
            trade: (Number(inputs.trade_count) || 0) * baseValues.trade_orange,
            totalSpeedupMinutes
        };
    }, [inputs, baseValues]);

    const totalScore = useMemo(() => {
        return results.speedup + results.bounty + results.trade;
    }, [results]);

    const formatNumber = (num) => {
        if (!num || isNaN(num) || num === 0) return '0';
        return new Intl.NumberFormat('en-US').format(Math.floor(num));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Modal */}
            {showWelcome && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-red-100">
                        <div className="p-10 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-red-200 animate-bounce cursor-default relative z-10">
                                    <Bell className="text-white" size={40} />
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-red-400 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
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
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-red-600 border-red-600' : 'border-gray-200 group-hover:border-red-400'}`}>
                                            {dontShowAgain && <Check size={12} className="text-white stroke-[4]" />}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">{t('dont_show_again')}</span>
                                </label>
                                <button onClick={handleCloseWelcome} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200">{t('close_guide')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-gray-950 via-red-950 to-rose-950 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-red-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-400/30">Alliance Duel</div>
                            <div className="px-3 py-1 bg-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-rose-400/30">{t('saturday')}</div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{t('sat_title')}</h2>
                        <p className="text-rose-200/60 text-sm font-medium">{t('sat_desc')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 w-full md:w-auto min-w-[280px]">
                        <div className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_est_score')}</div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-100 to-rose-100">{formatNumber(totalScore)}</div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={resetAll} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"><RotateCcw size={14} /> {t('reset_data')}</button>
                            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-white text-red-900' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}><Settings size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-red-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200"><Settings className="text-white" size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
                        {Object.keys(baseValues).map(key => (
                            <div key={key} className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t(key)}</label>
                                <input type="text" value={baseValues[key]} onChange={(e) => handleBaseValueChange(key, e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none transition-all" />
                            </div>
                        ))}
                    </div>
                    <button onClick={saveSettings} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"><Save size={18} /> {t('save_and_apply')}</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Any Speedup */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 border-l-4 border-l-red-500 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-red-500 bg-opacity-10"><Clock size={18} className="text-red-500" /></div>
                            <span className="font-bold text-gray-700 text-sm font-black text-red-700">Accumulate Speedup</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{baseValues.speedup_1min} pts / {t('unit_min')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {['d', 'h', 'm'].map(u => (
                            <div key={u} className="space-y-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t(`unit_${u === 'd' ? 'day' : u === 'h' ? 'hour' : 'min'}`)}</span>
                                <input type="text" name={`speedup_${u}`} value={inputs[`speedup_${u}`]} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-red-500/20 transition-all text-base font-mono" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-400 px-1">{t('current_total')}: <span className="text-red-600">{formatNumber(results.totalSpeedupMinutes)} {t('unit_min')}</span></span>
                        <span className="text-gray-400">{t('est_score')}: <span className="text-red-600 font-black">{formatNumber(results.speedup)}</span></span>
                    </div>
                </div>

                <InputCard icon={Target} title={t('bounty_title')} name="bounty" inputsKey="bounty_count" unit={t('unit_count')} pts={formatNumber(baseValues.bounty_orange)} colorClass="bg-orange-600" value={inputs.bounty_count} onChange={handleInputChange} score={formatNumber(results.bounty)} t={t} />
                <InputCard icon={Truck} title={t('trade_title')} name="trade" inputsKey="trade_count" unit={t('unit_trade')} pts={formatNumber(baseValues.trade_orange)} colorClass="bg-sky-600" value={inputs.trade_count} onChange={handleInputChange} score={formatNumber(results.trade)} t={t} />
            </div>

            <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100 flex gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><Info size={16} className="text-red-600" /></div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-red-900 underline decoration-red-200 decoration-2 underline-offset-2">{t('tips_title')}</p>
                    <p className="text-xs text-red-700 leading-relaxed font-medium">{t('tips_desc')}</p>
                </div>
            </div>
        </div>
    );
};

export default SaturdayCalculator;
