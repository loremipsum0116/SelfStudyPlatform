/* ============================================================
   Discrete Math · Grading Engine (Gemini Edition)
   - multiple-choice: local grading
   - short-answer:    Gemini grading
   - proof/essay:     Google Gemini 2.5 Flash (thinking mode) grading
   ============================================================ */

const STORAGE_KEY_API = "dm_gemini_api_key";
const STORAGE_KEY_PROGRESS_PREFIX = "dm_progress_"; // + chapter id

// Gemini model settings
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ---------- API key management ----------
function getApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) || "";
}
function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY_API, key);
}
function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY_API);
}

// ---------- Progress (per chapter) ----------
function loadProgress(chapterId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS_PREFIX + chapterId);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveProgress(chapterId, progress) {
  localStorage.setItem(STORAGE_KEY_PROGRESS_PREFIX + chapterId, JSON.stringify(progress));
}

// ---------- Normalization (short-answer comparison) ----------
function normalizeAnswer(s) {
  if (s == null) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()\[\]{}]/g, "")
    .replace(/[,.]/g, "");
}

// ---------- Truth-table helpers ----------
function normalizeTruthValue(v) {
  if (v == null) return "";
  const s = String(v).trim().toLowerCase();
  if (!s) return "";
  if (["t", "true", "참", "1", "o", "○"].includes(s)) return "T";
  if (["f", "false", "거짓", "0", "x", "×"].includes(s)) return "F";
  return "";
}

