// Firebase initialisation with graceful degradation.
//
// 이 모듈은 config.js의 값이 placeholder 상태이거나 Firebase 초기화가
// 실패하면 auth/db를 null로 export하여 "로컬 전용 모드"로 동작하게 합니다.
// 이렇게 하면 Firebase를 설정하지 않아도 모든 페이지가 깨지지 않습니다.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

let firebaseApp = null;
let auth = null;
let db = null;
let firebaseReady = false;
let firebaseError = null;

try {
  const mod = await import('./config.js');
  const cfg = mod.firebaseConfig;
  const isPlaceholder =
    !cfg || !cfg.apiKey || cfg.apiKey === 'YOUR_API_KEY' || cfg.projectId === 'YOUR_PROJECT_ID';
  if (isPlaceholder) {
    firebaseError =
      'Firebase가 설정되지 않아 로컬 전용 모드로 동작합니다. (shared/config.js 참고)';
    console.warn('[firebase-init]', firebaseError);
  } else {
    firebaseApp = initializeApp(cfg);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    firebaseReady = true;
  }
} catch (err) {
  firebaseError = 'Firebase 초기화 실패: ' + (err && err.message ? err.message : err);
  console.warn('[firebase-init]', firebaseError);
}

// window에도 노출해서 비-module 스크립트(practice.js 등)가 참조할 수 있게 함
if (typeof window !== 'undefined') {
  window.__firebase = { auth, db, firebaseReady, firebaseError };
}

export { firebaseApp, auth, db, firebaseReady, firebaseError };
