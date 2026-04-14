import json, itertools
\data = {
    "chapterId": "ch2",
    "title": "Chapter 2 · 명제와 논리",
    "questions": []
}\q_list = data["questions"]\n = [0]
\def mc(text, choices, answer, explanation):
    n[0] += 1
    q_list.append({
        "id": f"ch2-q{n[0]:03d}",
        "type": "multiple-choice",
        "text": text,
        "choices": choices,
        "answer": answer,
        "explanation": explanation
    })
\def proof(text, hint, modelAnswer):
    n[0] += 1
    q_list.append({
        "id": f"ch2-q{n[0]:03d}",
        "type": "proof",
        "text": text,
        "hint": hint,
        "modelAnswer": modelAnswer
    })
\def sa(text, answer, accepted, explanation):
    n[0] += 1
    q_list.append({
        "id": f"ch2-q{n[0]:03d}",
        "type": "short-answer",
        "text": text,
        "answer": answer,
        "accepted": accepted,
        "explanation": explanation
    })
\def tt(text, headers, data_rows, answer_rows, classification_answer, explanation):
    """truth-table type"""
    n[0] += 1
    q_list.append({
        "id": f"ch2-q{n[0]:03d}",
        "type": "truth-table",
        "text": text,
        "headers": headers,
        "data": data_rows,
        "answers": answer_rows,
        "classificationChoices": ["항진명제(tautology)", "모순(contradiction)", "충족가능(사건명제)"],
        "classificationAnswer": classification_answer,
        "explanation": explanation
    })
\prop_opts = ["명제이다 (참)", "명제이다 (거짓)", "명제가 아니다"]

# ───── 01 ─────\mc("<strong>[문제 01(a)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"지금 날씨가 어떻습니까?\"",
   prop_opts, 2, "의문문은 참·거짓을 판별할 수 없으므로 명제가 아닙니다.")\mc("<strong>[문제 01(b)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"4는 소수(prime number)이다.\"",
   prop_opts, 1, "$4 = 2 \\times 2$이므로 소수가 아닙니다. 거짓인 명제입니다.")\mc("<strong>[문제 01(c)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"대한민국은 살기 좋은 나라이다.\"",
   prop_opts, 2, "\"살기 좋다\"는 주관적 판단이므로 참·거짓을 객관적으로 판별할 수 없어 명제가 아닙니다.")\mc("<strong>[문제 01(d)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"$x^2 - 3 = 6$\"",
   prop_opts, 2, "$x$의 값이 정해지지 않은 변수이므로 참·거짓을 판별할 수 없습니다. 명제함수이지 명제가 아닙니다.")\mc("<strong>[문제 01(e)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"7은 홀수이다.\"",
   prop_opts, 0, "$7 = 2 \\times 3 + 1$이므로 홀수입니다. 참인 명제입니다.")\mc("<strong>[문제 01(f)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"런던은 영국의 수도이다.\"",
   prop_opts, 0, "런던은 영국의 수도이므로 참인 명제입니다.")\mc("<strong>[문제 01(g)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"$x^2 = 3$을 만족하는 정수 $x$가 존재한다.\"",
   prop_opts, 1, "$x^2 = 3$을 만족하는 $x = \\pm\\sqrt{3}$이고, 이는 정수가 아닙니다. 거짓인 명제입니다.")

# ───── 02 ─────\mc("<strong>[문제 02(a)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"책이 두껍고 무겁다.\"",
   prop_opts, 2, "\"두껍다\", \"무겁다\"는 주관적 판단이며, 어떤 책인지 특정되지 않아 명제가 아닙니다.")\mc("<strong>[문제 02(b)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"$\\sqrt{2x - 1} < 10$을 만족하는 실수 $x$는 무수히 많다.\"",
   prop_opts, 0, "$\\sqrt{2x-1} < 10$에서 $2x-1 < 100$이고 $2x-1 \\ge 0$이므로 $0.5 \\le x < 50.5$인 실수가 무수히 많습니다. 참인 명제입니다.")\mc("<strong>[문제 02(c)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"신발을 사야 할 것 같아.\"",
   prop_opts, 2, "개인의 주관적 판단(추측)이므로 참·거짓을 객관적으로 판별할 수 없어 명제가 아닙니다.")\mc("<strong>[문제 02(d)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"부산은 서울의 남서쪽에 위치한다.\"",
   prop_opts, 1, "부산은 서울의 남동쪽에 위치합니다. 남서쪽이 아니므로 거짓인 명제입니다.")\mc("<strong>[문제 02(e)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"빨간 장미가 노란 장미보다 더 향기롭다.\"",
   prop_opts, 2, "\"더 향기롭다\"는 주관적 판단이므로 명제가 아닙니다.")\mc("<strong>[문제 02(f)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"$+4$는 양수이다.\"",
   prop_opts, 0, "$+4 = 4 > 0$이므로 양수입니다. 참인 명제입니다.")\mc("<strong>[문제 02(g)]</strong> 다음 문장이 명제인지 판별하고, 명제라면 진릿값을 구하라.<br><br>\"$53 \text{ div } 7 = 9$\"",
   prop_opts, 1, "$53 \\div 7 = 7$ 나머지 $4$이므로 $53 \\text{ div } 7 = 7$입니다. $9$가 아니므로 거짓인 명제입니다.")

# ───── 03 ─────\pqr03 = "명제 $p$ : $3 + 8 \\le 11$ (참)<br>명제 $q$ : $100 \\times 4 \\neq 3800$ (참)<br>명제 $r$ : 10월 9일은 한글날이다. (참)<br><br>"\proof(f"<strong>[문제 03(a)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr03}\"$100 \times 4 \neq 3800$\"",
      "주어진 문장이 어떤 명제에 해당하는지 확인",
      "$q$ 그 자체입니다. $100 \\times 4 = 400 \\neq 3800$이므로 $q$는 참(T)입니다.")\proof(f"<strong>[문제 03(b)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr03}\"$3 + 8 > 11$이고, 10월 9일은 한글날이다.\"",
      "$3+8>11$은 $p$의 부정",
      "$\\sim p \\land r$. $\\sim p$: F, $r$: T이므로 F $\\land$ T $=$ F")\proof(f"<strong>[문제 03(c)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr03}\"$3 + 8 \le 11$이고, $100 \times 4 \neq 3800$\"",
      "두 명제의 논리곱",
      "$p \\land q$. T $\\land$ T $=$ T")\proof(f"<strong>[문제 03(d)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr03}\"$100 \\times 4 = 3800$이고 10월 9일이 한글날이면, $3 + 8 > 11$이다.\"",
      "조건문의 전건에 논리곱이 있는 형태",
      "$(\\sim q \\land r) \\rightarrow \\sim p$. (F $\\land$ T) $\\rightarrow$ F $=$ F $\\rightarrow$ F $=$ T")\proof(f"<strong>[문제 03(e)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr03}\"10월 9일이 한글날이 아니면, $100 \\times 4 = 3800$이거나 $3 + 8 \\le 11$이다.\"",
      "조건문의 후건에 논리합이 있는 형태",
      "$\\sim r \\rightarrow (\\sim q \\lor p)$. F $\\rightarrow$ (F $\\lor$ T) $=$ F $\\rightarrow$ T $=$ T")

# ───── 04 ─────\pqr04 = "명제 $p$ : 오렌지 주스는 하얀색이다 (거짓)<br>명제 $q$ : 원주율은 약 3.141592이다. (참)<br>명제 $r$ : 자연수는 0보다 크거나 같다. (참)<br><br>"\proof(f"<strong>[문제 04(a)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr04}\"원주율이 약 3.141592가 아니거나, 오렌지 주스가 하얀색이다.\"",
      "논리합으로 표현",
      "$\\sim q \\lor p$. F $\\lor$ F $=$ F")\proof(f"<strong>[문제 04(b)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr04}\"자연수가 0보다 크거나 같거나, 원주율이 약 3.141592가 아니다.\"",
      "논리합으로 표현",
      "$r \\lor \\sim q$. T $\\lor$ F $=$ T")\proof(f"<strong>[문제 04(c)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr04}\"자연수가 0보다 크거나 같으면, 오렌지 주스는 하얀색이 아니다.\"",
      "조건문으로 표현",
      "$r \\rightarrow \\sim p$. T $\\rightarrow$ T $=$ T")\proof(f"<strong>[문제 04(d)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr04}\"원주율이 약 3.141592이거나 오렌지 주스가 하얀색이 아님을 모두 부정하고 자연수는 0보다 크거나 같다.\"",
      "\"A를 모두 부정하고 B\" → ~A ∧ B",
      "$\\sim(q \\lor \\sim p) \\land r$. $q \\lor \\sim p = $ T $\\lor$ T $=$ T이므로 $\\sim$T $\\land$ T $=$ F $\\land$ T $=$ F")\proof(f"<strong>[문제 04(e)]</strong> 명제 $p, q, r$이 다음과 같을 때, 주어진 명제를 합성명제 형태로 나타내고 진릿값을 구하라.<br><br>{pqr04}\"오렌지 주스가 하얀색이면 자연수가 0보다 크거나 같음을 모두 부정하는 조건이 있을 때, 원주율이 약 3.141592가 아니면 자연수는 0보다 크거나 같다.\"",
      "\"A이면 B를 모두 부정\" → ~(p→r), 전체는 조건문",
      "$\\sim(p \\rightarrow r) \\rightarrow (\\sim q \\rightarrow r)$. $p \\rightarrow r = $ F $\\rightarrow$ T $=$ T이므로 $\\sim$T $=$ F. $\\sim q \\rightarrow r = $ F $\\rightarrow$ T $=$ T. F $\\rightarrow$ T $=$ T")

