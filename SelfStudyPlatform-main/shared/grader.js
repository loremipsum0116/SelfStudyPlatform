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

  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("AI 응답을 파싱할 수 없습니다: " + text.slice(0, 200));
  }

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

  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);

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
    inputHtml = `<textarea class="answer-input" data-qid="${q.id}" placeholder="답을 입력하세요..."></textarea>`;
  } else if (q.type === "proof" || q.type === "essay") {
    inputHtml = `<textarea class="answer-input proof" data-qid="${q.id}" placeholder="증명을 단계별로 서술하세요. 수식은 $...$ 또는 $$...$$로 감쌀 수 있습니다."></textarea>`;
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
