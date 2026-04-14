# 멀티유저 학습 플랫폼

이 리포지토리는 기존 이산수학 스터디 허브를 확장한 **멀티유저·멀티과목 학습 플랫폼**입니다.
Firebase(Auth + Firestore + Hosting)를 기반으로 로그인, 사용자별 기록 저장, 과목 확장 구조를
갖추고 있습니다.

> **⚠️ 로그인 필수 정책**: 이 플랫폼은 로그인 없이는 사용할 수 없습니다. Firebase 프로젝트
> 설정이 완료되어야 모든 페이지가 동작합니다. 설정이 안 되어 있으면 각 페이지는 "설정 필요"
> 안내 화면으로 대체됩니다.

---

## 1. Firebase 설정 (필수)

### 1-1. 프로젝트 생성

1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속해 **새 프로젝트 생성** (이름 자유).
   Google Analytics는 켜도 되고 꺼도 됩니다.

### 1-2. 이메일/비밀번호 로그인 활성화

2. 왼쪽 메뉴 **빌드 → Authentication** → **시작하기** 클릭.
3. "Sign-in method" 탭 → **이메일/비밀번호** 선택 → **사용 설정** 토글 ON → 저장.

### 1-3. Firestore Database 생성

4. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**.
5. 위치는 가까운 리전 선택 (예: `asia-northeast3` = 서울).
6. **프로덕션 모드로 시작** 선택 → 사용 설정.

### 1-4. 보안 규칙 설정 (중요)

7. Firestore의 "규칙" 탭에서 아래 규칙을 붙여넣고 **게시**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

   이 규칙은 "각 사용자는 자신의 `users/{본인uid}/` 아래 데이터만 읽고 쓸 수 있음"을 의미합니다.
   다른 사용자의 기록은 볼 수 없습니다.

### 1-5. 웹 앱 등록 및 설정값 복사

8. 왼쪽 상단 **톱니(프로젝트 설정)** → **일반** 탭 → 하단 "내 앱" 섹션에서
   **`</>` 웹 아이콘** 클릭 → 앱 닉네임 입력 → **앱 등록**.
9. 화면에 `firebaseConfig = { ... }` 객체가 표시됩니다. 이 객체를 **통째로 복사**.

### 1-6. config.js에 붙여넣기

10. 프로젝트 폴더의 `shared/config.js` 파일을 열어 기존 placeholder를 실제 값으로 교체:

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

> **Tip**: `apiKey` 는 비밀값이 아닙니다. 클라이언트에 노출되는 공개 설정이며, 실제 보안은 위의
> Firestore 보안 규칙과 Auth 설정으로 이뤄집니다.

---

## 2. 로컬에서 실행

정적 파일이 `fetch()`로 JSON을 로드하므로 **반드시 로컬 서버**를 통해 열어야 합니다.

```bash
cd study-platform
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/` 접속.

### 첫 사용 흐름

1. **홈 진입** (`/`) → 자동으로 로그인 페이지로 이동.
2. **회원가입** → "계정이 없으신가요? 회원가입" 클릭 → 이메일/비밀번호 입력 → 계정 생성.
3. **대시보드** → 과목 목록 표시. 첫 방문이라 기록은 비어 있음.
4. **과목 허브** 선택 → 챕터 학습 시작.

---

## 3. 페이지 구조 & 사용법

### 3-1. 랜딩 (`index.html`)
로그인 상태에 따라 자동 리디렉트:
- 로그인됨 → `dashboard.html`
- 미로그인 → `login.html`
- Firebase 미설정 → "설정 필요" 안내

### 3-2. 로그인 페이지 (`login.html`)
- 이메일/비밀번호로 로그인 및 회원가입
- 하단 링크로 두 모드 토글

### 3-3. 대시보드 (`dashboard.html`)
- 상단에 로그인한 사용자 이메일과 로그아웃 버튼
- 과목 카드 각각에 **최근 챕터 연습 요약** + **최근 모의고사 5회** 표시
- 과목 카드 우측 "과목 허브 →" 링크로 과목 페이지 진입

