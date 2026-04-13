/* ============================================================
   Practice & Mock Exam page logic.

   Two modes:
     - "practice": 문항별 즉시 채점, 종료 시 세션 요약(최근 일자/점수) 저장.
     - "mock": 타이머와 함께 일괄 풀이 → 제출 시 일괄 채점 → 최근 5개 기록 저장.

   호출 방법:
     initPractice(chapterId)                        // 레거시
     initPractice(subjectId, chapterId, mode)       // 신규 (mode: "practice" | "mock")

   의존성(전역):
     - grader.js:  gradeQuestion, renderQuestion, renderFeedback,
                   getUserAnswer, loadProgress, saveProgress,
                   updateScoreDisplay, getApiKey, setApiKey, clearApiKey,
                   escapeHtml
     - db.js   :   window.__db.{ savePracticeSession, saveMockRecord,
                                   getPracticeSession, getMockRecent }
   ============================================================ */

let currentQuestions = [];
let currentSubjectId = "";
let currentChapterId = "";
let currentMode = "practice";

// Practice 전용: 제출 확정된(잠긴) 문제 ID 세트
const lockedQuestions = new Set();

// Mock 전용 상태
let mockStartedAt = null;   // epoch ms
let mockEndedAt   = null;
let mockTimerInt  = null;
let mockSubmitted = false;

function getStorageKey() {
  return currentSubjectId ? `${currentSubjectId}_${currentChapterId}` : currentChapterId;
}

function isMock() { return currentMode === "mock"; }

/* ------------------------------------------------------------
   진입점
   ------------------------------------------------------------ */
async function initPractice(arg1, arg2, arg3) {
  // 레거시 호환
  if (typeof arg2 === "undefined") {
    currentSubjectId = "";
    currentChapterId = arg1;
    currentMode = "practice";
  } else {
    currentSubjectId = arg1;
    currentChapterId = arg2;
    currentMode = arg3 || "practice";
  }

  // 문제 JSON 경로 결정
  let questionPath;
  if (window.location.pathname.includes('/subjects/')) {
    questionPath = `../questions/${currentChapterId}.json`;
  } else {
    questionPath = `questions/${currentChapterId}.json`;
  }

  // 로드
  try {
    const res = await fetch(questionPath);
    if (!res.ok) throw new Error("문제 파일 로드 실패");
    const data = await res.json();
    currentQuestions = data.questions;
    if (data.title && document.getElementById("quiz-title")) {
      document.getElementById("quiz-title").textContent = data.title;
    }
  } catch (e) {
    const container = document.getElementById("questions-container");
    if (container) {
      container.innerHTML =
        `<div class="note err"><span class="lbl">오류</span>문제 데이터를 불러올 수 없습니다: ${e.message}<br><br>로컬 파일로 열면 fetch가 동작하지 않을 수 있어요. <code>python3 -m http.server</code> 같은 로컬 서버로 실행해주세요.</div>`;
    }
    return;
  }

  // 새 세션 시작 시 이전 진행 상태 초기화
  if (!isMock()) {
    const storageKey = getStorageKey();
    saveProgress(storageKey, {});
    lockedQuestions.clear();
  }

  if (isMock()) {
    renderMockIntro();
  } else {
    renderPracticeAll();
  }
  updateApiStatus();
}

/* ------------------------------------------------------------
   PRACTICE 모드: 문항별 즉시 채점 + 제출 확인 + 잠금
   ------------------------------------------------------------ */
