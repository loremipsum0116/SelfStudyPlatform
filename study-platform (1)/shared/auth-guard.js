// Authentication gate for protected pages.
// 동작:
//   1) Firebase 미설정 → 안내 화면
//   2) 미로그인 → login.html 리디렉트
//   3) 로그인 + 승인 대기(pending) → 대기 안내 화면
//   4) 로그인 + 거부(denied) → 접근 거부 화면
//   5) 로그인 + 승인(approved) → 정상 진입

import { firebaseReady, firebaseError } from './firebase-init.js';
import { onAuthChange, signOutUser } from './auth.js';
import { initAssistantWidget } from './assistant-widget.js';

function loginUrl() {
  return new URL('../login.html', import.meta.url).href;
}

function hideBody() {
  const style = document.createElement('style');
  style.id = '__auth_guard_hide';
  style.textContent = 'body { visibility: hidden !important; }';
  document.head.appendChild(style);
}

function showBody() {
  const el = document.getElementById('__auth_guard_hide');
  if (el) el.remove();
}

function renderConfigNeeded() {
  showBody();
  document.body.innerHTML = `
    <div style="max-width:560px;margin:80px auto;padding:40px 24px;
                font-family:'IBM Plex Sans KR',system-ui,sans-serif;text-align:center;color:#333">
      <h1 style="font-size:24px;margin-bottom:12px">Firebase 설정이 필요합니다</h1>
      <p style="color:#666;line-height:1.6">
        이 학습 플랫폼은 로그인이 필수이며, Firebase 프로젝트 설정이 있어야 동작합니다.
      </p>
      <div style="background:#fff7d6;border:1px solid #e6cf6a;padding:16px;border-radius:8px;
                  margin:24px 0;text-align:left;font-size:14px;color:#5a4a00">
        <strong>오류:</strong><br>
        ${firebaseError || 'config.js가 placeholder 상태입니다.'}
      </div>
    </div>`;
}

function renderPending() {
  showBody();
  document.body.innerHTML = `
    <div style="max-width:480px;margin:120px auto;padding:40px 24px;
                font-family:'IBM Plex Sans KR',system-ui,sans-serif;text-align:center;color:#333">
      <div style="font-size:48px;margin-bottom:16px">⏳</div>
      <h1 style="font-size:24px;margin-bottom:12px">승인 대기 중</h1>
      <p style="color:#666;line-height:1.7;font-size:15px">
        회원가입이 완료되었습니다.<br>
        관리자의 승인을 기다리고 있습니다.<br>
        승인이 완료되면 정상적으로 이용할 수 있습니다.
      </p>
      <button id="__pending_logout" style="margin-top:24px;padding:10px 24px;
        border:1px solid #1a1a1a;background:#1a1a1a;color:#f4f1ea;
        font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.15em;
        text-transform:uppercase;cursor:pointer">로그아웃</button>
    </div>`;
  document.getElementById('__pending_logout').addEventListener('click', async () => {
    await signOutUser();
    window.location.replace(loginUrl());
  });
}

function renderDenied() {
  showBody();
  document.body.innerHTML = `
    <div style="max-width:480px;margin:120px auto;padding:40px 24px;
                font-family:'IBM Plex Sans KR',system-ui,sans-serif;text-align:center;color:#333">
      <div style="font-size:48px;margin-bottom:16px">🚫</div>
      <h1 style="font-size:24px;margin-bottom:12px;color:#b5361a">접근이 거부되었습니다</h1>
      <p style="color:#666;line-height:1.7;font-size:15px">
        관리자에 의해 접근이 거부되었습니다.<br>
        문의 사항이 있으시면 관리자에게 연락해 주세요.
      </p>
      <button id="__denied_logout" style="margin-top:24px;padding:10px 24px;
        border:1px solid #1a1a1a;background:#1a1a1a;color:#f4f1ea;
        font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.15em;
        text-transform:uppercase;cursor:pointer">로그아웃</button>
    </div>`;
  document.getElementById('__denied_logout').addEventListener('click', async () => {
    await signOutUser();
    window.location.replace(loginUrl());
  });
}

function redirectToLogin() {
  const path = window.location.pathname;
  if (path.endsWith('/login.html') || path.endsWith('login.html')) return;
  window.location.replace(loginUrl());
}

// --- 즉시 실행 ---
hideBody();

if (!firebaseReady) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderConfigNeeded);
  } else {
    renderConfigNeeded();
  }
} else {
  // DB 모듈 로드 후 유저 상태 확인
  const dbMod = await import('./db.js');

  onAuthChange(async (user) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    // 유저 프로필 확인
    const profile = await dbMod.getUserProfile(user.uid);

    if (!profile) {
      // 프로필이 없는 경우 (이전에 가입한 유저 또는 슈퍼계정 최초 로그인)
      // 슈퍼 계정이면 자동 approved, 나머지는 pending
      await dbMod.createUserProfile(user.uid, user.email);
      const newProfile = await dbMod.getUserProfile(user.uid);
      if (newProfile && newProfile.status === 'approved') {
        showBody();
        try { initAssistantWidget(); } catch (err) { console.warn('[auth-guard] assistant init fail:', err); }
      } else {
        renderPending();
      }
      return;
    }

    switch (profile.status) {
      case 'approved':
        showBody();
        try { initAssistantWidget(); } catch (err) { console.warn('[auth-guard] assistant init fail:', err); }
        break;
      case 'denied':
        renderDenied();
        break;
      case 'pending':
      default:
        renderPending();
        break;
    }
  });
}
