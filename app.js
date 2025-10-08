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

// ===== 問題ビルド =====
function buildQuestionsFromSchema(schema) {
  const categories = schema.categories; // {"一類":[..], "二類":[..], ...}
  const catNames = Object.keys(categories);

  // 疾患→類 逆引き
  const diseaseToCat = {};
  const allDiseases = [];
  for (const cat of catNames) {
    for (const d of categories[cat]) {
      diseaseToCat[d] = cat;
      allDiseases.push(d);
    }
  }

  const built = [];

  // 1) 「次のうち、X類感染症はどれか」：各類につき1問（五者択一）
  for (const cat of catNames) {
    const correctDisease = sample(categories[cat], 1)[0];
    const exclude = new Set([correctDisease]);
    const distractors = sample(
      allDiseases.filter(d => diseaseToCat[d] !== cat),
      4,
      exclude
    );
    const options = shuffle([correctDisease, ...distractors]);
    built.push({
      text: `次のうち、${cat}感染症はどれか。`,
      options,
      answer: correctDisease
    });
  }

  // 2) 「『疾患』は第何類感染症？」：全疾患を網羅（五者択一）
  for (const d of allDiseases) {
    built.push({
      text: `『${d}』は第何類感染症？`,
      options: ["一類", "二類", "三類", "四類", "五類"],
      answer: diseaseToCat[d]
    });
  }

  return built;
}

// ===== 問題ロード =====
async function loadQuestions() {
  const res = await fetch('questions.json');
  const data = await res.json();
  ALL_QUESTIONS = buildQuestionsFromSchema(data);
}

// ===== 出題ロジック =====
function makeRun(from = ALL_QUESTIONS) {
  questions = shuffle(from);
  current = 0;
  score = 0;
  wrongSet = [];
  review.length = 0;
  qTotalEl.textContent = questions.length;
}

function renderQuestion() {
  const q = questions[current];
  qIndexEl.textContent = current + 1;
  qTextEl.textContent = q.text;
  feedbackEl.textContent = '';
  nextBtn.disabled = true;
  answered = false;

  choicesEl.innerHTML = '';
  const options = shuffle(q.options);
  options.forEach(opt => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectAnswer(btn, opt, q.answer));
    li.appendChild(btn);
    choicesEl.appendChild(li);
  });
}

function selectAnswer(btn, selected, correct) {
  if (answered) return;
  answered = true;

  const buttons = choicesEl.querySelectorAll('button');
  buttons.forEach(b => { b.disabled = true; });

  if (selected === correct) {
    btn.classList.add('correct');
    feedbackEl.textContent = '正解！';
    score++;
    review.push({ ok: true, text: questions[current].text, selected, correct });
  } else {
    btn.classList.add('wrong');
    const correctBtn = Array.from(buttons).find(b => b.textContent === correct);
    if (correctBtn) correctBtn.classList.add('correct');
    feedbackEl.textContent = `不正解… 正解：${correct}`;
    wrongSet.push(questions[current]);
    review.push({ ok: false, text: questions[current].text, selected, correct });
  }

  nextBtn.disabled = false; // 自分の操作で次へ
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
  elQuiz.classList.add('hidden');
  elResult.classList.remove('hidden');
  scoreText.textContent = `${questions.length}問中 ${score}問正解でした。`;

  if (wrongSet.length > 0) {
    retryWrongBtn.classList.remove('hidden');
  } else {
    retryWrongBtn.classList.add('hidden');
  }

  reviewList.innerHTML = '';
  review.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'review-item';
    const status = r.ok ? '<span class="ok">✔ 正解</span>' : '<span class="ng">✘ 不正解</span>';
    div.innerHTML = `${i + 1}. ${status}<br><strong>Q:</strong> ${r.text}<br><strong>あなたの選択:</strong> ${r.selected}<br><strong>正解:</strong> ${r.correct}`;
    reviewList.appendChild(div);
  });
}

function startQuiz(fromSet = ALL_QUESTIONS) {
  makeRun(fromSet);
  elSetup.classList.add('hidden');
  elResult.classList.add('hidden');
  elQuiz.classList.remove('hidden');
  renderQuestion();
}

// ===== イベント =====
startBtn.addEventListener('click', async () => {
  if (!ALL_QUESTIONS.length) {
    await loadQuestions();
  }
  startQuiz();
});

nextBtn.addEventListener('click', nextQuestion);

quitBtn.addEventListener('click', () => {
  finishRun();
});

retryWrongBtn.addEventListener('click', () => {
  if (wrongSet.length === 0) return;
  startQuiz(wrongSet);
});

retryAllBtn.addEventListener('click', () => {
  startQuiz(ALL_QUESTIONS);
});
