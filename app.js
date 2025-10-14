// ==============================
// app.js（衛生系クイズ：全統合＋共通特徴対応版）
// ==============================

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

// ===== 感染症クラス関係 =====
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

  // アイテム整理
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

  // === 通常パターン ===
  for (const item of allItems) {
    const cat = itemToCat[item];
    const exclude = new Set([item]);
    const distractors = sample(allItems.filter(x => itemToCat[x] !== cat), 4, exclude);
    built.push({
      bank: name,
      text: `次のうち、${catDisplay(cat, infectionStyle)}はどれか。`,
      options: shuffle([item, ...distractors]),
      answer: item
    });
  }

  // === 感染症の「第何類感染症？」 ===
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

  // === 特徴（カッコ内）抽出と共通特徴マッピング ===
  const featureRegex = /（(.+?)）/;
  const featureMap = {};

  for (const cat of catNames) {
    const match = cat.match(featureRegex);
    if (!match) continue;
    const features = match[1].split(/[、・]/).map(s => s.trim()).filter(Boolean);
    const drugs = categories[cat];

    for (const f of features) {
      if (!featureMap[f]) featureMap[f] = [];
      featureMap[f].push(...drugs);
    }
  }

  // === 特徴ベースの問題作成（共通特徴全対応） ===
  for (const [feature, items] of Object.entries(featureMap)) {
    let qText = "";
    if (feature.includes("副作用")) {
      qText = `${feature.replace("副作用：", "副作用として")}があるのはどれか。`;
    } else if (feature.includes("結合")) {
      qText = `${feature}するのはどれか。`;
    } else if (feature.includes("有効")) {
      qText = `${feature}なのはどれか。`;
    } else {
      qText = `${feature}に関連するのはどれか。`;
    }

    const correctSet = new Set(items);
    const distractors = sample(allItems.filter(x => !correctSet.has(x)), 4);
    const options = shuffle([...sample(items, 1), ...distractors]);

    built.push({
      bank: name,
      text: qText,
      options,
      answer: options.find(o => items.includes(o)),
      allAnswers: items // ←全正解を保持
    });
  }

  return built;
}

// ===== データ整形 =====
function toBanks(data) {
  if (data.categories && !data.banks) {
    return [{ name: data.name || "感染症", categories: data.categories }];
  }
  return data.banks || [];
}

// ===== 問題ロード =====
async function loadQuestions() {
  BANKS = [];

  // メインデータ
  const res = await fetch("questions.json");
  const data = await res.json();
  BANKS.push(...toBanks(data));

  // 抗菌薬
  try {
    const abRes = await fetch("antibiotics.json");
    const abData = await abRes.json();
    BANKS.push(...toBanks(abData));
  } catch (e) {
    console.warn("抗菌薬分類の読み込みに失敗:", e);
  }

  // セレクト作成
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

  // 全問題生成
  const all = [];
  for (const b of BANKS) all.push(...buildBankQuestions(b));
  ALL_QUESTIONS = all;
}

function filterQuestionsByBank(nameOrAll) {
  if (!nameOrAll || nameOrAll === "__ALL__") return ALL_QUESTIONS;
  return ALL_QUESTIONS.filter(q => q.bank === nameOrAll);
}

// ===== 出題管理 =====
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
  activeBankLbl.textContent =
    bankName === "__ALL__" ? "出題範囲：全部" : `出題範囲：${bankName}`;
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
    btn.addEventListener("click", () => selectAnswer(btn, opt, q));
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