function buildTruthTableAnswerHtml(question) {
  const headers = Array.isArray(question.headers) ? question.headers : [];
  const rows = Array.isArray(question.answers) ? question.answers : [];
  const cls = Array.isArray(question.classificationChoices)
    ? question.classificationChoices[question.classificationAnswer] || ""
    : "";

  const thead = headers.length
    ? `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`
    : "";
  const tbody = `<tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  const clsHtml = cls ? `<p><strong>분류</strong> ${escapeHtml(cls)}</p>` : "";
  return `<div class="truth-answer"><div class="truth-answer-label">완성된 진리표</div><div class="truth-table-wrap"><table class="truth-table answer-table">${thead}${tbody}</table></div>${clsHtml}</div>`;
}

// ---------- Local graders ----------
function gradeMultipleChoice(question, userAnswer) {
  const correct = userAnswer === question.answer;
  return {
    verdict: correct ? "correct" : "incorrect",
    score: correct ? 1 : 0,
    explanation: question.explanation || "",
    correctAnswer: question.choices[question.answer]
  };
}

function gradeShortAnswer(question, userAnswer) {
  const normUser = normalizeAnswer(userAnswer);
  const accepted = (question.accepted || [question.answer]).map(normalizeAnswer);
  const correct = accepted.includes(normUser);
  return {
    verdict: correct ? "correct" : "incorrect",
    score: correct ? 1 : 0,
    explanation: question.explanation || "",
    correctAnswer: question.answer
  };
}

function gradeTruthTable(question, userAnswer) {
  const templateRows = Array.isArray(question.data) ? question.data : [];
  const answerRows = Array.isArray(question.answers) ? question.answers : [];
  const userRows = Array.isArray(userAnswer?.cells) ? userAnswer.cells : [];

  let totalEditable = 0;
  let correctEditable = 0;

  templateRows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell === null) {
        totalEditable += 1;
        const expected = normalizeTruthValue(answerRows?.[ri]?.[ci]);
        const actual = normalizeTruthValue(userRows?.[ri]?.[ci]);
        if (actual && actual === expected) correctEditable += 1;
      }
    });
  });

  const hasClassification = typeof question.classificationAnswer === "number";
  const totalItems = totalEditable + (hasClassification ? 1 : 0);
  let scoreItems = correctEditable;
  const classificationCorrect = hasClassification && userAnswer?.classification === question.classificationAnswer;
  if (classificationCorrect) scoreItems += 1;

  const score = totalItems > 0 ? scoreItems / totalItems : 0;
  const verdict = score >= 1 ? "correct" : score > 0 ? "partial" : "incorrect";

  return {
    verdict,
    score,
    explanation: question.explanation || "",
    correctAnswerHtml: buildTruthTableAnswerHtml(question),
    truthTableStats: {
      totalEditable,
      correctEditable,
      classificationCorrect
    }
  };
}


function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function escapeControlCharsInsideJsonStrings(text) {
  const input = String(text || "");
  let out = "";
  let inString = false;
  let escaping = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      if (escaping) {
        out += ch;
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaping = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }

    out += ch;
    if (ch === '"') inString = true;
  }

  return out;
}

function extractLikelyJsonObject(text) {
  const input = String(text || "");
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return input.slice(start, end + 1).trim();
}

function parseGeminiJsonResponse(text) {
  const cleaned = stripCodeFences(text);
  const candidates = [];
  const jsonLike = extractLikelyJsonObject(cleaned);

  if (cleaned) candidates.push(cleaned);
  if (jsonLike && jsonLike !== cleaned) candidates.push(jsonLike);

  const seen = new Set();
  let lastError = null;

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastError = err;
    }

    const repaired = escapeControlCharsInsideJsonStrings(candidate)
      .replace(/,\s*([}\]])/g, "$1")
      .trim();

    if (!repaired || seen.has(repaired)) continue;
    seen.add(repaired);

    try {
      return JSON.parse(repaired);
    } catch (err) {
      lastError = err;
    }
  }

  const preview = cleaned.slice(0, 300);
  const detail = lastError && lastError.message ? lastError.message : "알 수 없는 파싱 오류";
  throw new Error(`AI 응답을 파싱할 수 없습니다: ${detail} / 응답 일부: ${preview}`);
}

function buildShortAnswerFallbackResult(question, userAnswer) {
  const local = gradeShortAnswer(question, userAnswer);
  const correctAnswer = question.answer || "";
  const explanation = question.explanation || "";

  if (local.verdict === "correct") {
    return {
      verdict: "correct",
      score: 1,
      strengths: "제출한 답이 기준 정답과 일치합니다.",
      issues: "",
      suggestions: "",
      correctAnswer,
      modelAnswer: question.modelAnswer || "",
      explanation
    };
  }

  return {
    verdict: "incorrect",
    score: 0,
    strengths: "",
    issues: "제출한 답이 기준 정답과 일치하지 않습니다.",
    suggestions: "시그마의 적용 범위, 항의 개수, 계산 과정을 다시 확인해 보세요.",
    correctAnswer,
    modelAnswer: question.modelAnswer || "",
    explanation
  };
}

// ---------- Proof grading via Gemini API ----------
async function gradeProofWithGemini(question, userAnswer) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. 페이지 상단에서 Google Gemini API 키를 먼저 입력해주세요.");
  }

  const systemInstruction = `당신은 이산수학 증명 문제를 채점하는 엄격하면서도 공정한 조교입니다.
학생의 증명을 평가하고 지정된 JSON 스키마에 따라 응답하세요.

채점 기준:
- "correct": 논리적 비약 없이 증명이 완결되었고, 결론에 도달함
- "partial": 방향은 맞으나 일부 단계가 빠졌거나 엄밀성이 부족함
- "incorrect": 증명 방법이 잘못되었거나 결론에 도달하지 못함

학생이 사용한 증명 기법(직접 증명/대우 증명/귀류법/수학적 귀납법 등)을 인식하고 해당 기법의 형식적 요구사항을 기준으로 평가하세요.

특히 수학적 귀납법은 3단계 구조(기본 단계, 귀납 가정, 귀납 단계)가 모두 서술되어야 하며, 귀류법은 부정 가정 → 모순 도출 흐름이 명확해야 합니다.

모든 응답은 한국어로 작성하세요. 잘한 점/논리 오류/보완할 점이 없으면 해당 필드는 빈 문자열로 두세요.`;

  const userMessage = `[문제]
${question.text}

${question.hint ? `[힌트·요구사항]\n${question.hint}\n\n` : ""}${question.modelAnswer ? `[모범답안 참고]\n${question.modelAnswer}\n\n` : ""}[학생의 답안]
${userAnswer}

위 답안을 채점해주세요.`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: ["correct", "partial", "incorrect"]
          },
          score: { type: "number" },
          strengths: { type: "string" },
          issues: { type: "string" },
          suggestions: { type: "string" }
        },
        required: ["verdict", "score", "strengths", "issues", "suggestions"]
      },
      temperature: 0.2,
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingBudget: -1  // -1 = dynamic (model decides), 0 = disabled
      }
    }
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `API 오류 (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error && errJson.error.message) {
        errMsg += `: ${errJson.error.message}`;
      }
    } catch {
      errMsg += `: ${errText.slice(0, 200)}`;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("Gemini가 응답을 반환하지 않았습니다. (차단되었거나 빈 응답)");
  }
  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    throw new Error("Gemini 응답 형식이 예상과 다릅니다.");
  }

  const text = candidate.content.parts
    .map(p => p.text || "")
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다. 답안이 너무 짧거나 모델이 차단한 것일 수 있습니다.");
  }

  const parsed = parseGeminiJsonResponse(text);

  return {
    verdict: parsed.verdict || "incorrect",
    score: typeof parsed.score === "number" ? parsed.score : 0,
    strengths: parsed.strengths || "",
    issues: parsed.issues || "",
    suggestions: parsed.suggestions || ""
  };
}

