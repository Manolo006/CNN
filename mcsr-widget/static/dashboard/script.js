const preview = document.getElementById("preview");
const urlInput = document.getElementById("url");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");

const usernameInput = document.getElementById("username");
const themeSelect = document.getElementById("theme");
const primaryInput = document.getElementById("primary");

const STORAGE_KEY = "mcsrWidgetConfig";
const DEFAULT_CONFIG = {
  username: "Dream",
  theme: "dark",
  primary: "#7c3aed"
};

let liveUpdateTimer = null;

function loadConfig() {
  let data = { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = { ...data, ...parsed };
    }
  } catch (err) {
    setStatus("Local settings were reset.", "error");
  }

  usernameInput.value = data.username || "";
  themeSelect.value = data.theme || "dark";
  primaryInput.value = data.primary || "#7c3aed";

  updatePreview(data);
  setStatus("Loaded.", "ok");
}

function updatePreview(data) {
  const widgetUrl = new URL("../widget/index.html", window.location.href);
  widgetUrl.searchParams.set("user", data.username || "");
  widgetUrl.searchParams.set("theme", data.theme || "dark");
  widgetUrl.searchParams.set("primary", data.primary || "#7c3aed");

  preview.src = widgetUrl.toString();
  urlInput.value = widgetUrl.toString();
}

async function save() {
  const payload = getFormData();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    updatePreview(payload);
    setStatus("Saved.", "ok");
  } catch (err) {
    setStatus("Save failed.", "error");
  }
}

function getFormData() {
  return {
    username: usernameInput.value.trim(),
    theme: themeSelect.value,
    primary: primaryInput.value
  };
}

function setStatus(message, tone) {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone || "neutral";
}

function queueLivePreview() {
  clearTimeout(liveUpdateTimer);
  liveUpdateTimer = setTimeout(() => updatePreview(getFormData()), 150);
}

saveBtn.addEventListener("click", save);
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(urlInput.value);
    setStatus("Copied URL.", "ok");
  } catch (err) {
    setStatus("Copy failed.", "error");
  }
});

usernameInput.addEventListener("input", queueLivePreview);
themeSelect.addEventListener("change", queueLivePreview);
primaryInput.addEventListener("input", queueLivePreview);

loadConfig();