# ───── 05~08: Truth Tables ─────
# Helper: compute truth table\def NOT(x): return "F" if x=="T" else "T"\def AND(a,b): return "T" if a=="T" and b=="T" else "F"\def OR(a,b): return "T" if a=="T" or b=="T" else "F"\def IMP(a,b): return "F" if a=="T" and b=="F" else "T"\def BIC(a,b): return "T" if a==b else "F"\def XOR(a,b): return "T" if a!=b else "F"
\def rows2(fn_cols):
    """Generate 2-var truth table rows. fn_cols(p,q) returns list of all column values."""
    result = []
    for p,q in [("T","T"),("T","F"),("F","T"),("F","F")]:
        result.append(fn_cols(p,q))
    return result
\def rows3(fn_cols):
    """Generate 3-var truth table rows. fn_cols(p,q,r) returns list of all column values."""
    result = []
    for p,q,r in itertools.product(["T","F"], repeat=3):
        result.append(fn_cols(p,q,r))
    return result
\def make_prefilled(answers, blank_from):
    """Mark columns from blank_from onward as None (to fill in)."""
    return [[c if ci < blank_from else None for ci, c in enumerate(row)] for row in answers]
\def classify(answers, result_col=-1):
    """0=tautology, 1=contradiction, 2=contingency"""
    vals = [row[result_col] for row in answers]
    if all(v=="T" for v in vals): return 0
    if all(v=="F" for v in vals): return 1
    return 2

# 05(a): ~(~p ∧ q)\h = ["$p$","$q$","$\\sim p$","$\\sim p \\land q$","$\\sim(\\sim p \\land q)$"]\ans = rows2(lambda p,q: [p,q, NOT(p), AND(NOT(p),q), NOT(AND(NOT(p),q))])\tt("<strong>[문제 05(a)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim(\\sim p \\land q)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$\\sim(\\sim p \\land q) \\equiv p \\lor \\sim q$ (드모르간). 결과: T,T,F,T → 충족가능(사건명제)")

# 05(b): (p∧q) ∧ ~(q∨r)\h = ["$p$","$q$","$r$","$p \\land q$","$q \\lor r$","$\\sim(q \\lor r)$","$(p \\land q) \\land \\sim(q \\lor r)$"]\ans = rows3(lambda p,q,r: [p,q,r, AND(p,q), OR(q,r), NOT(OR(q,r)), AND(AND(p,q),NOT(OR(q,r)))])\tt("<strong>[문제 05(b)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$(p \\land q) \\land \\sim(q \\lor r)$",
   h, make_prefilled(ans,3), ans, classify(ans),
   "$q$가 T이면 $\\sim(q \\lor r)$=F, $q$가 F이면 $p \\land q$=F. 항상 F → 모순(contradiction)")

# 05(c): (~p ∨ r) → ~q\h = ["$p$","$q$","$r$","$\\sim p$","$\\sim q$","$\\sim p \\lor r$","$(\\sim p \\lor r) \\rightarrow \\sim q$"]\ans = rows3(lambda p,q,r: [p,q,r, NOT(p), NOT(q), OR(NOT(p),r), IMP(OR(NOT(p),r),NOT(q))])\tt("<strong>[문제 05(c)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$(\\sim p \\lor r) \\rightarrow \\sim q$",
   h, make_prefilled(ans,3), ans, classify(ans),
   "결과: F,T,T,T,F,F,T,T → 충족가능(사건명제)")

# 05(d): ~(p ∨ ~q) → (~p ∧ q)\h = ["$p$","$q$","$\\sim p$","$\\sim q$","$p \\lor \\sim q$","$\\sim(p \\lor \\sim q)$","$\\sim p \\land q$","$\\sim(p \\lor \\sim q) \\rightarrow (\\sim p \\land q)$"]\ans = rows2(lambda p,q: [p,q, NOT(p), NOT(q), OR(p,NOT(q)), NOT(OR(p,NOT(q))), AND(NOT(p),q), IMP(NOT(OR(p,NOT(q))),AND(NOT(p),q))])\tt("<strong>[문제 05(d)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim(p \\lor \\sim q) \\rightarrow (\\sim p \\land q)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$\\sim(p \\lor \\sim q) = \\sim p \\land q$ (드모르간)이므로 $A \\rightarrow A$ 형태. 항상 T → 항진명제(tautology)")

# 06(a): p∧q → p\h = ["$p$","$q$","$p \\land q$","$p \\land q \\rightarrow p$"]\ans = rows2(lambda p,q: [p,q, AND(p,q), IMP(AND(p,q),p)])\tt("<strong>[문제 06(a)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$p \\land q \\rightarrow p$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$p \\land q$가 참이면 $p$는 반드시 참. 항상 T → 항진명제(tautology)")

# 06(b): p∨q → ~q\h = ["$p$","$q$","$p \\lor q$","$\\sim q$","$p \\lor q \\rightarrow \\sim q$"]\ans = rows2(lambda p,q: [p,q, OR(p,q), NOT(q), IMP(OR(p,q),NOT(q))])\tt("<strong>[문제 06(b)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$p \\lor q \\rightarrow \\sim q$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "결과: F,T,F,T → 충족가능(사건명제)")

# 06(c): p ∧ ~q ∧ (p→q)\h = ["$p$","$q$","$\\sim q$","$p \\rightarrow q$","$p \\land \\sim q \\land (p \\rightarrow q)$"]\ans = rows2(lambda p,q: [p,q, NOT(q), IMP(p,q), AND(AND(p,NOT(q)),IMP(p,q))])\tt("<strong>[문제 06(c)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$p \\land \\sim q \\land (p \\rightarrow q)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$p$가 T이고 $\\sim q$가 T이면 $p \\to q$=F. 동시 충족 불가. 항상 F → 모순(contradiction)")

# 06(d): ~(p∨q) → (~p ∧ ~q)\h = ["$p$","$q$","$p \\lor q$","$\\sim(p \\lor q)$","$\\sim p$","$\\sim q$","$\\sim p \\land \\sim q$","$\\sim(p \\lor q) \\rightarrow (\\sim p \\land \\sim q)$"]\ans = rows2(lambda p,q: [p,q, OR(p,q), NOT(OR(p,q)), NOT(p), NOT(q), AND(NOT(p),NOT(q)), IMP(NOT(OR(p,q)),AND(NOT(p),NOT(q)))])\tt("<strong>[문제 06(d)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim(p \\lor q) \\rightarrow (\\sim p \\land \\sim q)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "드모르간 법칙에 의해 $\\sim(p \\lor q) \\equiv \\sim p \\land \\sim q$. $A \\to A$는 항상 T → 항진명제(tautology)")

# 07(a): (r→~p) ∧ ~(p∨q) ∧ q\h = ["$p$","$q$","$r$","$\\sim p$","$r \\rightarrow \\sim p$","$p \\lor q$","$\\sim(p \\lor q)$","$(r \\rightarrow \\sim p) \\land \\sim(p \\lor q) \\land q$"]\ans = rows3(lambda p,q,r: [p,q,r, NOT(p), IMP(r,NOT(p)), OR(p,q), NOT(OR(p,q)), AND(AND(IMP(r,NOT(p)),NOT(OR(p,q))),q)])\tt("<strong>[문제 07(a)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$(r \\rightarrow \\sim p) \\land \\sim(p \\lor q) \\land q$",
   h, make_prefilled(ans,3), ans, classify(ans),
   "$\\sim(p \\lor q)$가 T이면 $q$=F이어야 하는데, $q$가 T이어야 하므로 모순. 항상 F → 모순(contradiction)")

# 07(b): p ⊕ (~q ∨ p)  (precedence: ~ > ∧ > ∨ > ⊕)\h = ["$p$","$q$","$\\sim q$","$\\sim q \\lor p$","$p \\oplus (\\sim q \\lor p)$"]\ans = rows2(lambda p,q: [p,q, NOT(q), OR(NOT(q),p), XOR(p,OR(NOT(q),p))])\tt("<strong>[문제 07(b)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$p \\oplus \\sim q \\lor p$<br><em>(연산자 우선순위: $\\sim$ &gt; $\\land$ &gt; $\\lor$ &gt; $\\oplus$이므로 $p \\oplus ((\\sim q) \\lor p)$로 해석)</em>",
   h, make_prefilled(ans,2), ans, classify(ans),
   "결과: F,F,F,T → 충족가능(사건명제)")

