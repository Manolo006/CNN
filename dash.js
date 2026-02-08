// Funzione per cambiare scheda
function showTab(tabName) {
    // Bottoni
    const buttons = document.querySelectorAll('.tab-buttons button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Contenuti
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    const target = document.getElementById(tabName);
    if (target) target.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const fetchCard = document.querySelector('.card-fetch');
    if (fetchCard) {
        loadTop5(fetchCard);
        setInterval(() => loadTop5(fetchCard), 10000);
    }

    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
        loadBotStatus(statusDot);
        setInterval(() => loadBotStatus(statusDot), 10000);
    }
    const suggestBox = document.getElementById('member-suggest');
    const memberInput = document.getElementById('member-input');
    const memberAdd = document.getElementById('member-add');
    if (suggestBox && memberInput) {
        setupMemberAutocomplete(memberInput, suggestBox);
    }

    const targetList = document.getElementById('target-list');
    const targetInput = document.getElementById('target-input');
    const targetAdd = document.getElementById('target-add');
    const targetSave = document.getElementById('target-save');
    if (targetList && targetInput && targetAdd && targetSave) {
        setupTargets(targetList, targetInput, targetAdd, targetSave, memberInput, memberAdd);
    }

    const usersInput = document.getElementById('user-input');
    const usersAdd = document.getElementById('user-add');
    const usersList = document.getElementById('user-list');
    const usersDownload = document.getElementById('user-download');
    const usersClear = document.getElementById('user-clear');

    if (usersList) {
        const users = loadUsers();
        renderUsers(usersList, users);

        const addUser = () => {
            if (!usersInput) return;
            const value = usersInput.value.trim();
            if (!value) return;
            users.push(value);
            saveUsers(users);
            renderUsers(usersList, users);
            usersInput.value = '';
            usersInput.focus();
        };

        if (usersAdd) usersAdd.addEventListener('click', addUser);
        if (usersInput) {
            usersInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addUser();
            });
        }

        if (usersClear) {
            usersClear.addEventListener('click', () => {
                users.length = 0;
                saveUsers(users);
                renderUsers(usersList, users);
            });
        }

        if (usersDownload) {
            usersDownload.addEventListener('click', () => {
                const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'users.json';
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }
});

function formatTime(totalSeconds) {
    const years = Math.floor(totalSeconds / 31536000);
    totalSeconds %= 31536000;
    const months = Math.floor(totalSeconds / 2592000);
    totalSeconds %= 2592000;
    const weeks = Math.floor(totalSeconds / 604800);
    totalSeconds %= 604800;
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (years > 0) result += `${years}y `;
    if (months > 0) result += `${months}mo `;
    if (weeks > 0) result += `${weeks}w `;
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0) result += `${seconds}s`;
    return result.trim() || '0s';
}

async function loadTop5(target) {
    try {
        const response = await fetch('https://discord-live-stats-default-rtdb.firebaseio.com/voicetime.json');
        if (!response.ok) throw new Error('Errore caricamento dati');
        const data = await response.json();
        const users = [];

        for (const [userId, info] of Object.entries(data || {})) {
            users.push({
                name: info.username || `User ${userId}`,
                time: info.seconds || 0,
                avatar: info.avatar || `https://i.pravatar.cc/50?img=${Math.floor(Math.random()*70)}`
            });
        }

        users.sort((a, b) => b.time - a.time);
        const top5 = users.slice(0, 5);
        const maxTime = Math.max(1, ...users.map(u => u.time));

        target.innerHTML = `
            <div class="leaderboard-mini">
                ${top5.map((u, i) => {
                    const percent = (u.time / maxTime) * 100;
                    return `
                        <div class="leader-row">
                            <div class="leader-line">
                                <span class="leader-rank">${i + 1}.</span>
                                <span class="leader-name">${u.name}</span>
                                <span class="leader-time">${formatTime(u.time)}</span>
                            </div>
                            <div class="bar-container">
                                <img src="progress.png" class="bar-image" style="width:${percent}%">
                                <img src="${u.avatar || ''}" class="avatar-end" style="left:${percent}%">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        target.textContent = 'Errore: ' + err.message;
    }
}

const FIREBASE_STATUS_URL = 'https://discord-live-stats-default-rtdb.firebaseio.com/bot/status.json';
const FIREBASE_HEARTBEAT_URL = 'https://discord-live-stats-default-rtdb.firebaseio.com/bot/heartbeat.json';
const HEARTBEAT_MAX_AGE_MS = 70 * 1000;

async function loadBotStatus(dotEl) {
    try {
        const [statusRes, hbRes] = await Promise.all([
            fetch(`${FIREBASE_STATUS_URL}?_=${Date.now()}`, { cache: 'no-store' }),
            fetch(`${FIREBASE_HEARTBEAT_URL}?_=${Date.now()}`, { cache: 'no-store' })
        ]);
        if (!statusRes.ok) throw new Error(`Errore caricamento stato bot (${statusRes.status})`);
        if (!hbRes.ok) throw new Error(`Errore caricamento heartbeat (${hbRes.status})`);
        const status = await statusRes.json();
        const heartbeat = await hbRes.json();
        const textEl = document.getElementById('bot-status-text');
        const timeEl = document.getElementById('bot-status-time');

        let state = 'unknown';
        const hbSec = typeof heartbeat === 'number' ? heartbeat : null;
        const hbMs = hbSec ? hbSec * 1000 : null;
        const now = Date.now();
        const stale = hbMs ? (now - hbMs > HEARTBEAT_MAX_AGE_MS) : true;

        if (status === true && !stale) state = 'online';
        if (status === false || stale) state = 'offline';

        dotEl.classList.remove('status-online', 'status-offline', 'status-unknown');
        dotEl.classList.add(
            state === 'online' ? 'status-online' :
            state === 'offline' ? 'status-offline' : 'status-unknown'
        );
        dotEl.setAttribute('aria-label', state);

        if (textEl) {
            textEl.textContent =
                state === 'online' ? 'Online' :
                state === 'offline' ? 'Offline' : 'Sconosciuto';
        }
        if (timeEl) {
            const hbText = hbMs ? new Date(hbMs).toLocaleTimeString() : '--';
            timeEl.textContent = `HB: ${hbText}`;
        }
    } catch (err) {
        console.error(err);
        const textEl = document.getElementById('bot-status-text');
        const timeEl = document.getElementById('bot-status-time');
        dotEl.classList.remove('status-online', 'status-unknown');
        dotEl.classList.add('status-offline');
        dotEl.setAttribute('aria-label', 'offline');
        if (textEl) textEl.textContent = 'Errore';
        if (timeEl) timeEl.textContent = '';
    }
}