// ---------- Unified grade dispatcher ----------
async function gradeQuestion(question, userAnswer) {
  switch (question.type) {
    case "multiple-choice":
      return gradeMultipleChoice(question, userAnswer);
    case "short-answer":
      return await gradeShortAnswerWithGemini(question, userAnswer);
    case "truth-table":
      return gradeTruthTable(question, userAnswer);
    case "proof":
    case "essay":
      return await gradeProofWithGemini(question, userAnswer);
    default:
      throw new Error("알 수 없는 문제 유형: " + question.type);
  }
}

async function gradeShortAnswerWithGemini(question, userAnswer) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  const systemInstruction = `당신은 이산수학 단답형/주관식 문제를 채점하는 엄격하면서도 공정한 조교입니다.
학생 답안을 문제 의도와 개념 정확성을 기준으로 채점하세요.
정답과 표현이 완전히 일치하지 않아도 의미가 맞으면 정답으로 볼 수 있습니다.
모든 응답은 한국어 JSON만 반환하세요.`;

  const userMessage = `[문제]
${question.text}

${question.hint ? `[힌트]\n${question.hint}\n\n` : ""}
${question.answer ? `[기준 정답]\n${question.answer}\n\n` : ""}
${question.modelAnswer ? `[모범답안]\n${question.modelAnswer}\n\n` : ""}
[학생 답안]
${userAnswer}

이 답안을 채점해주세요.`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: ["correct", "partial", "incorrect"]
          },
          score: { type: "number" },
          strengths: { type: "string" },
          issues: { type: "string" },
          suggestions: { type: "string" }
        },
        required: ["verdict", "score", "strengths", "issues", "suggestions"]
      },
      temperature: 0.2,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 오류: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();

  if (!text) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }

  let parsed;
  try {
    parsed = parseGeminiJsonResponse(text);
  } catch (err) {
    console.warn("Gemini JSON 파싱 실패, 로컬 단답형 채점으로 대체합니다.", err);
    return buildShortAnswerFallbackResult(question, userAnswer);
  }

  return {
    verdict: parsed.verdict || "incorrect",
    score: typeof parsed.score === "number" ? parsed.score : 0,
    strengths: parsed.strengths || "",
    issues: parsed.issues || "",
    suggestions: parsed.suggestions || "",
    correctAnswer: question.answer || "",
    modelAnswer: question.modelAnswer || "",
    explanation: question.explanation || ""
  };
}

