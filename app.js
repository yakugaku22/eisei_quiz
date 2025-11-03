// ===== ユーティリティ =====
function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(array, n = 1, exclude = new Set()) {
  const pool = array.filter(x => !exclude.has(x));
  return shuffle(pool).slice(0, n);
}

// ===== 状態 =====
let ALL_QUESTIONS = [];
let BANKS = [];
let questions = [];
let current = 0;
let score = 0;
let answered = false;
let wrongSet = [];
const review = [];

// ===== DOM =====
const elSetup = document.getElementById("setup");
const elQuiz = document.getElementById("quiz");
const elResult = document.getElementById("result");
const startBtn = document.getElementById("startBtn");
const quitBtn = document.getElementById("quitBtn");
const nextBtn = document.getElementById("nextBtn");
const qIndexEl = document.getElementById("qIndex");
const qTotalEl = document.getElementById("qTotal");
const qTextEl = document.getElementById("questionText");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const scoreText = document.getElementById("scoreText");
const retryWrongBtn = document.getElementById("retryWrongBtn");
const retryAllBtn = document.getElementById("retryAllBtn");
const reviewList = document.getElementById("reviewList");
const bankSelect = document.getElementById("bankSelect");
const activeBankLbl = document.getElementById("activeBankLbl");
const backToStartBtn = document.getElementById("backToStartBtn");

// ===== 感染症スタイル判定 =====
const BASE_CLASS = ["一類", "二類", "三類", "四類", "五類"];
function looksInfectionBank(catNames) {
  return catNames.length > 0 && catNames.every(c => BASE_CLASS.includes(c));
}
function catDisplay(cat, infectionStyle) {
  return infectionStyle ? `${cat}感染症` : cat;
}
function classOptions(infectionStyle) {
  return infectionStyle ? BASE_CLASS.map(c => `${c}感染症`) : BASE_CLASS.slice();
}
function classAnswer(rawClass, infectionStyle) {
  return infectionStyle ? `${rawClass}感染症` : rawClass;
}

// ===== 問題ビルド =====
function buildBankQuestions(bank) {
  const { name, categories } = bank;
  const catNames = Object.keys(categories);
  const itemToCat = {};
  const allItems = [];
  const seen = new Set();

  for (const cat of catNames) {
    for (const item of categories[cat]) {
      if (seen.has(item)) continue;
      seen.add(item);
      itemToCat[item] = cat;
      allItems.push(item);
    }
  }

  const built = [];
  const infectionStyle = looksInfectionBank(catNames);

  // 「次のうち、◯◯はどれか」
  for (const item of allItems) {
    const cat = itemToCat[item];
    const exclude = new Set([item]);
    const distractors = sample(allItems.filter(x => itemToCat[x] !== cat), 4, exclude);
    const options = shuffle([item, ...distractors]);
    built.push({
      bank: name,
      text: `次のうち、${catDisplay(cat, infectionStyle)}はどれか。`,
      options,
      answer: item
    });
  }

  // 感染症だけ「第何類感染症？」
  if (infectionStyle) {
    const opts = classOptions(true);
    for (const item of allItems) {
      const raw = itemToCat[item];
      built.push({
        bank: name,
        text: `『${item}』は第何類感染症？`,
        options: opts,
        answer: classAnswer(raw, true)
      });
    }
  }

  return built;
}

function toBanks(data) {
  if (data.categories && !data.banks) {
    return [{ name: "感染症", categories: data.categories }];
  }
  return data.banks || [];
}

// ===== 問題ロード =====
async function loadQuestions() {
  const res = await fetch("questions.json");
  const data = await res.json();
  BANKS = toBanks(data);

  bankSelect.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = "全部（ミックス）";
  bankSelect.appendChild(optAll);

  for (const b of BANKS) {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = b.name;
    bankSelect.appendChild(opt);
  }

  const all = [];
  for (const b of BANKS) {
    all.push(...buildBankQuestions(b));
  }
  ALL_QUESTIONS = all;
}

function filterQuestionsByBank(nameOrAll) {
  if (!nameOrAll || nameOrAll === "__ALL__") return ALL_QUESTIONS;
  return ALL_QUESTIONS.filter(q => q.bank === nameOrAll);
}

// ===== 出題ロジック =====
function makeRun(from, bankName = "__ALL__") {
  const CAP = { "特定機能食品": 20 };
  let pool = shuffle(from);
  if (CAP[bankName]) pool = pool.slice(0, CAP[bankName]);

  questions = pool;
  current = 0;
  score = 0;
  wrongSet = [];
  review.length = 0;
  qTotalEl.textContent = questions.length;
  activeBankLbl.textContent = bankName === "__ALL__" ? "出題範囲：全部" : `出題範囲：${bankName}`;
}

