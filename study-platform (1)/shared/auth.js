// Authentication helpers (tolerant of Firebase unavailable)
//
// Firebase 초기화에 실패했거나 config가 placeholder이면 auth가 null이 됩니다.
// 이 경우 모든 함수는 안전하게 no-op 하거나 에러를 던져 UI에서 처리할 수 있게 합니다.

import { auth, firebaseReady, firebaseError } from './firebase-init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

function requireAuth() {
  if (!auth) {
    throw new Error(firebaseError || 'Firebase가 설정되지 않았습니다.');
  }
}

export async function signUp(email, password) {
  requireAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signIn(email, password) {
  requireAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

/**
 * 인증 상태 변화 구독. Firebase가 없으면 즉시 null로 콜백을 호출하고
 * no-op 해제 함수를 반환합니다.
 */
export function onAuthChange(callback) {
  if (!auth) {
    try { callback(null); } catch {}
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

export function isFirebaseReady() {
  return firebaseReady;
}

export function getFirebaseError() {
  return firebaseError;
}

// window에도 노출해서 classic script에서 사용 가능하게 함
if (typeof window !== 'undefined') {
  window.__auth = {
    signUp, signIn, signOutUser, onAuthChange,
    getCurrentUser, isFirebaseReady, getFirebaseError
  };
}
