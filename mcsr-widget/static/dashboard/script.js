const preview = document.getElementById("preview");
const urlInput = document.getElementById("url");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");

const usernameInput = document.getElementById("username");
const themeSelect = document.getElementById("theme");
const primaryInput = document.getElementById("primary");
const primaryHexEl = document.getElementById("primaryHex");
const primarySwatchEl = document.getElementById("primarySwatch");
const primaryTriggerBtn = document.getElementById("primaryTrigger");
const presetRowEl = document.getElementById("presetRow");
const customPickerEl = document.getElementById("customPicker");
const pickerSpectrumEl = document.getElementById("pickerSpectrum");
const pickerKnobEl = document.getElementById("pickerKnob");
const pickerHueEl = document.getElementById("pickerHue");
const primaryHexInputEl = document.getElementById("primaryHexInput");
const showNameInput = document.getElementById("showName");
const showRankInput = document.getElementById("showRank");
const showEloInput = document.getElementById("showElo");
const headInput = document.getElementById("head");
const sessionEloInput = document.getElementById("sessionElo");
const avgTimeInput = document.getElementById("avgTime");
const personalBestInput = document.getElementById("personalBest");
const sessionWinrateInput = document.getElementById("sessionWinrate");
const sessionWLInput = document.getElementById("sessionWL");
const rankLogoInput = document.getElementById("rankLogo");

const STORAGE_KEY = "mcsrWidgetConfig";
const DEFAULT_CONFIG = {
  username: "Dream",
  theme: "dark",
  primary: "#7c3aed",
  showName: true,
  showRank: true,
  showElo: true,
  head: true,
  sessionElo: true,
  avgTime: true,
  personalBest: true,
  sessionWinrate: true,
  sessionWL: true,
  rankLogo: true
};

let liveUpdateTimer = null;
let pickerState = { h: 270, s: 78, v: 93 };
let draggingSpectrum = false;

function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(raw)) return "#7C3AED";
  return raw.toUpperCase();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hsvToHex(h, s, v) {
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsv(hex) {
  const value = normalizeHex(hex).slice(1);
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

function updatePickerUiFromState() {
  pickerHueEl.value = String(Math.round(pickerState.h));
  pickerSpectrumEl.style.background =
    `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${pickerState.h}, 100%, 50%))`;
  pickerKnobEl.style.left = `${pickerState.s}%`;
  pickerKnobEl.style.top = `${100 - pickerState.v}%`;
}

function setPrimaryColor(hex, fromPicker = false) {
  const normalized = normalizeHex(hex);
  primaryInput.value = normalized;
  primaryHexEl.textContent = normalized;
  primarySwatchEl.style.background = normalized;
  primaryHexInputEl.value = normalized;
  if (!fromPicker) {
    pickerState = hexToHsv(normalized);
  }
  updatePickerUiFromState();
}

function syncPrimaryUi() {
  setPrimaryColor(primaryInput.value);
}

function applyPickerState() {
  const hex = hsvToHex(pickerState.h, pickerState.s, pickerState.v);
  setPrimaryColor(hex, true);
  queueLivePreview();
}

function updateSpectrumFromPointer(clientX, clientY) {
  const rect = pickerSpectrumEl.getBoundingClientRect();
  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);
  pickerState.s = Math.round((x / rect.width) * 100);
  pickerState.v = Math.round(100 - (y / rect.height) * 100);
  applyPickerState();
}

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
  syncPrimaryUi();
  showNameInput.checked = Boolean(data.showName);
  showRankInput.checked = Boolean(data.showRank);
  showEloInput.checked = Boolean(data.showElo);
  headInput.checked = Boolean(data.head);
  sessionEloInput.checked = Boolean(data.sessionElo);
  avgTimeInput.checked = Boolean(data.avgTime);
  personalBestInput.checked = Boolean(data.personalBest);
  sessionWinrateInput.checked = Boolean(data.sessionWinrate);
  sessionWLInput.checked = Boolean(data.sessionWL);
  rankLogoInput.checked = Boolean(data.rankLogo);

  updatePreview(data);
  setStatus("Loaded.", "ok");
}

function updatePreview(data) {
  const widgetUrl = new URL("../widget/index.html", window.location.href);
  widgetUrl.searchParams.set("user", data.username || "");
  widgetUrl.searchParams.set("theme", data.theme || "dark");
  widgetUrl.searchParams.set("primary", data.primary || "#7c3aed");
  widgetUrl.searchParams.set("showName", data.showName ? "1" : "0");
  widgetUrl.searchParams.set("showRank", data.showRank ? "1" : "0");
  widgetUrl.searchParams.set("showElo", data.showElo ? "1" : "0");
  widgetUrl.searchParams.set("head", data.head ? "1" : "0");
  widgetUrl.searchParams.set("sessionElo", data.sessionElo ? "1" : "0");
  widgetUrl.searchParams.set("avgTime", data.avgTime ? "1" : "0");
  widgetUrl.searchParams.set("personalBest", data.personalBest ? "1" : "0");
  widgetUrl.searchParams.set("sessionWinrate", data.sessionWinrate ? "1" : "0");
  widgetUrl.searchParams.set("sessionWL", data.sessionWL ? "1" : "0");
  widgetUrl.searchParams.set("rankLogo", data.rankLogo ? "1" : "0");

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
    primary: primaryInput.value,
    showName: showNameInput.checked,
    showRank: showRankInput.checked,
    showElo: showEloInput.checked,
    head: headInput.checked,
    sessionElo: sessionEloInput.checked,
    avgTime: avgTimeInput.checked,
    personalBest: personalBestInput.checked,
    sessionWinrate: sessionWinrateInput.checked,
    sessionWL: sessionWLInput.checked,
    rankLogo: rankLogoInput.checked
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
primaryInput.addEventListener("input", syncPrimaryUi);
primaryTriggerBtn.addEventListener("click", () => {
  customPickerEl.classList.toggle("open");
});

pickerSpectrumEl.addEventListener("pointerdown", (event) => {
  draggingSpectrum = true;
  updateSpectrumFromPointer(event.clientX, event.clientY);
});

window.addEventListener("pointermove", (event) => {
  if (!draggingSpectrum) return;
  updateSpectrumFromPointer(event.clientX, event.clientY);
});

window.addEventListener("pointerup", () => {
  draggingSpectrum = false;
});

pickerHueEl.addEventListener("input", () => {
  pickerState.h = Number(pickerHueEl.value);
  applyPickerState();
});

primaryHexInputEl.addEventListener("change", () => {
  setPrimaryColor(primaryHexInputEl.value);
  queueLivePreview();
});

presetRowEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest(".preset");
  if (!(button instanceof HTMLButtonElement)) return;
  const color = button.dataset.color || "";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
  setPrimaryColor(color);
  queueLivePreview();
});
showNameInput.addEventListener("change", queueLivePreview);
showRankInput.addEventListener("change", queueLivePreview);
showEloInput.addEventListener("change", queueLivePreview);
headInput.addEventListener("change", queueLivePreview);
sessionEloInput.addEventListener("change", queueLivePreview);
avgTimeInput.addEventListener("change", queueLivePreview);
personalBestInput.addEventListener("change", queueLivePreview);
sessionWinrateInput.addEventListener("change", queueLivePreview);
sessionWLInput.addEventListener("change", queueLivePreview);
rankLogoInput.addEventListener("change", queueLivePreview);

loadConfig();
