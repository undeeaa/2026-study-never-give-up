const API_URL = "https://script.google.com/macros/s/AKfycbwQL6_dh3yOajdrfXLEOe0bfoUL-RuFhn57b-hkZRtnmj5NA8z4LUYHV3MvSwqAr4Gz/exec";

const CATEGORIES = [
  { id: "1", label: "정치" },
  { id: "2", label: "경제,경영" },
  { id: "3", label: "사회,문화" },
  { id: "4", label: "음악,미술,스포츠 등" },
  { id: "5", label: "자연과학, 신기술 등" },
  { id: "6", label: "인문과학, 철학 등" },
  { id: "7", label: "KBS 백서, 방송계 내부 뉴스 관련 등" },
  { id: "8", label: "맞춤법, 한자성어 등" },
];

const CATEGORY_LABEL_BY_ID = Object.fromEntries(CATEGORIES.map((category) => [category.id, category.label]));
const CATEGORY_ID_BY_LABEL = Object.fromEntries(CATEGORIES.map((category) => [category.label, category.id]));

const VIEWS = ["list", "add", "flash", "quiz"];

const state = {
  items: [],
  search: "",
  category: "",
  loaded: false,
  flash: {
    items: [],
    index: 0,
    flipped: false,
    preferDescriptionFirst: false,
  },
  quiz: {
    items: [],
    index: 0,
    results: [],
    answeredCurrent: false,
    pendingResult: null,
  },
};

const viewList = document.getElementById("view-list");
const viewAdd = document.getElementById("view-add");
const viewFlash = document.getElementById("view-flash");
const viewQuiz = document.getElementById("view-quiz");

const navList = document.getElementById("nav-list");
const navAdd = document.getElementById("nav-add");
const navFlash = document.getElementById("nav-flash");
const navQuiz = document.getElementById("nav-quiz");

const form = document.getElementById("material-form");
const studyCodeInput = document.getElementById("studyCode");
const authorInput = document.getElementById("author");
const categorySelect = document.getElementById("category");
const submitButton = document.getElementById("submit-button");
const submitText = document.getElementById("submit-text");
const submitSpinner = document.getElementById("submit-spinner");
const formMessage = document.getElementById("form-message");

const entries = document.getElementById("entries");
const entryTemplate = document.getElementById("entry-template");
const addEntryButton = document.getElementById("add-entry-button");

const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const cards = document.getElementById("cards");
const listStatus = document.getElementById("list-status");
const listLoading = document.getElementById("list-loading");
const refreshButton = document.getElementById("refresh-button");

const flashCategoryOptions = document.getElementById("flash-category-options");
const flashSetupStep = document.getElementById("flash-setup-step");
const flashPlayStep = document.getElementById("flash-play-step");
const flashStartButton = document.getElementById("flash-start-button");
const flashResetButton = document.getElementById("flash-reset-button");
const flashBackButton = document.getElementById("flash-back-button");
const flashSetupStatus = document.getElementById("flash-setup-status");
const flashPreferDescriptionInput = document.getElementById("flash-prefer-description");
const flashCard = document.getElementById("flash-card");
const flashProgress = document.getElementById("flash-progress");
const flashProgressTrack = document.getElementById("flash-progress-track");
const flashProgressFill = document.getElementById("flash-progress-fill");
const flashAnswer = document.getElementById("flash-answer");
const flashDescription = document.getElementById("flash-description");
const flashNextButton = document.getElementById("flash-next-button");