function renderPracticeAll() {
  const container = document.getElementById("questions-container");
  container.innerHTML = currentQuestions.map((q, i) => renderQuestion(q, i)).join("");
  attachQuestionListeners(container);

  // 세션 종료 버튼 영역 삽입
  const endBar = document.createElement("div");
  endBar.className = "session-endbar";
  endBar.innerHTML = `
    <button class="btn-submit" id="end-session-btn" style="padding:12px 20px">세션 종료 · 기록 저장</button>
    <div class="meta" style="margin-top:8px">이 버튼을 누르면 현재 세션의 "최근 풀이 날짜와 점수"가 저장됩니다.</div>
    <div id="session-save-msg" style="margin-top:8px"></div>
  `;
  container.appendChild(endBar);
  document.getElementById("end-session-btn").addEventListener("click", handleEndSession);

  if (typeof renderMathInElement === "function") {
    renderMathInElement(container, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ],
      throwOnError: false
    });
  }

  updateScoreDisplay(getStorageKey(), currentQuestions.length);
  renderLastSessionBadge();
}

async function renderLastSessionBadge() {
  if (!window.__db || !currentSubjectId) return;
  try {
    const last = await window.__db.getPracticeSession(currentSubjectId, currentChapterId);
    if (!last) return;
    const host = document.querySelector(".session-endbar");
    if (!host) return;
    const d = last.lastDate ? new Date(last.lastDate) : null;
    const when = d ? d.toLocaleString() : "—";
    const pct = Math.round((last.score || 0) * 100);
    const badge = document.createElement("div");
    badge.className = "note";
    badge.style.marginTop = "12px";
    badge.innerHTML = `<span class="lbl">최근 기록</span>${when} · 점수 ${pct}% (${last.correct || 0}/${last.total || 0})`;
    host.appendChild(badge);
  } catch (e) { /* ignore */ }
}

function attachQuestionListeners(container) {
  container.querySelectorAll("[data-action='submit']").forEach(btn => {
    btn.addEventListener("click", handleSubmit);
  });
  container.querySelectorAll("[data-action='reset']").forEach(btn => {
    btn.addEventListener("click", handleReset);
  });
}

/**
 * 문제를 잠그는 함수: 입력 비활성화, 버튼 숨김
 */
function lockQuestion(qid, q) {
  lockedQuestions.add(qid);

  if (q.type === "multiple-choice") {
    // 라디오 버튼 비활성화
    document.querySelectorAll(`input[name="q-${qid}"]`).forEach(r => {
      r.disabled = true;
    });
    // 레이블 클릭 불가
    document.querySelectorAll(`.choices[data-qid="${qid}"] label`).forEach(lbl => {
      lbl.classList.add("disabled");
      lbl.style.cursor = "default";
    });
  } else {
    // 텍스트 입력 비활성화
    const ta = document.querySelector(`textarea[data-qid="${qid}"]`);
    if (ta) { ta.disabled = true; ta.style.opacity = "0.7"; }
  }

  // 제출 & 초기화 버튼 비활성화
  const submitBtn = document.querySelector(`[data-action='submit'][data-qid='${qid}']`);
  const resetBtn  = document.querySelector(`[data-action='reset'][data-qid='${qid}']`);
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "제출 완료"; submitBtn.style.opacity = "0.5"; }
  if (resetBtn)  { resetBtn.style.display = "none"; }
}

