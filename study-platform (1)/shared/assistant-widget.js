import { onAuthChange } from './auth.js';
import { getGeminiApiKey } from './db.js';

let widgetMounted = false;
let widgetInitStarted = false;
let geminiApiKey = null;
let history = [];

function ensureStyles() {
  if (document.getElementById('__gemini_widget_style')) return;
  const style = document.createElement('style');
  style.id = '__gemini_widget_style';
  style.textContent = `
    .gaw-toggle-btn {
      position: fixed; right: 18px; bottom: 18px; z-index: 9998;
      border: 1px solid #111; background: #111; color: #f4f1ea;
      padding: 10px 14px; border-radius: 999px; cursor: pointer;
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .08em;
      box-shadow: 0 8px 24px rgba(0,0,0,.18);
    }
    .gaw-panel {
      position: fixed; top: 16px; right: 16px; bottom: 16px; width: min(380px, calc(100vw - 32px));
      background: #fff; border: 1px solid #111; z-index: 9999; display: flex; flex-direction: column;
      box-shadow: 0 18px 40px rgba(0,0,0,.18); border-radius: 14px; overflow: hidden;
    }
    .gaw-panel.minimized { display: none; }
    .gaw-head {
      display:flex; justify-content:space-between; align-items:center; gap:10px;
      padding: 14px 16px; border-bottom:1px solid #111; background:#faf7f0;
    }
    .gaw-title { font-weight:700; font-size:16px; }
    .gaw-head-actions { display:flex; gap:8px; align-items:center; }
    .gaw-badge { font-size:10px; border:1px solid #b45309; color:#b45309; background:#fff7ed; padding:3px 8px; border-radius:999px; }
    .gaw-head button, .gaw-clear button, .gaw-settings-link {
      border: none; background: none; cursor: pointer; color:#555; font-size:12px;
      text-decoration:none;
    }
    .gaw-messages { flex:1; overflow-y:auto; padding:14px; background:#fff; }
    .gaw-empty { color:#777; font-size:13px; line-height:1.7; }
    .gaw-msg { margin: 10px 0; padding: 11px 13px; border-radius: 12px; white-space: pre-wrap; word-break: break-word; font-size:14px; line-height:1.65; }
    .gaw-msg.user { background:#111; color:#f4f1ea; margin-left: 48px; }
    .gaw-msg.bot { background:#f3efe5; margin-right: 18px; }
    .gaw-msg.error { background:#fff1f2; color:#b42318; border:1px solid #fda4af; }
    .gaw-msg.loading { color:#777; font-style:italic; background:#f8f8f8; }
    .gaw-clear { padding: 8px 14px; text-align:right; border-top:1px solid #eee; }
    .gaw-input { display:flex; gap:0; border-top:1px solid #111; }
    .gaw-input textarea {
      flex:1; border:none; resize:none; min-height:60px; max-height:150px; padding:14px; font-size:14px; line-height:1.6;
    }
    .gaw-input textarea:focus { outline:none; }
    .gaw-input button {
      border:none; background:#111; color:#f4f1ea; padding: 0 16px; cursor:pointer;
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .08em;
    }
    .gaw-input button:disabled { opacity:.5; cursor:not-allowed; }
    body.gaw-has-panel { padding-right: min(400px, calc(100vw - 16px)); }
    @media (max-width: 980px) {
      body.gaw-has-panel { padding-right: 0; }
      .gaw-panel { width: min(420px, calc(100vw - 20px)); top: 10px; right: 10px; bottom: 10px; }
    }
  `;
  document.head.appendChild(style);
}

