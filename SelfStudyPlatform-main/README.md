# 멀티유저 학습 플랫폼

이 리포지토리는 기존 이산수학 스터디 허브를 확장한 **멀티유저·멀티과목 학습 플랫폼**입니다.  
Firebase(Auth + Firestore + Hosting)를 기반으로 로그인, 사용자별 기록 저장, 과목 확장 구조를 갖추고 있습니다.

> **⚠️ 로그인 필수 정책**: 이 플랫폼은 로그인 없이는 사용할 수 없습니다. Firebase 프로젝트 설정이 완료되어야 모든 페이지가 동작합니다. 설정이 안 되어 있으면 각 페이지는 "설정 필요" 안내 화면으로 대체됩니다.

---

## 1. Firebase 설정 (필수)

### 1-1. 프로젝트 생성
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속해 **새 프로젝트 생성**.
2. Google Analytics는 켜도 되고 꺼도 됩니다.

### 1-2. 이메일/비밀번호 로그인 활성화
1. **빌드 → Authentication** → **시작하기**.
2. **Sign-in method** 탭 → **이메일/비밀번호** 사용 설정.

### 1-3. Firestore Database 생성
1. **빌드 → Firestore Database** → **데이터베이스 만들기**.
2. 가까운 리전 선택 (예: `asia-northeast3`).
3. **프로덕션 모드로 시작** 선택.

### 1-4. 보안 규칙 설정
Firestore 규칙 탭에 아래를 적용합니다.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 1-5. 웹 앱 등록 및 설정값 복사
1. 프로젝트 설정 → 일반 → **웹 앱 등록**.
2. 표시된 `firebaseConfig = { ... }` 객체를 통째로 복사합니다.

### 1-6. `shared/config.js` 반영
`shared/config.js`의 placeholder를 실제 값으로 교체합니다.

```js
export const firebaseConfig = {
  apiKey: "AIza...실제값...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234:web:abcdef"
};
```

---

## 2. 로컬 실행

정적 HTML이 `fetch()`로 JSON을 읽으므로 **반드시 로컬 서버**로 실행해야 합니다.

```bash
cd study-platform
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/` 접속.

### 첫 사용 흐름
1. `/` 진입 → 로그인 페이지로 이동.
2. 회원가입 또는 로그인.
3. 대시보드에서 과목 선택.
4. 과목 허브에서 챕터 연습 / 모의고사 / 과제풀이 / 오답노트로 이동.

---

## 3. 현재 이산수학(`dm`) 기능 요약

### 3-1. 과목 허브 (`subjects/dm/index.html`)
- 챕터별 **개념 / 문제** 링크 제공
- 각 챕터별 **최근 연습 기록** 표시
- **모의고사** 섹션
  - 시작 버튼
  - 최근 기록 5회 요약
  - 기록 전체보기 링크
- **과제풀이** 섹션
  - Ch.1~Ch.5의 과제 문제만 모아서 푸는 전용 페이지 링크
  - 최근 과제풀이 기록 5회 요약
- **오답노트 배지**
  - 회색: 복습 대기
  - 빨간색: 지금 다시 풀어야 함

### 3-2. 챕터별 연습 (`subjects/dm/practice/chN.html`)
- 문항별 **즉시 채점**
- proof/essay 문제는 Gemini API 기반 채점
- **핵심 문제 필터** 제공 (Ch.1~Ch.5)
  - 반복형은 최대한 줄이고
  - 풀이 로직이 다르거나 헷갈리기 쉬운 문제는 남김
  - **과제 때 나온 문제는 필터가 켜져 있어도 반드시 표시**
- 문제 카드 태그
  - 문제 유형 태그
  - `과제 때 나온 문제` 태그
- 하단 **세션 종료 · 기록 저장** 버튼을 눌렀을 때만 최근 연습 기록 저장
- **연습문제에서 틀린 문제는 오답노트에 저장되지 않음**

### 3-3. 챕터별 필터/데이터 반영 사항
- **Ch.1**
  - 핵심 문제 필터 추가
  - 과제 문항: `9(a,b,c), 18(b,d,f), 27(f), 28(f), 31(f), 36 전체`
  - 파트가 본문에 직접 없더라도 값 기반 파트 추론 지원
- **Ch.2**
  - 핵심 문제 필터 추가
  - 과제 문항: `21(a,d), 22(a,d), 23(a,d), 24(d)`
  - **전 문항 proof 타입 서술형화**
  - 구형 객관식/진리표 필드 제거
