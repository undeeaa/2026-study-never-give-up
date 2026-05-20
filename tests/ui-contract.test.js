const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/Volumes/T7/_개발/2025-study';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');

function blockFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = css.match(re);
  return match ? match[1] : '';
}

test('submit button spinner structure exists and legacy inline loading is removed', () => {
  assert.match(html, /id="submit-button"[\s\S]*id="submit-text"/);
  assert.match(html, /id="submit-button"[\s\S]*id="submit-spinner"/);
  assert.doesNotMatch(html, /id="form-loading"/);
});

test('hidden attribute must force non-display to avoid persistent spinner', () => {
  assert.match(css, /\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important;/);
});

test('setFormLoading toggles only button spinner/text visibility', () => {
  assert.match(js, /submitText\.hidden\s*=\s*isLoading/);
  assert.match(js, /submitSpinner\.hidden\s*=\s*!isLoading/);
});

test('setListLoading toggles list spinner visibility and controls', () => {
  assert.match(js, /function setListLoading\(isLoading\)/);
  assert.match(js, /listLoading\.hidden\s*=\s*!isLoading/);
  assert.match(js, /searchInput\.disabled\s*=\s*isLoading/);
  assert.match(js, /filterCategory\.disabled\s*=\s*isLoading/);
  assert.match(js, /refreshButton\.disabled\s*=\s*isLoading/);
});

test('fetchList shows loading skeleton and always closes loading state in finally', () => {
  assert.match(js, /setListLoading\(true\);/);
  assert.match(js, /renderListSkeleton\(\);/);
  assert.match(js, /finally\s*\{[\s\S]*setListLoading\(false\);[\s\S]*\}/);
});

test('skeleton card styles are present', () => {
  assert.match(css, /\.skeleton-line\s*\{/);
  assert.match(css, /@keyframes skeleton/);
  assert.match(css, /\.skeleton-card/);
});

test('add-entry button size matches submit button baseline', () => {
  const buttonSizingBlock = css.match(/button\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?padding:\s*10px\s+15px;[\s\S]*?\}/m);
  const ghostBlock = blockFor('.ghost-btn');

  assert.ok(buttonSizingBlock, 'button baseline block should include min-height 44px and padding 10px 15px');
  assert.ok(ghostBlock.includes('min-height: 44px;'), 'ghost-btn min-height should be 44px');
  assert.ok(ghostBlock.includes('padding: 10px 15px;'), 'ghost-btn padding should be 10px 15px');
});

