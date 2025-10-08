// ===== ユーティリティ =====


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


function startQuiz(fromSet, bankName) {
makeRun(fromSet, bankName);
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
const selected = bankSelect.value || '__ALL__';
const pool = filterQuestionsByBank(selected);
startQuiz(pool, selected);
});


nextBtn.addEventListener('click', nextQuestion);


quitBtn.addEventListener('click', () => {
finishRun();
});


retryWrongBtn.addEventListener('click', () => {
if (wrongSet.length === 0) return;
// 直前のバンク名をラベルから復元
const bankName = activeBankLbl.textContent.replace('出題範囲：','');
startQuiz(wrongSet, bankName);
});


retryAllBtn.addEventListener('click', () => {
const selected = bankSelect.value || '__ALL__';
const pool = filterQuestionsByBank(selected);
startQuiz(pool, selected);
});
