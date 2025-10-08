// ===== ユーティリティ =====
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
div.innerHTML = `${i+1}. ${status}<br><strong>Q:</strong> ${r.text}<br><strong>あなたの選択:</strong> ${r.selected}<br><strong>正解:</strong> ${r.correct}`;
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