const quizCategoryOptions = document.getElementById("quiz-category-options");
const quizSetupStep = document.getElementById("quiz-setup-step");
const quizPlayStep = document.getElementById("quiz-play-step");
const quizCountSelect = document.getElementById("quiz-count-select");
const quizStartButton = document.getElementById("quiz-start-button");
const quizBackButton = document.getElementById("quiz-back-button");
const quizSetupStatus = document.getElementById("quiz-setup-status");
const quizPlayer = document.getElementById("quiz-player");
const quizProgress = document.getElementById("quiz-progress");
const quizProgressTrack = document.getElementById("quiz-progress-track");
const quizProgressFill = document.getElementById("quiz-progress-fill");
const quizQuestionLabel = document.getElementById("quiz-question-label");
const quizQuestion = document.getElementById("quiz-question");
const quizAnswerInput = document.getElementById("quiz-answer-input");
const quizLiveResult = document.getElementById("quiz-live-result");
const quizSubmitButton = document.getElementById("quiz-submit-button");
const quizSkipButton = document.getElementById("quiz-skip-button");
const quizNextButton = document.getElementById("quiz-next-button");
const quizResult = document.getElementById("quiz-result");
const quizScore = document.getElementById("quiz-score");
const quizWrongList = document.getElementById("quiz-wrong-list");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isConfiguredApiUrl() {
  return API_URL && API_URL !== "APPS_SCRIPT_WEB_APP_URL";
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function firstFilled(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function normalizeCategoryId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (CATEGORY_LABEL_BY_ID[raw]) {
    return raw;
  }
  if (CATEGORY_ID_BY_LABEL[raw]) {
    return CATEGORY_ID_BY_LABEL[raw];
  }
  const numberMatch = raw.match(/^(\d+)\s*[.)-]?\s*/);
  if (numberMatch && CATEGORY_LABEL_BY_ID[numberMatch[1]]) {
    return numberMatch[1];
  }
  return "";
}

function categoryLabelFromValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  const categoryId = normalizeCategoryId(raw);
  if (categoryId) {
    return CATEGORY_LABEL_BY_ID[categoryId];
  }
  return raw;
}

function categoryDisplayText(categoryId) {
  const label = CATEGORY_LABEL_BY_ID[categoryId];
  if (!label) {
    return "미분류";
  }
  return `${categoryId}. ${label}`;
}

function normalizeCompare(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function isCorrectAnswer(input, answer) {
  return normalizeCompare(input) === normalizeCompare(answer);
}

function shuffle(items) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function normalizeItem(item) {
  const rawCategory = firstFilled(item?.category);
  const categoryId = normalizeCategoryId(rawCategory);
  const categoryLabel = categoryLabelFromValue(rawCategory);

  return {
    id: String(item?.id ?? "").trim(),
    createdAt: String(item?.createdAt ?? "").trim(),
    author: firstFilled(item?.author),
    categoryId,
    category: categoryLabel,
    question: firstFilled(item?.question, item?.problem, item?.point, item?.title),
    answer: firstFilled(item?.answer, item?.correct, item?.solution),
    description: firstFilled(item?.description, item?.summary),
    source: firstFilled(item?.source),
  };
}

function sortLatest(items) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);

    if (aValid && bValid && aTime !== bTime) {
      return bTime - aTime;
    }
    if (aValid && !bValid) {
      return -1;
    }
    if (!aValid && bValid) {
      return 1;
    }

    const byCreatedAt = b.createdAt.localeCompare(a.createdAt);
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }
    return b.id.localeCompare(a.id);
  });
}

function formatCreatedAt(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    return escapeHtml(value || "-");
  }
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(time));
  return escapeHtml(formatted);
}

function sourceToHtml(source) {
  if (!source) {
    return "";
  }
  if (!isHttpUrl(source)) {
    return escapeHtml(source);
  }

  const url = new URL(source);
  const safeHref = escapeHtml(url.toString());
  const safeText = escapeHtml(source);
  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
}

function setFormMessage(type, message) {
  formMessage.className = `message ${type}`;
  formMessage.textContent = message;
}

function setListStatus(message) {
  listStatus.textContent = message;
}

function setStatus(target, type, message) {
  target.className = type ? `status ${type}` : "status";
  target.textContent = message;
}

function setFormLoading(isLoading) {
  form.classList.toggle("is-loading", isLoading);
  submitText.hidden = isLoading;
  submitSpinner.hidden = !isLoading;

  const controls = form.querySelectorAll("input, select, textarea, button");
  controls.forEach((control) => {
    control.disabled = isLoading;
  });

  if (!isLoading) {
    updateEntryIndices();
  }
}

function setListLoading(isLoading) {
  listLoading.hidden = !isLoading;
  searchInput.disabled = isLoading;
  filterCategory.disabled = isLoading;
  refreshButton.disabled = isLoading;
}