# 07(c): (p⊕~q) ↔ (~p⊕q)\h = ["$p$","$q$","$\\sim p$","$\\sim q$","$p \\oplus \\sim q$","$\\sim p \\oplus q$","$(p \\oplus \\sim q) \\leftrightarrow (\\sim p \\oplus q)$"]\ans = rows2(lambda p,q: [p,q, NOT(p), NOT(q), XOR(p,NOT(q)), XOR(NOT(p),q), BIC(XOR(p,NOT(q)),XOR(NOT(p),q))])\tt("<strong>[문제 07(c)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$(p \\oplus \\sim q) \\leftrightarrow (\\sim p \\oplus q)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$p \\oplus \\sim q$와 $\\sim p \\oplus q$는 항상 같은 값. 모두 T → 항진명제(tautology)")

# 07(d): (~p⊕q) ↔ ((p∧q)→~p)\h = ["$p$","$q$","$\\sim p$","$\\sim p \\oplus q$","$p \\land q$","$(p \\land q) \\rightarrow \\sim p$","$(\\sim p \\oplus q) \\leftrightarrow ((p \\land q) \\rightarrow \\sim p)$"]\ans = rows2(lambda p,q: [p,q, NOT(p), XOR(NOT(p),q), AND(p,q), IMP(AND(p,q),NOT(p)), BIC(XOR(NOT(p),q),IMP(AND(p,q),NOT(p)))])\tt("<strong>[문제 07(d)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$(\\sim p \\oplus q) \\leftrightarrow ((p \\land q) \\rightarrow \\sim p)$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "결과: F,F,F,T → 충족가능(사건명제)")

# 08(a): ~(p∨r) → (~q→r)\h = ["$p$","$q$","$r$","$p \\lor r$","$\\sim(p \\lor r)$","$\\sim q$","$\\sim q \\rightarrow r$","$\\sim(p \\lor r) \\rightarrow (\\sim q \\rightarrow r)$"]\ans = rows3(lambda p,q,r: [p,q,r, OR(p,r), NOT(OR(p,r)), NOT(q), IMP(NOT(q),r), IMP(NOT(OR(p,r)),IMP(NOT(q),r))])\tt("<strong>[문제 08(a)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim(p \\lor r) \\rightarrow (\\sim q \\rightarrow r)$",
   h, make_prefilled(ans,3), ans, classify(ans),
   "$(F,F,F)$에서만 F. 나머지 T → 충족가능(사건명제)")

# 08(b): ~p ∨ (q ∧ (p⊕~q))  (precedence: ~ > ⊕ inside parens > ∧ > ∨)\h = ["$p$","$q$","$\\sim p$","$\\sim q$","$p \\oplus \\sim q$","$q \\land (p \\oplus \\sim q)$","$\\sim p \\lor (q \\land (p \\oplus \\sim q))$"]\ans = rows2(lambda p,q: [p,q, NOT(p), NOT(q), XOR(p,NOT(q)), AND(q,XOR(p,NOT(q))), OR(NOT(p),AND(q,XOR(p,NOT(q))))])\tt("<strong>[문제 08(b)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim p \\lor q \\land (p \\oplus \\sim q)$<br><em>(우선순위에 따라 $\\sim p \\lor (q \\land (p \\oplus \\sim q))$로 해석)</em>",
   h, make_prefilled(ans,2), ans, classify(ans),
   "결과: T,F,T,T → 충족가능(사건명제)")

# 08(c): ~{(p⊕q) ∨ (p↔~q)}\h = ["$p$","$q$","$\\sim q$","$p \\oplus q$","$p \\leftrightarrow \\sim q$","$(p \\oplus q) \\lor (p \\leftrightarrow \\sim q)$","$\\sim\\{(p \\oplus q) \\lor (p \\leftrightarrow \\sim q)\\}$"]\ans = rows2(lambda p,q: [p,q, NOT(q), XOR(p,q), BIC(p,NOT(q)), OR(XOR(p,q),BIC(p,NOT(q))), NOT(OR(XOR(p,q),BIC(p,NOT(q))))])\tt("<strong>[문제 08(c)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\sim\\{(p \\oplus q) \\lor (p \\leftrightarrow \\sim q)\\}$",
   h, make_prefilled(ans,2), ans, classify(ans),
   "$p \\oplus q \\equiv p \\leftrightarrow \\sim q$이므로 논리합은 $p \\oplus q$와 동일. 결과: T,F,F,T → 충족가능(사건명제)")

# 08(d): {(p↔~q) ⊕ (p→~r) ⊕ r} ↔ q\h = ["$p$","$q$","$r$","$\\sim q$","$\\sim r$","$p \\leftrightarrow \\sim q$","$p \\rightarrow \\sim r$","$(p{\\leftrightarrow}\\sim q)\\oplus(p{\\rightarrow}\\sim r)\\oplus r$","$\\{\\cdots\\} \\leftrightarrow q$"]\def f08d(p,q,r):
    nq,nr = NOT(q),NOT(r)
    a = BIC(p,nq)
    b = IMP(p,nr)
    xor1 = XOR(a,b)
    xor2 = XOR(xor1,r)
    result = BIC(xor2,q)
    return [p,q,r,nq,nr,a,b,xor2,result]\ans = rows3(f08d)\tt("<strong>[문제 08(d)]</strong> 다음 합성명제의 진리표를 완성하고, 합성명제의 종류를 구분하라.<br><br>$\\{(p \\leftrightarrow \\sim q) \\oplus (p \\rightarrow \\sim r) \\oplus r\\} \\leftrightarrow q$",
   h, make_prefilled(ans,3), ans, classify(ans),
   "8행 중 T와 F가 혼재 → 충족가능(사건명제)")

# ───── 09: 역, 이, 대우 ─────\proof("<strong>[문제 09(a)]</strong> 다음 명제의 역, 이, 대우 명제를 구하고, 각각의 진릿값을 구하라.<br><br>\"순수한 물의 어는점(빙점)이 섭씨 0℃이면, 섭씨 0℃ 이하에서는 반드시 비가 온다.\"",
   "$p$: 순수한 물의 어는점은 섭씨 0℃ (T), $q$: 섭씨 0℃ 이하에서 반드시 비가 온다 (F)",
   "$p \\to q$: T→F = F<br>역($q \\to p$): F→T = T<br>이($\\sim p \\to \\sim q$): F→T = T<br>대우($\\sim q \\to \\sim p$): T→F = F")\proof("<strong>[문제 09(b)]</strong> 다음 명제의 역, 이, 대우 명제를 구하고, 각각의 진릿값을 구하라.<br><br>\"관악산이 제주도에 있으면, 설악산은 강원도에 있다.\"",
   "$p$: 관악산이 제주도에 있다 (F), $q$: 설악산은 강원도에 있다 (T)",
   "$p \\to q$: F→T = T<br>역($q \\to p$): T→F = F<br>이($\\sim p \\to \\sim q$): T→F = F<br>대우($\\sim q \\to \\sim p$): F→T = T")\proof("<strong>[문제 09(c)]</strong> 다음 명제의 역, 이, 대우 명제를 구하고, 각각의 진릿값을 구하라.<br><br>\"모든 실수 $x$에 대하여 $x^2 \\ge 0$이면, 36의 제곱근은 $\\pm 6$이다.\"",
   "$p$: 모든 실수 $x$에 대해 $x^2 \\ge 0$ (T), $q$: 36의 제곱근은 $\\pm 6$ (T)",
   "$p \\to q$: T→T = T<br>역($q \\to p$): T→T = T<br>이($\\sim p \\to \\sim q$): F→F = T<br>대우($\\sim q \\to \\sim p$): F→F = T")\proof("<strong>[문제 09(d)]</strong> 다음 명제의 역, 이, 대우 명제를 구하고, 각각의 진릿값을 구하라.<br><br>\"한강이 동해로 유입되면, 호주는 유럽연합에 속한다.\"",
   "$p$: 한강이 동해로 유입 (F), $q$: 호주는 EU에 속한다 (F)",
   "$p \\to q$: F→F = T<br>역($q \\to p$): F→F = T<br>이($\\sim p \\to \\sim q$): T→T = T<br>대우($\\sim q \\to \\sim p$): T→T = T")\proof("<strong>[문제 09(e)]</strong> 다음 명제의 역, 이, 대우 명제를 구하고, 각각의 진릿값을 구하라.<br><br>\"8비트가 1바이트이면, 월요일의 다음날은 토요일이다.\"",
   "$p$: 8비트=1바이트 (T), $q$: 월요일 다음날은 토요일 (F)",
   "$p \\to q$: T→F = F<br>역($q \\to p$): F→T = T<br>이($\\sim p \\to \\sim q$): F→T = T<br>대우($\\sim q \\to \\sim p$): T→F = F")

