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

// ===== 問題ビルド =====
function buildBankQuestions(bank) {
  const { name, categories } = bank;
  const catNames = Object.keys(categories);

  // アイテム → カテゴリ（重複スキップ）
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

  // A) 「次のうち、◯◯はどれか。」形式（全アイテム分）
  for (const item of allItems) {
    const cat = itemToCat[item];
    const exclude = new Set([item]);
    const distractors = sample(
      allItems.filter(x => itemToCat[x] !== cat),
      4,
      exclude
    );
    const options = shuffle([item, ...distractors]);
    built.push({
      bank: name,
      text: `次のうち、${cat}はどれか。`,
      options,
      answer: item
    });
  }

  // B) 感染症（類別）専用の「『○○』は第何類？」形式
  const CLASS_LABELS = ["一類", "二類", "三類", "四類", "五類"];
  const looksClassified = catNames.some(c => CLASS_LABELS.includes(c));
  if (looksClassified) {
    for (const item of allItems) {
      built.push({
        bank: name,
        text: `『${item}』は第何類？`,
        options: CLASS_LABELS,
        answer: itemToCat[item]
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

  // セレクトボックス作成
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

  // 全部の問題を生成
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
  const CAP = {
    "特定機能食品": 20
  };
  let pool = shuffle(from);
  if (CAP[bankName]) pool = pool.slice(0, CAP[bankName]);

  questions = pool;
  current = 0;
  score = 0;
  wrongSet = [];
  review.length = 0;
  qTotalEl.textContent = questions.length;
  activeBankLbl.textContent =
    bankName === "__ALL__"
      ? "出題範囲：全部"
      : `出題範囲：${bankName}`;
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
    btn.addEventListener("click", () =>
      selectAnswer(btn, opt, q.answer)
    );
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

function selectAnswer(btn, selected, correct) {
  if (answered) return;
  answered = true;

  const buttons = choicesEl.querySelectorAll("button");
  buttons.forEach(b => {
    b.disabled = true;
  });

  if (selected === correct) {
    btn.classList.add("correct");
    feedbackEl.textContent = "正解！";
    score++;
    review.push({
      ok: true,
      text: questions[current].text,
      selected,
      correct
    });
  } else {
    btn.classList.add("wrong");
    const correctBtn = Array.from(buttons).find(
      b => b.textContent === correct
    );
    if (correctBtn) correctBtn.classList.add("correct");
    feedbackEl.textContent = `不正解… 正解：${correct}`;
    wrongSet.push(questions[current]);
    review.push({
      ok: false,
      text: questions[current].text,
      selected,
      correct
    });
  }

  nextBtn.disabled = false;
}

function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  } else {
    finishRun();
  }
}

function finishRun() {
  elQuiz.classList.add("hidden");
  elResult.classList.remove("hidden");
  scoreText.textContent = `${questions.length}問中 ${score}問正解でした。`;

  if (wrongSet.length > 0) {
    retryWrongBtn.classList.remove("hidden");
  } else {
    retryWrongBtn.classList.add("hidden");
  }

  reviewList.innerHTML = "";
  review.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "review-item";
    const status = r.ok
      ? '<span class="ok">✔ 正解</span>'
      : '<span class="ng">✘ 不正解</span>';
    div.innerHTML = `${i + 1}. ${status}<br><strong>Q:</strong> ${
      r.text
    }<br><strong>あなたの選択:</strong> ${
      r.selected
    }<br><strong>正解:</strong> ${r.correct}`;
    reviewList.appendChild(div);
  });
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
  if (!ALL_QUESTIONS.length) {
    await loadQuestions();
  }
  const selected = bankSelect.value || "__ALL__";
  const pool = filterQuestionsByBank(selected);
  startQuiz(pool, selected);
});

nextBtn.addEventListener("click", nextQuestion);

quitBtn.addEventListener("click", () => {
  finishRun();
});

retryWrongBtn.addEventListener("click", () => {
  if (wrongSet.length === 0) return;
  const bankName = activeBankLbl.textContent.replace("出題範囲：", "");
  startQuiz(wrongSet, bankName);
});

retryAllBtn.addEventListener("click", () => {
  const selected = bankSelect.value || "__ALL__";
  const pool = filterQuestionsByBank(selected);
  startQuiz(pool, selected);
});
// ページ表示時に先にロードしてセレクトを埋めておく
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!ALL_QUESTIONS.length) {
      await loadQuestions();
    }
    // 既定は「全部（ミックス）」を選択状態に
    if (bankSelect && !bankSelect.value) bankSelect.value = "__ALL__";
    // ラベルにも反映
    activeBankLbl.textContent = "出題範囲：全部";
  } catch (e) {
    console.error("初期ロードに失敗しました。", e);
  }
});
// セレクト変更時にラベルだけ先に更新（開始前の見た目用）
bankSelect.addEventListener("change", () => {
  const selected = bankSelect.value || "__ALL__";
  activeBankLbl.textContent =
    selected === "__ALL__" ? "出題範囲：全部" : `出題範囲：${selected}`;
});