function appendMessage(messagesEl, role, text) {
  const msg = document.createElement('div');
  msg.className = `gaw-msg ${role}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

async function callGemini(userText, messagesEl, sendBtn) {
  if (!geminiApiKey) {
    appendMessage(messagesEl, 'error', 'Gemini API 키가 없습니다. AI API 등록 페이지에서 먼저 키를 저장하세요.');
    return;
  }

  appendMessage(messagesEl, 'user', userText);
  history.push({ role: 'user', parts: [{ text: userText }] });
  const loading = appendMessage(messagesEl, 'loading', '답변 생성 중...');
  sendBtn.disabled = true;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history,
        systemInstruction: {
          parts: [{ text: '당신은 학습 플랫폼 우측 패널 AI 어시스턴트입니다. 한국어로 간결하고 정확하게 답변하세요. 사용자의 현재 공부 맥락(이산수학/컴퓨터공학 학습)을 우선 고려하세요.' }]
        }
      })
    });

    loading.remove();

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      history.pop();
      appendMessage(messagesEl, 'error', 'API 오류: ' + (errData.error?.message || `HTTP ${resp.status}`));
      return;
    }

    const data = await resp.json();
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '(응답 없음)';
    history.push({ role: 'model', parts: [{ text: reply }] });
    appendMessage(messagesEl, 'bot', reply);
  } catch (err) {
    loading.remove();
    history.pop();
    appendMessage(messagesEl, 'error', '네트워크 오류: ' + err.message);
  } finally {
    sendBtn.disabled = false;
  }
}

function mountWidget() {
  if (widgetMounted) return;
  widgetMounted = true;
  ensureStyles();

  const panel = document.createElement('aside');
  panel.className = 'gaw-panel';
  panel.innerHTML = `
    <div class="gaw-head">
      <div>
        <div class="gaw-title">🤖 Gemini 학습 어시스턴트</div>
        <div style="font-size:12px;color:#666;margin-top:4px">항상 화면 옆에서 바로 질문할 수 있습니다.</div>
      </div>
      <div class="gaw-head-actions">
        <span class="gaw-badge" id="gaw-badge" style="display:none">API 키 없음</span>
        <a class="gaw-settings-link" href="${new URL('../api-settings.html', import.meta.url).href}">API 설정</a>
        <button type="button" id="gaw-min-btn">접기</button>
      </div>
    </div>
    <div class="gaw-messages" id="gaw-messages"><div class="gaw-empty">질문을 입력하면 즉시 Gemini에게 물어볼 수 있습니다.</div></div>
    <div class="gaw-clear"><button type="button" id="gaw-clear-btn">대화 초기화</button></div>
    <div class="gaw-input">
      <textarea id="gaw-input" placeholder="질문을 입력하세요... (Shift+Enter 줄바꿈)"></textarea>
      <button type="button" id="gaw-send-btn">전송</button>
    </div>`;

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'gaw-toggle-btn';
  toggleBtn.textContent = '🤖 AI 열기';
  toggleBtn.style.display = 'none';

  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);
  document.body.classList.add('gaw-has-panel');

  const messagesEl = panel.querySelector('#gaw-messages');
  const inputEl = panel.querySelector('#gaw-input');
  const sendBtn = panel.querySelector('#gaw-send-btn');
  const clearBtn = panel.querySelector('#gaw-clear-btn');
  const minBtn = panel.querySelector('#gaw-min-btn');
  const badge = panel.querySelector('#gaw-badge');

  if (!geminiApiKey) badge.style.display = 'inline-block';

  minBtn.addEventListener('click', () => {
    panel.classList.add('minimized');
    toggleBtn.style.display = 'block';
    document.body.classList.remove('gaw-has-panel');
  });

  toggleBtn.addEventListener('click', () => {
    panel.classList.remove('minimized');
    toggleBtn.style.display = 'none';
    document.body.classList.add('gaw-has-panel');
    inputEl.focus();
  });

  clearBtn.addEventListener('click', () => {
    history = [];
    messagesEl.innerHTML = '<div class="gaw-empty">대화가 초기화되었습니다. 새 질문을 입력하세요.</div>';
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });

  sendBtn.addEventListener('click', async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    if (messagesEl.querySelector('.gaw-empty')) messagesEl.innerHTML = '';
    inputEl.value = '';
    inputEl.style.height = 'auto';
    await callGemini(text, messagesEl, sendBtn);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
}

export async function initAssistantWidget() {
  if (widgetInitStarted) return;
  widgetInitStarted = true;

  onAuthChange(async (user) => {
    if (!user) return;
    try {
      geminiApiKey = await getGeminiApiKey();
    } catch (err) {
      console.warn('[assistant-widget] getGeminiApiKey fail:', err);
      geminiApiKey = null;
    }
    mountWidget();
  });
}

// 모듈이 로드되면 자동 초기화도 시도한다.
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initAssistantWidget(); }, { once: true });
  } else {
    initAssistantWidget();
  }
}
