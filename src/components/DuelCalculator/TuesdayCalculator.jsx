import React, { useState, useEffect, useMemo } from 'react';
import {
    Calculator,
    Settings,
    Building2,
    Clock,
    Trophy,
    Hammer,
    Cpu,
    Users,
    Gem,
    Plus,
    Minus,
    RotateCcw,
    Save,
    Info
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const TuesdayCalculator = () => {
    const { t } = useLanguage();
    // Default values based on user's tech
    const [baseValues, setBaseValues] = useState({
        speedup_1min: 164,
        power_10: 5,
        bounty_orange: 246800,
        refine_stone: 16400,
        pulse_module: 411300,
        survivor_orange: 164500,
        survivor_purple: 41100,
        survivor_blue: 8200,
        diamond_1: 30
    });

    const [inputs, setInputs] = useState({
        speedup_d: '',
        speedup_h: '',
        speedup_m: '',
        power_start: '',
        power_end: '',
        bounty_count: '',
        refine_count: '',
        pulse_count: '',
        sur_orange_count: '',
        sur_purple_count: '',
        sur_blue_count: '',
        diamond_count: ''
    });

    const [showSettings, setShowSettings] = useState(false);

    // Load saved base values from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('duel_tue_base_values');
        if (saved) {
            try {
                setBaseValues(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load base values", e);
            }
        }
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Allow only numbers
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
        localStorage.setItem('duel_tue_base_values', JSON.stringify(baseValues));
        setShowSettings(false);
    };

    const resetAll = () => {
        setInputs({
            speedup_d: '',
            speedup_h: '',
            speedup_m: '',
            power_start: '',
            power_end: '',
            bounty_count: '',
            refine_count: '',
            pulse_count: '',
            sur_orange_count: '',
            sur_purple_count: '',
            sur_blue_count: '',
            diamond_count: ''
        });
    };

    const results = useMemo(() => {
        const totalMinutes = (Number(inputs.speedup_d) || 0) * 1440 +
            (Number(inputs.speedup_h) || 0) * 60 +
            (Number(inputs.speedup_m) || 0);

        const speedup = totalMinutes * baseValues.speedup_1min;

        const powerDelta = Math.max(0, (Number(inputs.power_end) || 0) - (Number(inputs.power_start) || 0));
        const power = (powerDelta / 10) * baseValues.power_10;

        const bounty = (Number(inputs.bounty_count) || 0) * baseValues.bounty_orange;
        const refine = (Number(inputs.refine_count) || 0) * baseValues.refine_stone;
        const pulse = (Number(inputs.pulse_count) || 0) * baseValues.pulse_module;
        const surOrange = (Number(inputs.sur_orange_count) || 0) * baseValues.survivor_orange;
        const surPurple = (Number(inputs.sur_purple_count) || 0) * baseValues.survivor_purple;
        const surBlue = (Number(inputs.sur_blue_count) || 0) * baseValues.survivor_blue;
        const diamond = (Number(inputs.diamond_count) || 0) * baseValues.diamond_1;

        const total = speedup + power + bounty + refine + pulse + surOrange + surPurple + surBlue + diamond;

        return {
            speedup,
            power,
            bounty,
            refine,
            pulse,
            surOrange,
            surPurple,
            surBlue,
            diamond,
            total,
            totalMinutes
        };
    }, [inputs, baseValues]);

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(Math.floor(num));
    };

    const InputCard = ({ icon: Icon, title, name, value, placeholder, unit, pts, colorClass }) => (
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
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    placeholder={placeholder || t('search_placeholder').replace('...', '')}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {unit}
                </div>
            </div>
            <div className="mt-2 flex justify-end">
                <span className="text-xs font-bold text-gray-400">
                    {t('est_score')}: <span className="text-blue-600 font-black">{formatNumber(results[name.split('_')[0]])}</span>
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 頂部總結卡片 */}
            <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-400/30">
                                Alliance Duel
                            </div>
                            <div className="px-3 py-1 bg-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-400/30">
                                {t('tuesday')}
                            </div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">{t('tue_title')}</h2>
                        <p className="text-blue-200/60 text-sm font-medium">{t('tue_desc')}</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 w-full md:w-auto min-w-[280px]">
                        <div className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_est_score')}</div>
                        <div className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-indigo-100">
                            {formatNumber(results.total)}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={resetAll}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5"
                            >
                                <RotateCcw size={14} /> {t('reset_data')}
                            </button>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-white text-blue-900' : 'bg-white/5 hover:bg-white/10 border-white/5'}`}
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-blue-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Settings className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {Object.keys(baseValues).map(key => (
                            <div key={key} className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    {t(key)}
                                </label>
                                <input
                                    type="text"
                                    value={baseValues[key]}
                                    onChange={(e) => handleBaseValueChange(key, e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={saveSettings}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
                    >
                        <Save size={18} /> {t('save_and_apply')}
                    </button>
                </div>
            )}

            {/* 主要輸入區域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 建築加速計算器 (特殊型) */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 border-l-4 border-l-blue-500 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-500 bg-opacity-10">
                                <Clock size={18} className="text-blue-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">{t('speedup_title')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{baseValues.speedup_1min} pts / {t('unit_min')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('unit_day')}</span>
                            <input
                                type="text"
                                name="speedup_d"
                                value={inputs.speedup_d}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('unit_hour')}</span>
                            <input
                                type="text"
                                name="speedup_h"
                                value={inputs.speedup_h}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('unit_min')}</span>
                            <input
                                type="text"
                                name="speedup_m"
                                value={inputs.speedup_m}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-400 px-1">
                            {t('current_total')}: <span className="text-blue-600">{formatNumber(results.totalMinutes)} {t('unit_min')}</span>
                        </span>
                        <span className="text-gray-400">
                            {t('est_score')}: <span className="text-blue-600 font-black">{formatNumber(results.speedup)}</span>
                        </span>
                    </div>
                </div>

                {/* 建築戰力計算器 (特殊型) */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 border-l-4 border-l-orange-500 hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500 bg-opacity-10">
                                <Building2 size={18} className="text-orange-500" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">{t('power_increase')}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{baseValues.power_10} pts / 10 Power</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_start')}</span>
                            <input
                                type="text"
                                name="power_start"
                                value={inputs.power_start}
                                onChange={handleInputChange}
                                placeholder="1000"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase ml-1">{t('power_end')}</span>
                            <input
                                type="text"
                                name="power_end"
                                value={inputs.power_end}
                                onChange={handleInputChange}
                                placeholder="2000"
                                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-400 px-1">
                            {t('power_diff')}: <span className="text-orange-600">{formatNumber(Math.max(0, (Number(inputs.power_end) || 0) - (Number(inputs.power_start) || 0)))}</span>
                        </span>
                        <span className="text-gray-400">
                            {t('est_score')}: <span className="text-orange-600 font-black">{formatNumber(results.power)}</span>
                        </span>
                    </div>
                </div>

                <InputCard
                    icon={Trophy}
                    title={t('bounty_title')}
                    name="bounty_count"
                    value={inputs.bounty_count}
                    unit={t('unit_count')}
                    pts={formatNumber(baseValues.bounty_orange)}
                    colorClass="bg-yellow-500"
                />

                <InputCard
                    icon={Hammer}
                    title={t('refine_title')}
                    name="refine_count"
                    value={inputs.refine_count}
                    unit={t('unit_item')}
                    pts={formatNumber(baseValues.refine_stone)}
                    colorClass="bg-red-500"
                />

                <InputCard
                    icon={Cpu}
                    title={t('pulse_title')}
                    name="pulse_count"
                    value={inputs.pulse_count}
                    unit={t('unit_item')}
                    pts={formatNumber(baseValues.pulse_module)}
                    colorClass="bg-purple-500"
                />

                <InputCard
                    icon={Users}
                    title={t('sur_orange')}
                    name="sur_orange_count"
                    value={inputs.sur_orange_count}
                    unit={t('unit_person')}
                    pts={formatNumber(baseValues.survivor_orange)}
                    colorClass="bg-orange-600"
                />

                <InputCard
                    icon={Users}
                    title={t('sur_purple')}
                    name="sur_purple_count"
                    value={inputs.sur_purple_count}
                    unit={t('unit_person')}
                    pts={formatNumber(baseValues.survivor_purple)}
                    colorClass="bg-purple-400"
                />

                <InputCard
                    icon={Users}
                    title={t('sur_blue')}
                    name="sur_blue_count"
                    value={inputs.sur_blue_count}
                    unit={t('unit_person')}
                    pts={formatNumber(baseValues.survivor_blue)}
                    colorClass="bg-blue-400"
                />

                <InputCard
                    icon={Gem}
                    title={t('diamond_gift')}
                    name="diamond_count"
                    value={inputs.diamond_count}
                    unit={t('unit_item')}
                    pts={baseValues.diamond_1}
                    colorClass="bg-cyan-500"
                />
            </div>

            {/* 底部說明 */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Info size={16} className="text-blue-600" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-900 underline decoration-blue-200 decoration-2 underline-offset-2">{t('tips_title')}</p>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        {t('tips_desc')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TuesdayCalculator;