- **Ch.3**
  - 문제 번호 단위 핵심 필터 추가
  - 과제 문항: `11, 23, 48 전체`
- **Ch.4**
  - 핵심 문제 필터 추가
  - 과제 문항: `4, 5, 28, 29, 30 전체`
  - 데이터 구조상 `28(d), 29(d), 30(d)`만 분리할 수 없어 문제 전체를 과제 예외 처리
- **Ch.5**
  - 핵심 문제 필터 추가
  - 과제 문항: `13 전체`
  - 13번 문제에 과제 안내 문구 추가

### 3-4. 모의고사 (`subjects/dm/mock/index.html`)
- 챕터 선택형 동적 생성
- **챕터 1회 선택당 6문항** 생성
- 한 세트 안에서는 같은 문항 중복을 최대한 회피
- 제출 시 일괄 채점
- 저장 항목
  - 점수 / 정답 수 / 총 문항 수 / 소요 시간
  - 문항별 결과
  - 선택 챕터
  - 생성 요약
- 틀린 문제는 **오답노트에 저장**

### 3-5. 과제풀이 (`subjects/dm/assignment/index.html`)
- 신규 전용 페이지
- Ch.1~Ch.5에서 `__assignmentProblem`으로 표시된 문제만 자동 수집
- 챕터 구분 없이 한 화면에서 일괄 풀이
- 카드에 **원래 챕터 태그** 표시
- 제출 시
  - 점수 / 정답 수 / 총 문항 수 / 소요 시간 저장
  - 기록은 `assignmentHistory`에 저장
  - 틀린 문제는 **오답노트에 저장**

### 3-6. 오답노트 (`subjects/dm/wrong-notes/index.html`)
- 저장 대상
  - 모의고사 오답
  - 과제풀이 오답
- 저장 제외
  - 챕터별 연습 오답
- 같은 문제를 다시 틀리면 새 문서를 만들지 않고 누적 갱신
- 복습 주기 및 숙달 상태 관리

---

## 4. 모의고사/과제풀이 생성 규칙

### 4-1. 모의고사
모의고사는 더 이상 `mock.json` 고정 더미에 의존하지 않고, 각 챕터의 `questions/chN.json`에서 동적으로 생성합니다.

주제 매핑은 문항 ID가 아니라 **문항 본문에 포함된 원문 문제 번호**를 기준으로 처리합니다.

- `ch1`: 6개 주제 → 각 1문항
- `ch2`: 6개 주제 → 각 1문항
- `ch3`: 4개 주제 → 최소 1문항씩 포함 후 비율 배분
- `ch4`: 6개 주제 → 각 1문항
- `ch5`: 7개 주제 → 무작위 6주제를 남겨 각 1문항

### 4-2. 과제풀이
- 고정 전용 문제 파일을 따로 두지 않음
- 기존 챕터 JSON을 순회하면서 **과제 태그된 문제만 자동 수집**
- 저장 컬렉션은 `mockHistory`와 분리된 `assignmentHistory`

---

## 5. 데이터 모델 (Firestore)

### 5-1. 챕터별 연습
경로: `users/{uid}/subjects/{subjectId}/chapters/{chapterId}`

| 필드 | 설명 |
|---|---|
| `subjectId` | 과목 ID |
| `chapterId` | 챕터 ID |
| `correct` | 정답 수 |
| `total` | 총 문항 수 |
| `score` | 점수(0~1) |
| `lastDate` | 최근 저장 시각(ISO) |
| `updatedAt` | Firestore serverTimestamp |

### 5-2. 모의고사
경로: `users/{uid}/subjects/{subjectId}/mockHistory/{autoId}`

| 필드 | 설명 |
|---|---|
| `score` | 점수(0~1) |
| `correct` / `total` | 정답 수 / 총 문항 수 |
| `durationMs` | 소요 시간 |
| `details` | 문항별 판정 배열 |
| `chapterSelections` | 선택 챕터 배열 |
| `generationSummary` | 생성 요약 |
| `date` | 시도 시각(ISO) |
| `createdAt` | Firestore serverTimestamp |

### 5-3. 과제풀이
경로: `users/{uid}/subjects/{subjectId}/assignmentHistory/{autoId}`

| 필드 | 설명 |
|---|---|
| `score` | 점수(0~1) |
| `correct` / `total` | 정답 수 / 총 문항 수 |
| `durationMs` | 소요 시간 |
| `details` | 문항별 판정 배열 |
| `chapterSelections` | 포함된 챕터 배열 |
| `generationSummary` | 챕터별 과제 문항 수 요약 |
| `date` | 시도 시각(ISO) |
| `createdAt` | Firestore serverTimestamp |

