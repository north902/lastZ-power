import React, { useState } from 'react';
import MondayCalculator from './MondayCalculator';
import TuesdayCalculator from './TuesdayCalculator';
import WednesdayCalculator from './WednesdayCalculator';
import ThursdayCalculator from './ThursdayCalculator';
import FridayCalculator from './FridayCalculator';
import SaturdayCalculator from './SaturdayCalculator';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar } from 'lucide-react';

const DuelCalculator = () => {
    const { t } = useLanguage();
    const [selectedDay, setSelectedDay] = useState(() => {
        const now = new Date();
        const utcHour = now.getUTCHours();
        let day = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        // Game resets at 02:00 UTC (10:00 GMT+8)
        // If before 2:00 UTC, it's still the previous game day
        if (utcHour < 2) {
            day = day - 1;
            if (day < 0) day = 6; // Sunday -> Saturday
        }

        // If it's Sunday (0), default to Monday (1) since usually SVS is Mon-Sat
        // or prevent invalid selection if 0 isn't handled
        if (day === 0) return 1;

        return day;
    });

    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const getDayTitle = (day) => {
        switch (day) {
            case 1: return t('mon_title');
            case 2: return t('tue_title');
            case 3: return t('wed_title');
            case 4: return t('thu_title');
            case 5: return t('fri_title');
            case 6: return t('sat_title');
            default: return t('duel_calculator');
        }
    };

    const getDayDesc = (day) => {
        switch (day) {
            case 1: return t('mon_desc');
            case 2: return t('tue_desc');
            case 3: return t('wed_desc');
            case 4: return t('thu_desc');
            case 5: return t('fri_desc');
            case 6: return t('sat_desc');
            default: return t('calc_dev_desc');
        }
    };

    const isDayEnabled = (day) => {
        return [1, 2, 3, 4, 5, 6].includes(day);
    };

    const getDayTitleColor = (day) => {
        switch (day) {
            case 1: return 'text-cyan-600';
            case 2: return 'text-blue-600';
            case 3: return 'text-indigo-600';
            case 4: return 'text-orange-600';
            case 5: return 'text-emerald-600';
            case 6: return 'text-red-600';
            default: return 'text-gray-900';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-black tracking-tight ${getDayTitleColor(selectedDay)}`}>{getDayTitle(selectedDay)}</h2>
                    <p className="text-gray-500 text-sm font-medium">{getDayDesc(selectedDay)}</p>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto max-w-full">
                    {[1, 2, 3, 4, 5, 6].map((day) => {
                        const enabled = isDayEnabled(day);
                        const getDayColor = (d) => {
                            switch (d) {
                                case 1: return 'bg-cyan-600 shadow-cyan-200';
                                case 2: return 'bg-blue-600 shadow-blue-200';
                                case 3: return 'bg-indigo-600 shadow-indigo-200';
                                case 4: return 'bg-orange-600 shadow-orange-200';
                                case 5: return 'bg-emerald-600 shadow-emerald-200';
                                case 6: return 'bg-red-600 shadow-red-200';
                                default: return 'bg-gray-900 shadow-gray-200';
                            }
                        };

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                disabled={!enabled}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${selectedDay === day
                                    ? `${getDayColor(day)} text-white shadow-lg`
                                    : enabled
                                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        : 'text-gray-200 cursor-not-allowed'
                                    }`}
                            >
                                <Calendar size={14} />
                                {t(dayKeys[day - 1])}
                                {!enabled && <span className="text-[8px] opacity-40 ml-1">({t('dev_in_progress')})</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="transition-all duration-300">
                {selectedDay === 1 && <MondayCalculator />}
                {selectedDay === 2 && <TuesdayCalculator />}
                {selectedDay === 3 && <WednesdayCalculator />}
                {selectedDay === 4 && <ThursdayCalculator />}
                {selectedDay === 5 && <FridayCalculator />}
                {selectedDay === 6 && <SaturdayCalculator />}

                {!isDayEnabled(selectedDay) && (
                    <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Calendar className="text-gray-200" size={32} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">{t(dayKeys[selectedDay - 1])} {t('duel_calculator')} {t('dev_in_progress')}</h3>
                        <p className="text-gray-400 text-sm font-medium">{t('calc_dev_desc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DuelCalculator;