function renderListSkeleton(count = 4) {
  const blocks = [];
  for (let i = 0; i < count; i += 1) {
    blocks.push(`
      <article class="card skeleton-card" aria-hidden="true">
        <div class="card-head">
          <span class="skeleton-line s-w-sm"></span>
          <span class="skeleton-line s-w-xs"></span>
        </div>
        <div class="skeleton-line s-w-lg"></div>
        <div class="skeleton-line s-w-md"></div>
        <div class="card-meta">
          <span class="skeleton-line s-w-sm"></span>
          <span class="skeleton-line s-w-md"></span>
        </div>
      </article>
    `);
  }
  cards.innerHTML = blocks.join("");
}

function fillCategoryOptions() {
  categorySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "대분류를 선택하세요";
  placeholder.disabled = true;
  placeholder.selected = true;
  categorySelect.appendChild(placeholder);

  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.id}. ${category.label}`;
    categorySelect.appendChild(option);
  }

  filterCategory.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "전체 대분류";
  filterCategory.appendChild(allOption);

  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.id}. ${category.label}`;
    filterCategory.appendChild(option);
  }
}

function buildCategoryOptions(container, key) {
  container.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-option is-selected";
    button.dataset.categoryId = category.id;
    button.dataset.optionGroup = key;
    button.setAttribute("aria-pressed", "true");
    button.textContent = `${category.id}. ${category.label}`;

    button.addEventListener("click", () => {
      const nextSelected = !button.classList.contains("is-selected");
      button.classList.toggle("is-selected", nextSelected);
      button.setAttribute("aria-pressed", nextSelected ? "true" : "false");
    });

    container.appendChild(button);
  });
}

function getSelectedCategories(container) {
  return [...container.querySelectorAll(".category-option.is-selected")]
    .map((button) => String(button.dataset.categoryId || "").trim())
    .filter(Boolean);
}

function resetCategoryChecks(container, checked = true) {
  container.querySelectorAll(".category-option").forEach((button) => {
    button.classList.toggle("is-selected", checked);
    button.setAttribute("aria-pressed", checked ? "true" : "false");
  });
}

function addEntry(initial = {}) {
  const node = entryTemplate.content.firstElementChild.cloneNode(true);

  node.querySelector(".entry-question").value = initial.question ?? "";
  node.querySelector(".entry-answer").value = initial.answer ?? "";
  node.querySelector(".entry-description").value = initial.description ?? "";
  node.querySelector(".entry-source").value = initial.source ?? "";

  const removeButton = node.querySelector(".remove-entry");
  removeButton.addEventListener("click", () => {
    if (entries.children.length <= 1) {
      return;
    }
    node.remove();
    updateEntryIndices();
  });

  entries.appendChild(node);
  updateEntryIndices();
}

function updateEntryIndices() {
  const allEntries = [...entries.querySelectorAll("[data-entry]")];
  allEntries.forEach((entry, index) => {
    entry.querySelector(".entry-index").textContent = `소재 ${index + 1}`;
    const removeButton = entry.querySelector(".remove-entry");
    removeButton.disabled = allEntries.length === 1;
  });
}

function resetEntryValues() {
  entries.innerHTML = "";
  addEntry();
}

function toSearchText(item) {
  return [item.question, item.answer, item.description, item.author, item.source]
    .join(" ")
    .toLowerCase();
}

function getVisibleItems() {
  const query = state.search.trim().toLowerCase();

  return state.items.filter((item) => {
    if (state.category && item.categoryId !== state.category) {
      return false;
    }
    if (!query) {
      return true;
    }
    return toSearchText(item).includes(query);
  });
}