const USERS_KEY = 'dash_users';

function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function renderUsers(listEl, users) {
    listEl.innerHTML = users.map(u => `<li>${escapeHtml(u)}</li>`).join('');
}

function escapeHtml(str) {
    return str
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const FIREBASE_TARGETS_URL = 'https://discord-live-stats-default-rtdb.firebaseio.com/targets.json';

async function setupTargets(listEl, inputEl, addBtn, saveBtn, memberInput, memberAdd) {
    const [targetsData, guildData] = await Promise.all([
        fetchJson(FIREBASE_TARGETS_URL),
        fetchJson('https://discord-live-stats-default-rtdb.firebaseio.com/guild/members.json')
    ]);

    const members = Array.isArray(guildData) ? guildData : (Array.isArray(guildData?.members) ? guildData.members : []);
    const idToName = new Map(members.map(m => [String(m.id), m.username]));
    const nameToId = new Map(members.map(m => [String(m.username), String(m.id)]));

    let targets = Array.isArray(targetsData) ? targetsData : (Array.isArray(targetsData?.targets) ? targetsData.targets : []);
    // normalize to ids (string)
    let ids = targets.map(t => {
        const key = String(t);
        return nameToId.get(key) || key;
    });

    const render = () => {
        listEl.innerHTML = ids.map((id, i) => {
            const name = idToName.get(String(id)) || String(id);
            return `
            <li class="targets-item">
                <span>${escapeHtml(name)}</span>
                <button class="targets-remove" data-index="${i}" title="Rimuovi">X</button>
            </li>
        `;
        }).join('');
    };

    const addName = (sourceInput) => {
        const value = (sourceInput?.value || '').trim();
        if (!value) return;
        const id =
            /^\d+$/.test(value) ? value :
            (nameToId.get(value) || value);
        ids.push(String(id));
        if (sourceInput) sourceInput.value = '';
        render();
        saveTargets(ids);
    };

    addBtn.addEventListener('click', () => addName(inputEl));
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addName(inputEl);
    });
    if (memberAdd && memberInput) {
        memberAdd.addEventListener('click', () => addName(memberInput));
        memberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addName(memberInput);
        });
    }

    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.targets-remove');
        if (!btn) return;
        const idx = Number(btn.getAttribute('data-index'));
        if (!Number.isNaN(idx)) {
            ids.splice(idx, 1);
            render();
            saveTargets(ids);
        }
    });

    if (saveBtn) saveBtn.style.display = 'none';

    render();
}

async function fetchJson(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Errore caricamento ${path}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return {};
    }
}

async function saveTargets(names) {
    try {
        await fetch(FIREBASE_TARGETS_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(names)
        });
    } catch (err) {
        console.error('Errore salvataggio targets:', err);
    }
}

async function setupMemberAutocomplete(input, box) {
    let members = [];
    try {
        const response = await fetch('https://discord-live-stats-default-rtdb.firebaseio.com/guild/members.json');
        if (!response.ok) throw new Error('Errore caricamento Firebase guild members');
        const data = await response.json();
        members = Array.isArray(data) ? data : (Array.isArray(data.members) ? data.members : []);
    } catch (err) {
        console.error(err);
    }

    const close = () => {
        box.classList.remove('open');
        box.setAttribute('aria-hidden', 'true');
        box.innerHTML = '';
    };

    const open = (items, activeIndex = -1) => {
        if (!items.length) return close();
        box.innerHTML = items.map((m, i) => `
            <div class="suggest-item ${i === activeIndex ? 'active' : ''}" data-value="${m.username}">
                <span class="suggest-name">${m.username}</span>
                <span class="suggest-id">${m.id}</span>
            </div>
        `).join('');
        box.classList.add('open');
        box.setAttribute('aria-hidden', 'false');
    };

    let activeIndex = -1;
    const filter = () => {
        const q = input.value.trim().toLowerCase();
        if (!q) return close();
        const items = members.filter(m =>
            String(m.username || '').toLowerCase().includes(q) ||
            String(m.id || '').includes(q)
        ).slice(0, 8);
        activeIndex = -1;
        open(items, activeIndex);
    };

    input.addEventListener('input', filter);

    input.addEventListener('keydown', (e) => {
        const items = Array.from(box.querySelectorAll('.suggest-item'));
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            input.value = items[activeIndex].getAttribute('data-value') || input.value;
            close();
        } else if (e.key === 'Escape') {
            close();
        }
    });

    box.addEventListener('mousedown', (e) => {
        const item = e.target.closest('.suggest-item');
        if (!item) return;
        input.value = item.getAttribute('data-value') || input.value;
        close();
    });

    document.addEventListener('click', (e) => {
        if (!box.contains(e.target) && e.target !== input) close();
    });
}
