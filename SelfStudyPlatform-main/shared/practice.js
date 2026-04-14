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

let mockChapterSelections = [];
const mockQuestionBankCache = {};

const MOCK_CHAPTER_OPTIONS = [
  { id: 'ch1', title: 'Ch.1 수의 체계와 컴퓨터의 수 표현' },
  { id: 'ch2', title: 'Ch.2 명제 논리와 추론' },
  { id: 'ch3', title: 'Ch.3 수학적 증명과 귀납법' },
  { id: 'ch4', title: 'Ch.4 집합론과 집합의 연산' },
  { id: 'ch5', title: 'Ch.5 행렬과 행렬 연산' }
];

const MOCK_TOPIC_BLUEPRINTS = {
  ch1: [
    { key: 's1', title: '§1 수의 체계 · 기약분수', spec: [[1, 3]] },
    { key: 's2', title: '§2 복소수의 연산', spec: [[4, 5]] },
    { key: 's3', title: '§3 시그마 · 파이 · 팩토리얼', spec: [[6, 13]] },
    { key: 's4', title: '§4 정수의 나눗셈 정리', spec: [[14, 15]] },
    { key: 's5', title: '§5 진법 변환', spec: [[16, 31]] },
    { key: 's6', title: '§6 컴퓨터의 정수(음수) 표현 및 연산', spec: [[32, 36]] }
  ],
  ch2: [
    { key: 's1', title: '§1 명제', spec: [[1, 2]] },
    { key: 's2', title: '§2 논리 연산자와 합성명제', spec: [[3, 8]] },
    { key: 's3', title: '§3 조건명제의 변형 (역·이·대우)', spec: [[9, 10]] },
    { key: 's4', title: '§4 논리적 동치 법칙', spec: [[11, 14]] },
    { key: 's5', title: '§5 명제함수와 한정자', spec: [[15, 22]] },
    { key: 's6', title: '§6 논리적 추론', spec: [[23, 25]] }
  ],
  ch3: [
    { key: 's1', title: '§1 증명을 위한 기초 수학적 정의', spec: [[1, 15]] },
    { key: 's2', title: '§2 논리적 증명 기법', spec: [[16, 17], [20, 43]] },
    { key: 's3', title: '§3 부등식의 증명', spec: [[18, 19]] },
    { key: 's4', title: '§4 수학적 귀납법', spec: [[44, 53]] }
  ],
  ch4: [
    { key: 's1', title: '§1 집합의 기초 표기와 분류', spec: [[1, 2]] },
    { key: 's2', title: '§2 원소와 집합의 포함 관계', spec: [[3, 6]] },
    { key: 's3', title: '§3 집합의 기본 연산', spec: [[7, 12]] },
    { key: 's4', title: '§4 포함-배제의 원리와 기수 계산', spec: [[13, 16], [20, 27]] },
    { key: 's5', title: '§5 곱집합과 멱집합', spec: [[17, 19]] },
    { key: 's6', title: '§6 집합의 대수 법칙', spec: [[28, 31]] }
  ],
  ch5: [
    { key: 's1', title: '§1 행렬의 기초', spec: [[1, 1]] },
    { key: 's2', title: '§2 행렬의 기본 연산', spec: [[2, 3], [6, 6]] },
    { key: 's3', title: '§3 행렬의 곱셈', spec: [[4, 4], [7, 7]] },
    { key: 's4', title: '§4 특수한 형태의 행렬', spec: [[5, 5], [8, 9]] },
    { key: 's5', title: '§5 부울 행렬과 연산', spec: [[10, 11]] },
    { key: 's6', title: '§6 행렬식과 역행렬', spec: [[12, 14]] },
    { key: 's7', title: '§7 연립일차방정식과 가우스 소거법', spec: [[15, 17]] }
  ]
};

function questionNumberFromId(id) {
  const m = String(id || '').match(/q0*(\d+)$/);
  return m ? parseInt(m[1], 10) : NaN;
}

