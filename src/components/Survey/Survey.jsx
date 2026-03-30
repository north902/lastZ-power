import React, { useState, useEffect } from 'react';
import { getSurveyConfig, submitSurveyResponse } from '../../services/surveyService';
import { CheckCircle2, Lock, Globe, ChevronRight, Loader2, ClipboardList } from 'lucide-react';

// ── Translations (survey-only, zh / en / es) ─────────────────────────────────
const i18n = {
  zh: {
    survey_title: '聯盟問卷',
    survey_version: 'v.2026/3/30',
    survey_note: '本問卷用於整理聯盟未來方向（包含合併、移民與玩法）。\n沒有對錯，也不影響個人位置，請依照自己的想法填寫。',
    anon_tip: '可匿名填寫',
    name_tip: '若願意留下名稱，會有助於後續規劃（非必填）',
    code_label: '請輸入邀請碼',
    code_placeholder: '輸入邀請碼',
    code_btn: '進入問卷',
    code_wrong: '邀請碼錯誤，請再試一次',
    code_hint: '邀請碼請向聯盟長索取',
    already_submitted: '您已完成作答，感謝您的參與！',
    submit_btn: '提交問卷',
    submitting: '提交中...',
    submit_success: '感謝填寫！',
    submit_success_msg: '您的回答已成功儲存，感謝您的參與！',
    submit_again: '重新填寫',
    required: '（必選）',
    optional: '（選填）',
    open_placeholder: '請輸入您的想法...',
    name_placeholder: '遊戲ID / 暱稱（留空代表匿名）',
    closed: '問卷目前已關閉',
    // Questions
    q_section_basic: '基本資料',
    q_spending_title: '你的課金狀況？',
    q_spending_A: '無課',
    q_spending_B: '偶爾課（有需要才課）',
    q_spending_C: '穩定課（會持續投入）',
    q_activity_title: '你的活躍程度？',
    q_activity_A: '高（幾乎每天、會配合）',
    q_activity_B: '中',
    q_activity_C: '低',
    q_name_title: '你的名稱（選填）',
    q_section_1: '玩法偏好',
    q1_title: '你目前比較想要的玩法是？',
    q1_A: '偏競技（SVS / 打架 / 強度）',
    q1_B: '偏穩定（發展 / 經營 / 有秩序）',
    q1_C: '偏自由（隨興玩 / 想打就打）',
    q_section_2: '移民意願',
    q2_title: '如果合併後聯盟決定移民，你的選擇？',
    q2_A: '願意跟',
    q2_B: '視情況',
    q2_C: '不想移',
    q_section_3: '聯盟內角色 / 位置',
    q3_title: '你對「在聯盟中有沒有角色或影響力」的重視程度？',
    q3_A: '很重要（希望有發言權 / 參與決策）',
    q3_B: '普通',
    q3_C: '不重要（跟著玩就好）',
    q_section_4: '紀律接受度',
    q4_title: '你能接受多嚴格的配合程度？',
    q4_A: '高（配合指揮、戰術安排）',
    q4_B: '中（基本配合）',
    q4_C: '低（偏自由）',
    q_section_5: '聯盟分團接受度',
    q5_desc: '如果之後聯盟分成不同玩法的團（紀律團/自由團），整體仍是同一個聯盟、會互相支援，在這樣的情況下：',
    q5_title: '你可以接受嗎？',
    q5_A: '可以',
    q5_B: '視情況',
    q5_C: '不太能接受（希望大家一起、同一玩法）',
    q_section_6: '決策時機',
    q6_title: '關於後續方向（合併後是否移民），你比較傾向什麼時候做決定？',
    q6_A: '希望先看合併後的情況，再決定',
    q6_B: '視情況',
    q6_C: '希望現在就大致確定方向',
    q_section_7: '戰力區間',
    q7_title: '你目前主隊戰力大約在哪個區間？',
    q7_A: '100 以下',
    q7_B: '100～149',
    q7_C: '150～199',
    q7_D: '200 以上',
    q_section_8: '後續聯絡',
    q8_title: '如果有進一步規劃，你是否願意被聯絡？（記得留名字）',
    q8_A: '可以（會留下名稱）',
    q8_B: '不需要',
    q_section_9: '開放題',
    q9_title: '你目前對聯盟最不滿意或覺得可以改善的一點是什麼？',
    q_section_10: '其他想法',
    q10_title: '其他想法或建議',
  },
  en: {
    survey_title: 'Alliance Survey',
    survey_version: 'v.2026/3/30',
    survey_note: 'This survey helps us understand where our alliance wants to go — including merger, migration, and playstyle.\nThere are no right or wrong answers. Please answer based on your honest thoughts.',
    anon_tip: 'Anonymous responses are welcome',
    name_tip: 'Leaving your name helps future planning (optional)',
    code_label: 'Enter Invite Code',
    code_placeholder: 'Enter invite code',
    code_btn: 'Enter Survey',
    code_wrong: 'Incorrect invite code. Please try again.',
    code_hint: 'Ask your Alliance Leader for the invite code',
    already_submitted: 'You have already submitted a response. Thank you!',
    submit_btn: 'Submit Survey',
    submitting: 'Submitting...',
    submit_success: 'Thank you!',
    submit_success_msg: 'Your response has been saved successfully. We appreciate your participation!',
    submit_again: 'Fill Again',
    required: '(required)',
    optional: '(optional)',
    open_placeholder: 'Type your thoughts here...',
    name_placeholder: 'Game ID / Nickname (leave blank for anonymous)',
    closed: 'Survey is currently closed',
    q_section_basic: 'Basic Info',
    q_spending_title: 'Your spending habit?',
    q_spending_A: 'Free-to-play',
    q_spending_B: 'Occasional spender (spend when needed)',
    q_spending_C: 'Regular spender (consistent investment)',
    q_activity_title: 'Your activity level?',
    q_activity_A: 'High (almost daily, willing to coordinate)',
    q_activity_B: 'Moderate',
    q_activity_C: 'Low',
    q_name_title: 'Your name (optional)',
    q_section_1: 'Playstyle Preference',
    q1_title: 'What playstyle do you prefer currently?',
    q1_A: 'Competitive (SVS / PvP / strength-focused)',
    q1_B: 'Stable (development / management / structured)',
    q1_C: 'Casual (flexible / play as desired)',
    q_section_2: 'Migration Intent',
    q2_title: 'If the alliance decides to migrate after the merge, what would you do?',
    q2_A: 'I\'ll follow',
    q2_B: 'Depends on the situation',
    q2_C: 'Prefer to stay',
    q_section_3: 'Role / Influence in Alliance',
    q3_title: 'How important is it to have a role or influence within the alliance?',
    q3_A: 'Very important (want decision-making voice)',
    q3_B: 'Neutral',
    q3_C: 'Not important (just follow along)',
    q_section_4: 'Discipline Tolerance',
    q4_title: 'How strict of a coordination level can you accept?',
    q4_A: 'High (follow commands and tactics)',
    q4_B: 'Moderate (basic cooperation)',
    q4_C: 'Low (prefer freedom)',
    q_section_5: 'Alliance Split Acceptance',
    q5_desc: 'If the alliance splits into two groups (discipline-focused vs free-play), still under the same alliance with mutual support:',
    q5_title: 'Can you accept this arrangement?',
    q5_A: 'Yes',
    q5_B: 'Depends',
    q5_C: 'Prefer everyone stays together with one playstyle',
    q_section_6: 'Decision Timing',
    q6_title: 'Regarding the next steps (whether to migrate after the merge), when do you prefer to decide?',
    q6_A: 'Prefer to wait and see how the merge goes first',
    q6_B: 'Depends on the situation',
    q6_C: 'Prefer to set a general direction now',
    q_section_7: 'Power Range',
    q7_title: 'What is your main team\'s approximate power level?',
    q7_A: 'Below 100',
    q7_B: '100–149',
    q7_C: '150–199',
    q7_D: '200+',
    q_section_8: 'Follow-up Contact',
    q8_title: 'If further planning is needed, are you open to being contacted? (Remember to leave your name)',
    q8_A: 'Yes (will leave my name)',
    q8_B: 'Not necessary',
    q_section_9: 'Open Feedback',
    q9_title: 'What\'s the one thing about the alliance you\'re most unsatisfied with or think could improve?',
    q_section_10: 'Other Ideas',
    q10_title: 'Any other thoughts or suggestions?',
  },
  es: {
    survey_title: 'Encuesta de Alianza',
    survey_version: 'v.2026/3/30',
    survey_note: 'Esta encuesta nos ayuda a comprender hacia dónde quiere ir nuestra alianza, incluyendo fusiones, migraciones y estilo de juego.\nNo hay respuestas correctas o incorrectas. Por favor responde según tus pensamientos honestos.',
    anon_tip: 'Las respuestas anónimas son bienvenidas',
    name_tip: 'Dejar tu nombre ayuda a la planificación futura (opcional)',
    code_label: 'Ingresa el Código de Invitación',
    code_placeholder: 'Ingresa el código',
    code_btn: 'Entrar a la Encuesta',
    code_wrong: 'Código de invitación incorrecto. Inténtalo de nuevo.',
    code_hint: 'Pide el código al Líder de la Alianza',
    already_submitted: '¡Ya enviaste una respuesta. ¡Gracias!',
    submit_btn: 'Enviar Encuesta',
    submitting: 'Enviando...',
    submit_success: '¡Gracias!',
    submit_success_msg: '¡Tu respuesta ha sido guardada con éxito. Agradecemos tu participación!',
    submit_again: 'Rellenar de nuevo',
    required: '(obligatorio)',
    optional: '(opcional)',
    open_placeholder: 'Escribe tus pensamientos aquí...',
    name_placeholder: 'ID del juego / Apodo (deja en blanco para ser anónimo)',
    closed: 'La encuesta está cerrada actualmente',
    q_section_basic: 'Información Básica',
    q_spending_title: '¿Tu hábito de gasto?',
    q_spending_A: 'Free-to-play (sin gastar)',
    q_spending_B: 'Gasto ocasional (cuando es necesario)',
    q_spending_C: 'Gasto regular (inversión constante)',
    q_activity_title: '¿Tu nivel de actividad?',
    q_activity_A: 'Alto (casi todos los días, dispuesto a coordinar)',
    q_activity_B: 'Moderado',
    q_activity_C: 'Bajo',
    q_name_title: 'Tu nombre (opcional)',
    q_section_1: 'Preferencia de Estilo de Juego',
    q1_title: '¿Qué estilo de juego prefieres actualmente?',
    q1_A: 'Competitivo (SVS / PvP / enfocado en fuerza)',
    q1_B: 'Estable (desarrollo / gestión / estructurado)',
    q1_C: 'Casual (flexible / jugar según deseos)',
    q_section_2: 'Intención de Migración',
    q2_title: 'Si la alianza decide migrar después de la fusión, ¿qué harías?',
    q2_A: 'Los seguiré',
    q2_B: 'Depende de la situación',
    q2_C: 'Prefiero quedarme',
    q_section_3: 'Rol / Influencia en la Alianza',
    q3_title: '¿Qué tan importante es tener un rol o influencia dentro de la alianza?',
    q3_A: 'Muy importante (quiero voz en las decisiones)',
    q3_B: 'Neutral',
    q3_C: 'No es importante (solo seguir el juego)',
    q_section_4: 'Tolerancia a la Disciplina',
    q4_title: '¿Qué nivel estricto de coordinación puedes aceptar?',
    q4_A: 'Alto (seguir comandos y tácticas)',
    q4_B: 'Moderado (cooperación básica)',
    q4_C: 'Bajo (prefiero libertad)',
    q_section_5: 'Aceptación de División de la Alianza',
    q5_desc: 'Si la alianza se divide en dos grupos (enfocado en disciplina vs juego libre), bajo la misma alianza con apoyo mutuo:',
    q5_title: '¿Puedes aceptar este arreglo?',
    q5_A: 'Sí',
    q5_B: 'Depende',
    q5_C: 'Prefiero que todos estemos juntos con el mismo estilo',
    q_section_6: 'Momento de Decisión',
    q6_title: 'Sobre los próximos pasos (si migrar después de la fusión), ¿cuándo prefieres decidir?',
    q6_A: 'Prefiero ver cómo resulta la fusión primero',
    q6_B: 'Depende de la situación',
    q6_C: 'Prefiero establecer una dirección general ahora',
    q_section_7: 'Rango de Poder',
    q7_title: '¿Cuál es el nivel de poder aproximado de tu equipo principal?',
    q7_A: 'Menos de 100',
    q7_B: '100–149',
    q7_C: '150–199',
    q7_D: '200+',
    q_section_8: 'Contacto de Seguimiento',
    q8_title: '¿Estás dispuesto a ser contactado si hay más planificación? (Recuerda dejar tu nombre)',
    q8_A: 'Sí (dejaré mi nombre)',
    q8_B: 'No es necesario',
    q_section_9: 'Retroalimentación Abierta',
    q9_title: '¿Cuál es la cosa con la que estás más insatisfecho o crees que podría mejorar en la alianza?',
    q_section_10: 'Otras Ideas',
    q10_title: '¿Algún otro pensamiento o sugerencia?',
  },
};