### 3-4. 과목 허브 (`subjects/{과목ID}/index.html`)
- 챕터 목록 (개념 정리 / 문제풀이 각 링크)
- 챕터별 "최근 풀이: YYYY-MM-DD · 점수 N% (정답/총)" 표시
- 하단 "모의고사 시작" / "최근 기록 전체보기" 버튼
- 최근 모의고사 5회 요약 인라인 표시

### 3-5. 개념 정리 (`subjects/{과목ID}/concepts/chN.html`)
- 챕터별 개념 설명 페이지 (원본 HTML 유지, 네비게이션만 수정됨)

### 3-6. 챕터 문제풀이 (`subjects/{과목ID}/practice/chN.html`)
- 문항별 **즉시 채점**: "제출" 버튼으로 답을 확인하면 바로 정답/오답 피드백
- 증명형 문제는 Gemini API 호출 (API 키 등록 필요)
- **"세션 종료 · 기록 저장" 버튼** (페이지 하단): 이 버튼을 눌러야 비로소
  "최근 풀이 날짜 + 점수"가 DB에 저장됩니다. 버튼을 누르지 않고 페이지를 떠나면
  기록에 반영되지 않으니 주의하세요.
- 저장 후 하단에 "최근 기록" 뱃지가 표시됨

### 3-7. 모의고사 (`subjects/{과목ID}/mock/index.html`)
- 페이지 진입 시 **챕터 선택형 안내 화면**이 먼저 표시됩니다.
- 사용자는 출제에 포함할 챕터를 **중복 선택 가능**합니다.
- **챕터 1회 선택당 6문항**이 생성됩니다.
- 시작 버튼 클릭 시, 선택한 챕터들을 기준으로 동적 모의고사가 생성되고 타이머가 시작됩니다.
- 출제 규칙
  - 주제 수가 **6개**인 챕터: 각 주제에서 1문항씩
  - 주제 수가 **6개 미만**인 챕터: 모든 주제를 최소 1문항씩 포함한 뒤, 주제별 커버 문항 수 비율에 따라 나머지 배분
  - 주제 수가 **7개 이상**인 챕터: 주제들 중 6개를 무작위로 남긴 뒤 각 1문항씩
- 모든 문항을 풀고 상단 **"제출" 버튼** 클릭 → 일괄 채점
- 채점 완료 후 상단에 "점수 N% · 소요시간 MM:SS" 요약 표시
- 기록이 Firestore에 자동 저장되며, 최근 기록 화면에는 **선택 챕터와 생성 구성 요약**도 함께 표시됩니다.
- 증명형 문제에서 API 키가 없으면 해당 문항만 자동 오답 처리 (시험은 계속 진행)

### 3-8. 모의고사 기록 (`subjects/{과목ID}/mock/history.html`)
- 최근 5회 모의고사 결과를 카드 형태로 표시
- 각 카드에 점수, 소요시간, 시도 일시 표시
- "문항별 결과 보기" 펼치면 정답/오답 그리드 표시

---

## 4. 데이터 모델 (Firestore)

### 4-1. 일반 연습 (세션 단위 요약)

`users/{uid}/subjects/{subjectId}/chapters/{chapterId}` — 문서 1개, 매번 덮어씀.

| 필드 | 설명 |
|---|---|
| `subjectId` | 과목 ID |
| `chapterId` | 챕터 ID |
| `lastDate` | 세션 종료 시각 (ISO) |
| `score` | 점수 (0~1) |
| `correct` | 정답 수 |
| `total` | 총 문항 수 |
| `updatedAt` | Firestore serverTimestamp |

**저장 시점**: 연습 페이지 하단의 **"세션 종료 · 기록 저장"** 버튼 클릭 시.

### 4-2. 모의고사 (최근 5개 상세 기록)

`users/{uid}/subjects/{subjectId}/mockHistory/{autoId}` — 시도할 때마다 append.

