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
const elSetup = document.getElementById('setup');
const elQuiz = document.getElementById('quiz');
const elResult = document.getElementById('result');

const startBtn = document.getElementById('startBtn');
const quitBtn = document.getElementById('quitBtn');
const nextBtn = document.getElementById('nextBtn');

const qIndexEl = document.getElementById('qIndex');
const qTotalEl = document.getElementById('qTotal');
const qTextEl = document.getElementById('questionText');
const choicesEl = document.getElementById('choices');
const feedbackEl = document.getElementById('feedback');

const scoreText = document.getElementById('scoreText');
const retryWrongBtn = document.getElementById('retryWrongBtn');
const retryAllBtn = document.getElementById('retryAllBtn');
const reviewList = document.getElementById('reviewList');

const bankSelect = document.getElementById('bankSelect');
const activeBankLbl = document.getElementById('activeBankLbl');

// ===== ビルド =====
function buildBankQuestions(bank) {
  const { name, categories } = bank; // { name, categories: {cat:[items]} }
  const catNames = Object.keys(categories);

  // アイテム -> カテゴリ（重複アイテムは最初に出てきたカテゴリを採用）
  const itemToCat = {};
  const allItems = [];
  const seen = new Set();
  for (const cat of catNames) {
    for (const item of categories[cat]) {
      if (seen.has(item)) continue; // 重複を避ける
      seen.add(item);
      itemToCat[item] = cat;
      allItems.push(item);
    }
  }

  const built = [];

  // A) 「次のうち、Xはどれか。」（X=◯類/◯系/◯用途）。各アイテムを正答として1回出す
  for (const item of allItems) {
    const cat = itemToCat[item];
    const exclude = new Set([item]);
    const distractors = sample(
});