function renderCards() {
  const visibleItems = getVisibleItems();

  if (visibleItems.length === 0) {
    cards.innerHTML = '<div class="empty">조건에 맞는 소재가 없습니다.</div>';
    setListStatus("총 0건");
    return;
  }

  cards.innerHTML = visibleItems
    .map((item) => {
      const safeCategory = escapeHtml(
        item.categoryId ? categoryDisplayText(item.categoryId) : (item.category || "미분류")
      );
      const safeAnswer = escapeHtml(item.answer || "-");
      const safeDescription = escapeHtml(item.description || "-");
      const safeAuthor = escapeHtml(item.author || "-");
      const safeDate = formatCreatedAt(item.createdAt);
      const sourceText = firstFilled(item.source);
      const safeSource = sourceToHtml(sourceText);
      const hasSource = Boolean(sourceText && sourceText !== "-" && safeSource);
      const sourceMeta = hasSource
        ? `<div class="meta-source"><span class="meta-label">출처</span><span class="meta-source-value">${safeSource}</span></div>`
        : "";

      return `
        <article class="card">
          <div class="card-head">
            <span class="card-badge">${safeCategory}</span>
            <span class="card-date">${safeDate}</span>
          </div>
          <h3 class="card-title">${safeAnswer}</h3>
          <p class="card-description">${safeDescription}</p>
          <div class="card-meta">
            ${sourceMeta}
            <span class="meta-author">${safeAuthor}</span>
          </div>
        </article>
      `;
    })
    .join("");

  setListStatus(`총 ${visibleItems.length}건 (최신순)`);
}

async function fetchList() {
  if (!isConfiguredApiUrl()) {
    setListStatus("API URL을 script.js에서 설정해 주세요.");
    cards.innerHTML = '<div class="empty">API URL 설정 후 목록을 불러올 수 있습니다.</div>';
    setListLoading(false);
    return false;
  }

  setListLoading(true);
  setListStatus("");
  renderListSkeleton();

  try {
    const response = await fetch(`${API_URL}?action=list`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`목록 요청 실패 (${response.status})`);
    }

    const data = await response.json();
    if (!data?.ok || !Array.isArray(data.items)) {
      throw new Error("목록 응답 형식이 올바르지 않습니다.");
    }

    state.items = sortLatest(data.items.map(normalizeItem));
    state.loaded = true;
    renderCards();
    return true;
  } catch (error) {
    cards.innerHTML = '<div class="empty">목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
    if (error instanceof TypeError) {
      setListStatus("오류: CORS로 목록 조회가 차단되었습니다. Apps Script 배포 설정을 확인해 주세요.");
    } else {
      setListStatus(`오류: ${error.message}`);
    }
    return false;
  } finally {
    setListLoading(false);
  }
}

async function ensureItemsLoaded() {
  if (state.loaded) {
    return true;
  }
  return fetchList();
}

async function postItem(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`등록 요청 실패 (${response.status})`);
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (data && data.ok === false) {
      throw new Error(data.message || "등록 실패");
    }

    return { mode: "cors" };
  } catch (primaryError) {
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });
      return { mode: "no-cors" };
    } catch (fallbackError) {
      throw new Error(`${primaryError.message} / fallback 실패: ${fallbackError.message}`);
    }
  }
}

