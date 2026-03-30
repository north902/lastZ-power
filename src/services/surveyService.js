import { db } from '../config/firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';

const RESPONSES_COL = 'survey_responses';
const CONFIG_DOC = 'config/survey';

// ── Submit a survey response ──────────────────────────────────────────────────
export const submitSurveyResponse = async (answers) => {
  try {
    await addDoc(collection(db, RESPONSES_COL), {
      ...answers,
      submittedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error('Survey submit error:', err);
    return { success: false, error: err.message };
  }
};

// ── Fetch all responses (admin) ───────────────────────────────────────────────
export const fetchSurveyResponses = async () => {
  try {
    const q = query(collection(db, RESPONSES_COL), orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Survey fetch error:', err);
    return [];
  }
};

// ── Get survey config (invite code, active status) ───────────────────────────
export const getSurveyConfig = async () => {
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC));
    if (snap.exists()) return snap.data();
    // Default config if not set yet
    return { inviteCode: 'KTX2026', isActive: true, surveyVersion: 'v2026-03-30' };
  } catch (err) {
    console.error('Survey config fetch error:', err);
    return { inviteCode: 'KTX2026', isActive: true, surveyVersion: 'v2026-03-30' };
  }
};

// ── Update survey config (admin) ─────────────────────────────────────────────
export const updateSurveyConfig = async (data) => {
  try {
    await setDoc(doc(db, CONFIG_DOC), data, { merge: true });
    return { success: true };
  } catch (err) {
    console.error('Survey config update error:', err);
    return { success: false, error: err.message };
  }
};
