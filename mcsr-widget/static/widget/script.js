const params = new URLSearchParams(window.location.search);
const overrideUser = params.get("user");
const overrideTheme = params.get("theme");
const overridePrimary = params.get("primary");

const API_BASE = "https://api.mcsrranked.com";

function buildApiUrl(username) {
  const safeUser = encodeURIComponent(username);
  return `${API_BASE}/users/${safeUser}`;
}

function applyTheme() {
  const theme = overrideTheme === "light" ? "light" : "dark";
  const widget = document.getElementById("widget");
  widget.className = theme;
  widget.style.setProperty("--accent", overridePrimary || "#7c3aed");
}

function resolveStats(records) {
  const record = records?.["2"] || records?.["3"] || records?.["4"] || {};
  const wins = record.win ?? record.wins ?? 0;
  const losses = record.lose ?? record.losses ?? 0;
  return { wins, losses };
}

async function updateWidget() {
  const username = overrideUser || "Dream";
  applyTheme();

  const res = await fetch(buildApiUrl(username));
  if (!res.ok) return;
  const payload = await res.json();

  const data = payload.data || payload;
  if (!data) return;

  const nickname = data.nickname || username;
  const elo = data.elo_rate ?? data.eloRate ?? 0;
  const eloRank = data.elo_rank ?? data.eloRank;
  const rankLabel = typeof eloRank === "number" ? `#${eloRank}` : "-";
  const { wins, losses } = resolveStats(data.records);

  document.getElementById("username").textContent = nickname;
  document.getElementById("rank").textContent = rankLabel;
  document.getElementById("elo").textContent = elo;
  document.getElementById("wl").textContent = `${wins}W / ${losses}L`;

  // Glow rank (if available)
  const rankEl = document.getElementById("rank");
  rankEl.className = "";
  const rankText = (data.rank || data.rank_name || data.rankName || "").toLowerCase();
  if (rankText.includes("bronze")) rankEl.classList.add("rank-bronze");
  if (rankText.includes("silver")) rankEl.classList.add("rank-silver");
  if (rankText.includes("gold")) rankEl.classList.add("rank-gold");
  if (rankText.includes("diamond")) rankEl.classList.add("rank-diamond");
}

updateWidget();
setInterval(updateWidget, 5000);