function collectEntryPayloads() {
  const rows = [...entries.querySelectorAll("[data-entry]")];
  const payloads = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const question = row.querySelector(".entry-question").value.trim();
    const answer = row.querySelector(".entry-answer").value.trim();
    const description = row.querySelector(".entry-description").value.trim();
    const source = row.querySelector(".entry-source").value.trim();

    const hasAnyValue = Boolean(question || answer || description || source);
    if (!hasAnyValue) {
      return;
    }

    if (!question || !answer || !description) {
      invalidRows.push(index + 1);
      return;
    }

    payloads.push({
      question,
      answer,
      description,
      source,
    });
  });

  if (invalidRows.length > 0) {
    throw new Error(`소재 ${invalidRows.join(", ")}번의 필수값(질문/정답/한 줄 해설)을 확인해 주세요.`);
  }

  if (payloads.length === 0) {
    throw new Error("등록할 소재를 최소 1개 이상 입력해 주세요.");
  }

  return payloads;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!isConfiguredApiUrl()) {
    setFormMessage("error", "script.js의 API_URL을 실제 Apps Script URL로 변경해 주세요.");
    return;
  }

  const studyCode = studyCodeInput.value.trim();
  const author = authorInput.value.trim();
  const categoryId = categorySelect.value.trim();

  if (!studyCode || !author || !categoryId) {
    setFormMessage("error", "스터디 코드, 작성자, 대분류는 필수입니다.");
    return;
  }

  let entryPayloads;
  try {
    entryPayloads = collectEntryPayloads();
  } catch (error) {
    setFormMessage("error", error.message);
    return;
  }

  setFormLoading(true);
  setFormMessage("info", `등록 중입니다. 항목 수(${entryPayloads.length}건)에 따라 몇 초 걸릴 수 있어요.`);

  let successCount = 0;
  let noCorsCount = 0;
  const failMessages = [];

  for (let i = 0; i < entryPayloads.length; i += 1) {
    const entry = entryPayloads[i];
    const payload = {
      studyCode,
      author,
      category: categoryId,
      question: entry.question,
      answer: entry.answer,
      description: entry.description,
      source: entry.source,
    };

    try {
      const result = await postItem(payload);
      successCount += 1;
      if (result.mode === "no-cors") {
        noCorsCount += 1;
      }
    } catch (error) {
      failMessages.push(`${i + 1}번 실패: ${error.message}`);
    }
  }

  if (successCount === entryPayloads.length) {
    setFormMessage("success", `총 ${successCount}건 등록을 완료했습니다. 목록으로 이동합니다.`);
    resetEntryValues();
    setFormLoading(false);
    moveToView("list");
    await fetchList();
    if (noCorsCount > 0) {
      setListStatus(`${listStatus.textContent} · ${noCorsCount}건은 no-cors fallback 처리`);
    }
  } else if (successCount > 0) {
    setFormMessage(
      "error",
      `총 ${entryPayloads.length}건 중 ${successCount}건 성공, ${entryPayloads.length - successCount}건 실패. ${failMessages[0]}`
    );
    setFormLoading(false);
  } else {
    setFormMessage("error", `등록에 실패했습니다. ${failMessages[0] || "요청을 확인해 주세요."}`);
    setFormLoading(false);
  }
}

function setFlashStage(stage) {
  const isPlay = stage === "play";
  flashSetupStep.hidden = isPlay;
  flashPlayStep.hidden = !isPlay;
}

function getFlashDefaultFlipped() {
  return Boolean(flashPreferDescriptionInput?.checked);
}

function setFlashProgress(current, total) {
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const ratio = safeTotal > 0 ? Math.min(1, safeCurrent / safeTotal) : 0;

  flashProgressTrack.setAttribute("aria-valuemax", String(safeTotal));
  flashProgressTrack.setAttribute("aria-valuenow", String(Math.min(safeCurrent, safeTotal)));
  flashProgressFill.style.width = `${ratio * 100}%`;
}

function renderFlashCard(message = "") {
  const current = state.flash.items[state.flash.index];
  if (!current) {
    setFlashProgress(0, 0);
    flashProgress.textContent = "0 / 0";
    setFlashStage("setup");
    return;
  }

  const currentOrder = state.flash.index + 1;
  const total = state.flash.items.length;
  setFlashProgress(currentOrder, total);
  flashProgress.textContent = `${currentOrder} / ${total}${message ? ` · ${message}` : ""}`;
  flashAnswer.textContent = current.answer || "-";
  flashDescription.textContent = current.description || "-";
  flashCard.classList.toggle("is-flipped", state.flash.flipped);
}

function toggleFlashCard() {
  if (state.flash.items.length === 0) {
    return;
  }
  state.flash.flipped = !state.flash.flipped;
  flashCard.classList.toggle("is-flipped", state.flash.flipped);
}

function nextFlashCard() {
  if (state.flash.items.length === 0) {
    return;
  }

  if (state.flash.index >= state.flash.items.length - 1) {
    state.flash.items = shuffle(state.flash.items);
    state.flash.index = 0;
    state.flash.flipped = state.flash.preferDescriptionFirst;
    renderFlashCard("한 바퀴 완료, 자동으로 다시 섞었습니다");
    return;
  }

  state.flash.index += 1;
  state.flash.flipped = state.flash.preferDescriptionFirst;
  renderFlashCard();
}