function selectAnswer(btn, selected, q) {
  if (answered) return;
  answered = true;
  const buttons = choicesEl.querySelectorAll("button");
  buttons.forEach(b => (b.disabled = true));

  const correctList = q.allAnswers || [q.answer];

  if (correctList.includes(selected)) {
    btn.classList.add("correct");
    feedbackEl.textContent = "正解！";
    score++;
    review.push({ ok: true, text: q.text, selected, correct: correctList.join(", ") });
  } else {
    btn.classList.add("wrong");
    const correctBtn = Array.from(buttons).find(b => correctList.includes(b.textContent));
    if (correctBtn) correctBtn.classList.add("correct");
    feedbackEl.textContent = `不正解… 正解：${correctList.join(", ")}`;
    wrongSet.push(q);
    review.push({ ok: false, text: q.text, selected, correct: correctList.join(", ") });
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
  retryWrongBtn.classList.toggle("hidden", wrongSet.length === 0);

  reviewList.innerHTML = review
    .map(
      (r, i) => `
    <div class="review-item">
      ${i + 1}. ${r.ok ? '<span class="ok">✔ 正解</span>' : '<span class="ng">✘ 不正解</span>'}<br>
      <strong>Q:</strong> ${r.text}<br>
      <strong>あなたの選択:</strong> ${r.selected}<br>
      <strong>正解:</strong> ${r.correct}
    </div>`
    )
    .join("");
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
quitBtn.addEventListener("click", () => finishRun());

retryWrongBtn.addEventListener("click", () => {
  if (!wrongSet.length) return;
  const bankName = activeBankLbl.textContent.replace("出題範囲：", "");
  startQuiz(wrongSet, bankName);
});

retryAllBtn.addEventListener("click", () => {
  const selected = bankSelect.value || "__ALL__";
  const pool = filterQuestionsByBank(selected);
  startQuiz(pool, selected);
});

if (backToStartBtn) {
  backToStartBtn.addEventListener("click", () => {
    elResult.classList.add("hidden");
    elQuiz.classList.add("hidden");
    elSetup.classList.remove("hidden");
    score = 0;
    current = 0;
    wrongSet = [];
    review.length = 0;
    activeBankLbl.textContent = "出題範囲：全部";
  });
}

// ===== 初期ロード =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!ALL_QUESTIONS.length) await loadQuestions();
    if (bankSelect && !bankSelect.value) bankSelect.value = "__ALL__";
    activeBankLbl.textContent = "出題範囲：全部";
  } catch (e) {
    console.error("初期ロードに失敗:", e);
  }
});

bankSelect.addEventListener("change", () => {
  const selected = bankSelect.value || "__ALL__";
  activeBankLbl.textContent =
    selected === "__ALL__" ? "出題範囲：全部" : `出題範囲：${selected}`;
});

// ===== ゴロ特集タブ =====
document.addEventListener("DOMContentLoaded", () => {
  const tabQuiz = document.getElementById("tabQuiz");
  const tabGoro = document.getElementById("tabGoro");
  const quizPane = document.getElementById("quizPane");
  const goroPane = document.getElementById("goroPane");
  const goroSearch = document.getElementById("goroSearch");
  const goroList = document.getElementById("goroList");
  if (!tabQuiz || !tabGoro) return;

  let GOROS = [];

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function loadGoros() {
    try {
      const res = await fetch("goros.json");
      const data = await res.json();
      GOROS = data.items || [];
      renderGoros(GOROS);
    } catch (e) {
      console.error("goros.json の読み込みに失敗:", e);
      if (goroList)
        goroList.innerHTML = `<p class="progress">ゴロ一覧の読み込みに失敗しました。</p>`;
    }
  }

  function renderGoros(items) {
    if (!goroList) return;
    if (!items.length) {
      goroList.innerHTML = `<p class="progress">該当なし</p>`;
      return;
    }
    goroList.innerHTML = items
      .map(
        it => `
      <article class="goro-item">
        <h3>${escapeHTML(it.title || "")}</h3>
        <div class="meta">${it.category ? `カテゴリ：${escapeHTML(it.category)}` : ""}</div>
        <div class="memo">${escapeHTML(it.memo || "").replace(/\n/g, "<br>")}</div>
      </article>`
      )
      .join("");
  }

  function activateTab(name) {
    const quizActive = name === "quiz";
    quizPane.classList.toggle("hidden", !quizActive);
    goroPane.classList.toggle("hidden", quizActive);
    tabQuiz.classList.toggle("active", quizActive);
    tabGoro.classList.toggle("active", !quizActive);
    if (!quizActive && !GOROS.length) loadGoros();
  }

  tabQuiz.addEventListener("click", () => activateTab("quiz"));
  tabGoro.addEventListener("click", () => activateTab("goro"));

  if (goroSearch) {
    goroSearch.addEventListener("input", e => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) return renderGoros(GOROS);
      const filtered = GOROS.filter(it => {
        const hay = [it.title || "", it.category || "", it.memo || ""].join(" ").toLowerCase();
        return hay.includes(q);
      });
      renderGoros(filtered);
    });
  }

  activateTab("quiz");
});
