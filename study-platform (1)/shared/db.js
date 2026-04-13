// Data persistence layer — Firebase 전용.
import { auth, db, firebaseReady } from './firebase-init.js';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs,
  query, orderBy, limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const MOCK_KEEP = 5;
const SUPER_ADMIN_EMAIL = 'sst7050@naver.com';

function currentUid() {
  if (!firebaseReady || !auth || !auth.currentUser) return null;
  return auth.currentUser.uid;
}

// ==================== USER MANAGEMENT ====================

export async function createUserProfile(uid, email) {
  if (!db) return;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const isSuperAdmin = normalizedEmail === SUPER_ADMIN_EMAIL;
  try {
    const signupRequest = isSuperAdmin ? null : await getSignupRequestByEmail(normalizedEmail);
    const status = isSuperAdmin ? 'approved' : (signupRequest?.status === 'approved' ? 'approved' : 'pending');
    await setDoc(doc(db, 'users', uid), {
      email: normalizedEmail,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) { console.warn('[db] createUserProfile fail:', err); throw err; }
}

export async function getUserProfile(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) { console.warn('[db] getUserProfile fail:', err); return null; }
}



export async function getSignupRequestByEmail(email) {
  if (!db || !email) return null;
  try {
    const snap = await getDoc(doc(db, 'signupRequests', email.trim().toLowerCase()));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) { console.warn('[db] getSignupRequestByEmail fail:', err); return null; }
}

export async function createSignupRequest(email) {
  if (!db || !email) return;
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const existing = await getSignupRequestByEmail(normalizedEmail);
    if (existing && existing.status === 'pending') return { alreadyPending: true, ...existing };
    await setDoc(doc(db, 'signupRequests', normalizedEmail), {
      email: normalizedEmail,
      status: 'pending',
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedAt: existing?.approvedAt || null,
      approvedBy: existing?.approvedBy || null
    }, { merge: true });
    return { email: normalizedEmail, status: 'pending' };
  } catch (err) { console.warn('[db] createSignupRequest fail:', err); throw err; }
}

export async function getAllSignupRequests() {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'signupRequests'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) { console.warn('[db] getAllSignupRequests fail:', err); return []; }
}

export async function setSignupRequestStatus(email, status, adminEmail = null) {
  if (!db || !email) return;
  const normalizedEmail = email.trim().toLowerCase();
  try {
    await setDoc(doc(db, 'signupRequests', normalizedEmail), {
      email: normalizedEmail,
      status,
      approvedAt: status === 'approved' ? serverTimestamp() : null,
      approvedBy: status === 'approved' ? adminEmail : null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) { console.warn('[db] setSignupRequestStatus fail:', err); throw err; }
}

export async function deleteSignupRequest(email) {
  if (!db || !email) return;
  try {
    await deleteDoc(doc(db, 'signupRequests', email.trim().toLowerCase()));
  } catch (err) { console.warn('[db] deleteSignupRequest fail:', err); throw err; }
}

export async function getCurrentUserStatus() {
  const uid = currentUid();
  if (!uid) return null;
  const p = await getUserProfile(uid);
  return p ? p.status : null;
}

export async function getAllUsers() {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) { console.warn('[db] getAllUsers fail:', err); return []; }
}

export async function setUserStatus(uid, status) {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { status, updatedAt: serverTimestamp() });
  } catch (err) { console.warn('[db] setUserStatus fail:', err); throw err; }
}

/**
 * 유저 프로필 삭제 (관리자 탈퇴 처리용).
 * Firestore 문서만 삭제. Firebase Auth 계정은 클라이언트에서 삭제 불가.
 * 삭제된 유저가 재로그인하면 auth-guard가 새 pending 프로필을 생성하므로
 * 재가입 차단이 필요하면 deleteDoc 대신 setUserStatus(uid,'denied') 사용.
 */
export async function deleteUserProfile(uid) {
  if (!db) return;
  try {
    // 하위 컬렉션(subjects 등)은 Firestore 특성상 자동 삭제 안 됨.
    // 프로필 문서만 삭제하면 auth-guard에서 차단됨.
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) { console.warn('[db] deleteUserProfile fail:', err); throw err; }
}

export function isSuperAdmin() {
  if (!auth || !auth.currentUser) return false;
  return auth.currentUser.email === SUPER_ADMIN_EMAIL;
}

// ==================== GEMINI API KEY ====================

export async function saveGeminiApiKey(apiKey) {
  const uid = currentUid();
  if (!uid || !db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { geminiApiKey: apiKey, updatedAt: serverTimestamp() });
  } catch (err) { console.warn('[db] saveGeminiApiKey fail:', err); throw err; }
}

export async function getGeminiApiKey() {
  const uid = currentUid();
  if (!uid || !db) return null;
  const p = await getUserProfile(uid);
  return p ? (p.geminiApiKey || null) : null;
}

// ==================== PRACTICE ====================

export async function savePracticeSession(summary) {
  const uid = currentUid();
  if (!uid || !db) { console.warn('[db] savePracticeSession: 로그인 필요'); return; }
  const { subjectId, chapterId } = summary;
  if (!subjectId || !chapterId) return;
  try {
    await setDoc(doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId), {
      subjectId, chapterId,
      correct: summary.correct || 0, total: summary.total || 0,
      score: summary.score || 0,
      lastDate: summary.date || new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) { console.warn('[db] savePracticeSession fail:', err); throw err; }
}

export async function getPracticeSession(subjectId, chapterId) {
  const uid = currentUid();
  if (!uid || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId));
    return snap.exists() ? snap.data() : null;
  } catch (err) { console.warn('[db] getPracticeSession fail:', err); return null; }
}

export async function getPracticeSessionsForSubject(subjectId, chapterIds) {
  const result = {};
  for (const chId of chapterIds) result[chId] = await getPracticeSession(subjectId, chId);
  return result;
}

// ==================== MOCK EXAM ====================

export async function saveMockRecord(record) {
  const uid = currentUid();
  if (!uid || !db) { console.warn('[db] saveMockRecord: 로그인 필요'); return; }
  const { subjectId } = record;
  if (!subjectId) return;
  try {
    await addDoc(collection(db, 'users', uid, 'subjects', subjectId, 'mockHistory'), {
      score: record.score || 0, correct: record.correct || 0,
      total: record.total || 0, durationMs: record.durationMs || 0,
      details: Array.isArray(record.details) ? record.details : [],
      date: record.date || new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  } catch (err) { console.warn('[db] saveMockRecord fail:', err); throw err; }
}

export async function getMockRecent(subjectId) {
  const uid = currentUid();
  if (!uid || !db) return [];
  try {
    const q = query(
      collection(db, 'users', uid, 'subjects', subjectId, 'mockHistory'),
      orderBy('createdAt', 'desc'), limit(MOCK_KEEP)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const v = d.data();
      return { score:v.score||0, correct:v.correct||0, total:v.total||0,
               durationMs:v.durationMs||0, details:v.details||[], date:v.date||null };
    });
  } catch (err) { console.warn('[db] getMockRecent fail:', err); return []; }
}

// ---------- 전역 노출 ----------
if (typeof window !== 'undefined') {
  window.__db = {
    createUserProfile, getUserProfile, getCurrentUserStatus,
    getSignupRequestByEmail, createSignupRequest, getAllSignupRequests, setSignupRequestStatus, deleteSignupRequest,
    getAllUsers, setUserStatus, deleteUserProfile, isSuperAdmin,
    saveGeminiApiKey, getGeminiApiKey,
    savePracticeSession, getPracticeSession, getPracticeSessionsForSubject,
    saveMockRecord, getMockRecent
  };
}