async function startFlashCards() {
  const ok = await ensureItemsLoaded();
  if (!ok) {
    setStatus(flashSetupStatus, "error", "목록을 불러오지 못해 플래시 카드를 시작할 수 없습니다.");
    return;
  }

  const selectedCategories = getSelectedCategories(flashCategoryOptions);
  if (selectedCategories.length === 0) {
    setStatus(flashSetupStatus, "error", "최소 1개 이상의 카테고리를 선택해 주세요.");
    return;
  }

  const candidates = state.items.filter((item) => selectedCategories.includes(item.categoryId));
  const memorizationItems = candidates.filter((item) => item.answer || item.description);

  if (memorizationItems.length === 0) {
    setStatus(flashSetupStatus, "error", "선택한 카테고리에 암기할 항목이 없습니다.");
    return;
  }

  state.flash.items = shuffle(memorizationItems);
  state.flash.index = 0;
  state.flash.preferDescriptionFirst = getFlashDefaultFlipped();
  state.flash.flipped = state.flash.preferDescriptionFirst;

  setStatus(flashSetupStatus, "", `총 ${state.flash.items.length}개 카드를 준비했습니다.`);
  setFlashStage("play");
  renderFlashCard();
}

function resetFlashCards() {
  resetCategoryChecks(flashCategoryOptions, true);
  state.flash.items = [];
  state.flash.index = 0;
  state.flash.flipped = false;
  state.flash.preferDescriptionFirst = false;
  if (flashPreferDescriptionInput) {
    flashPreferDescriptionInput.checked = false;
  }
  setFlashStage("setup");
  flashCard.classList.remove("is-flipped");
  setFlashProgress(0, 0);
  flashProgress.textContent = "0 / 0";
  setStatus(flashSetupStatus, "", "카테고리를 선택하고 시작해 주세요.");
}

function isTypingElement(target) {
  if (!target) {
    return false;
  }
  const tagName = target.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function handleFlashKeyboard(event) {
  if (getCurrentView() !== "flash" || flashPlayStep.hidden || state.flash.items.length === 0) {
    return;
  }
  if (event.defaultPrevented) {
    return;
  }
  if (isTypingElement(event.target)) {
    return;
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") {
    event.preventDefault();
    nextFlashCard();
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "button" || tagName === "a") {
      return;
    }
    event.preventDefault();
    toggleFlashCard();
  }
}

function getQuizTargetCount(selectedValue, availableCount) {
  if (selectedValue === "all") {
    return availableCount;
  }
  const parsed = Number.parseInt(selectedValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.min(5, availableCount);
  }
  return Math.min(parsed, availableCount);
}

function setQuizStage(stage) {
  const isPlay = stage === "play";
  quizSetupStep.hidden = isPlay;
  quizPlayStep.hidden = !isPlay;
}

function setQuizProgress(current, total) {
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const ratio = safeTotal > 0 ? Math.min(1, safeCurrent / safeTotal) : 0;
  const percent = ratio * 100;
  const visualPercent = safeCurrent > 0 && safeTotal > 0 ? Math.max(percent, 3) : 0;

  quizProgressTrack.setAttribute("aria-valuemax", String(safeTotal));
  quizProgressTrack.setAttribute("aria-valuenow", String(Math.min(safeCurrent, safeTotal)));
  quizProgressTrack.setAttribute("aria-valuetext", `${Math.min(safeCurrent, safeTotal)} / ${safeTotal}`);
  quizProgressFill.style.width = `${visualPercent}%`;
}

function renderQuizCurrent() {
  const current = state.quiz.items[state.quiz.index];
  if (!current) {
    return;
  }

  state.quiz.answeredCurrent = false;
  state.quiz.pendingResult = null;

  const currentOrder = state.quiz.index + 1;
  const total = state.quiz.items.length;
  const categoryText = current.categoryId
    ? categoryDisplayText(current.categoryId)
    : firstFilled(current.category, "미분류");
  setQuizProgress(currentOrder, total);
  quizProgress.textContent = `${currentOrder} / ${total}`;
  quizQuestionLabel.textContent = categoryText;
  quizQuestion.textContent = current.question || "(질문 없음)";
  quizAnswerInput.value = "";
  quizAnswerInput.disabled = false;
  quizSubmitButton.disabled = false;
  quizSkipButton.disabled = false;
  quizNextButton.disabled = true;
  quizNextButton.hidden = true;
  setStatus(quizLiveResult, "", "정답을 입력하고 답 제출을 눌러주세요.");

  const isLast = state.quiz.index === state.quiz.items.length - 1;
  quizNextButton.textContent = isLast ? "결과 보기" : "다음";
  quizAnswerInput.focus();
}

