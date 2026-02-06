const API = "http://localhost:8000";

// STATUS
async function loadStatus() {
  const res = await fetch(API + "/status");
  const data = await res.json();
  const badge = document.getElementById("status");

  if (data.bot_online) {
    badge.textContent = "ONLINE";
    badge.className = "badge online";
  } else {
    badge.textContent = "OFFLINE";
    badge.className = "badge offline";
  }
}

// GUILDS
async function loadGuilds() {
  const res = await fetch(API + "/guilds");
  const data = await res.json();
  const select = document.getElementById("guilds");
  select.innerHTML = "";

  Object.entries(data).forEach(([id, g]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = g.name;
    select.appendChild(opt);
  });
}

// LOGS
async function loadLogs() {
  const res = await fetch(API + "/logs");
  const logs = await res.json();
  const box = document.getElementById("logs");

  box.innerHTML = logs
    .slice()
    .reverse()
    .map(l =>
      `<div>${new Date(l.time * 1000).toLocaleTimeString()} — ${l.message}</div>`
    ).join("");
}

// FETCH DA ALTRO GITHUB PAGES
async function loadExternal() {
  try {
    const res = await fetch(
      "https://TUO_USERNAME.github.io/altro-repo/data.json"
    );
    const data = await res.json();
    document.getElementById("externalData").textContent =
      JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById("externalData").textContent =
      "Errore nel fetch esterno";
  }
}

// INIT
loadStatus();
loadGuilds();
loadExternal();
setInterval(loadLogs, 3000);