function extractSourceProblemNumber(question) {
  if (!question || typeof question !== 'object') return NaN;
  if (Number.isInteger(question.__sourceProblemNumber)) return question.__sourceProblemNumber;

  const text = String(question.text || '');
  const match = text.match(/\[문제\s*0*(\d+)/);
  const parsed = match ? parseInt(match[1], 10) : questionNumberFromId(question.id);
  question.__sourceProblemNumber = Number.isFinite(parsed) ? parsed : NaN;
  return question.__sourceProblemNumber;
}

function buildNumberSet(spec) {
  const nums = [];
  (spec || []).forEach(entry => {
    if (Array.isArray(entry) && entry.length === 2) {
      for (let n = entry[0]; n <= entry[1]; n += 1) nums.push(n);
    } else if (typeof entry === 'number') {
      nums.push(entry);
    }
  });
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomSample(arr, count) {
  return shuffle(arr).slice(0, count);
}

async function loadQuestionSet(chapterId) {
  if (mockQuestionBankCache[chapterId]) return mockQuestionBankCache[chapterId];
  const questionPath = window.location.pathname.includes('/subjects/')
    ? `../questions/${chapterId}.json`
    : `questions/${chapterId}.json`;
  const res = await fetch(questionPath);
  if (!res.ok) throw new Error(`${chapterId} 문제 파일 로드 실패`);
  const data = await res.json();
  mockQuestionBankCache[chapterId] = data;
  return data;
}

function getTopicPools(chapterId, questions) {
  const topicDefs = MOCK_TOPIC_BLUEPRINTS[chapterId] || [];
  return topicDefs.map(topic => {
    const allowedNums = new Set(buildNumberSet(topic.spec));
    return {
      ...topic,
      pool: questions.filter(q => allowedNums.has(extractSourceProblemNumber(q)))
    };
  }).filter(topic => topic.pool.length > 0);
}

function allocateCountsProportionally(topics, totalCount) {
  if (!topics.length) return [];

  const baseAlloc = topics.map(topic => Math.min(1, topic.pool.length));
  let assigned = baseAlloc.reduce((a, b) => a + b, 0);
  if (assigned >= totalCount) {
    return baseAlloc.map((count, i) => (i < totalCount ? count : 0));
  }

  const extraNeeded = totalCount - assigned;
  const weights = topics.map(t => t.pool.length);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (!weightSum) return topics.map(() => 0);

  const quotas = weights.map(w => (extraNeeded * w) / weightSum);
  const extraAlloc = quotas.map((q, i) => Math.min(Math.floor(q), Math.max(topics[i].pool.length - baseAlloc[i], 0)));
  assigned += extraAlloc.reduce((a, b) => a + b, 0);

  while (assigned < totalCount) {
    const candidates = topics
      .map((topic, i) => ({
        i,
        remainder: quotas[i] - extraAlloc[i],
        spare: topic.pool.length - baseAlloc[i] - extraAlloc[i]
      }))
      .filter(x => x.spare > 0)
      .sort((a, b) => b.remainder - a.remainder);

    if (!candidates.length) break;
    const bestRemainder = candidates[0].remainder;
    const tied = candidates.filter(x => Math.abs(x.remainder - bestRemainder) < 1e-9);
    const chosen = tied[Math.floor(Math.random() * tied.length)];
    extraAlloc[chosen.i] += 1;
    assigned += 1;
  }

  const alloc = topics.map((_, i) => baseAlloc[i] + extraAlloc[i]);

  while (assigned > totalCount) {
    const candidates = topics
      .map((topic, i) => ({ i, remainder: quotas[i] - extraAlloc[i], extra: extraAlloc[i] }))
      .filter(x => x.extra > 0)
      .sort((a, b) => a.remainder - b.remainder);

    if (!candidates.length) break;
    const worst = candidates[0].remainder;
    const tied = candidates.filter(x => Math.abs(x.remainder - worst) < 1e-9);
    const chosen = tied[Math.floor(Math.random() * tied.length)];
    extraAlloc[chosen.i] -= 1;
    alloc[chosen.i] -= 1;
    assigned -= 1;
  }

  return alloc;
}

function chooseTopicsForMock(topics) {
  if (topics.length === 6) return [...topics];
  if (topics.length < 6) return [...topics];
  return randomSample(topics, 6);
}

function pickQuestionsFromTopics(chapterId, topics, desiredCount, usedQuestionIds) {
  const picked = [];
  const usedWithinSet = new Set();

  const takeFromTopic = (topic, count) => {
    const preferred = shuffle(topic.pool.filter(q => !usedWithinSet.has(q.id) && !usedQuestionIds.has(q.id)));
    const backup = shuffle(topic.pool.filter(q => !usedWithinSet.has(q.id)));
    const source = preferred.length >= count ? preferred : [...preferred, ...backup.filter(q => !preferred.some(p => p.id === q.id))];
    const chosen = source.slice(0, count);
    chosen.forEach(q => {
      usedWithinSet.add(q.id);
      usedQuestionIds.add(q.id);
      picked.push({
        ...q,
        mockSourceChapterId: chapterId,
        mockSourceTopicKey: topic.key,
        mockSourceTopicTitle: topic.title
      });
    });
  };

  if (topics.length >= desiredCount) {
    chooseTopicsForMock(topics).forEach(topic => takeFromTopic(topic, 1));
  } else {
    const alloc = allocateCountsProportionally(topics, desiredCount);
    topics.forEach((topic, i) => {
      if (alloc[i] > 0) takeFromTopic(topic, alloc[i]);
    });
  }

  if (picked.length < desiredCount) {
    const chapterPool = shuffle(topics.flatMap(topic => topic.pool).filter(q => !usedWithinSet.has(q.id) && !usedQuestionIds.has(q.id)));
    chapterPool.slice(0, desiredCount - picked.length).forEach(q => {
      usedWithinSet.add(q.id);
      usedQuestionIds.add(q.id);
      picked.push({ ...q, mockSourceChapterId: chapterId, mockSourceTopicKey: 'fallback', mockSourceTopicTitle: '보충 출제' });
    });
  }

  return picked.slice(0, desiredCount);
}

async function generateMockQuestionsFromSelections(selections) {
  const usedQuestionIds = new Set();
  const assembled = [];
  const summary = [];

  for (const chapterId of selections) {
    const data = await loadQuestionSet(chapterId);
    const topics = getTopicPools(chapterId, data.questions || []);
    const questions = pickQuestionsFromTopics(chapterId, topics, 6, usedQuestionIds);
    const chapterMeta = MOCK_CHAPTER_OPTIONS.find(ch => ch.id === chapterId);
    assembled.push(...questions);
    summary.push({
      chapterId,
      title: chapterMeta ? chapterMeta.title : chapterId,
      topicCount: topics.length,
      questionCount: questions.length
    });
  }

  return { questions: assembled, summary };
}

function chapterSelectionLabel(chapterId) {
  const found = MOCK_CHAPTER_OPTIONS.find(ch => ch.id === chapterId);
  return found ? found.title : chapterId;
}

function getStorageKey() {
  return currentSubjectId ? `${currentSubjectId}_${currentChapterId}` : currentChapterId;
}

function isMock() { return currentMode === "mock"; }

function isBlankUserAnswer(q, userAnswer) {
  if (q.type === "truth-table") {
    const requiresClassification = Array.isArray(q.classificationChoices) && q.classificationChoices.length > 0;
    return (!userAnswer || userAnswer.filledCount === 0) && (!requiresClassification || userAnswer?.classification == null);
  }
  return userAnswer === null || userAnswer === "" || (typeof userAnswer === "string" && userAnswer.trim() === "");
}

function setTruthTableInputsDisabled(qid, disabled) {
  document.querySelectorAll(`.tt-cell[data-qid="${qid}"]`).forEach(input => {
    input.disabled = disabled;
    input.style.opacity = disabled ? "0.7" : "1";
  });
  document.querySelectorAll(`input[name="q-${qid}-classification"]`).forEach(input => {
    input.disabled = disabled;
  });
  document.querySelectorAll(`.tt-classification .choices[data-qid="${qid}-classification"] label`).forEach(lbl => {
    lbl.classList.toggle("disabled", disabled);
    lbl.style.cursor = disabled ? "default" : "pointer";
  });
}

function decorateTruthTableFeedback(q, userAnswer, result) {
  if (!q || q.type !== "truth-table") return;

  const answerRows = Array.isArray(q.answers) ? q.answers : [];
  const userRows = Array.isArray(userAnswer?.cells) ? userAnswer.cells : [];
  const templateRows = Array.isArray(q.data) ? q.data : [];

  templateRows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell === null) {
        const input = document.querySelector(`.tt-cell[data-qid="${q.id}"][data-row="${ri}"][data-col="${ci}"]`);
        if (!input) return;
        const expected = normalizeTruthValue(answerRows?.[ri]?.[ci]);
        const actual = normalizeTruthValue(userRows?.[ri]?.[ci]);
        input.value = actual || input.value || "";
        input.classList.remove("cell-correct", "cell-incorrect");
        if (actual) input.classList.add(actual === expected ? "cell-correct" : "cell-incorrect");
      }
    });
  });

  document.querySelectorAll(`input[name="q-${q.id}-classification"]`).forEach(input => {
    const label = input.closest("label");
    if (!label) return;
    label.classList.remove("correct", "incorrect");
    const idx = parseInt(input.value, 10);
    if (idx === q.classificationAnswer) label.classList.add("correct");
    else if (userAnswer?.classification === idx && result.verdict !== "correct") label.classList.add("incorrect");
  });
}