### 5-4. 오답노트
경로: `users/{uid}/subjects/{subjectId}/wrongNotes/{noteId}`

| 필드 | 설명 |
|---|---|
| `questionId` / `chapterId` | 원문 문제 식별자 |
| `questionType` | multiple-choice / short-answer / proof / truth-table |
| `questionText` | 문제 본문 스냅샷 |
| `choices` / `answer` / `accepted` | 객관식/단답형용 정답 정보 (비해당 타입은 빈 배열/`null`로 저장) |
| `headers` / `data` / `answers` | 진리표형 스냅샷 (비해당 타입은 빈 배열로 저장) |
| `classificationChoices` / `classificationAnswer` | 진리표 분류 스냅샷 (비해당 타입은 빈 배열/`null`로 저장) |
| `explanation` / `hint` / `modelAnswer` | 복습용 해설 정보 |
| `wrongCount` | 누적 오답 횟수 |
| `reviewSuccessCount` / `reviewAttemptCount` | 복습 누적 정보 |
| `status` | waiting / due / mastered |
| `nextReviewAt` | 다음 복습 시각 |
| `lastUserAnswer` | 최근 입력 답안 |
| `lastWrongAt` / `lastReviewedAt` | 최근 오답 / 복습 시각 |
| `updatedAt` | Firestore serverTimestamp |

---

## 6. 폴더 구조

```txt
study-platform/
├── index.html
├── login.html
├── dashboard.html
├── README.md
├── REQUIREMENTS.md
├── shared/
│   ├── config.js
│   ├── config.example.js
│   ├── firebase-init.js
│   ├── auth.js
│   ├── auth-guard.js
│   ├── db.js
│   ├── grader.js
│   ├── practice.js
│   ├── katex-boot.js
│   └── styles.css
└── subjects/
    └── dm/
        ├── index.html
        ├── assignment/
        │   └── index.html
        ├── concepts/
        │   └── chN.html
        ├── practice/
        │   └── chN.html
        ├── mock/
        │   ├── index.html
        │   └── history.html
        ├── wrong-notes/
        │   └── index.html
        └── questions/
            ├── ch1.json
            ├── ch2.json
            ├── ch3.json
            ├── ch4.json
            ├── ch5.json
            └── mock.json   # 레거시 파일(현재 모의고사 생성에는 사용하지 않음)
```

---

## 7. AI 채점

증명/서술형 문제는 **Google Gemini 2.5 Flash**로 채점됩니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급
2. 연습 / 모의고사 / 과제풀이 페이지 상단에서 API 키 등록
3. 키는 **브라우저 localStorage**에만 저장
4. 모의고사/과제풀이에서 API 키가 없으면 해당 서술형 문항은 자동 오답 처리될 수 있음

---

## 8. 새 과목 추가 방법

1. `subjects/{newSubjectId}/` 디렉터리 생성
2. `dm` 하위 구조를 복사
3. `questions/chN.json` 작성
4. 각 연습 페이지에서 `initPractice("{subjectId}","chN","practice")` 호출
5. 모의고사 페이지에서 `initPractice("{subjectId}","mock","mock")` 호출
6. 과제풀이를 지원할 경우 `assignment/index.html`을 추가하고 `initPractice("{subjectId}","assignment","assignment")` 호출
7. `shared/practice.js`에 주제 블루프린트와 필터/과제 설정 추가
8. `dashboard.html`의 `SUBJECTS` 배열에 과목 정보 추가

---

## 9. 배포

```bash
npm install -g firebase-tools
firebase login
cd study-platform
firebase init hosting
firebase deploy
```

Hosting 초기화 시:
- public directory → `.`
- single-page app → `No`
- 기존 `index.html` overwrite → `No`

---

## 10. 트러블슈팅

### Firebase 설정 필요 화면이 계속 보임
`shared/config.js`가 실제 값으로 채워졌는지 확인하세요.

### 로그인 후에도 로그인 페이지로 돌아감
Firestore 규칙과 Auth 설정을 확인하세요.

### 기록이 저장되지 않음
- 챕터별 연습: **세션 종료 · 기록 저장** 버튼을 눌러야 저장됩니다.
- 모의고사/과제풀이: **제출** 시 자동 저장됩니다.

### 로딩이 멈춤
`file://`로 직접 열지 말고 `python3 -m http.server` 같은 로컬 서버로 실행하세요.