// ── Helper: Radio option ──────────────────────────────────────────────────────
function RadioOption({ name, value, label, checked, onChange }) {
  return (
    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 ${checked
        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
        }`}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`text-sm font-semibold leading-snug ${checked ? 'text-indigo-700' : 'text-gray-600'}`}>{label}</span>
    </label>
  );
}

// ── Helper: Section header ────────────────────────────────────────────────────
function SectionHeader({ emoji, label, num }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
        <span className="text-sm">{emoji}</span>
        {num !== undefined && (
          <span className="text-xs font-black text-amber-600">{num}</span>
        )}
      </div>
      <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">{label}</h3>
    </div>
  );
}

// ── Main Survey Component ─────────────────────────────────────────────────────
const SURVEY_VERSION = 'v2026-03-30';
const SESSION_KEY = 'survey_submitted_v2026_03_30';

export default function Survey() {
  const [lang, setLang] = useState('zh');
  const [phase, setPhase] = useState('code'); // 'code' | 'form' | 'done'
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [config, setConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [answers, setAnswers] = useState({
    surveyVersion: SURVEY_VERSION,
    q0_spending: '',
    q0_activity: '',
    q0_name: '',
    q1_playstyle: '',
    q2_migration: '',
    q3_role: '',
    q4_discipline: '',
    q5_split: '',
    q6_merge: '',
    q7_power: '',
    q8_followup: '',
    q9_feedback: '',
    q10_other: '',
  });

  const s = i18n[lang];

  useEffect(() => {
    getSurveyConfig().then(setConfig);
    if (sessionStorage.getItem(SESSION_KEY)) setPhase('done');
  }, []);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (!config) return;
    if (codeInput.trim().toUpperCase() === config.inviteCode.toUpperCase()) {
      setPhase('form');
      setCodeError(false);
    } else {
      setCodeError(true);
    }
  };

  const setAnswer = (key, val) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  };

  const isFormValid = () => {
    const required = ['q0_spending', 'q0_activity', 'q1_playstyle', 'q2_migration', 'q3_role', 'q4_discipline', 'q5_split', 'q6_merge', 'q7_power', 'q8_followup'];
    return required.every(k => answers[k]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const result = await submitSurveyResponse({ ...answers, lang });
    setSubmitting(false);
    if (result.success) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setPhase('done');
    } else {
      setSubmitError(`提交失敗：${result.error || '未知錯誤，請查看 Console'}`);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // ── Closed ───────────────────────────────────────────────────────────────
  if (!config.isActive) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center px-4">
        <div className="text-4xl mb-4">🔒</div>
        <p className="font-bold text-gray-500">{s.closed}</p>
      </div>
    );
  }

  // ── Header (with language switcher) ─────────────────────────────────────
  const Header = () => (
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white shadow-xl shadow-indigo-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">{s.survey_title}</h1>
            <p className="text-xs text-indigo-200 font-bold mt-0.5">{s.survey_version}</p>
          </div>
        </div>
        {/* Language switcher */}
        <div className="flex gap-1 bg-white/15 rounded-xl p-1 border border-white/20 backdrop-blur-sm">
          {['zh', 'en', 'es'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${lang === l ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/70 hover:text-white'
                }`}
            >
              {l === 'zh' ? '中' : l === 'en' ? 'EN' : 'ES'}
            </button>
          ))}
        </div>
      </div>
      {phase === 'form' && (
        <div className="mt-4 bg-white/10 rounded-xl p-3.5 border border-white/20 space-y-1.5 text-sm text-white/90 leading-relaxed">
          {s.survey_note.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          <div className="flex flex-wrap gap-3 mt-2 pt-1 border-t border-white/20">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-100">
              <Globe size={12} /> {s.anon_tip}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-indigo-200">
              👤 {s.name_tip}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // ── Code Gate ────────────────────────────────────────────────────────────
  if (phase === 'code') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Header />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3 border border-indigo-100">
              <Lock size={24} className="text-indigo-500" />
            </div>
            <p className="font-black text-gray-700 text-lg">{s.code_label}</p>
            <p className="text-xs text-gray-400 mt-1">{s.code_hint}</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(false); }}
              placeholder={s.code_placeholder}
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold text-center tracking-widest text-lg transition-colors ${codeError ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 focus:border-indigo-500'
                }`}
              autoFocus
            />
            {codeError && (
              <p className="text-xs text-red-500 font-bold text-center animate-in fade-in">{s.code_wrong}</p>
            )}
            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
            >
              {s.code_btn} <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-10 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-100">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">{s.submit_success}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">{s.submit_success_msg}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setAnswers({
                surveyVersion: SURVEY_VERSION, q0_spending: '', q0_activity: '', q0_name: '',
                q1_playstyle: '', q2_migration: '', q3_role: '', q4_discipline: '',
                q5_split: '', q6_merge: '', q7_power: '', q8_followup: '',
                q9_feedback: '', q10_other: '',
              });
              setPhase('form');
            }}
            className="text-xs text-gray-400 hover:text-indigo-500 font-bold transition-colors"
          >
            {s.submit_again}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  const questions = [
    // Section 0 – Basic
    {
      section: s.q_section_basic,
      emoji: '🟡', num: '0',
      items: [
        {
          key: 'q0_spending', title: s.q_spending_title, required: true,
          options: [
            { v: 'A', l: `A. ${s.q_spending_A}` },
            { v: 'B', l: `B. ${s.q_spending_B}` },
            { v: 'C', l: `C. ${s.q_spending_C}` },
          ]
        },
        {
          key: 'q0_activity', title: s.q_activity_title, required: true,
          options: [
            { v: 'A', l: `A. ${s.q_activity_A}` },
            { v: 'B', l: `B. ${s.q_activity_B}` },
            { v: 'C', l: `C. ${s.q_activity_C}` },
          ]
        },
        { key: 'q0_name', title: s.q_name_title, type: 'text', required: false },
      ]
    },
    // Section 1
    {
      section: s.q_section_1, emoji: '🟡', num: '1',
      items: [{
        key: 'q1_playstyle', title: s.q1_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q1_A}` },
          { v: 'B', l: `B. ${s.q1_B}` },
          { v: 'C', l: `C. ${s.q1_C}` },
        ]
      }]
    },
    // Section 2
    {
      section: s.q_section_2, emoji: '🟡', num: '2',
      items: [{
        key: 'q2_migration', title: s.q2_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q2_A}` },
          { v: 'B', l: `B. ${s.q2_B}` },
          { v: 'C', l: `C. ${s.q2_C}` },
        ]
      }]
    },
    // Section 3
    {
      section: s.q_section_3, emoji: '🟡', num: '3',
      items: [{
        key: 'q3_role', title: s.q3_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q3_A}` },
          { v: 'B', l: `B. ${s.q3_B}` },
          { v: 'C', l: `C. ${s.q3_C}` },
        ]
      }]
    },
    // Section 4
    {
      section: s.q_section_4, emoji: '🟡', num: '4',
      items: [{
        key: 'q4_discipline', title: s.q4_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q4_A}` },
          { v: 'B', l: `B. ${s.q4_B}` },
          { v: 'C', l: `C. ${s.q4_C}` },
        ]
      }]
    },
    // Section 5
    {
      section: s.q_section_5, emoji: '🟡', num: '5',
      desc: s.q5_desc,
      items: [{
        key: 'q5_split', title: s.q5_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q5_A}` },
          { v: 'B', l: `B. ${s.q5_B}` },
          { v: 'C', l: `C. ${s.q5_C}` },
        ]
      }]
    },
    // Section 6
    {
      section: s.q_section_6, emoji: '🟡', num: '6',
      items: [{
        key: 'q6_merge', title: s.q6_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q6_A}` },
          { v: 'B', l: `B. ${s.q6_B}` },
          { v: 'C', l: `C. ${s.q6_C}` },
        ]
      }]
    },
    // Section 7
    {
      section: s.q_section_7, emoji: '🟡', num: '7',
      items: [{
        key: 'q7_power', title: s.q7_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q7_A}` },
          { v: 'B', l: `B. ${s.q7_B}` },
          { v: 'C', l: `C. ${s.q7_C}` },
          { v: 'D', l: `D. ${s.q7_D}` },
        ]
      }]
    },
    // Section 8
    {
      section: s.q_section_8, emoji: '🟡', num: '8',
      items: [{
        key: 'q8_followup', title: s.q8_title, required: true,
        options: [
          { v: 'A', l: `A. ${s.q8_A}` },
          { v: 'B', l: `B. ${s.q8_B}` },
        ]
      }]
    },
    // Section 9
    {
      section: s.q_section_9, emoji: '🟡', num: '9',
      items: [{ key: 'q9_feedback', title: s.q9_title, type: 'textarea', required: false }]
    },
    // Section 10
    {
      section: s.q_section_10, emoji: '🟡', num: '🔟',
      items: [{ key: 'q10_other', title: s.q10_title, type: 'textarea', required: false }]
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Header />
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((sec, sidx) => (
          <div key={sidx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SectionHeader emoji={sec.emoji} label={sec.section} num={sec.num} />
            {sec.desc && (
              <p className="text-sm text-gray-600 bg-amber-50 rounded-xl p-3.5 mb-4 leading-relaxed border border-amber-100">{sec.desc}</p>
            )}
            <div className="space-y-6">
              {sec.items.map(item => (
                <div key={item.key}>
                  <p className="text-sm font-bold text-gray-700 mb-2 leading-snug">
                    {item.title}{' '}
                    <span className={`text-xs font-normal ${item.required ? 'text-red-400' : 'text-gray-400'}`}>
                      {item.required ? s.required : s.optional}
                    </span>
                  </p>
                  {item.type === 'text' ? (
                    <input
                      type="text"
                      value={answers[item.key]}
                      onChange={e => setAnswer(item.key, e.target.value)}
                      placeholder={s.name_placeholder}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none text-sm font-medium transition-colors"
                    />
                  ) : item.type === 'textarea' ? (
                    <textarea
                      value={answers[item.key]}
                      onChange={e => setAnswer(item.key, e.target.value)}
                      placeholder={s.open_placeholder}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none text-sm font-medium resize-none transition-colors"
                    />
                  ) : (
                    <div className="space-y-2">
                      {item.options.map(opt => (
                        <RadioOption
                          key={opt.v}
                          name={item.key}
                          value={opt.v}
                          label={opt.l}
                          checked={answers[item.key] === opt.v}
                          onChange={() => setAnswer(item.key, opt.v)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Submit */}
        <div className="sticky bottom-4">
          <button
            type="submit"
            disabled={!isFormValid() || submitting}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-xl ${isFormValid() && !submitting
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-300'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            {submitting ? s.submitting : s.submit_btn}
          </button>
          {!isFormValid() && (
            <p className="text-center text-xs text-gray-400 mt-2 font-medium">
              {lang === 'zh' ? '請完成所有必填題目' : lang === 'en' ? 'Please complete all required questions' : 'Por favor completa todas las preguntas obligatorias'}
            </p>
          )}
          {submitError && (
            <p className="text-center text-xs text-red-500 mt-2 font-bold bg-red-50 rounded-xl p-3 border border-red-100">
              ⚠️ {submitError}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
