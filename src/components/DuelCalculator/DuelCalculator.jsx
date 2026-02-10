import React, { useState } from 'react';
import TuesdayCalculator from './TuesdayCalculator';
import WednesdayCalculator from './WednesdayCalculator';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar } from 'lucide-react';

const DuelCalculator = () => {
    const { t } = useLanguage();
    const [selectedDay, setSelectedDay] = useState(2); // Default to Tuesday (2)

    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const getDayTitle = (day) => {
        switch (day) {
            case 2: return t('tue_title');
            case 3: return t('wed_title');
            default: return t('duel_calculator');
        }
    };

    const getDayDesc = (day) => {
        switch (day) {
            case 2: return t('tue_desc');
            case 3: return t('wed_desc');
            default: return t('calc_dev_desc');
        }
    };

    const isDayEnabled = (day) => {
        return day === 2 || day === 3;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{getDayTitle(selectedDay)}</h2>
                    <p className="text-gray-500 text-sm font-medium">{getDayDesc(selectedDay)}</p>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto max-w-full">
                    {[1, 2, 3, 4, 5, 6].map((day) => {
                        const enabled = isDayEnabled(day);
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                disabled={!enabled}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${selectedDay === day
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
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
                {selectedDay === 2 && <TuesdayCalculator />}
                {selectedDay === 3 && <WednesdayCalculator />}

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