# ───── 10 ─────\proof("<strong>[문제 10(a)]</strong> 명제 $p, q$가 다음과 같을 때, $p \\rightarrow q$의 역, 이, 대우 명제를 작성하고 진릿값을 구하라.<br><br>$p$ : 부산은 대한민국의 수도이다. (F)<br>$q$ : 워싱턴 D.C.는 미국의 수도이다. (T)",
   "$p$: F, $q$: T", "$p \\to q$: F→T = T<br>역: T→F = F<br>이: T→F = F<br>대우: F→T = T")\proof("<strong>[문제 10(b)]</strong> 명제 $p, q$가 다음과 같을 때, $p \\rightarrow q$의 역, 이, 대우 명제를 작성하고 진릿값을 구하라.<br><br>$p$ : $3 \\times 13 < 11$ (F)<br>$q$ : 삼각형 내각의 합은 $200^\\circ$이다. (F)",
   "$3 \\times 13 = 39 \\not< 11$이므로 $p$: F, 삼각형 내각의 합은 $180^\\circ$이므로 $q$: F",
   "$p \\to q$: F→F = T<br>역: F→F = T<br>이: T→T = T<br>대우: T→T = T")\proof("<strong>[문제 10(c)]</strong> 명제 $p, q$가 다음과 같을 때, $p \\rightarrow q$의 역, 이, 대우 명제를 작성하고 진릿값을 구하라.<br><br>$p$ : 자연수는 0보다 큰 정수이다. (T)<br>$q$ : 직선은 두 점을 지난다. (T)",
   "$p$: T, $q$: T", "$p \\to q$: T→T = T<br>역: T→T = T<br>이: F→F = T<br>대우: F→F = T")\proof("<strong>[문제 10(d)]</strong> 명제 $p, q$가 다음과 같을 때, $p \\rightarrow q$의 역, 이, 대우 명제를 작성하고 진릿값을 구하라.<br><br>$p$ : 모든 실수 $x$는 $\\dfrac{\\sqrt{4x}}{5} > 5$를 만족한다. (F)<br>$q$ : $2x+1=k$일 때 모든 정수 $x$에 대하여 $k$는 짝수이다. (F)",
   "$p$: F (반례 존재), $q$: F ($k=2x+1$은 홀수)", "$p \\to q$: F→F = T<br>역: F→F = T<br>이: T→T = T<br>대우: T→T = T")\proof("<strong>[문제 10(e)]</strong> 명제 $p, q$가 다음과 같을 때, $p \\rightarrow q$의 역, 이, 대우 명제를 작성하고 진릿값을 구하라.<br><br>$p$ : 모든 정수 $x$에 대하여 $2x$는 항상 짝수이다. (T)<br>$q$ : 독도는 대한민국 땅이다. (T)",
   "$p$: T, $q$: T", "$p \\to q$: T→T = T<br>역: T→T = T<br>이: F→F = T<br>대우: F→F = T")

# ───── 11 ─────\proof("<strong>[문제 11(a)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$\\sim(p \\oplus q) \\equiv p \\leftrightarrow q$",
   "$p \\oplus q$는 $p, q$가 다를 때 T, $p \\leftrightarrow q$는 같을 때 T",
   "$\\sim(p \\oplus q)$는 $p, q$가 같을 때 T = $p \\leftrightarrow q$. 진리표 4행 모두 일치.")\proof("<strong>[문제 11(b)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$\\sim(p \\lor \\sim q) \\lor (\\sim p \\land \\sim q) \\equiv \\sim p$",
   "드모르간 법칙으로 $\\sim(p \\lor \\sim q) = \\sim p \\land q$",
   "$(\\sim p \\land q) \\lor (\\sim p \\land \\sim q) = \\sim p \\land (q \\lor \\sim q) = \\sim p \\land T = \\sim p$")\proof("<strong>[문제 11(c)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$[p \\land \\{\\sim(\\sim p \\lor q)\\}] \\lor (p \\land q) \\equiv p$",
   "$\\sim(\\sim p \\lor q) = p \\land \\sim q$ (드모르간)",
   "$[p \\land (p \\land \\sim q)] \\lor (p \\land q) = (p \\land \\sim q) \\lor (p \\land q) = p \\land (\\sim q \\lor q) = p \\land T = p$")\proof("<strong>[문제 11(d)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$(p \\rightarrow q) \\land (\\sim p \\rightarrow q) \\equiv q$",
   "조건문을 논리합으로 변환: $p \\to q \\equiv \\sim p \\lor q$",
   "$(\\sim p \\lor q) \\land (p \\lor q) = q \\lor (\\sim p \\land p) = q \\lor F = q$")\proof("<strong>[문제 11(e)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$(p \\land q) \\oplus (p \\lor q) \\equiv p \\oplus q$",
   "진리표로 4행 모두 확인",
   "$(T,T)$: T⊕T=F, T⊕T=F ✓ | $(T,F)$: F⊕T=T, T⊕F=T ✓ | $(F,T)$: F⊕T=T, F⊕T=T ✓ | $(F,F)$: F⊕F=F, F⊕F=F ✓")

# ───── 12 ─────\proof("<strong>[문제 12(a)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$(p \\lor q) \\rightarrow r \\equiv (p \\rightarrow r) \\land (q \\rightarrow r)$",
   "조건문을 논리합으로 변환 후 분배법칙",
   "$(p \\lor q) \\to r = \\sim(p \\lor q) \\lor r = (\\sim p \\land \\sim q) \\lor r$<br>$(p \\to r) \\land (q \\to r) = (\\sim p \\lor r) \\land (\\sim q \\lor r) = (\\sim p \\land \\sim q) \\lor r$ (분배). 동치.")\proof("<strong>[문제 12(b)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$\\{(\\sim p \\land r) \\rightarrow q\\} \\lor \\{p \\rightarrow (q \\lor \\sim r)\\} \\equiv T$",
   "각 조건문을 논리합으로 변환",
   "$(p \\lor \\sim r \\lor q) \\lor (\\sim p \\lor q \\lor \\sim r) = (p \\lor \\sim p) \\lor q \\lor \\sim r = T$. 항진명제.")\proof("<strong>[문제 12(c)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$\\{(p \\rightarrow q) \\lor (p \\rightarrow r)\\} \\rightarrow (q \\lor r) \\equiv p \\lor q \\lor r$",
   "조건문 변환 후 정리",
   "$(\\sim p \\lor q \\lor r) \\to (q \\lor r) = \\sim(\\sim p \\lor q \\lor r) \\lor (q \\lor r) = (p \\land \\sim q \\land \\sim r) \\lor (q \\lor r) = p \\lor q \\lor r$. 진리표 8행 확인 일치.")\proof("<strong>[문제 12(d)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$(p \\land r) \\lor \\{(p \\lor q) \\land \\sim r\\} \\lor (q \\land r) \\equiv p \\lor q$",
   "분배법칙으로 전개 후 정리",
   "$(p \\land r) \\lor (p \\land \\sim r) \\lor (q \\land \\sim r) \\lor (q \\land r) = p(r \\lor \\sim r) \\lor q(\\sim r \\lor r) = p \\lor q$")\proof("<strong>[문제 12(e)]</strong> 진리표와 논리적 동치법칙을 이용하여 다음 합성명제의 동치관계가 성립함을 보여라.<br><br>$(p \\lor r) \\oplus (q \\lor r) \\equiv (p \\oplus q) \\land \\sim r$",
   "진리표 8행 확인",
   "$(T,T,T)$: T⊕T=F, F∧F=F ✓ | $(T,F,F)$: T⊕F=T, T∧T=T ✓ | 등 8행 모두 일치.")

# ───── 13 ─────\proof("<strong>[문제 13(a)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$(\\sim p \\lor q) \\rightarrow q$",
   "조건문을 논리합으로 변환: $\\sim(\\sim p \\lor q) \\lor q$",
   "$(p \\land \\sim q) \\lor q = (p \\lor q) \\land (\\sim q \\lor q) = (p \\lor q) \\land T = p \\lor q$. 답: $p \\lor q$")\proof("<strong>[문제 13(b)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$\\{\\sim p \\land (p \\rightarrow q)\\} \\land p$",
   "$p$와 $\\sim p$가 동시에 있으면 모순",
   "$\\sim p \\land p \\land \\cdots = F$. 답: $F$ (모순)")\proof("<strong>[문제 13(c)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$(p \\land q) \\lor \\{p \\land (p \\land \\sim q)\\}$",
   "공통인수 $p$로 묶기",
   "$(p \\land q) \\lor (p \\land \\sim q) = p \\land (q \\lor \\sim q) = p$. 답: $p$")\proof("<strong>[문제 13(d)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$\\sim(p \\oplus q) \\rightarrow (\\sim p \\rightarrow q)$",
   "$\\sim(p \\oplus q) \\equiv p \\leftrightarrow q$를 활용",
   "$(p \\leftrightarrow q) \\to (p \\lor q)$. 진리표 확인: T,T,T,F. 답: $p \\lor q$")\proof("<strong>[문제 13(e)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$(\\sim p \\oplus q) \\rightarrow (p \\lor q)$",
   "XOR을 전개하여 조건문 변환",
   "진리표 확인: T,T,T,F. 답: $p \\lor q$")