| 필드 | 설명 |
|---|---|
| `date` | 시도 일시 (ISO) |
| `score` | 점수 (0~1) |
| `correct` / `total` | 정답 수 / 총 문항 수 |
| `durationMs` | 시작~제출 소요시간 (ms) |
| `details` | `[{ questionId, verdict, score }]` 문항별 결과 배열 |
| `chapterSelections` | 사용자가 선택한 챕터 ID 배열 (중복 허용) |
| `generationSummary` | 생성 시 사용된 챕터별 문항 수 요약 |
| `createdAt` | Firestore serverTimestamp |

**조회**: `getMockRecent(subjectId)` 가 `orderBy('createdAt','desc').limit(5)` 로 최근 5개만 반환.
History 컬렉션에는 모든 기록이 남지만 UI에는 5개까지만 노출됩니다.

**저장 시점**: 모의고사 페이지에서 **"제출"** 버튼 클릭 직후.

---

## 5. 폴더 구조

```
study-platform/
├── index.html                       # 랜딩 (자동 리디렉트)
├── login.html                       # 로그인/회원가입
├── dashboard.html                   # 대시보드 (과목별 요약) [가드 적용]
├── README.md
├── shared/
│   ├── config.js                    # Firebase 설정 (실제 값 입력 필요)
│   ├── config.example.js            # 설정 템플릿
│   ├── firebase-init.js             # Firebase 초기화
│   ├── auth.js                      # 인증 래퍼
│   ├── auth-guard.js                # 보호 페이지 공통 가드
│   ├── db.js                        # 기록 저장/조회
│   ├── grader.js                    # 채점 엔진 (MC/단답/증명)
│   ├── practice.js                  # 연습+모의고사 UI 로직
│   ├── katex-boot.js                # 수식 렌더링
│   └── styles.css
└── subjects/
    └── dm/                          # 과목 ID: dm (이산수학)
        ├── index.html               # 과목 허브 [가드 적용]
        ├── concepts/chN.html        # 개념 정리 [가드 적용]
        ├── practice/chN.html        # 챕터 연습 [가드 적용]
        ├── mock/
        │   ├── index.html           # 모의고사 풀이 [가드 적용]
        │   └── history.html         # 최근 5회 상세 기록 [가드 적용]
        └── questions/
            └── chN.json             # 챕터별 문제 (모의고사도 여기서 동적 추출)
```

**[가드 적용]** 표시된 페이지는 `auth-guard.js`를 로드하며, 미로그인 상태에서 접근하면
자동으로 `login.html`로 리디렉트됩니다.

---

## 6. 새 과목 추가 방법

예: 컴퓨터구조(`ca`)를 추가하는 경우.

1. `subjects/ca/` 디렉터리 생성.
2. 기존 `subjects/dm/` 하위 구조(concepts, practice, mock, questions)를 복사해 동일하게 구성.
3. `questions/chN.json` 파일 작성. 스키마는 `dm/questions/ch1.json` 참고.
4. 각 `practice/chN.html` 의 맨 아래 `initPractice("ca","chN","practice")` 처럼 과목 ID 지정.
5. `mock/index.html` 에서 `initPractice("ca","mock","mock")` 로 호출.
6. 새로 복사한 HTML 파일들의 `<head>` 최상단에 `auth-guard.js` 경로가 올바른지 확인
   (depth 3 파일이면 `../../../shared/auth-guard.js`).
7. `dashboard.html` 의 `SUBJECTS` 배열에 새 객체 추가:

   ```js
   {
     id: 'ca',
     title: '컴퓨터구조',
     description: '...',
     hubLink: 'subjects/ca/index.html',
     mockLink: 'subjects/ca/mock/index.html',
     historyLink: 'subjects/ca/mock/history.html',
     chapters: [ { id: 'ch1', title: '...' }, { id: 'ch2', title: '...' } ]
   }
   ```

8. `subjects/ca/index.html`, `subjects/ca/mock/history.html` 의 `SUBJECT_ID` 상수를 `'ca'`로 지정.

과목별 기록은 Firestore 경로에 `subjectId`로 분리 저장되므로 다른 과목에 영향을 주지 않습니다.

---

