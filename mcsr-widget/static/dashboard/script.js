const preview = document.getElementById("preview");
const urlInput = document.getElementById("url");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");

const usernameInput = document.getElementById("username");
const themeSelect = document.getElementById("theme");
const primaryInput = document.getElementById("primary");

let liveUpdateTimer = null;

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load config");
    const data = await res.json();

    usernameInput.value = data.username || "";
    themeSelect.value = data.theme || "dark";
    primaryInput.value = data.primary || "#7c3aed";

    updatePreview(data);
    setStatus("Loaded.", "ok");
  } catch (err) {
    setStatus("Could not load config.", "error");
  }
}

function updatePreview(data) {
  const params = new URLSearchParams({
    user: data.username || "",
    theme: data.theme || "dark",
    primary: data.primary || "#7c3aed"
  });
  const url = `/widget?${params.toString()}`;
  preview.src = url;
  urlInput.value = window.location.origin + url;
}

async function save() {
  const payload = getFormData();

  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Save failed");
    const data = await res.json();

    updatePreview(data);
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
