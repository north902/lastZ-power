import React, { useState, useEffect, useMemo } from 'react';
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
    ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const MultiInputCard = ({ icon: Icon, title, items, colorClass, t, subtotal }) => (
    <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all md:col-span-2 lg:col-span-3`}>
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 shadow-sm`}>
                <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
            </div>
            <h3 className="font-black text-gray-900 leading-tight">{title}</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {items.map((item) => (
                <div key={item.key} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{item.label}</span>
                        <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">{item.pts} pts</span>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            name={item.key}
                            value={item.value}
                            onChange={item.onChange}
                            placeholder="0"
                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-mono text-center"
                        />
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-end">
            <span className="text-xs font-bold text-gray-400">
                {t('est_score')}: <span className={`${colorClass.replace('bg-', 'text-')} font-black`}>{subtotal}</span>
            </span>
        </div>
    </div>
);

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

const MondayCalculator = () => {
    const { t } = useLanguage();

    const [baseValues, setBaseValues] = useState({
        drawing_1: 102,
        wrench_1: 25500,
        radar_1: 20500,
        module_L1: 2000,
        module_L2: 6100,
        module_L3: 18500,
        module_L4: 55500,
        module_L5: 166600,
        module_L6: 499800,
        module_L7: 1400000,
        plugin_green: 12300,
        plugin_blue: 51400,
        plugin_purple: 205600,
        plugin_orange: 1000000,
        sl_10: 2500,
        sl_20: 3000,
        sl_30: 3500,
        sl_40: 4000,
        sl_50: 5100,
        sl_60: 6100,
        pz_10: 5100,
        pz_20: 6100,
        pz_30: 7100,
        pz_40: 8100,
        pz_50: 10200,
        pz_60: 12200,
        gather_coin_1k: 15,
        gather_res_1k: 5,
        diamond_1: 30
    });

    const [inputs, setInputs] = useState({
        drawing_count: '',
        wrench_count: '',
        radar_count: '',
        module_L1: '', module_L2: '', module_L3: '', module_L4: '', module_L5: '', module_L6: '', module_L7: '',
        plugin_green: '', plugin_blue: '', plugin_purple: '', plugin_orange: '',
        sl_count: '',
        sl_level: '10',
        pz_count: '',
        pz_level: '10',
        gather_coin: '',
        gather_res: '',
        diamond_count: ''
    });

    const [showSettings, setShowSettings] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('duel_mon_base_values');
        const welcomeDismissed = localStorage.getItem('duel_welcome_dismissed_mon');

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
        localStorage.setItem('duel_mon_base_values', JSON.stringify(baseValues));
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
            sl_level: '10',
            pz_count: '',
            pz_level: '10',
            gather_coin: '',
            gather_res: '',
            diamond_count: ''
        });
    };

    const results = useMemo(() => {
        let moduleTotal = 0;
        for (let i = 1; i <= 7; i++) {
            moduleTotal += (Number(inputs[`module_L${i}`]) || 0) * (baseValues[`module_L${i}`] || 0);
        }

        let pluginTotal = 0;
        ['green', 'blue', 'purple', 'orange'].forEach(color => {
            pluginTotal += (Number(inputs[`plugin_${color}`]) || 0) * (baseValues[`plugin_${color}`] || 0);
        });

        return {
            drawing: (Number(inputs.drawing_count) || 0) * baseValues.drawing_1,
            wrench: (Number(inputs.wrench_count) || 0) * baseValues.wrench_1,
            radar: (Number(inputs.radar_count) || 0) * baseValues.radar_1,
            module: moduleTotal,
            plugin: pluginTotal,
            sl: (Number(inputs.sl_count) || 0) * (baseValues[`sl_${inputs.sl_level}`] || 0),
            pz: (Number(inputs.pz_count) || 0) * (baseValues[`pz_${inputs.pz_level}`] || 0),
            gather_coin: Math.floor((Number(inputs.gather_coin) || 0) / 1000) * baseValues.gather_coin_1k,
            gather_res: Math.floor((Number(inputs.gather_res) || 0) / 1000) * baseValues.gather_res_1k,
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
            {/* Welcome Modal */}
            {showWelcome && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-10 text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-slate-200 animate-bounce cursor-default relative z-10">
                                    <Bell className="text-white" size={40} />
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-slate-400 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
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
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${dontShowAgain ? 'bg-slate-800 border-slate-800' : 'border-gray-200 group-hover:border-slate-400'}`}>
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-400/30">Alliance Duel</div>
                            <div className="px-3 py-1 bg-slate-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-slate-400/30">{t('monday')}</div>
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
                <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200"><Settings className="text-white" size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">{t('score_base_settings')}</h3>
                            <p className="text-xs text-gray-500">{t('base_points_desc')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6">
                        {Object.keys(baseValues).map(key => (
                            <div key={key} className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t(key)}</label>
                                <input type="text" value={baseValues[key]} onChange={(e) => handleBaseValueChange(key, e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-slate-500/20 outline-none transition-all" />
                            </div>
                        ))}
                    </div>
                    <button onClick={saveSettings} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"><Save size={18} /> {t('save_and_apply')}</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InputCard icon={Scroll} title={t('drawing_title')} name="drawing" inputsKey="drawing_count" unit={t('unit_drawing')} pts={formatNumber(baseValues.drawing_1)} colorClass="bg-amber-600" value={inputs.drawing_count} onChange={handleInputChange} score={formatNumber(results.drawing)} t={t} />
                <InputCard icon={Wrench} title={t('wrench_title')} name="wrench" inputsKey="wrench_count" unit={t('unit_wrench')} pts={formatNumber(baseValues.wrench_1)} colorClass="bg-amber-500" value={inputs.wrench_count} onChange={handleInputChange} score={formatNumber(results.wrench)} t={t} />
                <InputCard icon={Radio} title={t('radar_title')} name="radar" inputsKey="radar_count" unit={t('unit_radar')} pts={formatNumber(baseValues.radar_1)} colorClass="bg-blue-600" value={inputs.radar_count} onChange={handleInputChange} score={formatNumber(results.radar)} t={t} />

                {/* Batch Module Entry */}
                <MultiInputCard
                    icon={Box}
                    title={t('module_case')}
                    colorClass="bg-cyan-600"
                    t={t}
                    subtotal={formatNumber(results.module)}
                    items={[1, 2, 3, 4, 5, 6, 7].map(lv => ({
                        key: `module_L${lv}`,
                        label: `${t('level_label')} ${lv}`,
                        pts: formatNumber(baseValues[`module_L${lv}`]),
                        value: inputs[`module_L${lv}`],
                        onChange: handleInputChange
                    }))}
                />

                {/* Batch Plugin Entry */}
                <MultiInputCard
                    icon={Cpu}
                    title={t('tactical_plugin')}
                    colorClass="bg-indigo-600"
                    t={t}
                    subtotal={formatNumber(results.plugin)}
                    items={['green', 'blue', 'purple', 'orange'].map(c => ({
                        key: `plugin_${c}`,
                        label: t(`color_${c}`),
                        pts: formatNumber(baseValues[`plugin_${c}`]),
                        value: inputs[`plugin_${c}`],
                        onChange: handleInputChange
                    }))}
                />

                {/* Snow Leopard (SL) Dropdown - Keep dropdown as people only farm one level usually */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-800 bg-opacity-10"><Target size={18} className="text-slate-800" /></div>
                            <span className="font-bold text-gray-700 text-sm">{t('snow_leopard')}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{formatNumber(baseValues[`sl_${inputs.sl_level}`])} pts / {t('unit_target')}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="relative">
                            <select value={inputs.sl_level} onChange={(e) => setInputs(prev => ({ ...prev, sl_level: e.target.value }))} className="w-full appearance-none bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-slate-500/20 transition-all text-xs cursor-pointer">
                                {['10', '20', '30', '40', '50', '60'].map(lv => (
                                    <option key={lv} value={lv}>{t('level_label')} {Number(lv) - 9}-{lv}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                        <input type="text" name="sl_count" value={inputs.sl_count} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-slate-500/20 transition-all text-base font-mono" />
                    </div>
                    <div className="mt-4 flex justify-end text-xs font-bold text-gray-400">{t('est_score')}: <span className="text-slate-800 font-black">{formatNumber(results.sl)}</span></div>
                </div>

                {/* Polar Zombie (PZ) Dropdown */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-800 bg-opacity-10"><Skull size={18} className="text-blue-800" /></div>
                            <span className="font-bold text-gray-700 text-sm">{t('polar_zombie')}</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider">{formatNumber(baseValues[`pz_${inputs.pz_level}`])} pts / {t('unit_target')}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="relative">
                            <select value={inputs.pz_level} onChange={(e) => setInputs(prev => ({ ...prev, pz_level: e.target.value }))} className="w-full appearance-none bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-xs cursor-pointer">
                                {['10', '20', '30', '40', '50', '60'].map(lv => (
                                    <option key={lv} value={lv}>{t('level_label')} {Number(lv) - 9}-{lv}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                        <input type="text" name="pz_count" value={inputs.pz_count} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-base font-mono" />
                    </div>
                    <div className="mt-4 flex justify-end text-xs font-bold text-gray-400">{t('est_score')}: <span className="text-blue-800 font-black">{formatNumber(results.pz)}</span></div>
                </div>

                {/* Resource Gathering */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 md:col-span-2 lg:col-span-1 border-t-4 border-t-green-500">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-green-500 bg-opacity-10"><Coins size={18} className="text-green-500" /></div>
                        <span className="font-bold text-gray-700 text-sm">{t('gathering_title')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-green-700 uppercase ml-1 flex justify-between">{t('gathering_coin')} <span className="text-gray-400">{baseValues.gather_coin_1k} pts/1k</span></span>
                            <input type="text" name="gather_coin" value={inputs.gather_coin} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold focus:ring-2 focus:ring-green-500/20 transition-all text-sm font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-green-700 uppercase ml-1 flex justify-between">{t('gathering_res')} <span className="text-gray-400">{baseValues.gather_res_1k} pts/1k</span></span>
                            <input type="text" name="gather_res" value={inputs.gather_res} onChange={handleInputChange} placeholder="0" className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 text-gray-900 font-bold focus:ring-2 focus:ring-green-500/20 transition-all text-sm font-mono" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-400">{t('est_score')}: <span className="text-green-600 font-black">{formatNumber(results.gather_coin + results.gather_res)}</span></span>
                    </div>
                </div>

                <InputCard icon={Gem} title={t('diamond_gift')} name="diamond" inputsKey="diamond_count" unit={t('unit_item')} pts={baseValues.diamond_1} colorClass="bg-cyan-500" value={inputs.diamond_count} onChange={handleInputChange} score={formatNumber(results.diamond)} t={t} />
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

