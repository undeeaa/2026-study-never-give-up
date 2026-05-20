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
};

const form = document.getElementById("material-form");
const submitButton = document.getElementById("submit-button");
const formMessage = document.getElementById("form-message");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const categorySelect = document.getElementById("category");
const cards = document.getElementById("cards");
const listStatus = document.getElementById("list-status");
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

function setFormMessage(type, message) {
  formMessage.className = `message ${type}`;
  formMessage.textContent = message;
}

function setListStatus(message) {
  listStatus.textContent = message;
}

function normalizeItem(item) {
  return {
    id: String(item?.id ?? "").trim(),
    createdAt: String(item?.createdAt ?? "").trim(),
    author: String(item?.author ?? "").trim(),
    category: String(item?.category ?? "").trim(),
    title: String(item?.title ?? "").trim(),
    description: String(item?.description ?? "").trim(),
    point: String(item?.point ?? "").trim(),
    source: String(item?.source ?? "").trim(),
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

function toSearchText(item) {
  return [item.title, item.description, item.point, item.author, item.source]
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
    setListStatus(`총 0건`);
    return;
  }

  cards.innerHTML = visibleItems
    .map((item) => {
      const safeCategory = escapeHtml(item.category || "미분류");
      const safeTitle = escapeHtml(item.title || "제목 없음");
      const safeDescription = escapeHtml(item.description || "-");
      const safePoint = escapeHtml(item.point || "-");
      const safeAuthor = escapeHtml(item.author || "-");
      const dateText = formatCreatedAt(item.createdAt);
      const sourceHtml = sourceToHtml(item.source);

      return `
        <article class="card">
          <div class="card-header">
            <span class="badge">${safeCategory}</span>
            <span class="date">${dateText}</span>
          </div>
          <h3>${safeTitle}</h3>
          <p>${safeDescription}</p>
          <div class="meta">
            <div><strong>출제 포인트</strong>: ${safePoint}</div>
            <div><strong>작성자</strong>: ${safeAuthor}</div>
            <div><strong>출처</strong>: ${sourceHtml}</div>
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
    return;
  }

  setListStatus("목록을 불러오는 중...");

  try {
    const response = await fetch(`${API_URL}?action=list`, {
      method: "GET",
      headers: { Accept: "application/json" },
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
    renderCards();
  } catch (error) {
    cards.innerHTML = '<div class="empty">목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
    setListStatus(`오류: ${error.message}`);
  }
}

async function postItem(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`등록 요청 실패 (${response.status})`);
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

async function handleSubmit(event) {
  event.preventDefault();

  if (!isConfiguredApiUrl()) {
    setFormMessage("error", "script.js의 API_URL을 실제 Apps Script URL로 변경해 주세요.");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    studyCode: String(formData.get("studyCode") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    point: String(formData.get("point") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
  };

  if (!payload.studyCode || !payload.author || !payload.category || !payload.title) {
    setFormMessage("error", "스터디 코드, 작성자, 대분류, 소재명은 필수입니다.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "등록 중...";
  setFormMessage("info", "요청을 전송하고 있습니다...");

  try {
    const result = await postItem(payload);

    if (result.mode === "cors") {
      setFormMessage("success", "등록에 성공했습니다.");
    } else {
      setFormMessage(
        "info",
        "CORS 제한으로 응답 확인은 못했지만 요청은 전송했습니다. 목록을 새로 불러옵니다."
      );
    }

    const savedStudyCode = payload.studyCode;
    form.reset();
    form.studyCode.value = savedStudyCode;
    categorySelect.selectedIndex = 0;

    await fetchList();
  } catch (error) {
    setFormMessage("error", `등록에 실패했습니다: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "소재 등록";
  }
}

function bindEvents() {
  form.addEventListener("submit", handleSubmit);

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
}

function init() {
  fillCategoryOptions();
  bindEvents();
  fetchList();
}

init();