function showQuizResult() {
  quizPlayer.hidden = true;
  quizResult.hidden = false;

  const total = state.quiz.results.length;
  const correctCount = state.quiz.results.filter((result) => result.correct).length;
  const percent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  quizScore.textContent = `총 ${total}문제 중 ${correctCount}개 정답 (${percent}%)`;

  const wrongResults = state.quiz.results.filter((result) => !result.correct);

  if (wrongResults.length === 0) {
    quizWrongList.innerHTML = '<div class="empty">완벽합니다. 틀린 문제가 없습니다.</div>';
    return;
  }

  quizWrongList.innerHTML = wrongResults
    .map((result, index) => {
      const safeQuestion = escapeHtml(result.item.question || "-");
      const safeAnswer = escapeHtml(result.item.answer || "-");
      const safeDescription = escapeHtml(result.item.description || "-");
      const safeUserAnswer = escapeHtml(result.userAnswer || "미입력");

      return `
        <article class="wrong-item">
          <p><strong>${index + 1}. 질문</strong>: ${safeQuestion}</p>
          <p><strong>정답</strong>: ${safeAnswer}</p>
          <p><strong>내 입력</strong>: ${safeUserAnswer}</p>
          <p><strong>해설</strong>: ${safeDescription}</p>
        </article>
      `;
    })
    .join("");
}

function moveQuizToNextOrResult() {
  state.quiz.index += 1;
  if (state.quiz.index >= state.quiz.items.length) {
    showQuizResult();
  } else {
    renderQuizCurrent();
  }
}

function submitQuizAnswer() {
  if (state.quiz.answeredCurrent) {
    return;
  }

  const current = state.quiz.items[state.quiz.index];
  if (!current) {
    return;
  }

  const userAnswer = quizAnswerInput.value.trim();
  if (!userAnswer) {
    setStatus(quizLiveResult, "error", "정답을 입력한 뒤 답 제출을 눌러주세요.");
    return;
  }

  const correct = isCorrectAnswer(userAnswer, current.answer);
  const result = {
    item: current,
    userAnswer,
    correct,
    skipped: false,
  };

  state.quiz.results.push(result);
  state.quiz.pendingResult = result;
  state.quiz.answeredCurrent = true;

  if (correct) {
    setStatus(quizLiveResult, "success", "정답입니다. 다음으로 진행하세요.");
  } else {
    setStatus(quizLiveResult, "error", `오답입니다. 정답: ${current.answer || "-"}`);
  }

  quizAnswerInput.disabled = true;
  quizSubmitButton.disabled = true;
  quizSkipButton.disabled = true;
  quizNextButton.disabled = false;
  quizNextButton.hidden = false;
}

function skipQuizCurrent() {
  const current = state.quiz.items[state.quiz.index];
  if (!current) {
    return;
  }

  state.quiz.results.push({
    item: current,
    userAnswer: "스킵함",
    correct: false,
    skipped: true,
  });

  moveQuizToNextOrResult();
}

function advanceQuizStep() {
  if (!state.quiz.answeredCurrent) {
    setStatus(quizLiveResult, "error", "먼저 답 제출을 눌러 채점해 주세요.");
    return;
  }
  moveQuizToNextOrResult();
}

async function startQuiz() {
  const ok = await ensureItemsLoaded();
  if (!ok) {
    setStatus(quizSetupStatus, "error", "목록을 불러오지 못해 문제를 시작할 수 없습니다.");
    return;
  }

  const selectedCategories = getSelectedCategories(quizCategoryOptions);
  if (selectedCategories.length === 0) {
    setStatus(quizSetupStatus, "error", "최소 1개 이상의 카테고리를 선택해 주세요.");
    return;
  }

  const pool = state.items.filter((item) => {
    if (!selectedCategories.includes(item.categoryId)) {
      return false;
    }
    return Boolean(item.question && item.answer);
  });

  if (pool.length === 0) {
    setStatus(quizSetupStatus, "error", "선택한 카테고리에 문제 풀이 가능한 항목이 없습니다.");
    return;
  }

  const targetCount = getQuizTargetCount(quizCountSelect.value, pool.length);
  const items = shuffle(pool).slice(0, targetCount);

  state.quiz.items = items;
  state.quiz.index = 0;
  state.quiz.results = [];
  state.quiz.answeredCurrent = false;
  state.quiz.pendingResult = null;

  quizPlayer.hidden = false;
  quizResult.hidden = true;
  setQuizStage("play");
  setStatus(quizSetupStatus, "", `총 ${items.length}문제를 시작합니다.`);
  renderQuizCurrent();
}