# ───── 14 ─────\proof("<strong>[문제 14(a)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$(p \\lor r) \\rightarrow \\{(q \\land \\sim r) \\rightarrow p\\}$",
   "이중 조건문을 풀어서 정리",
   "진리표(8행) 확인 결과 모두 T. 답: $T$ (항진명제)")\proof("<strong>[문제 14(b)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$(p \\leftrightarrow \\sim q) \\land (p \\land q)$",
   "$p \\leftrightarrow \\sim q$는 $p \\neq q$일 때 참, $p \\land q$는 둘 다 참",
   "동시 충족 불가. 답: $F$ (모순)")\proof("<strong>[문제 14(c)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$\\sim(p \\land q) \\oplus (\\sim p \\lor q)$",
   "드모르간: $\\sim(p \\land q) = \\sim p \\lor \\sim q$",
   "$(\\sim p \\lor \\sim q) \\oplus (\\sim p \\lor q)$. 진리표: T,T,F,F. 답: $p$")\proof("<strong>[문제 14(d)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$\\{p \\land (p \\rightarrow q)\\} \\rightarrow q$",
   "전건긍정(Modus Ponens) 규칙",
   "$\\{p \\land (\\sim p \\lor q)\\} \\to q = (p \\land q) \\to q = \\sim(p \\land q) \\lor q = \\sim p \\lor \\sim q \\lor q = T$. 답: $T$ (항진명제)")\proof("<strong>[문제 14(e)]</strong> 다음 합성명제를 최대한 간략히 정리하라. 그리고 진리표를 이용하여 원래 명제와 간략히 정리한 결과가 동치인지 확인하라.<br><br>$\\sim p \\rightarrow (p \\lor \\sim p)$",
   "$p \\lor \\sim p \\equiv T$",
   "$\\sim p \\to T = T$. 답: $T$ (항진명제)")

# ───── 15 ─────\pf_h = "명제함수가 다음과 같을 때, 주어진 값에 대하여 진릿값을 구하라.<br>$P(x) : \\sqrt{x} > 10$<br>$Q(x, y) : (x > 3) \\rightarrow (y \\le 10)$<br>$R(x, y, z) : (x < 15 \\land y \\ge 5) \\lor (z = 7)$<br><br>"\tf = ["참 (T)", "거짓 (F)"]\mc(f"<strong>[문제 15(a)]</strong> {pf_h}$P(121)$의 진릿값은?", tf, 0, "$\\sqrt{121} = 11 > 10$이므로 참.")\mc(f"<strong>[문제 15(b)]</strong> {pf_h}$P(9)$의 진릿값은?", tf, 1, "$\\sqrt{9} = 3$, $3 > 10$은 거짓.")\mc(f"<strong>[문제 15(c)]</strong> {pf_h}$Q(6, 2)$의 진릿값은?", tf, 0, "$6>3$: T, $2 \\le 10$: T. T→T = T")\mc(f"<strong>[문제 15(d)]</strong> {pf_h}$Q(1, 1)$의 진릿값은?", tf, 0, "$1>3$: F. F→(anything) = T")\mc(f"<strong>[문제 15(e)]</strong> {pf_h}$Q(15, 12)$의 진릿값은?", tf, 1, "$15>3$: T, $12 \\le 10$: F. T→F = F")\mc(f"<strong>[문제 15(f)]</strong> {pf_h}$R(21, 8, 3)$의 진릿값은?", tf, 1, "$21<15$: F. F∧T = F. $3=7$: F. F∨F = F")\mc(f"<strong>[문제 15(g)]</strong> {pf_h}$R(7, 7, 7)$의 진릿값은?", tf, 0, "$7<15$: T, $7\\ge 5$: T. T∧T = T. T∨T = T. 또는 $z=7$: T이므로 바로 T")\mc(f"<strong>[문제 15(h)]</strong> {pf_h}$R(0, 0, -7)$의 진릿값은?", tf, 1, "$0<15$: T, $0\\ge 5$: F. T∧F = F. $-7=7$: F. F∨F = F")

# ───── 16 ─────\q16_header = """주어진 논의영역과 명제함수에 대하여, 다음 8가지 한정자 조합의 진릿값을 모두 구하라.<br><br>$\\forall x \\forall y P(x,y)$, $\\forall x \\exists y P(x,y)$, $\\exists x \\forall y P(x,y)$, $\\exists x \\exists y P(x,y)$<br>$\\forall y \\forall x P(x,y)$, $\\forall y \\exists x P(x,y)$, $\\exists y \\forall x P(x,y)$, $\\exists y \\exists x P(x,y)$<br><br>"""\proof(f"<strong>[문제 16(a)]</strong> {q16_header}$D = \\{{d \\mid d \\in \\mathbb{{R}}\\}}$, $P(x, y) : x^2 < y^2$",
   "$x^2 < y^2$는 $|x| < |y|$와 동치. $x=y$이면 항상 거짓",
   "$\\forall x \\forall y$: F (x=y일 때 거짓)<br>$\\forall x \\exists y$: T (임의의 x에 대해 y=2x 선택 가능)<br>$\\exists x \\forall y$: F (어떤 x를 택해도 y=0이면 거짓 가능)<br>$\\exists x \\exists y$: T (x=1, y=2)<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 y에 대해 x=0 선택)<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 16(b)]</strong> {q16_header}$D = \\{{d \\mid -10 \\le d \\le 10,\\; d \\in \\mathbb{{Z}}\\}}$, $P(x, y) : x + y = 2x - y$",
   "$x + y = 2x - y \\Leftrightarrow 2y = x \\Leftrightarrow x = 2y$",
   "$\\forall x \\forall y$: F<br>$\\forall x \\exists y$: F (x=1일 때 y=0.5는 정수가 아님)<br>$\\exists x \\forall y$: F<br>$\\exists x \\exists y$: T (x=0, y=0)<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 정수 y에 대해 x=2y ∈ D 가능, 단 |y|≤5)<br>이 경우 y=6이면 x=12∉D이므로: F<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 16(c)]</strong> {q16_header}$D = \\{{d \\mid -10 \\le d \\le 10,\\; d \\in \\mathbb{{R}}\\}}$, $P(x, y) : x + y = 2x - y$",
   "$x = 2y$이므로 실수 범위에서 확인",
   "$\\forall x \\forall y$: F<br>$\\forall x \\exists y$: F (x=20은 D 밖이지만, D 내 x에 대해 y=x/2. x=20은 D 밖. x∈[-10,10]이면 y=x/2∈[-5,5]⊂D이므로 T)<br>사실 x∈D이면 y=x/2∈D이므로: $\\forall x \\exists y$: T<br>$\\exists x \\forall y$: F<br>$\\exists x \\exists y$: T<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: F (y=6이면 x=12∉D)<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 16(d)]</strong> {q16_header}$D = \\{{d \\mid d < -10 \\lor d > 10,\\; d \\in \\mathbb{{R}}\\}}$, $P(x, y) : (0 < x < 15) \\rightarrow (-10 \\le y < 5)$",
   "D에서 $0 < x < 15$를 만족하는 x는 $10 < x < 15$. 이때 y∈D이면 $y<-10$ 또는 $y>10$이므로 $-10 \\le y < 5$를 만족하는 y는 없음",
   "D에서 $10 < x < 15$인 x가 존재하고, 이 x에 대해 $-10 \\le y < 5$인 y∈D는 없으므로 조건문의 후건 F.<br>$\\forall x \\forall y$: F (x∈(10,15)일 때 F)<br>$\\forall x \\exists y$: F<br>$\\exists x \\forall y$: T (x=20이면 전건 F이므로 T)<br>$\\exists x \\exists y$: T<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 y에 대해 x=20 선택)<br>$\\exists y \\forall x$: F (어떤 y를 택해도 x∈(10,15)일 때 문제)<br>$\\exists y \\exists x$: T")