test('app has flash and quiz views with nav links', () => {
  assert.match(html, /id=\"nav-flash\"/);
  assert.match(html, /id=\"nav-quiz\"/);
  assert.match(html, /id=\"view-flash\"/);
  assert.match(html, /id=\"view-quiz\"/);
});

test('category is stored as numeric id and rendered via text mapping', () => {
  assert.match(js, /id:\s*\"1\"/);
  assert.match(js, /function normalizeCategoryId\(/);
  assert.match(js, /function categoryDisplayText\(/);
  assert.match(js, /category:\s*categoryId/);
  assert.match(js, /selectedCategories\.includes\(item\.categoryId\)/);
});

test('flash and quiz category options use selectable button chips without checkboxes', () => {
  assert.match(js, /button\.className = \"category-option is-selected\"/);
  assert.match(js, /button\.setAttribute\(\"aria-pressed\", \"true\"\)/);
  assert.match(js, /container\.querySelectorAll\(\"\.category-option\.is-selected\"\)/);
  assert.match(css, /\.category-option\s*\{/);
  assert.match(css, /\.category-option\.is-selected\s*\{/);
  assert.doesNotMatch(css, /\.category-check input\[type=\"checkbox\"\]/);
});

test('list card meta shows author name only and source only when present', () => {
  assert.match(js, /const sourceMeta = hasSource/);
  assert.match(js, /<span class=\"meta-label\">출처<\/span>/);
  assert.match(js, /<span class=\"meta-author\">\$\{safeAuthor\}<\/span>/);
  assert.doesNotMatch(js, /작성자:\s*\$\{safeAuthor\}/);
  assert.doesNotMatch(js, /출처:\s*\$\{safeSource\}/);
});

test('createdAt is rendered as date only', () => {
  assert.match(js, /dateStyle:\s*\"medium\"/);
  assert.doesNotMatch(js, /timeStyle:\s*\"short\"/);
});

test('flash card uses two-stage flow and flip interaction', () => {
  assert.match(html, /id=\"flash-setup-step\"/);
  assert.match(html, /id=\"flash-play-step\"/);
  assert.match(html, /id=\"flash-card\"/);
  assert.match(js, /function toggleFlashCard\(\)/);
  assert.match(js, /flashCard\.classList\.toggle\(\"is-flipped\"/);
  assert.match(js, /한 바퀴 완료, 자동으로 다시 섞었습니다/);
});

test('flash UI uses progress bar and removes the front "정답" label', () => {
  assert.match(html, /id=\"flash-progress-track\"/);
  assert.match(html, /id=\"flash-progress-fill\"/);
  assert.match(js, /function setFlashProgress\(/);
  assert.doesNotMatch(html, /flash-front[\s\S]*정답<\/span>/);
});

test('flash card supports keyboard controls', () => {
  assert.match(html, /id=\"flash-card\"[\s\S]*tabindex=\"0\"/);
  assert.match(js, /function handleFlashKeyboard\(/);
  assert.match(js, /event\.key === \"ArrowRight\"/);
  assert.match(js, /event\.key\.toLowerCase\(\) === \"n\"/);
  assert.match(js, /event\.key === \" \" \|\| event\.key === \"Enter\"/);
  assert.match(js, /document\.addEventListener\(\"keydown\", handleFlashKeyboard\)/);
});

test('flash next button is centered and stretched', () => {
  assert.match(html, /class=\"panel-actions panel-actions-center flash-next-actions\"/);
  assert.match(css, /\.panel-actions-center\s*\{[\s\S]*justify-content:\s*center;/);
  assert.match(css, /#flash-next-button\s*\{[\s\S]*width:\s*min\(560px,\s*100%\);/);
});

test('flash setup actions are centered, two-row, and equal-width', () => {
  assert.match(html, /class=\"panel-actions flash-setup-actions\"/);
  assert.match(css, /\.flash-setup-actions\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /\.flash-setup-actions\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*460px\);/);
  assert.match(css, /\.flash-setup-actions\s*>\s*button\s*\{[\s\S]*width:\s*100%;/);
});

test('flash setup has "description first" option and uses it as initial card side', () => {
  assert.match(html, /id=\"flash-prefer-description\"/);
  assert.match(js, /preferDescriptionFirst:\s*false/);
  assert.match(js, /function getFlashDefaultFlipped\(/);
  assert.match(js, /state\.flash\.preferDescriptionFirst = getFlashDefaultFlipped\(\)/);
  assert.match(js, /state\.flash\.flipped = state\.flash\.preferDescriptionFirst/);
  assert.match(js, /flashPreferDescriptionInput\.checked = false/);
});

test('quiz view has progress bar UI and progress updater', () => {
  assert.match(html, /id=\"quiz-progress-track\"/);
  assert.match(html, /id=\"quiz-progress-fill\"/);
  assert.match(js, /function setQuizProgress\(/);
  assert.match(js, /setQuizProgress\(currentOrder,\s*total\);/);
  assert.match(css, /\.quiz-progress-wrap\s+\.progress-track/);
});

test('quiz workflow uses submit-based judging and two-stage flow', () => {
  assert.match(html, /id=\"quiz-setup-step\"/);
  assert.match(html, /id=\"quiz-play-step\"/);
  assert.match(html, /id=\"quiz-question-label\"/);
  assert.match(html, /id=\"quiz-submit-button\"/);
  assert.match(html, /id=\"quiz-next-button\"[\s\S]*disabled[\s\S]*hidden/);
  assert.match(js, /function submitQuizAnswer\(\)/);
  assert.match(js, /function advanceQuizStep\(\)/);
  assert.match(js, /if \(!state\.quiz\.answeredCurrent\)/);
  assert.doesNotMatch(js, /function evaluateCurrentQuizInput\(\)/);
  assert.match(js, /quizSkipButton\.addEventListener\(\"click\"/);
  assert.match(js, /quizQuestionLabel\.textContent = categoryText/);
  assert.match(js, /quizNextButton\.hidden\s*=\s*true/);
  assert.match(js, /quizNextButton\.hidden\s*=\s*false/);
  assert.match(js, /userAnswer: \"스킵함\"/);
  assert.match(js, /<strong>정답<\/strong>/);
  assert.match(js, /<strong>내 입력<\/strong>/);
  assert.match(js, /<strong>해설<\/strong>/);
});
