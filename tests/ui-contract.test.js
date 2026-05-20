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