/* ------------------------------------------------------------
   진입점
   ------------------------------------------------------------ */
async function initPractice(arg1, arg2, arg3) {
  if (typeof arg2 === "undefined") {
    currentSubjectId = "";
    currentChapterId = arg1;
    currentMode = "practice";
  } else {
    currentSubjectId = arg1;
    currentChapterId = arg2;
    currentMode = arg3 || "practice";
  }

  if (isMock() && currentChapterId === 'mock') {
    currentQuestions = [];
    const titleEl = document.getElementById('quiz-title');
    if (titleEl) titleEl.textContent = '이산수학 모의고사';
    renderMockIntro();
    updateApiStatus();
    return;
  }

  let questionPath;
  if (window.location.pathname.includes('/subjects/')) {
    questionPath = `../questions/${currentChapterId}.json`;
  } else {
    questionPath = `questions/${currentChapterId}.json`;
  }

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
  container.querySelectorAll(".tt-cell").forEach(input => {
    input.addEventListener("input", e => {
      const normalized = normalizeTruthValue(e.target.value);
      e.target.value = normalized;
      e.target.classList.remove("cell-correct", "cell-incorrect");
      if (!normalized) return;
      const qid = e.target.dataset.qid;
      const cells = Array.from(container.querySelectorAll(`.tt-cell[data-qid="${qid}"]:not(:disabled)`));
      const idx = cells.indexOf(e.target);
      if (idx >= 0 && idx < cells.length - 1) cells[idx + 1].focus();
    });
  });
}