function renderMathSymbolToolbox(qid) {
  const suffix = String(qid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const quickSymbols = [
    ['π', 'π'], ['∞', '∞'], ['∅', '∅'], ['∈', '∈'], ['∉', '∉'],
    ['⊂', '⊂'], ['⊆', '⊆'], ['∪', '∪'], ['∩', '∩'], ['¬', '¬'],
    ['∧', '∧'], ['∨', '∨'], ['→', '→'], ['↔', '↔'], ['∀', '∀'],
    ['∃', '∃'], ['≤', '≤'], ['≥', '≥'], ['≠', '≠'], ['×', '×'],
    ['∴', '∴'], ['∵', '∵'], ['⇒', '⇒'], ['⇔', '⇔']
  ];

  const quickButtons = quickSymbols.map(([label, value]) => `
    <button type="button" class="symbol-chip" onclick="quickInsertMathText('${suffix}', '${value}')">${label}</button>
  `).join('');

  return `
    <div class="symbol-toolbox" data-qid="${suffix}">
      <div class="symbol-toolbox-bar">
        <button type="button" class="symbol-toggle" id="symbol-toggle-${suffix}" aria-expanded="false" onclick="toggleSymbolSelector('${suffix}')">기호</button>
      </div>
      <div class="symbol-panel" id="symbol-panel-${suffix}" hidden>
        <div class="symbol-panel-head">
          <strong>기호 셀렉터</strong>
          <button type="button" class="symbol-close" onclick="toggleSymbolSelector('${suffix}', false)">닫기</button>
        </div>
        <p class="symbol-help">주관식·단답형 답안을 입력할 때 자주 쓰는 수식 기호를 쉽게 끼워 넣는 보조 도구입니다.</p>
        <div class="symbol-quick-grid">${quickButtons}</div>
        <div class="symbol-builder-grid">
          <div class="symbol-builder-card">
            <div class="symbol-builder-title">시그마 Σ</div>
            <label>부호
              <select id="sigma-sign-${suffix}">
                <option value="">없음</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </label>
            <label>인덱스
              <input id="sigma-index-${suffix}" type="text" value="j" placeholder="j">
            </label>
            <label>시작값
              <input id="sigma-start-${suffix}" type="text" placeholder="-2">
            </label>
            <label>종점
              <input id="sigma-end-${suffix}" type="text" placeholder="3">
            </label>
            <label>일반항
              <input id="sigma-term-${suffix}" type="text" placeholder="3^j">
            </label>
            <button type="button" class="symbol-apply" onclick="applyStructuredMathSymbol('${suffix}', 'sigma')">삽입</button>
          </div>

          <div class="symbol-builder-card">
            <div class="symbol-builder-title">파이 Π</div>
            <label>부호
              <select id="prod-sign-${suffix}">
                <option value="">없음</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </label>
            <label>인덱스
              <input id="prod-index-${suffix}" type="text" value="i" placeholder="i">
            </label>
            <label>시작값
              <input id="prod-start-${suffix}" type="text" placeholder="1">
            </label>
            <label>종점
              <input id="prod-end-${suffix}" type="text" placeholder="n">
            </label>
            <label>일반항
              <input id="prod-term-${suffix}" type="text" placeholder="a_i">
            </label>
            <button type="button" class="symbol-apply" onclick="applyStructuredMathSymbol('${suffix}', 'product')">삽입</button>
          </div>

          <div class="symbol-builder-card">
            <div class="symbol-builder-title">거듭제곱</div>
            <label>부호
              <select id="pow-sign-${suffix}">
                <option value="">없음</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </label>
            <label>밑
              <input id="pow-base-${suffix}" type="text" placeholder="3">
            </label>
            <label>지수
              <input id="pow-exp-${suffix}" type="text" placeholder="j">
            </label>
            <button type="button" class="symbol-apply" onclick="applyStructuredMathSymbol('${suffix}', 'power')">삽입</button>
          </div>

          <div class="symbol-builder-card">
            <div class="symbol-builder-title">분수</div>
            <label>부호
              <select id="frac-sign-${suffix}">
                <option value="">없음</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </label>
            <label>분자
              <input id="frac-num-${suffix}" type="text" placeholder="a+b">
            </label>
            <label>분모
              <input id="frac-den-${suffix}" type="text" placeholder="n">
            </label>
            <button type="button" class="symbol-apply" onclick="applyStructuredMathSymbol('${suffix}', 'fraction')">삽입</button>
          </div>

          <div class="symbol-builder-card">
            <div class="symbol-builder-title">근호</div>
            <label>부호
              <select id="root-sign-${suffix}">
                <option value="">없음</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </label>
            <label>차수(비우면 √)
              <input id="root-degree-${suffix}" type="text" placeholder="3">
            </label>
            <label>내용
              <input id="root-radicand-${suffix}" type="text" placeholder="x+1">
            </label>
            <button type="button" class="symbol-apply" onclick="applyStructuredMathSymbol('${suffix}', 'root')">삽입</button>
          </div>
        </div>
      </div>
    </div>`;
}

function findAnswerTextarea(qid) {
  return document.querySelector(`textarea[data-qid="${qid}"]`) || document.querySelector(`textarea[data-qid="${String(qid || '').replace(/_/g, '-')}"]`);
}

function toggleSymbolSelector(qid, forceOpen) {
  const panel = document.getElementById(`symbol-panel-${qid}`);
  const toggle = document.getElementById(`symbol-toggle-${qid}`);
  if (!panel) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !willOpen;
  if (toggle) toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (willOpen) {
    const firstInput = panel.querySelector('input, select, button');
    if (firstInput) firstInput.focus();
  }
}

function insertTextAtCursor(textarea, text) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  const nextPos = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(nextPos, nextPos);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function quickInsertMathText(qid, text) {
  const textarea = findAnswerTextarea(qid);
  if (!textarea) return;
  insertTextAtCursor(textarea, text);
}

function getBuilderValue(id, fallback = '') {
  const el = document.getElementById(id);
  const value = el ? String(el.value || '').trim() : '';
  return value || fallback;
}

function withLeadingSign(sign, expr) {
  if (!expr) return '';
  return `${sign || ''}${expr}`;
}

function applyStructuredMathSymbol(qid, kind) {
  const textarea = findAnswerTextarea(qid);
  if (!textarea) return;

  let inserted = '';
  if (kind === 'sigma') {
    const sign = getBuilderValue(`sigma-sign-${qid}`);
    const index = getBuilderValue(`sigma-index-${qid}`, 'j');
    const start = getBuilderValue(`sigma-start-${qid}`, '1');
    const end = getBuilderValue(`sigma-end-${qid}`, 'n');
    const term = getBuilderValue(`sigma-term-${qid}`, `${index}`);
    inserted = withLeadingSign(sign, `∑_{${index}=${start}}^{${end}} ${term}`);
  } else if (kind === 'product') {
    const sign = getBuilderValue(`prod-sign-${qid}`);
    const index = getBuilderValue(`prod-index-${qid}`, 'i');
    const start = getBuilderValue(`prod-start-${qid}`, '1');
    const end = getBuilderValue(`prod-end-${qid}`, 'n');
    const term = getBuilderValue(`prod-term-${qid}`, `${index}`);
    inserted = withLeadingSign(sign, `∏_{${index}=${start}}^{${end}} ${term}`);
  } else if (kind === 'power') {
    const sign = getBuilderValue(`pow-sign-${qid}`);
    const base = getBuilderValue(`pow-base-${qid}`, 'a');
    const exp = getBuilderValue(`pow-exp-${qid}`, 'n');
    inserted = withLeadingSign(sign, `${base}^${exp}`);
  } else if (kind === 'fraction') {
    const sign = getBuilderValue(`frac-sign-${qid}`);
    const num = getBuilderValue(`frac-num-${qid}`, 'a');
    const den = getBuilderValue(`frac-den-${qid}`, 'b');
    inserted = withLeadingSign(sign, `(${num})/(${den})`);
  } else if (kind === 'root') {
    const sign = getBuilderValue(`root-sign-${qid}`);
    const degree = getBuilderValue(`root-degree-${qid}`);
    const radicand = getBuilderValue(`root-radicand-${qid}`, 'x');
    inserted = withLeadingSign(sign, degree ? `${degree}√(${radicand})` : `√(${radicand})`);
  }

  if (!inserted) return;
  insertTextAtCursor(textarea, inserted);
}


function findMathPreview(qid) {
  return document.getElementById(`math-preview-${String(qid || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`);
}

function looksMathy(text) {
  if (!text) return false;
  const trimmed = String(text).trim();
  if (!trimmed) return false;
  if (/\$\$?|\\\(|\\\[/.test(trimmed)) return true;
  if (/[∑∏√π∞∅∈∉⊂⊆∪∩¬∧∨→↔∀∃≤≥≠×∴∵⇒⇔^_=]/.test(trimmed)) return true;
  if (/^[0-9a-zA-Z+\-*/=(){}\[\],.\s/]+$/.test(trimmed)) return true;
  return false;
}

function normalizeMathForKatex(text) {
  let expr = String(text || '').trim();
  if (!expr) return '';
  if (/\$\$?|\\\(|\\\[/.test(expr)) return expr;
  expr = expr
    .replace(/∑/g, '\\sum ')
    .replace(/∏/g, '\\prod ')
    .replace(/π/g, '\\pi ')
    .replace(/∞/g, '\\infty ')
    .replace(/∅/g, '\\emptyset ')
    .replace(/∈/g, '\\in ')
    .replace(/∉/g, '\\notin ')
    .replace(/⊂/g, '\\subset ')
    .replace(/⊆/g, '\\subseteq ')
    .replace(/∪/g, '\\cup ')
    .replace(/∩/g, '\\cap ')
    .replace(/¬/g, '\\neg ')
    .replace(/∧/g, '\\land ')
    .replace(/∨/g, '\\lor ')
    .replace(/→/g, '\\to ')
    .replace(/↔/g, '\\leftrightarrow ')
    .replace(/∀/g, '\\forall ')
    .replace(/∃/g, '\\exists ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/×/g, '\\times ')
    .replace(/∴/g, '\\therefore ')
    .replace(/∵/g, '\\because ')
    .replace(/⇒/g, '\\Rightarrow ')
    .replace(/⇔/g, '\\Leftrightarrow ');

  expr = expr.replace(/(\d*)√\(([^()]+)\)/g, (m, degree, radicand) => degree ? `\\sqrt[${degree}]{${radicand}}` : `\\sqrt{${radicand}}`);

  if (/^\(?[^()]+\)?\s*\/\s*\(?[^()]+\)?$/.test(expr)) {
    const parts = expr.split('/');
    if (parts.length === 2) {
      const num = parts[0].trim().replace(/^\((.*)\)$/,'$1');
      const den = parts[1].trim().replace(/^\((.*)\)$/,'$1');
      expr = `\\frac{${num}}{${den}}`;
    }
  }

  return `$$${expr}$$`;
}

function updateMathPreview(qid) {
  const textarea = findAnswerTextarea(qid);
  const preview = findMathPreview(qid);
  if (!preview) return;
  const raw = textarea ? String(textarea.value || '').trim() : '';
  if (!raw) {
    preview.innerHTML = '<div class="math-preview-empty">입력한 수식이 여기에서 미리보기로 표시됩니다.</div>';
    return;
  }
  if (!looksMathy(raw)) {
    preview.innerHTML = `<pre class="math-preview-plain">${escapeHtml(raw)}</pre>`;
    return;
  }
  preview.innerHTML = `<div class="math-preview-render">${escapeHtml(normalizeMathForKatex(raw))}</div>`;
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(preview, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

function initMathAnswerAssists(container = document) {
  const textareas = container.querySelectorAll('textarea[data-qid]');
  textareas.forEach(textarea => {
    const qid = textarea.dataset.qid;
    if (!qid || textarea.dataset.mathAssistBound === 'true') return;
    textarea.dataset.mathAssistBound = 'true';
    textarea.addEventListener('input', () => updateMathPreview(qid));
    updateMathPreview(qid);
  });
}

function resetMathPreview(qid) {
  const textarea = findAnswerTextarea(qid);
  if (textarea) textarea.dispatchEvent(new Event('input', { bubbles: true }));
  else updateMathPreview(qid);
}

// ---------- Question rendering ----------
function renderQuestion(q, index) {
  const tagHtml = q.type === "proof"
    ? '<span class="tag proof">서술형 · AI 채점</span>'
    : q.type === "short-answer"
      ? '<span class="tag">단답형 · AI 채점</span>'
      : q.type === "truth-table"
        ? '<span class="tag">진리표 · 부분점수</span>'
        : '<span class="tag">객관식</span>';

  let inputHtml = "";
  if (q.type === "multiple-choice") {
    inputHtml = `<ul class="choices" data-qid="${q.id}">` +
      q.choices.map((c, i) => `
        <li><label>
          <input type="radio" name="q-${q.id}" value="${i}">
          <span>${c}</span>
        </label></li>`).join("") +
      `</ul>`;
  } else if (q.type === "short-answer") {
    inputHtml = `${renderMathSymbolToolbox(q.id)}<textarea class="answer-input" data-qid="${q.id}" placeholder="답을 입력하세요... 수식은 $...$ 또는 $$...$$로 감쌀 수 있습니다."></textarea><div class="math-preview-box" id="math-preview-${String(q.id).replace(/[^a-zA-Z0-9_-]/g, '_')}"><div class="math-preview-empty">입력한 수식이 여기에서 미리보기로 표시됩니다.</div></div>`;
  } else if (q.type === "proof" || q.type === "essay") {
    inputHtml = `${renderMathSymbolToolbox(q.id)}<textarea class="answer-input proof" data-qid="${q.id}" placeholder="증명을 단계별로 서술하세요. 수식은 $...$ 또는 $$...$$로 감쌀 수 있습니다."></textarea><div class="math-preview-box" id="math-preview-${String(q.id).replace(/[^a-zA-Z0-9_-]/g, '_')}"><div class="math-preview-empty">입력한 수식이 여기에서 미리보기로 표시됩니다.</div></div>`;
  } else if (q.type === "truth-table") {
    const headers = Array.isArray(q.headers) ? q.headers : [];
    const rows = Array.isArray(q.data) ? q.data : [];
    const headerHtml = headers.length
      ? `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`
      : "";
    const bodyHtml = `<tbody>${rows.map((row, ri) => `
      <tr>${row.map((cell, ci) => {
        if (cell === null) {
          return `<td><input class="tt-cell" data-qid="${q.id}" data-row="${ri}" data-col="${ci}" maxlength="1" inputmode="latin" autocomplete="off" placeholder="T/F" aria-label="진리값 입력"></td>`;
        }
        return `<td class="prefilled">${escapeHtml(cell)}</td>`;
      }).join("")}</tr>`).join("")}</tbody>`;
    const classificationHtml = Array.isArray(q.classificationChoices) && q.classificationChoices.length
      ? `<div class="tt-classification"><div class="tt-classification-label">합성명제의 종류</div><ul class="choices compact" data-qid="${q.id}-classification">${q.classificationChoices.map((choice, idx) => `
          <li><label>
            <input type="radio" name="q-${q.id}-classification" value="${idx}">
            <span>${choice}</span>
          </label></li>`).join("")}</ul></div>`
      : "";
    inputHtml = `
      <div class="truth-table-wrap">
        <table class="truth-table" data-qid="${q.id}">
          ${headerHtml}
          ${bodyHtml}
        </table>
      </div>
      ${classificationHtml}`;
  }

  return `
    <div class="question" id="q-${q.id}" data-qid="${q.id}" data-qtype="${q.type}">
      <div class="q-num">Problem ${String(index + 1).padStart(2, "0")} ${tagHtml}</div>
      <div class="q-text">${q.text}</div>
      ${inputHtml}
      <div class="q-actions">
        <button class="btn-submit" data-action="submit" data-qid="${q.id}">제출</button>
        <button class="btn-reset" data-action="reset" data-qid="${q.id}">초기화</button>
      </div>
      <div class="feedback" id="fb-${q.id}"></div>
    </div>
  `;
}

// ---------- Feedback rendering ----------
function renderFeedback(qid, result) {
  const fb = document.getElementById("fb-" + qid);
  if (!fb) return;
  fb.className = "feedback show " + result.verdict;

  const verdictText = {
    correct: "✓ 정답",
    partial: "△ 부분 정답",
    incorrect: "✗ 오답"
  }[result.verdict] || result.verdict;

  let body = "";
  const isAiFeedback =
    ("strengths" in result || "issues" in result || "suggestions" in result);

  if (isAiFeedback) {
    if (result.strengths) {
      body += `<strong>잘한 점</strong><p>${escapeHtml(result.strengths)}</p>`;
    }
    if (result.issues) {
      body += `<strong>논리적 오류 · 누락</strong><p>${escapeHtml(result.issues)}</p>`;
    }
    if (result.suggestions) {
      body += `<strong>보완할 점</strong><p>${escapeHtml(result.suggestions)}</p>`;
    }
    if (!result.strengths && !result.issues && !result.suggestions) {
      body += `<p>보완할 점 없음 — 훌륭합니다.</p>`;
    }

    // AI 채점이어도 정답/모범답안/해설은 항상 보여주기
    const answerText = result.modelAnswer || result.correctAnswer;
    if (result.correctAnswerHtml) {
      body += `<strong>정답</strong>${result.correctAnswerHtml}`;
    } else if (answerText) {
      body += `<strong>정답</strong><p>${escapeHtml(answerText)}</p>`;
    }
    if (result.truthTableStats) {
      const { totalEditable, correctEditable, classificationCorrect } = result.truthTableStats;
      body += `<strong>채점 요약</strong><p>진리표 칸 ${correctEditable}/${totalEditable} 정답${typeof classificationCorrect === "boolean" ? ` · 분류 ${classificationCorrect ? "정답" : "오답"}` : ""}</p>`;
    }
    if (result.explanation) {
      body += `<strong>해설</strong><p>${escapeHtml(result.explanation)}</p>`;
    }
  } else {
    if (result.correctAnswerHtml) {
      body += `<strong>정답</strong>${result.correctAnswerHtml}`;
    } else if (result.verdict !== "correct" && result.correctAnswer) {
      body += `<strong>정답</strong><p>${escapeHtml(result.correctAnswer)}</p>`;
    }
    if (result.truthTableStats) {
      const { totalEditable, correctEditable, classificationCorrect } = result.truthTableStats;
      body += `<strong>채점 요약</strong><p>진리표 칸 ${correctEditable}/${totalEditable} 정답${typeof classificationCorrect === "boolean" ? ` · 분류 ${classificationCorrect ? "정답" : "오답"}` : ""}</p>`;
    }
    if (result.explanation) {
      body += `<strong>해설</strong><p>${escapeHtml(result.explanation)}</p>`;
    }
  }

  fb.innerHTML = `<div class="verdict">${verdictText}</div><div class="body">${body}</div>`;

  if (typeof renderMathInElement === "function") {
    renderMathInElement(fb, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Get user input for a question ----------
function getUserAnswer(q) {
  if (q.type === "multiple-choice") {
    const checked = document.querySelector(`input[name="q-${q.id}"]:checked`);
    return checked ? parseInt(checked.value, 10) : null;
  } else if (q.type === "truth-table") {
    const rows = Array.isArray(q.data) ? q.data.map(row => [...row]) : [];
    let filledCount = 0;
    rows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell === null) {
          const input = document.querySelector(`.tt-cell[data-qid="${q.id}"][data-row="${ri}"][data-col="${ci}"]`);
          const normalized = normalizeTruthValue(input ? input.value : "");
          if (normalized) filledCount += 1;
          row[ci] = normalized;
        }
      });
    });
    const checked = document.querySelector(`input[name="q-${q.id}-classification"]:checked`);
    return {
      cells: rows,
      classification: checked ? parseInt(checked.value, 10) : null,
      filledCount
    };
  } else {
    const ta = document.querySelector(`textarea[data-qid="${q.id}"]`);
    return ta ? ta.value : "";
  }
}

// ---------- Score tracking ----------
function updateScoreDisplay(chapterId, totalQuestions) {
  const progress = loadProgress(chapterId);
  const solved = Object.values(progress).filter(p => p.verdict === "correct" || p.verdict === "partial").length;
  const correct = Object.values(progress).filter(p => p.verdict === "correct").length;
  const el = document.getElementById("score-display");
  if (el) {
    el.innerHTML = `${correct} / ${totalQuestions} <small>맞춤 · ${solved} 시도</small>`;
  }
}
