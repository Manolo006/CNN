const params = new URLSearchParams(window.location.search);
const overrideUser = params.get("user");
const overrideTheme = params.get("theme");
const overridePrimary = params.get("primary");

function buildApiUrl() {
  const query = new URLSearchParams();
  if (overrideUser) query.set("user", overrideUser);
  if (overrideTheme) query.set("theme", overrideTheme);
  if (overridePrimary) query.set("primary", overridePrimary);
  const qs = query.toString();
  return qs ? `/api/player?${qs}` : "/api/player";
}

async function updateWidget() {
  const res = await fetch(buildApiUrl());
  if (!res.ok) return;
  const data = await res.json();

  if (data.error) return;

  document.getElementById("username").textContent = data.username;
  document.getElementById("rank").textContent = data.rank || "-";
  document.getElementById("elo").textContent = data.elo || 0;
  document.getElementById("wl").textContent =
    `${data.wins || 0}W / ${data.losses || 0}L`;

  // Tema
  const widget = document.getElementById("widget");
  widget.className = data.theme === "light" ? "light" : "dark";
  widget.style.setProperty("--accent", data.primary || "#7c3aed");

  // Glow rank
  const rankEl = document.getElementById("rank");
  rankEl.className = "";
  const rankText = (data.rank || "").toLowerCase();
  if (rankText.includes("bronze")) rankEl.classList.add("rank-bronze");
  if (rankText.includes("silver")) rankEl.classList.add("rank-silver");
  if (rankText.includes("gold")) rankEl.classList.add("rank-gold");
  if (rankText.includes("diamond")) rankEl.classList.add("rank-diamond");
}

updateWidget();
setInterval(updateWidget, 5000);