/**
 * 문제를 잠그는 함수: 입력 비활성화, 버튼 숨김
 */
function lockQuestion(qid, q) {
  lockedQuestions.add(qid);

  if (q.type === "multiple-choice") {
    document.querySelectorAll(`input[name="q-${qid}"]`).forEach(r => { r.disabled = true; });
    document.querySelectorAll(`.choices[data-qid="${qid}"] label`).forEach(lbl => {
      lbl.classList.add("disabled");
      lbl.style.cursor = "default";
    });
  } else if (q.type === "truth-table") {
    setTruthTableInputsDisabled(qid, true);
  } else {
    const ta = document.querySelector(`textarea[data-qid="${qid}"]`);
    if (ta) { ta.disabled = true; ta.style.opacity = "0.7"; }
  }

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
  if (isBlankUserAnswer(q, userAnswer)) {
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
    } else if (q.type === "truth-table") {
      decorateTruthTableFeedback(q, userAnswer, result);
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
  } else if (q.type === "truth-table") {
    document.querySelectorAll(`.tt-cell[data-qid="${qid}"]`).forEach(input => {
      input.value = "";
      input.disabled = false;
      input.style.opacity = "1";
      input.classList.remove("cell-correct", "cell-incorrect");
    });
    document.querySelectorAll(`input[name="q-${qid}-classification"]`).forEach(input => {
      input.checked = false;
      input.disabled = false;
    });
    document.querySelectorAll(`.tt-classification .choices[data-qid="${qid}-classification"] label`).forEach(lbl => {
      lbl.classList.remove("correct", "incorrect", "disabled");
      lbl.style.cursor = "pointer";
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
  const optionsHtml = MOCK_CHAPTER_OPTIONS.map(ch => `
    <button class="secondary" type="button" data-mock-add="${ch.id}" style="padding:10px 14px; margin:0 8px 8px 0">${ch.title}</button>
  `).join('');

  container.innerHTML = `
    <div class="note">
      <span class="lbl">모의고사 안내</span>
      챕터를 원하는 만큼 선택하면, <strong>선택 1회당 6문항</strong>이 생성됩니다.<br>
      주제 수가 6개보다 적은 챕터는 <strong>모든 주제를 최소 1문항씩 포함한 뒤</strong> 주제별 커버 문제 수 비율에 따라 나머지를 배분하고,<br>
      주제 수가 7개 이상인 챕터는 <strong>주제를 랜덤하게 6개만 남겨</strong> 각 1문항씩 출제합니다.
    </div>
    <div class="card" style="background:#fff; border:1px solid #ddd; border-radius:12px; padding:18px; margin:18px 0">
      <h3 style="margin-top:0">출제할 챕터 선택</h3>
      <div>${optionsHtml}</div>
      <div style="margin-top:14px">
        <div class="meta" style="margin-bottom:8px">선택된 챕터</div>
        <div id="mock-selection-list" style="display:flex; flex-wrap:wrap; gap:8px"></div>
        <div id="mock-selection-empty" class="meta" style="color:#777">아직 선택한 챕터가 없습니다.</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px">
        <button class="btn-submit" id="mock-start-btn" style="padding:14px 28px; font-size:16px">모의고사 시작</button>
        <button class="secondary" id="mock-clear-btn" type="button">선택 초기화</button>
      </div>
      <div class="meta" id="mock-selection-summary" style="margin-top:10px"></div>
    </div>
  `;

  mockChapterSelections = [];
  syncMockSelectionUI();

  container.querySelectorAll('[data-mock-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      mockChapterSelections.push(btn.dataset.mockAdd);
      syncMockSelectionUI();
    });
  });
  document.getElementById('mock-clear-btn').addEventListener('click', () => {
    mockChapterSelections = [];
    syncMockSelectionUI();
  });
  document.getElementById("mock-start-btn").addEventListener("click", startMock);
}

