const API_URL = "https://script.google.com/macros/s/AKfycbwQL6_dh3yOajdrfXLEOe0bfoUL-RuFhn57b-hkZRtnmj5NA8z4LUYHV3MvSwqAr4Gz/exec";

const CATEGORIES = [
  "정치",
  "경제,경영",
  "사회,문화",
  "음악,미술,스포츠 등",
  "자연과학, 신기술 등",
  "인문과학, 철학 등",
  "KBS 백서, 방송계 내부 뉴스 관련 등",
  "맞춤법, 한자성어 등",
];

const state = {
  items: [],
  search: "",
  category: "",
  loaded: false,
};

const viewList = document.getElementById("view-list");
const viewAdd = document.getElementById("view-add");
const navList = document.getElementById("nav-list");
const navAdd = document.getElementById("nav-add");

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

function normalizeItem(item) {
  return {
    id: String(item?.id ?? "").trim(),
    createdAt: String(item?.createdAt ?? "").trim(),
    author: firstFilled(item?.author),
    category: firstFilled(item?.category),
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
    timeStyle: "short",
  }).format(new Date(time));
  return escapeHtml(formatted);
}

function sourceToHtml(source) {
  if (!source) {
    return "-";
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
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }

  filterCategory.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "전체 대분류";
  filterCategory.appendChild(allOption);

  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filterCategory.appendChild(option);
  }
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
    if (state.category && item.category !== state.category) {
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
      const safeCategory = escapeHtml(item.category || "미분류");
      const safeAnswer = escapeHtml(item.answer || "-");
      const safeDescription = escapeHtml(item.description || "-");
      const safeAuthor = escapeHtml(item.author || "-");
      const safeDate = formatCreatedAt(item.createdAt);
      const safeSource = sourceToHtml(item.source);

      return `
        <article class="card">
          <div class="card-head">
            <span class="card-badge">${safeCategory}</span>
            <span class="card-date">${safeDate}</span>
          </div>
          <h3 class="card-title">${safeAnswer}</h3>
          <p class="card-description">${safeDescription}</p>
          <div class="card-meta">
            <span>작성자: ${safeAuthor}</span>
            <span>출처: ${safeSource}</span>
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
    return;
  }

  setListLoading(true);
  setListStatus("목록을 불러오는 중...");
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
  } catch (error) {
    cards.innerHTML = '<div class="empty">목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
    if (error instanceof TypeError) {
      setListStatus("오류: CORS로 목록 조회가 차단되었습니다. Apps Script 배포 설정을 확인해 주세요.");
    } else {
      setListStatus(`오류: ${error.message}`);
    }
  } finally {
    setListLoading(false);
  }
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
  const category = categorySelect.value.trim();

  if (!studyCode || !author || !category) {
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
      category,
      question: entry.question,
      description: entry.description,
      answer: entry.answer,
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

function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "add" ? "add" : "list";
}

function setView(view) {
  const isAdd = view === "add";

  viewList.classList.toggle("is-active", !isAdd);
  viewAdd.classList.toggle("is-active", isAdd);

  navList.classList.toggle("is-active", !isAdd);
  navAdd.classList.toggle("is-active", isAdd);

  if (!isAdd && !state.loaded) {
    fetchList();
  }
}

function moveToView(view) {
  const url = new URL(window.location.href);
  if (view === "add") {
    url.searchParams.set("view", "add");
  } else {
    url.searchParams.delete("view");
    url.searchParams.set("view", "list");
  }
  history.pushState({}, "", url);
  setView(view);
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

  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      moveToView(link.dataset.viewLink === "add" ? "add" : "list");
    });
  });

  window.addEventListener("popstate", () => {
    setView(getCurrentView());
  });
}

function init() {
  fillCategoryOptions();
  resetEntryValues();
  bindEvents();
  setView(getCurrentView());
}

init();
