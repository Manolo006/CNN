const params = new URLSearchParams(window.location.search);
const overrideUser = params.get("user");
const overrideTheme = params.get("theme");
const overridePrimary = params.get("primary");

const API_BASE = "https://api.mcsrranked.com";
const PB_CACHE_TTL_MS = 5 * 60 * 1000;
const RANK_ICON_URLS = {
  coal: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/coal.png",
  iron: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/iron.png",
  gold: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/gold.png",
  emerald: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/emerald.png",
  diamond: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/diamond.png",
  netherite: "https://raw.githubusercontent.com/noobweer/mcsr-widget/main/public/icons/ranks/netherite.png"
};
const personalBestCache = new Map();

function parseBooleanParam(name, fallback = true) {
  const value = params.get(name);
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

const settings = {
  showName: parseBooleanParam("showName", true),
  showRank: parseBooleanParam("showRank", true),
  showElo: parseBooleanParam("showElo", true),
  head: parseBooleanParam("head", true),
  sessionElo: parseBooleanParam("sessionElo", true),
  avgTime: parseBooleanParam("avgTime", true),
  personalBest: parseBooleanParam("personalBest", true),
  sessionWinrate: parseBooleanParam("sessionWinrate", true),
  sessionWL: parseBooleanParam("sessionWL", true),
  rankLogo: parseBooleanParam("rankLogo", true)
};

function buildApiUrl(username) {
  const safeUser = encodeURIComponent(username);
  return `${API_BASE}/users/${safeUser}`;
}

function buildMatchesApiUrl(username) {
  const safeUser = encodeURIComponent(username);
  return `${API_BASE}/users/${safeUser}/matches?type=2&sort=newest&count=100`;
}

function buildFastestMatchesApiUrl(username) {
  const safeUser = encodeURIComponent(username);
  return `${API_BASE}/users/${safeUser}/matches?type=2&sort=fastest&count=50`;
}

function applyTheme() {
  const theme = overrideTheme === "light" ? "light" : "dark";
  const widget = document.getElementById("widget");
  widget.className = theme;
  widget.style.setProperty("--accent", overridePrimary || "#7c3aed");
}

function setVisible(id, shouldShow) {
  const element = document.getElementById(id);
  if (!element) return;
  element.style.display = shouldShow ? "" : "none";
}

function formatSigned(value) {
  const n = Number(value) || 0;
  if (n > 0) return `+${n}`;
  return `${n}`;
}

function formatTime(ms) {
  if (!ms || ms < 1) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resolveRankTier(data, elo) {
  const raw = String(data?.rank || data?.rank_name || data?.rankName || "").toLowerCase();

  const byName = [
    ["netherite", { key: "netherite", label: "Netherite" }],
    ["diamond", { key: "diamond", label: "Diamond" }],
    ["emerald", { key: "emerald", label: "Emerald" }],
    ["gold", { key: "gold", label: "Gold" }],
    ["iron", { key: "iron", label: "Iron" }],
    ["coal", { key: "coal", label: "Coal" }],
    ["silver", { key: "iron", label: "Iron" }],
    ["bronze", { key: "coal", label: "Coal" }]
  ];

  for (const [needle, tier] of byName) {
    if (raw.includes(needle)) return tier;
  }

  if (elo >= 2000) return { key: "netherite", label: "Netherite" };
  if (elo >= 1500) return { key: "diamond", label: "Diamond" };
  if (elo >= 1200) return { key: "emerald", label: "Emerald" };
  if (elo >= 900) return { key: "gold", label: "Gold" };
  if (elo >= 600) return { key: "iron", label: "Iron" };
  return { key: "coal", label: "Coal" };
}

async function fetchTodaySession(username, uuid) {
  const res = await fetch(buildMatchesApiUrl(username));
  if (!res.ok) return null;

  const payload = await res.json();
  const matches = payload.data || payload;
  if (!Array.isArray(matches)) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayStartSec = Math.floor(start.getTime() / 1000);

  let eloDelta = 0;
  let wins = 0;
  let losses = 0;
  let completionTotal = 0;
  let completionCount = 0;

  for (const match of matches) {
    if (!match || typeof match.date !== "number" || match.date < todayStartSec) {
      continue;
    }

    const changeForUser = (match.changes || []).find((entry) => entry?.uuid === uuid);
    const delta = Number(changeForUser?.change);

    if (Number.isFinite(delta)) {
      eloDelta += delta;
      if (delta > 0) wins += 1;
      if (delta < 0) losses += 1;
    } else if (match?.result?.uuid) {
      if (match.result.uuid === uuid) wins += 1;
      else losses += 1;
    }

    if (match?.result?.uuid === uuid && typeof match?.result?.time === "number") {
      completionTotal += match.result.time;
      completionCount += 1;
    }
  }

  const played = wins + losses;
  const winrate = played > 0 ? (wins / played) * 100 : 0;
  const avgCompletion = completionCount > 0 ? Math.round(completionTotal / completionCount) : 0;

  return { eloDelta, wins, losses, winrate, avgCompletion };
}

function getProfilePersonalBestMs(data) {
  return (
    data?.statistics?.total?.bestTime?.ranked ??
    data?.statistics?.total?.best_time?.ranked ??
    data?.statistics?.total?.ranked?.bestTime ??
    data?.statistics?.total?.ranked?.best_time ??
    0
  );
}

async function resolvePersonalBestMs(username, uuid, data) {
  const profilePB = Number(getProfilePersonalBestMs(data)) || 0;
  if (profilePB > 0) return profilePB;

  const cacheKey = `${username}:${uuid}`;
  const cached = personalBestCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < PB_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const res = await fetch(buildFastestMatchesApiUrl(username));
    if (!res.ok) return 0;
    const payload = await res.json();
    const matches = payload.data || payload;
    if (!Array.isArray(matches)) return 0;

    let pb = 0;
    for (const match of matches) {
      const result = match?.result;
      if (result?.uuid === uuid && typeof result?.time === "number" && result.time > 0) {
        pb = result.time;
        break;
      }
    }

    personalBestCache.set(cacheKey, { value: pb, fetchedAt: Date.now() });
    return pb;
  } catch {
    return 0;
  }
}

async function updateWidget() {
  const username = overrideUser || "Dream";
  applyTheme();

  const leftVisible = settings.head || settings.showName || settings.showRank || settings.rankLogo;
  const rightVisible =
    settings.showElo ||
    settings.sessionElo ||
    settings.sessionWL ||
    settings.sessionWinrate ||
    settings.avgTime ||
    settings.personalBest;

  setVisible("leftCol", leftVisible);
  setVisible("rightCol", rightVisible);
  setVisible("username", settings.showName);
  setVisible("rankLine", settings.showRank || settings.rankLogo);
  setVisible("rankName", settings.showRank);
  setVisible("rank", settings.showRank);
  setVisible("head", settings.head);
  setVisible("statElo", settings.showElo);
  setVisible("rankIcon", settings.rankLogo);
  setVisible("statSessionElo", settings.sessionElo);
  setVisible("statWL", settings.sessionWL);
  setVisible("statWinrate", settings.sessionWinrate);
  setVisible("statAvgTime", settings.avgTime);
  setVisible("statPersonalBest", settings.personalBest);

  const res = await fetch(buildApiUrl(username));
  if (!res.ok) return;
  const payload = await res.json();
  const data = payload.data || payload;
  if (!data) return;

  const nickname = data.nickname || username;
  const uuid = data.uuid || "";
  const elo = data.elo_rate ?? data.eloRate ?? 0;
  const eloRank = data.elo_rank ?? data.eloRank;
  const rankLabel = typeof eloRank === "number" ? `#${eloRank}` : "-";
  const tier = resolveRankTier(data, Number(elo) || 0);
  const session = await fetchTodaySession(username, uuid).catch(() => null);

  const sessionElo = session?.eloDelta ?? 0;
  const sessionWins = session?.wins ?? 0;
  const sessionLosses = session?.losses ?? 0;
  const sessionWinrate = session?.winrate ?? 0;
  const avgCompletion = session?.avgCompletion ?? 0;
  const personalBestMs = await resolvePersonalBestMs(username, uuid, data);

  document.getElementById("username").textContent = nickname;
  document.getElementById("head").src = `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}/64`;
  document.getElementById("head").alt = `${nickname} head`;
  document.getElementById("rank").textContent = rankLabel;
  document.getElementById("rankName").textContent = tier.label;
  document.getElementById("rankIcon").src = RANK_ICON_URLS[tier.key] || RANK_ICON_URLS.coal;
  document.getElementById("rankIcon").alt = `${tier.label} icon`;
  document.getElementById("elo").textContent = elo;
  document.getElementById("sessionElo").textContent = formatSigned(sessionElo);
  document.getElementById("wl").textContent = `${sessionWins}W / ${sessionLosses}L`;
  document.getElementById("winrate").textContent = `${sessionWinrate.toFixed(1)}%`;
  document.getElementById("avgTime").textContent = formatTime(avgCompletion);
  document.getElementById("personalBest").textContent = formatTime(personalBestMs);
}

updateWidget();
setInterval(updateWidget, 5000);