function resetQuizSetup() {
  resetCategoryChecks(quizCategoryOptions, true);
  quizCountSelect.value = "5";
  state.quiz.items = [];
  state.quiz.index = 0;
  state.quiz.results = [];
  state.quiz.answeredCurrent = false;
  state.quiz.pendingResult = null;

  quizPlayer.hidden = true;
  quizResult.hidden = true;
  quizNextButton.hidden = true;
  setQuizStage("setup");
  setQuizProgress(0, 0);
  quizProgress.textContent = "0 / 0";
  quizQuestionLabel.textContent = "문제";
  setStatus(quizSetupStatus, "", "카테고리와 문제 수를 선택하고 시작해 주세요.");
  setStatus(quizLiveResult, "", "");
}

function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "list";
  return VIEWS.includes(view) ? view : "list";
}

function setView(view) {
  const currentView = VIEWS.includes(view) ? view : "list";

  viewList.classList.toggle("is-active", currentView === "list");
  viewAdd.classList.toggle("is-active", currentView === "add");
  viewFlash.classList.toggle("is-active", currentView === "flash");
  viewQuiz.classList.toggle("is-active", currentView === "quiz");

  navList.classList.toggle("is-active", currentView === "list");
  navAdd.classList.toggle("is-active", currentView === "add");
  navFlash.classList.toggle("is-active", currentView === "flash");
  navQuiz.classList.toggle("is-active", currentView === "quiz");

  if (currentView === "list" && !state.loaded) {
    fetchList();
  }
}

function moveToView(view) {
  const targetView = VIEWS.includes(view) ? view : "list";
  const url = new URL(window.location.href);
  url.searchParams.set("view", targetView);
  history.pushState({}, "", url);
  setView(targetView);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindEvents() {
  form.addEventListener("submit", handleSubmit);

  addEntryButton.addEventListener("click", () => {
    addEntry();
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCards();
  });

  filterCategory.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderCards();
  });

  refreshButton.addEventListener("click", () => {
    fetchList();
  });

  flashStartButton.addEventListener("click", () => {
    startFlashCards();
  });

  flashResetButton.addEventListener("click", () => {
    resetFlashCards();
  });

  flashBackButton.addEventListener("click", () => {
    setFlashStage("setup");
  });

  flashNextButton.addEventListener("click", () => {
    nextFlashCard();
  });

  flashCard.addEventListener("click", () => {
    toggleFlashCard();
  });

  flashCard.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    toggleFlashCard();
  });

  document.addEventListener("keydown", handleFlashKeyboard);

  quizStartButton.addEventListener("click", () => {
    startQuiz();
  });

  quizBackButton.addEventListener("click", () => {
    resetQuizSetup();
  });

  quizSubmitButton.addEventListener("click", () => {
    submitQuizAnswer();
  });

  quizNextButton.addEventListener("click", () => {
    advanceQuizStep();
  });

  quizSkipButton.addEventListener("click", () => {
    skipQuizCurrent();
  });

  quizAnswerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!quizSubmitButton.disabled) {
        submitQuizAnswer();
      } else if (!quizNextButton.disabled) {
        advanceQuizStep();
      }
    }
  });

  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      moveToView(link.dataset.viewLink || "list");
    });
  });

  window.addEventListener("popstate", () => {
    setView(getCurrentView());
  });
}

function init() {
  fillCategoryOptions();
  buildCategoryOptions(flashCategoryOptions, "flash");
  buildCategoryOptions(quizCategoryOptions, "quiz");

  resetEntryValues();
  resetFlashCards();
  resetQuizSetup();

  bindEvents();
  setView(getCurrentView());
}

init();