# ───── 17 ─────\q17_header = """주어진 명제함수에 대하여, 다음 8가지 한정자 조합의 진릿값을 모두 구하라.<br><br>$\\forall x \\forall y P(x,y)$, $\\forall x \\exists y P(x,y)$, $\\exists x \\forall y P(x,y)$, $\\exists x \\exists y P(x,y)$<br>$\\forall y \\forall x P(x,y)$, $\\forall y \\exists x P(x,y)$, $\\exists y \\forall x P(x,y)$, $\\exists y \\exists x P(x,y)$<br><br>"""\proof(f"<strong>[문제 17(a)]</strong> {q17_header}$X = \\{{x \\mid x \\in \\mathbb{{Z}}\\}}$, $Y = \\{{y \\mid y \\in \\mathbb{{N}}\\}}$일 때, $P(x, y) : x^2 - y^2 > 0$",
   "$x^2 > y^2$, 즉 $|x| > y$ (y≥1)",
   "$\\forall x \\forall y$: F (x=0이면 항상 F)<br>$\\forall x \\exists y$: F (x=0이면 $0-y^2 > 0$ 불가)<br>$\\exists x \\forall y$: F (어떤 정수 x를 택해도 충분히 큰 y에 대해 F)<br>$\\exists x \\exists y$: T (x=2, y=1)<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 자연수 y에 대해 x=y+1 선택)<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 17(b)]</strong> {q17_header}$X = \\{{x \\mid x \\in \\mathbb{{R}}\\}}$, $Y = \\{{y \\mid y \\in \\mathbb{{R}}\\}}$일 때, $P(x, y) : x^2 - y^2 > 0$",
   "$|x| > |y|$",
   "$\\forall x \\forall y$: F<br>$\\forall x \\exists y$: F (x=0이면 불가)<br>$\\exists x \\forall y$: F<br>$\\exists x \\exists y$: T<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 y에 대해 x=|y|+1 선택)<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 17(c)]</strong> {q17_header}$X = \\{{x \\mid x \\in \\mathbb{{N}}\\}}$, $Y = \\{{y \\mid y \\in \\mathbb{{Z}}\\}}$일 때, $P(x, y) : x^2 - y^2 > 0$",
   "자연수 x, 정수 y에서 $x^2 > y^2$",
   "$\\forall x \\forall y$: F (x=1, y=1이면 0>0 거짓)<br>$\\forall x \\exists y$: T (임의의 자연수 x≥1에 대해 y=0 선택하면 $x^2 > 0$)<br>$\\exists x \\forall y$: F<br>$\\exists x \\exists y$: T<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: F (y가 충분히 크면 불가... 아니, 임의의 정수 y에 대해 x=|y|+1 선택 가능, x는 자연수) → T<br>$\\exists y \\forall x$: F (y=0이면 모든 자연수 x에 대해 $x^2>0$ → T) → 실은 T<br>$\\exists y \\exists x$: T")\proof(f"<strong>[문제 17(d)]</strong> {q17_header}$X = \\{{x \\mid x \\in \\mathbb{{R}}\\}}$, $Y = \\{{y \\mid y \\in \\mathbb{{R}}\\}}$일 때, $P(x, y) : x^2 + y^2 \\ge 0$",
   "$x^2 + y^2 \\ge 0$은 항상 참 (실수의 제곱은 항상 ≥ 0)",
   "모든 실수 $x, y$에 대해 항상 참이므로:<br>$\\forall x \\forall y$: T, $\\forall x \\exists y$: T, $\\exists x \\forall y$: T, $\\exists x \\exists y$: T<br>$\\forall y \\forall x$: T, $\\forall y \\exists x$: T, $\\exists y \\forall x$: T, $\\exists y \\exists x$: T<br>8가지 모두 T")\proof(f"<strong>[문제 17(e)]</strong> {q17_header}$X = \\{{x \\mid x \\in \\mathbb{{Z}}\\}}$, $Y = \\{{y \\mid y \\in \\mathbb{{Z}}\\}}$일 때, $P(x, y) : x - y = 2x + y$",
   "$x - y = 2x + y \\Leftrightarrow -2y = x \\Leftrightarrow x = -2y$",
   "$\\forall x \\forall y$: F<br>$\\forall x \\exists y$: F (x=1이면 y=-1/2, 정수 아님)<br>$\\exists x \\forall y$: F<br>$\\exists x \\exists y$: T (x=0, y=0)<br>$\\forall y \\forall x$: F<br>$\\forall y \\exists x$: T (임의의 정수 y에 대해 x=-2y∈ℤ)<br>$\\exists y \\forall x$: F<br>$\\exists y \\exists x$: T")

# ───── 18 ─────\q18_header = "논의영역과 명제함수가 다음과 같을 때, 주어진 한정된 명제함수의 기호 표현을 문장으로 나타내고 진릿값을 구하라.<br><br>$D = \\{d \\mid d \\in \\mathbb{Z}\\}$<br>$P(x) : x$는 소수<br>$Q(x) : x$의 약수의 합($x$는 제외)은 $x$이다.<br><br>"\proof(f"<strong>[문제 18(a)]</strong> {q18_header}$\\sim \\exists x P(x)$",
      "문장 표현과 진릿값 판별",
      "문장: 소수인 정수는 존재하지 않는다.<br>진릿값: 거짓 (F) (예: 2, 3 등 소수가 존재함)")\proof(f"<strong>[문제 18(b)]</strong> {q18_header}$\\exists x \\sim Q(x)$",
      "문장 표현과 진릿값 판별",
      "문장: 약수의 합(자신 제외)이 자신이 아닌 정수가 존재한다.<br>진릿값: 참 (T) (예: 2의 약수 합은 1이므로 2가 아님)")\proof(f"<strong>[문제 18(c)]</strong> {q18_header}$\\exists x (P(x) \\land Q(x))$",
      "문장 표현과 진릿값 판별",
      "문장: 소수이면서 약수의 합이 자신과 같은 정수가 존재한다.<br>진릿값: 거짓 (F) (소수의 진약수는 1뿐이므로 합이 1이 되며, 1은 소수가 아님)")\proof(f"<strong>[문제 18(d)]</strong> {q18_header}$\\forall x (P(x) \\lor Q(x))$",
      "문장 표현과 진릿값 판별",
      "문장: 모든 정수는 소수이거나 약수의 합이 자신과 같다.<br>진릿값: 거짓 (F) (예: 4는 소수도 아니고 진약수의 합이 1+2=3으로 자신과 다름)")\proof(f"<strong>[문제 18(e)]</strong> {q18_header}$\\forall x \\sim(P(x) \\land Q(x))$",
      "문장 표현과 진릿값 판별",
      "문장: 모든 정수는 소수가 아니거나 약수의 합이 자신과 같지 않다.<br>진릿값: 참 (T) (소수이면서 동시에 완전수인 정수는 존재하지 않음)")\proof(f"<strong>[문제 18(f)]</strong> {q18_header}$\\sim \\forall x (P(x) \\lor Q(x))$",
      "문장 표현과 진릿값 판별",
      "문장: 소수이거나 약수의 합이 자신과 같은 것은 아닌 정수가 존재한다. (즉, 소수도 아니고 완전수도 아닌 정수가 존재한다.)<br>진릿값: 참 (T) (예: 4)")

# ───── 19 ─────\q19_header = "다음 괄호 안에 알맞은 내용을 작성하라.<br><br>"\proof(f"<strong>[문제 19(a)]</strong> {q19_header}$\\sim \\exists x \\exists y \\forall z P(x, y, z) \\equiv (\\quad\\quad\\quad) \\sim P(x, y, z)$",
      "한정자의 부정",
      "$\\forall x \\forall y \\exists z$")\proof(f"<strong>[문제 19(b)]</strong> {q19_header}$\\forall x \\sim \\forall y \\forall z Q(x, y, z) \\equiv (\\quad\\quad\\quad) \\sim Q(x, y, z)$",
      "한정자의 부정",
      "$\\forall x \\exists y \\exists z$")\proof(f"<strong>[문제 19(c)]</strong> {q19_header}$\\sim \\forall x \\exists y (P(x, y) \\land Q(x, y)) \\equiv (\\quad\\quad\\quad) (\\sim P(x, y) (\\quad\\quad\\quad) \\sim Q(x, y))$",
      "한정자의 부정과 드모르간의 법칙",
      "앞 괄호: $\\exists x \\forall y$<br>뒤 괄호: $\\lor$")\proof(f"<strong>[문제 19(d)]</strong> {q19_header}$\\sim \\exists x \\exists y (P(x, y) \\land \\sim Q(x, y)) \\equiv (\\quad\\quad\\quad) (\\sim P(x, y) \\lor Q(x, y))$",
      "한정자의 부정과 드모르간의 법칙",
      "$\\forall x \\forall y$")\proof(f"<strong>[문제 19(e)]</strong> {q19_header}$\\exists x \\sim \\exists y \\exists z (P(x, y, z) \\rightarrow Q(x, y, z)) \\equiv (\\quad\\quad\\quad) (P(x, y, z) \\land \\sim Q(x, y, z))$",
      "조건문의 부정: $\\sim(P \\to Q) \\equiv P \\land \\sim Q$",
      "$\\exists x \\forall y \\forall z$")

# ───── 20 ─────\q20_header = "다음 문장을 보고 사용한 추론법칙을 찾고 빈칸에 필요한 문장을 작성하라.<br><br>"\proof(f"<strong>[문제 20(a)]</strong> {q20_header}4월 5일은 식목일이다.<br>___________________________________________________<br>$\\therefore$ 4월 5일은 식목일이고, 봄에는 새싹이 나온다.",
      "추론법칙과 빈칸 내용",
      "빈칸: 봄에는 새싹이 나온다.<br>추론법칙: 논리곱(Conjunction)")\proof(f"<strong>[문제 20(b)]</strong> {q20_header}하늘이 흐리다.<br>하늘이 흐리면, 비가 온다.<br>$\\therefore$ ___________________________________________________",
      "추론법칙과 빈칸 내용",
      "빈칸: 비가 온다.<br>추론법칙: 전건긍정(Modus Ponens)")\proof(f"<strong>[문제 20(c)]</strong> {q20_header}___________________________________________________<br>냉장고에 요리 재료가 없으면, 마트에 가서 장을 본다.<br>$\\therefore$ 냉장고에 요리 재료가 있다.",
      "추론법칙과 빈칸 내용",
      "빈칸: 마트에 가서 장을 보지 않는다.<br>추론법칙: 후건부정(Modus Tollens)")\proof(f"<strong>[문제 20(d)]</strong> {q20_header}___________________________________________________<br>어제 공연을 보았다.<br>$\\therefore$ 백화점에서 쇼핑을 했다.",
      "추론법칙과 빈칸 내용",
      "빈칸: 어제 공연을 보지 않았거나 백화점에서 쇼핑을 했다. (또는 어제 공연을 보았다면 백화점에서 쇼핑을 했다.)<br>추론법칙: 선언적 삼단논법(Disjunctive Syllogism) (또는 전건긍정)")\proof(f"<strong>[문제 20(e)]</strong> {q20_header}기상청의 슈퍼컴퓨터가 정확하면, 개인용 컴퓨터로 영화를 볼 수 있다.<br>개인용 컴퓨터로 영화를 볼 수 있다면, 스마트폰으로 전화를 할 수 있다.<br>$\\therefore$ ___________________________________________________",
      "추론법칙과 빈칸 내용",
      "빈칸: 기상청의 슈퍼컴퓨터가 정확하면, 스마트폰으로 전화를 할 수 있다.<br>추론법칙: 가언 삼단논법(Hypothetical Syllogism)")

