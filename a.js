// Funzione per convertire minuti in ore/giorni
function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;

    const days = Math.floor(minutes / 1440); // 1440 min in un giorno
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (mins > 0) result += `${mins}m`;

    return result.trim();
}

fetch("https://discord-live-stats-default-rtdb.firebaseio.com/voicetime.json")
    .then(res => res.json())
    .then(data => {
        // data = { user_id: { seconds: ..., username: ..., avatar: ... } }
        const users = [];

        for (const [userId, info] of Object.entries(data)) {
            users.push({
                name: info.username || `User ${userId}`,   // usa il nome salvato
                time: Math.floor(info.seconds / 60),       // converti secondi in minuti
                avatar: info.avatar || `https://i.pravatar.cc/50?img=${Math.floor(Math.random()*70)}` // fallback
            });
        }

        // Ordina per tempo decrescente
        users.sort((a, b) => b.time - a.time);

        // Trova il massimo tempo
        const maxTime = Math.max(...users.map(u => u.time));

        const leaderboard = document.getElementById("leaderboard");
        leaderboard.innerHTML = ''; // pulisce eventuali dati precedenti

        users.forEach((user, index) => {
            const percent = (user.time / maxTime) * 100;

            const row = document.createElement("div");
            row.classList.add("user-row");

            row.innerHTML = `
                <div class="progress-container">
                    <div class="progress-fill" style="width:${percent}%;"></div>
                </div>
                <div class="user-info">
                    <img src="${user.avatar}">
                    <span>${index + 1}°</span>
                    <span>${formatTime(user.time)}</span>
                </div>
            `;

            leaderboard.appendChild(row);
        });
    })
    .catch(err => console.error("Errore caricamento dati Firebase:", err));
