// Funzione per convertire secondi in giorni/ore/minuti/secondi
function formatTime(totalSeconds) {
    if (totalSeconds < 60) return `${totalSeconds}s`;

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0) result += `${seconds}s`;

    return result.trim();
}

// Caricamento dati da Firebase
fetch("https://discord-live-stats-default-rtdb.firebaseio.com/voicetime.json")
    .then(res => res.json())
    .then(data => {
        const users = [];

        for (const [userId, info] of Object.entries(data)) {
            users.push({
                name: info.username || `User ${userId}`,
                time: info.seconds || 0,
                avatar: info.avatar || `https://i.pravatar.cc/50?img=${Math.floor(Math.random()*70)}`
            });
        }

        // Ordina per tempo decrescente
        users.sort((a, b) => b.time - a.time);

        const maxTime = Math.max(...users.map(u => u.time));
        const leaderboard = document.getElementById("leaderboard");
        leaderboard.innerHTML = '';

        users.forEach((user, index) => {
        const percent = (user.time / maxTime) * 100;
        const offset = 5;

const row = document.createElement("div");
row.classList.add("user-row");

row.innerHTML = `
    <div class="bar-container">
        <img src="progress.png" class="bar-image" style="width:${percent}%">
        <img src="${user.avatar}" class="avatar-end" style="left:${percent}%">
        <span class="time" style="left:${percent + offset}%">${formatTime(user.time)}</span>
    </div>
    <div class="user-info">
        <span>${index + 1}°  ${user.name}</span>
    </div>
`;

leaderboard.appendChild(row);

        });
    })
    .catch(err => console.error("Errore caricamento dati Firebase:", err));