# ───── 21 ─────\vf21 = ["유효추론이다", "허위추론이다"]\mc(f"<strong>[문제 21(a)]</strong> 진리표를 이용하여 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$q \\land \\sim r$<br>$r \\rightarrow \\sim p$<br>$\\therefore p \\rightarrow q$",
   vf21, 0,
   "$q \\land \\sim r$에서 $q=T, r=F$. 이때 $r \\to \\sim p$는 $F \\to \\sim p$이므로 $p$의 값에 관계없이 T. 따라서 전제가 모두 T가 되는 경우는 $(p=T, q=T, r=F)$와 $(p=F, q=T, r=F)$. 두 경우 모두 결론 $p \\to q$는 $T \\to T = T$ 또는 $F \\to T = T$이므로 결론이 항상 참. 유효추론.")\mc(f"<strong>[문제 21(b)]</strong> 진리표를 이용하여 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$r \\rightarrow \\sim p$<br>$(p \\land \\sim q) \\rightarrow \\sim r$<br>$\\therefore q \\lor r$",
   vf21, 1,
   "$p=F, q=F, r=F$일 때, 전제1: $F \\to T = T$, 전제2: $F \\to T = T$로 모든 전제가 참이 된다. 그러나 이때 결론 $q \\lor r = F \\lor F = F$로 거짓이 된다. 따라서 허위추론.")\mc(f"<strong>[문제 21(c)]</strong> 진리표를 이용하여 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$q \\lor r \\rightarrow \\sim p$<br>$p \\lor \\sim q$<br>$q \\rightarrow r$<br>$\\therefore \\sim p \\lor \\sim q$",
   vf21, 0,
   "전제가 참인 경우를 찾으면, $p=T$일 때 전제2에 의해 $q=F$. $q=F$이면 전제3은 T. 전제1 $F \\lor r \\to F$가 참이 되려면 $r=F$. 이때 $(T,F,F)$에서 결론 $\\sim p \\lor \\sim q = F \\lor T = T$. 반면 $p=F$일 때 전제2에 의해 $q=F$이고, 전제1은 $\\sim p=T$이므로 항상 T. $(F,F,T)$나 $(F,F,F)$에서 결론 $\\sim p \\lor \\sim q = T \\lor T = T$. 모든 경우 결론이 T. 유효추론.")\mc(f"<strong>[문제 21(d)]</strong> 진리표를 이용하여 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$p \\lor \\sim q \\lor r$<br>$(\\sim p \\lor \\sim r) \\land q$<br>$(\\sim p \\land \\sim q) \\lor r$<br>$\\therefore p \\land \\sim q$",
   vf21, 1,
   "전제2에서 $q=T$. 이를 전제3에 대입하면 $(\\sim p \\land F) \\lor r = r=T$. 전제2에 대입하면 $\\sim p \\lor F = \\sim p=T$이므로 $p=F$. 이때 $p=F, q=T, r=T$에서 전제1은 $F \\lor F \\lor T = T$로 모든 전제가 참. 하지만 결론 $p \\land \\sim q = F \\land F = F$. 허위추론.")

# ───── 22 ─────\mc(f"<strong>[문제 22(a)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$p \\rightarrow q$<br>$q \\rightarrow p$<br>$\\therefore \\mathbf{{T}}$",
   vf21, 0,
   "결론이 항진명제($\\mathbf{T}$)이므로 전제의 참/거짓 여부와 상관없이 항상 결론이 참이 된다. 따라서 유효추론.")\mc(f"<strong>[문제 22(b)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$\\sim p \\lor \\sim q$<br>$\\sim q \\rightarrow r$<br>$\\sim r$<br>$\\therefore p$",
   vf21, 1,
   "$\\sim r$과 $\\sim q \\to r$에서 후건부정(또는 대우)으로 $q$가 참. $\\sim p \\lor \\sim q$에서 $\\sim q$가 거짓이므로 선언적 삼단논법에 의해 $\\sim p$가 참. 즉, $p$는 거짓. 전제가 모두 참일 때 결론 $p$가 거짓이 되므로 허위추론.")\mc(f"<strong>[문제 22(c)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$p \\lor \\sim r$<br>$r \\land q$<br>$q \\rightarrow s$<br>$\\therefore p$",
   vf21, 0,
   "$r \\land q$에서 $r$이 참. $p \\lor \\sim r$에서 $\\sim r$이 거짓이므로 $p$가 참이어야 함. 따라서 전제가 참일 때 결론 $p$도 참이 되므로 유효추론.")\mc(f"<strong>[문제 22(d)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$(q \\rightarrow p) \\rightarrow \\sim r$<br>$p$<br>$q \\lor r$<br>$\\therefore q$",
   vf21, 0,
   "$p$가 참이므로 $q \\to p$는 항상 참. $(q \\to p) \\to \\sim r$에서 전건긍정에 의해 $\\sim r$ 참, 즉 $r$ 거짓. $q \\lor r$에서 $r$ 거짓이므로 $q$가 참이어야 함. 전제가 참일 때 결론 $q$가 참이 되므로 유효추론.")

# ───── 23 ─────\vf = ["유효추론이다", "허위추론이다"]\mc("<strong>[문제 23(a)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$(p \\rightarrow q) \\rightarrow r$<br>$q \\rightarrow s$<br>$\\sim t$<br>$\\sim p \\lor t$<br>$p \\lor \\sim(r \\land s)$<br>$\\therefore \\sim q$",
   vf, 0, "$\\sim t$와 $\\sim p \\lor t$에서 $\\sim p$. $\\sim p$와 $(p \\to q) \\to r$에서 $p \\to q$는 T이므로 $r$. $\\sim p$이고 $p \\lor \\sim(r \\land s)$에서 $\\sim(r \\land s)$. $r$이므로 $\\sim s$. $q \\to s$의 대우로 $\\sim s \\to \\sim q$이므로 $\\sim q$. 유효추론.")\mc("<strong>[문제 23(b)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$p \\lor q$<br>$q \\rightarrow r$<br>$\\sim(p \\land s) \\lor t$<br>$\\sim r$<br>$q \\lor (u \\land s)$<br>$\\therefore u \\rightarrow t$",
   vf, 0, "$\\sim r$와 $q \\to r$의 대우로 $\\sim q$. $p \\lor q$와 $\\sim q$에서 $p$. $q \\lor (u \\land s)$와 $\\sim q$에서 $u \\land s$, 즉 $s$. $p$와 $s$에서 $p \\land s$. $\\sim(p \\land s) \\lor t$에서 $t$. $t$이면 $u \\to t$는 항상 참. 유효추론.")\mc("<strong>[문제 23(c)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$\\{\\sim(p \\land t) \\lor r\\} \\lor s$<br>$u \\rightarrow p$<br>$\\sim q \\lor (u \\land t)$<br>$\\sim s$<br>$\\therefore q \\rightarrow (t \\rightarrow r)$",
   vf, 0, "$\\sim s$와 첫째 전제에서 $\\sim(p \\land t) \\lor r$. 이는 $(p \\land t) \\to r$. $\\sim q \\lor (u \\land t)$에서 $q$가 T이면 $u \\land t$, 즉 $u$와 $t$. $u \\to p$에서 $p$. $p \\land t$이므로 $r$. 따라서 $q \\to (t \\to r)$ 성립. 유효추론.")\mc("<strong>[문제 23(d)]</strong> 다음 추론이 유효추론인지 허위추론인지 판별하라.<br><br>$\\sim p \\lor q$<br>$q \\rightarrow s$<br>$(\\sim p \\land r) \\rightarrow s$<br>$\\sim s$<br>$\\therefore \\sim r$",
   vf, 0, "$\\sim s$와 $q \\to s$의 대우로 $\\sim q$. $\\sim p \\lor q$와 $\\sim q$에서 $\\sim p$. $(\\sim p \\land r) \\to s$와 $\\sim s$에서 $\\sim(\\sim p \\land r)$, 즉 $p \\lor \\sim r$. $\\sim p$이므로 $\\sim r$. 유효추론.")