async function handleSubmit(e) {
  const qid = e.currentTarget.dataset.qid;
  const q = currentQuestions.find(x => x.id === qid);
  if (!q) return;

  // 이미 잠긴 문제면 무시
  if (lockedQuestions.has(qid)) return;

  const userAnswer = getUserAnswer(q);
  if (userAnswer === null || userAnswer === "" || (typeof userAnswer === "string" && userAnswer.trim() === "")) {
    alert("답안을 먼저 입력해주세요.");
    return;
  }

  // ★ 제출 확인 다이얼로그
  if (!confirm("제출 버튼을 누르면, 채점 결과를 번복할 수 없습니다. 제출하시겠습니까?")) {
    return;
  }

  const btn = e.currentTarget;
  const originalText = btn.textContent;

  if (q.type === "proof" || q.type === "essay") {
    if (!getApiKey()) {
      alert("증명 문제 채점을 위해서는 Google Gemini API 키가 필요합니다. 페이지 상단에서 키를 먼저 등록해주세요.");
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>AI 채점 중...';
  } else {
    btn.disabled = true;
  }

  try {
    const result = await gradeQuestion(q, userAnswer);
    renderFeedback(qid, result);

    const storageKey = getStorageKey();
    const progress = loadProgress(storageKey);
    progress[qid] = {
      verdict: result.verdict,
      score: result.score,
      timestamp: Date.now()
    };
    saveProgress(storageKey, progress);
    updateScoreDisplay(storageKey, currentQuestions.length);

    if (q.type === "multiple-choice") {
      const labels = document.querySelectorAll(`.choices[data-qid="${qid}"] label`);
      labels.forEach((lbl, i) => {
        if (i === q.answer) lbl.classList.add("correct");
        else if (i === userAnswer && result.verdict === "incorrect") lbl.classList.add("incorrect");
      });
    }

    // ★ 채점 완료 후 문제 잠금
    lockQuestion(qid, q);

  } catch (err) {
    alert("채점 중 오류: " + err.message);
    console.error(err);
    // 오류 시에는 잠금하지 않음 → 재시도 가능
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function handleReset(e) {
  const qid = e.currentTarget.dataset.qid;

  // 이미 제출 확정된 문제는 초기화 불가
  if (lockedQuestions.has(qid)) {
    alert("이미 제출된 문제는 초기화할 수 없습니다.");
    return;
  }

  const q = currentQuestions.find(x => x.id === qid);
  if (!q) return;

  if (q.type === "multiple-choice") {
    document.querySelectorAll(`input[name="q-${qid}"]`).forEach(r => r.checked = false);
    document.querySelectorAll(`.choices[data-qid="${qid}"] label`).forEach(lbl => {
      lbl.classList.remove("correct", "incorrect", "disabled");
    });
  } else {
    const ta = document.querySelector(`textarea[data-qid="${qid}"]`);
    if (ta) ta.value = "";
  }

  const fb = document.getElementById("fb-" + qid);
  if (fb) { fb.className = "feedback"; fb.innerHTML = ""; }

  const storageKey = getStorageKey();
  const progress = loadProgress(storageKey);
  delete progress[qid];
  saveProgress(storageKey, progress);
  updateScoreDisplay(storageKey, currentQuestions.length);
}

async function handleEndSession() {
  const storageKey = getStorageKey();
  const progress = loadProgress(storageKey);
  const total = currentQuestions.length;
  const correct = Object.values(progress).filter(p => p.verdict === "correct").length;
  const score = total > 0 ? correct / total : 0;

  const msgEl = document.getElementById("session-save-msg");
  if (msgEl) msgEl.innerHTML = '<span class="lbl">저장 중...</span>';

  if (!currentSubjectId) {
    if (msgEl) msgEl.innerHTML = '<div class="note">레거시 페이지에서는 원격 저장이 지원되지 않습니다.</div>';
    return;
  }

  if (window.__db && window.__db.savePracticeSession) {
    try {
      await window.__db.savePracticeSession({
        subjectId: currentSubjectId,
        chapterId: currentChapterId,
        correct, total, score,
        date: new Date().toISOString()
      });
      const pct = Math.round(score * 100);
      if (msgEl) msgEl.innerHTML = `<div class="note ok">✓ 저장되었습니다 — 점수 ${pct}% (${correct}/${total})</div>`;
    } catch (err) {
      if (msgEl) msgEl.innerHTML = `<div class="note err"><span class="lbl">저장 실패</span>${err.message}</div>`;
    }
  }

  // 세션 종료 후 localStorage 진행 데이터 삭제 (다음 방문 시 리셋)
  saveProgress(storageKey, {});
  lockedQuestions.clear();
}

/* ------------------------------------------------------------
   MOCK 모드: 타이머 + 일괄 제출
   ------------------------------------------------------------ */
function renderMockIntro() {
  const container = document.getElementById("questions-container");
  container.innerHTML = `
    <div class="note">
      <span class="lbl">모의고사 안내</span>
      총 ${currentQuestions.length}문항. 시작 버튼을 누르면 타이머가 작동하며,
      제출 전에는 문항별 정답이 공개되지 않습니다. 제출 시 결과와 소요시간이 저장됩니다.
      (최근 5회까지 보관)
    </div>
    <div style="text-align:center; margin:24px 0">
      <button class="btn-submit" id="mock-start-btn" style="padding:14px 28px; font-size:16px">모의고사 시작</button>
    </div>
  `;
  document.getElementById("mock-start-btn").addEventListener("click", startMock);
}

function startMock() {
  mockStartedAt = Date.now();
  mockEndedAt = null;
  mockSubmitted = false;

  const container = document.getElementById("questions-container");
  // 타이머 바 + 문항 + 일괄 제출 버튼
  container.innerHTML = `
    <div class="quiz-header" style="position:sticky; top:0; z-index:5; background:var(--bg, #fff); padding:12px 0; border-bottom:1px solid #ddd">
      <div>
        <div class="meta">경과 시간</div>
        <div class="score" id="mock-timer">00:00</div>
      </div>
      <div>
        <button class="btn-submit" id="mock-submit-btn" style="padding:10px 20px">제출</button>
      </div>
    </div>
    <div id="mock-questions">
      ${currentQuestions.map((q, i) => renderQuestion(q, i)).join("")}
    </div>
  `;

  // 모의고사에서는 개별 "제출"/"초기화" 버튼을 비활성화
  container.querySelectorAll(".q-actions").forEach(el => { el.style.display = "none"; });

  if (typeof renderMathInElement === "function") {
    renderMathInElement(container, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ],
      throwOnError: false
    });
  }

  // 타이머
  mockTimerInt = setInterval(updateMockTimer, 500);
  updateMockTimer();

  document.getElementById("mock-submit-btn").addEventListener("click", confirmAndSubmitMock);
}

function updateMockTimer() {
  if (!mockStartedAt) return;
  const end = mockEndedAt || Date.now();
  const elapsed = Math.floor((end - mockStartedAt) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const el = document.getElementById("mock-timer");
  if (el) el.textContent = `${mm}:${ss}`;
}

// ★ 모의고사 제출 확인 다이얼로그
function confirmAndSubmitMock() {
  if (mockSubmitted) return;

  // 미응답 문항 수 체크
  let unanswered = 0;
  for (const q of currentQuestions) {
    const ans = getUserAnswer(q);
    if (ans === null || ans === "" || (typeof ans === "string" && ans.trim() === "")) {
      unanswered++;
    }
  }

  let msg = "제출하면 채점 결과를 번복할 수 없습니다. 제출하시겠습니까?";
  if (unanswered > 0) {
    msg = `아직 ${unanswered}개 문항이 미응답 상태입니다.\n\n제출하면 채점 결과를 번복할 수 없습니다. 제출하시겠습니까?`;
  }

  if (!confirm(msg)) return;
  submitMock();
}

async function submitMock() {
  if (mockSubmitted) return;
  mockSubmitted = true;
  mockEndedAt = Date.now();
  if (mockTimerInt) { clearInterval(mockTimerInt); mockTimerInt = null; }
  updateMockTimer();

  const submitBtn = document.getElementById("mock-submit-btn");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "채점 중..."; }

  // 일괄 채점
  const details = [];
  let correctCount = 0;
  for (const q of currentQuestions) {
    const userAnswer = getUserAnswer(q);
    let result;
    try {
      // 증명형이면서 API 키 없으면 자동으로 오답 처리(모의고사 중단 방지)
      if ((q.type === "proof" || q.type === "essay") && !getApiKey()) {
        result = { verdict: "incorrect", score: 0, explanation: "API 키 미등록으로 자동 오답 처리" };
      } else if (userAnswer === null || userAnswer === "" ||
                 (typeof userAnswer === "string" && userAnswer.trim() === "")) {
        result = { verdict: "incorrect", score: 0, explanation: "미응답" };
      } else {
        result = await gradeQuestion(q, userAnswer);
      }
    } catch (err) {
      console.warn("문항 채점 실패:", q.id, err);
      result = { verdict: "incorrect", score: 0, explanation: "채점 오류: " + err.message };
    }

    renderFeedback(q.id, result);

    // 모의고사에서도 제출 후 입력 잠금
    if (q.type === "multiple-choice") {
      document.querySelectorAll(`input[name="q-${q.id}"]`).forEach(r => { r.disabled = true; });
      const labels = document.querySelectorAll(`.choices[data-qid="${q.id}"] label`);
      labels.forEach((lbl, i) => {
        lbl.classList.add("disabled");
        lbl.style.cursor = "default";
        if (i === q.answer) lbl.classList.add("correct");
        else if (i === userAnswer && result.verdict === "incorrect") lbl.classList.add("incorrect");
      });
    } else {
      const ta = document.querySelector(`textarea[data-qid="${q.id}"]`);
      if (ta) { ta.disabled = true; ta.style.opacity = "0.7"; }
    }

    if (result.verdict === "correct") correctCount++;
    details.push({ questionId: q.id, verdict: result.verdict });
  }

  const total = currentQuestions.length;
  const score = total > 0 ? correctCount / total : 0;
  const durationMs = mockEndedAt - mockStartedAt;

  // 저장
  if (window.__db && window.__db.saveMockRecord) {
    try {
      await window.__db.saveMockRecord({
        subjectId: currentSubjectId,
        score, correct: correctCount, total,
        durationMs, details,
        date: new Date().toISOString()
      });
    } catch (err) {
      console.warn("모의고사 저장 실패:", err);
    }
  }

  // 상단에 요약 삽입
  const header = document.querySelector(".quiz-header");
  if (header) {
    const summary = document.createElement("div");
    summary.className = "note";
    summary.style.marginTop = "12px";
    summary.style.width = "100%";
    const pct = Math.round(score * 100);
    const mm = String(Math.floor(durationMs / 60000)).padStart(2, "0");
    const ss = String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0");
    summary.innerHTML = `<span class="lbl">결과</span>
      점수 <strong>${pct}%</strong> (${correctCount} / ${total}) ·
      소요시간 <strong>${mm}:${ss}</strong> ·
      기록이 저장되었습니다. <a href="history.html" style="color:var(--accent); text-decoration:none">최근 기록 보기 →</a>`;
    header.parentNode.insertBefore(summary, header.nextSibling);
  }

  if (submitBtn) submitBtn.textContent = "제출 완료";
}

/* ------------------------------------------------------------
   API Key UI (기존 동작)
   ------------------------------------------------------------ */
function updateApiStatus() {
  const el = document.getElementById("api-status");
  if (!el) return;
  const hasKey = !!getApiKey();
  el.textContent = hasKey ? "API KEY · 등록됨" : "API KEY · 미등록";
  el.className = "api-status " + (hasKey ? "ok" : "err");
}

function handleSaveApiKey() {
  const input = document.getElementById("api-key-input");
  const key = input.value.trim();
  if (!key.startsWith("AIza")) {
    alert("Google API 키는 보통 'AIza'로 시작합니다. Google AI Studio (aistudio.google.com)에서 발급한 키가 맞는지 확인해주세요.");
    return;
  }
  setApiKey(key);
  input.value = "";
  updateApiStatus();
  document.getElementById("api-setup").style.display = "none";
  alert("API 키가 브라우저에 저장되었습니다.");
}

function handleClearApiKey() {
  if (confirm("저장된 API 키를 삭제하시겠습니까?")) {
    clearApiKey();
    updateApiStatus();
    alert("API 키가 삭제되었습니다.");
  }
}

function toggleApiSetup() {
  const el = document.getElementById("api-setup");
  el.style.display = el.style.display === "none" ? "block" : "none";
}