function renderQuestion() {
  const q = questions[current];
  qIndexEl.textContent = current + 1;
  qTextEl.textContent = q.text;
  feedbackEl.textContent = "";
  nextBtn.disabled = true;
  answered = false;

  choicesEl.innerHTML = "";
  const options = shuffle(q.options);
  options.forEach(opt => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectAnswer(btn, opt, q.answer));
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

function selectAnswer(btn, selected, correct) {
  if (answered) return;
  answered = true;
  const buttons = choicesEl.querySelectorAll("button");
  buttons.forEach(b => (b.disabled = true));

  if (selected === correct) {
    btn.classList.add("correct");
    feedbackEl.textContent = "正解！";
    score++;
    review.push({ ok: true, text: questions[current].text, selected, correct });
  } else {
    btn.classList.add("wrong");
    const correctBtn = Array.from(buttons).find(b => b.textContent === correct);
    if (correctBtn) correctBtn.classList.add("correct");
    feedbackEl.textContent = `不正解… 正解：${correct}`;
    wrongSet.push(questions[current]);
    review.push({ ok: false, text: questions[current].text, selected, correct });
  }

  nextBtn.disabled = false;
}

// ===== 結果画面 + 円グラフ =====
function finishRun() {
  elQuiz.classList.add("hidden");
  elResult.classList.remove("hidden");
  scoreText.textContent = `${questions.length}問中 ${score}問正解でした。`;

  if (wrongSet.length > 0) retryWrongBtn.classList.remove("hidden");
  else retryWrongBtn.classList.add("hidden");

  reviewList.innerHTML = "";
  review.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "review-item";
    const status = r.ok ? '<span class="ok">✔ 正解</span>' : '<span class="ng">✘ 不正解</span>';
    div.innerHTML = `${i + 1}. ${status}<br><strong>Q:</strong> ${r.text}<br><strong>あなたの選択:</strong> ${r.selected}<br><strong>正解:</strong> ${r.correct}`;
    reviewList.appendChild(div);
  });
}
// ===== 基本制御 =====
function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  } else {
    finishRun();
  }
}
function startQuiz(fromSet, bankName) {
  makeRun(fromSet, bankName);
  elSetup.classList.add("hidden");
  elResult.classList.add("hidden");
  elQuiz.classList.remove("hidden");
  renderQuestion();
}

// ===== イベント =====
startBtn.addEventListener("click", async () => {
  if (!ALL_QUESTIONS.length) await loadQuestions();
  const selected = bankSelect.value || "__ALL__";
  const pool = filterQuestionsByBank(selected);
  startQuiz(pool, selected);
});
nextBtn.addEventListener("click", nextQuestion);
quitBtn.addEventListener("click", finishRun);
retryWrongBtn.addEventListener("click", () => wrongSet.length && startQuiz(wrongSet, activeBankLbl.textContent.replace("出題範囲：", "")));
retryAllBtn.addEventListener("click", () => startQuiz(filterQuestionsByBank(bankSelect.value || "__ALL__"), bankSelect.value || "__ALL__"));
backToStartBtn.addEventListener("click", () => {
  elResult.classList.add("hidden");
  elQuiz.classList.add("hidden");
  elSetup.classList.remove("hidden");
});

// ===== 初期ロード =====
document.addEventListener("DOMContentLoaded", async () => {
  if (!ALL_QUESTIONS.length) await loadQuestions();
  if (bankSelect && !bankSelect.value) bankSelect.value = "__ALL__";
  activeBankLbl.textContent = "出題範囲：全部";
});

// ===== ゴロ特集タブ =====
document.addEventListener("DOMContentLoaded", () => {
  const tabQuiz = document.getElementById("tabQuiz");
  const tabGoro = document.getElementById("tabGoro");
  const goroPane = document.getElementById("goroPane");
  const goroSearch = document.getElementById("goroSearch");
  const goroList = document.getElementById("goroList");
  let GOROS = [];

  function escapeHTML(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  async function loadGoros() {
    try {
      const res = await fetch("goros.json");
      const data = await res.json();
      GOROS = data.items || [];
      renderGoros(GOROS);
    } catch {
      goroList.innerHTML = `<p class="progress">ゴロ一覧の読み込みに失敗しました。</p>`;
    }
  }

  function renderGoros(items) {
    goroList.innerHTML = items.map(it => `
      <article class="goro-item">
        <h3>${escapeHTML(it.title)}</h3>
        <div class="meta">カテゴリ：${escapeHTML(it.category)}</div>
        <div class="memo">${escapeHTML(it.memo).replace(/\n/g, "<br>")}</div>
      </article>`).join("");
  }

  function activateTab(name) {
  const quizActive = name === "quiz";

  // === クイズ⇄ゴロ切り替え ===
  const quizPane = document.getElementById("quizPane");
  const goroPane = document.getElementById("goroPane");

  if (!quizPane || !goroPane) return;

  // タブ表示の切り替え
  quizPane.classList.toggle("hidden", !quizActive);
  goroPane.classList.toggle("hidden", quizActive);

  // アクティブタブ見た目
  tabQuiz.classList.toggle("active", quizActive);
  tabGoro.classList.toggle("active", !quizActive);

  // ゴロ特集読み込み（初回のみ）
  if (!quizActive && !GOROS.length) loadGoros();

  // === クイズ中断再開制御 ===
  if (quizActive) {
    // もしクイズがまだ始まっていない（setup状態）なら setup を表示
    if (questions.length === 0 && elSetup) {
      elSetup.classList.remove("hidden");
      elQuiz.classList.add("hidden");
      elResult.classList.add("hidden");
    }
    // 出題中または結果画面なら、そのままの状態を維持
  }
}

  tabQuiz.addEventListener("click", () => activateTab("quiz"));
  tabGoro.addEventListener("click", () => activateTab("goro"));
  goroSearch.addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q ? GOROS : GOROS.filter(it => [it.title, it.category, it.memo].join(" ").toLowerCase().includes(q));
    renderGoros(filtered);
  });
  activateTab("quiz");
});