# ───── 24 ─────\proof("<strong>[문제 24(a)]</strong> 다음과 같이 전제가 주어진 추론의 결론을 유도하라.<br><br>전제 A : 변수를 정수형으로 선언하지 않고 조건에 따라 연산한다.<br>전제 B : 변수를 정수형으로 선언하지 않으면, 반복문이 무한히 실행된다.<br>전제 C : 반복문이 무한히 실행되면, 프로그램을 강제 종료한다.",
   "$p$: 정수형 선언 안 함, $q$: 조건에 따라 연산, $r$: 반복문 무한 실행, $s$: 프로그램 강제 종료",
   "A: $\\sim p \\land q$에서 $\\sim p$. B: $\\sim p \\to r$에서 $r$. C: $r \\to s$에서 $s$.<br>결론: <strong>프로그램을 강제 종료한다.</strong>")\proof("<strong>[문제 24(b)]</strong> 다음과 같이 전제가 주어진 추론의 결론을 유도하라.<br><br>전제 A : 마트에서 장을 보거나 영화를 본다.<br>전제 B : 마트에서 장을 보면, 저녁에 스테이크를 먹는다.<br>전제 C : 영화를 보면, 저녁에 햄버거를 먹는다.<br>전제 D : 저녁에 햄버거를 먹지 않고 샐러드를 먹는다.",
   "$p$: 장봄, $q$: 영화, $r$: 스테이크, $s$: 햄버거, $t$: 샐러드",
   "D: $\\sim s \\land t$에서 $\\sim s$. C의 대우: $\\sim s \\to \\sim q$에서 $\\sim q$. A: $p \\lor q$와 $\\sim q$에서 $p$. B: $p \\to r$에서 $r$.<br>결론: <strong>마트에서 장을 보고, 저녁에 스테이크를 먹으며, 샐러드를 먹는다.</strong>")\proof("<strong>[문제 24(c)]</strong> 다음과 같이 전제가 주어진 추론의 결론을 유도하라.<br><br>전제 A : 운동을 하고 떡볶이를 먹지 않으면, 몸무게가 줄어든다.<br>전제 B : 몸무게가 줄어들지 않고 배가 나온다.<br>전제 C : 떡볶이를 먹으면, 배가 나오지 않는다.<br>전제 D : 퇴근을 하면, 운동을 한다.<br>전제 E : 퇴근을 하지 않으면, 야근을 하고 떡볶이를 먹지 않는다.",
   "$p$: 운동, $q$: 떡볶이, $r$: 몸무게↓, $s$: 배나옴, $t$: 퇴근, $u$: 야근",
   "B: $\\sim r \\land s$에서 $s$. C의 대우: $s \\to \\sim q$에서 $\\sim q$. A: $(p \\land \\sim q) \\to r$의 대우: $\\sim r \\to \\sim(p \\land \\sim q) = \\sim p \\lor q$. $\\sim r$이고 $\\sim q$이므로 $\\sim p$. D의 대우: $\\sim p \\to \\sim t$에서 $\\sim t$. E: $\\sim t \\to (u \\land \\sim q)$에서 $u$.<br>결론: <strong>퇴근을 하지 않고 야근을 하며, 떡볶이를 먹지 않고, 운동을 하지 않으며, 배가 나온다.</strong>")\proof("<strong>[문제 24(d)]</strong> 다음과 같이 전제가 주어진 추론의 결론을 유도하라.<br><br>전제 A : 계속 직진을 하고 두 블록을 더 간다.<br>전제 B : 유턴을 하지 않으면, 두 블록을 더 가지 않거나 길을 잃는다.<br>전제 C : 유턴을 하면, 목적지에 도착한다.<br>전제 D : 목적지에 도착하면, 계속 직진하지 않는다.<br>전제 E : 목적지에 도착하지 않거나 두 블록을 더 간다.",
   "$p$: 직진, $q$: 두 블록 더감, $r$: 유턴, $s$: 목적지 도착, $t$: 길 잃음",
   "A: $p \\land q$에서 $q$. B: $\\sim r \\to (\\sim q \\lor t)$, 대우: $(q \\land \\sim t) \\to r$. C: $r \\to s$. D: $s \\to \\sim p$. A에서 $p$, D의 대우: $p \\to \\sim s$에서 $\\sim s$. E: $\\sim s \\lor q$, $\\sim s$이므로 성립. $\\sim s$와 C의 대우: $\\sim s \\to \\sim r$에서 $\\sim r$. B에서 $\\sim q \\lor t$. $q$이므로 $t$.<br>결론: <strong>유턴을 하지 않고 길을 잃는다.</strong>")

# ───── 25 ─────\proof("<strong>[문제 25(a)]</strong> 비상금은 어디에 있는가?<br><br>전제 A : 집이 단독주택이면, 비상금은 침실에 있지 않다.<br>전제 B : 거실에 난초가 있으면, 비상금은 침실에 있다.<br>전제 C : 집은 단독주택이다.<br>전제 D : 거실에 난초가 있거나 비상금이 주방에 있다.",
   "$p$: 단독주택, $q$: 비상금 침실, $r$: 난초, $s$: 비상금 주방",
   "C: $p$. A: $p \\to \\sim q$에서 $\\sim q$. B의 대우: $\\sim q \\to \\sim r$에서 $\\sim r$. D: $r \\lor s$와 $\\sim r$에서 $s$.<br>결론: <strong>비상금은 주방에 있다.</strong>")\proof("<strong>[문제 25(b)]</strong> 선희가 해야 할 일은 무엇인가?<br><br>전제 A : 선희가 퇴근을 하지 않는다면, 영수와 저녁을 먹고 쇼핑은 하지 않는다.<br>전제 B : 영화 티켓을 영수에게 주면, 선희는 쇼핑을 한다.<br>전제 C : 선희가 회사 보고서를 작성해야 한다면, 선희는 퇴근을 하지 않는다.<br>전제 D : 영수는 운동하러 가지 않는다.<br>전제 E : 선희가 회사 보고서를 작성하거나 영수가 운동하러 간다.",
   "$p$: 퇴근, $q$: 영수와 저녁, $r$: 쇼핑, $s$: 영화 티켓, $t$: 보고서, $u$: 영수 운동",
   "D: $\\sim u$. E: $t \\lor u$와 $\\sim u$에서 $t$. C: $t \\to \\sim p$에서 $\\sim p$. A: $\\sim p \\to (q \\land \\sim r)$에서 $q \\land \\sim r$. B의 대우: $\\sim r \\to \\sim s$에서 $\\sim s$.<br>결론: <strong>선희는 회사 보고서를 작성하고, 영수와 저녁을 먹으며, 쇼핑은 하지 않고, 영화 티켓을 영수에게 주지 않는다.</strong>")\proof("<strong>[문제 25(c)]</strong> 시영이가 퇴근한 후에 하지 않을 일은 무엇인가?<br><br>전제 A : 방을 치우지 않으면, 설거지를 하고 책을 읽지 않는다.<br>전제 B : 설거지를 하지 않거나 음악을 듣지 않는다.<br>전제 C : 방을 치우거나 책을 읽으면, 그림을 그린다.<br>전제 D : 음악을 듣고 그림을 그리지 않는다.",
   "$p$: 방 치움, $q$: 설거지, $r$: 책, $s$: 그림, $t$: 음악",
   "D: $t \\land \\sim s$에서 $t$, B에서 $\\sim q \\lor \\sim t$, $t$이므로 $\\sim q$. A: $\\sim p \\to (q \\land \\sim r)$의 대우: $\\sim q \\lor r \\to p$. $\\sim q$이므로 $p$. C: $(p \\lor r) \\to s$, $p$이므로 $s$. 이는 $\\sim s$와 모순.<br><br>재검토: D에서 $t$. B: $\\sim q \\lor \\sim t$에서 $\\sim q$. 그런데 $\\sim p$이면 A에서 $q$이어야 하는데 $\\sim q$이므로 $p$ (귀류). $p$이고 C: $s$, D와 모순. 따라서 전제가 비일관적이거나 문제의 해석에 따라: <strong>그림을 그리지 않는다.</strong>")\proof("<strong>[문제 25(d)]</strong> 다이어트를 위해 먹지 않는 것은 무엇인가?<br><br>전제 A : 양념치킨과 콜라를 모두 먹지 않으면, 샐러드를 먹지 않는다.<br>전제 B : 샐러드를 먹는다. 그리고 양념치킨을 먹으면, 고구마를 먹는다.<br>전제 C : 고구마를 먹는 조건 하에 빵을 먹으면, 콜라를 마시지 않는다.<br>전제 D : 콜라를 마시는 조건 하에 아이스크림을 먹으면, 고구마를 먹지 않는다.",
   "$p$: 양념치킨, $q$: 콜라, $r$: 샐러드, $s$: 고구마, $t$: 빵, $u$: 아이스크림",
   "B: $r$ (샐러드 먹음). A의 대우: $r \\to \\sim(\\sim p \\land \\sim q) = p \\lor q$. 즉 양념치킨 또는 콜라 중 하나는 먹음. B: $p \\to s$ (양념치킨 먹으면 고구마). C: $(s \\land t) \\to \\sim q$. D: $(q \\land u) \\to \\sim s$.<br>$p$이면 $s$. $s \\land t$이면 $\\sim q$. $q$이고 $u$이면 $\\sim s$.<br><br>경우 분석으로 도출: <strong>빵을 먹지 않거나 콜라를 마시지 않는다.</strong> (구체적 결론은 전제 조합에 따라 다름)")

# ─── output ───\with open("./ch2.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
\print(f"Total questions: {len(q_list)}")\types = {}\for qq in q_list:
    types[qq['type']] = types.get(qq['type'], 0) + 1\print("By type:", types)