function syncMockSelectionUI() {
  const listEl = document.getElementById('mock-selection-list');
  const emptyEl = document.getElementById('mock-selection-empty');
  const summaryEl = document.getElementById('mock-selection-summary');
  if (!listEl || !emptyEl || !summaryEl) return;

  listEl.innerHTML = mockChapterSelections.map((chapterId, idx) => `
    <span style="display:inline-flex; align-items:center; gap:8px; padding:8px 10px; border-radius:999px; background:#f5f5f7; border:1px solid #ddd">
      <span>${chapterSelectionLabel(chapterId)}</span>
      <button type="button" data-mock-remove="${idx}" style="border:none; background:none; cursor:pointer; font-size:16px; line-height:1">×</button>
    </span>
  `).join('');
  emptyEl.style.display = mockChapterSelections.length ? 'none' : 'block';
  const totalQuestions = mockChapterSelections.length * 6;
  summaryEl.textContent = mockChapterSelections.length
    ? `현재 ${mockChapterSelections.length}회 선택 · 예상 문항 수 ${totalQuestions}문항`
    : '챕터를 하나 이상 선택해야 시작할 수 있습니다.';

  listEl.querySelectorAll('[data-mock-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.mockRemove, 10);
      mockChapterSelections.splice(idx, 1);
      syncMockSelectionUI();
    });
  });
}

async function startMock() {
  if (!mockChapterSelections.length) {
    alert('모의고사에 포함할 챕터를 하나 이상 선택해주세요.');
    return;
  }

  const container = document.getElementById("questions-container");
  container.innerHTML = `<div class="note"><span class="lbl">생성 중</span>선택한 챕터를 기준으로 모의고사 문제를 구성하고 있습니다...</div>`;

  let generation;
  try {
    generation = await generateMockQuestionsFromSelections(mockChapterSelections);
  } catch (err) {
    container.innerHTML = `<div class="note err"><span class="lbl">오류</span>${escapeHtml(err.message)}</div>`;
    return;
  }

  currentQuestions = generation.questions;
  window.__mockChapterSelections = [...mockChapterSelections];
  window.__mockGenerationSummary = generation.summary;
  mockStartedAt = Date.now();
  mockEndedAt = null;
  mockSubmitted = false;

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
    <div class="note" style="margin:14px 0">
      <span class="lbl">출제 구성</span>
      ${generation.summary.map(item => `${item.title} · ${item.questionCount}문항`).join('<br>')}
    </div>
    <div id="mock-questions">
      ${currentQuestions.map((q, i) => renderQuestion(q, i)).join("")}
    </div>
  `;

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
    if (isBlankUserAnswer(q, ans)) {
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
      } else if (isBlankUserAnswer(q, userAnswer)) {
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
    } else if (q.type === "truth-table") {
      decorateTruthTableFeedback(q, userAnswer, result);
      setTruthTableInputsDisabled(q.id, true);
    } else {
      const ta = document.querySelector(`textarea[data-qid="${q.id}"]`);
      if (ta) { ta.disabled = true; ta.style.opacity = "0.7"; }
    }

    if (result.verdict === "correct") correctCount++;
    details.push({ questionId: q.id, verdict: result.verdict, score: result.score || 0 });
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
        chapterSelections: Array.isArray(window.__mockChapterSelections) ? window.__mockChapterSelections : [],
        generationSummary: Array.isArray(window.__mockGenerationSummary) ? window.__mockGenerationSummary : [],
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