## 7. 무료 배포 (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
cd study-platform
firebase init hosting
```

초기화 설정:
- "Please select an option" → **Use an existing project** → 위에서 만든 프로젝트 선택
- "What do you want to use as your public directory?" → **`.`** (점, 현재 디렉터리)
- "Configure as a single-page app?" → **No**
- "Set up automatic builds with GitHub?" → **No**
- "File . /index.html already exists. Overwrite?" → **No** (중요!)

배포:

```bash
firebase deploy
```

배포 완료 후 출력되는 `https://your-project.web.app` URL로 접속하면 어디서든 사용 가능합니다.

### 무료 티어 한도 (참고)

- **Firestore (Spark)**: 저장 1GB, 문서 읽기 50K/일, 쓰기 20K/일 — 개인용으로 충분
- **Authentication (Spark)**: 이메일/비밀번호는 무제한
- **Hosting (Spark)**: 저장 10GB, 전송 360MB/일

---

## 8. AI 채점 (증명형 문제)

증명/서술형 문제는 **Google Gemini 2.5 Flash**로 채점됩니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 API 키 발급.
2. 연습/모의고사 페이지 상단 "API 키 관리" 버튼 → 키 입력 → 저장.
3. 키는 **이 브라우저의 localStorage**에만 저장되며 서버로 전송되지 않습니다.
4. 모의고사 중 API 키가 없으면 증명형 문항은 자동으로 오답 처리됩니다 (모의고사 중단 방지).

> API 키는 Firebase와는 무관한 **Google AI Studio 전용 키**입니다. Firebase 설정과는 별개로
> 관리됩니다.

---

## 9. 트러블슈팅

### "Firebase 설정이 필요합니다" 화면이 계속 나옵니다
→ `shared/config.js` 파일을 열어 실제 Firebase 설정 값이 들어갔는지 확인. `apiKey`가
`"YOUR_API_KEY"`인 상태이면 placeholder로 간주되어 안내 화면이 표시됩니다.

### 로그인 후에도 login.html로 계속 돌아갑니다
→ Firestore 보안 규칙이 너무 엄격한 경우 발생 가능. 위 1-4 섹션의 규칙이 적용되어 있는지
Firestore 콘솔 → 규칙 탭에서 확인. 또는 브라우저 콘솔에서 에러 메시지 확인.

### 기록을 저장했는데 대시보드에 표시되지 않습니다
→ 일반 연습의 경우 문항을 제출했을 뿐만 아니라 **페이지 하단의 "세션 종료 · 기록 저장"
버튼을 반드시 클릭**해야 저장됩니다. 버튼을 누르지 않은 채로 페이지를 떠나면 세션 요약이
저장되지 않습니다.

### 모의고사가 "문제를 불러오는 중..."에서 멈춰 있습니다
→ `file://` 프로토콜로 직접 HTML 파일을 열면 `fetch()`가 차단됩니다. 반드시
`python3 -m http.server` 같은 로컬 서버를 거쳐 접속하세요.


---

## 8. 모의고사 주제 매핑 기준

현재 이산수학(`dm`) 모의고사는 각 챕터의 개념 정리 문서에 있는 **주제 분류**를 기준으로 문제를 묶습니다.
문제 JSON 내부의 세부 문항 ID가 아니라, 각 문항 본문에 포함된 **원문 문제 번호**를 읽어 주제에 매핑합니다.
그래서 챕터 1, 2처럼 세부 문항이 많이 쪼개진 경우에도 원문 번호 기준 출제가 유지됩니다.

- `ch1`: 6개 주제 → 각 1문항
- `ch2`: 6개 주제 → 각 1문항
- `ch3`: 4개 주제 → 최소 1문항씩 포함 후 비율 배분
- `ch4`: 6개 주제 → 각 1문항
- `ch5`: 7개 주제 → 무작위 6주제를 남겨 각 1문항

이 구조를 다른 과목에도 적용하려면 `shared/practice.js`의 `MOCK_TOPIC_BLUEPRINTS`에
각 챕터의 주제별 문제 번호 범위를 정의하면 됩니다.
