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
    document.getElementById(tabName).classList.add('active');

    // Se si apre Fetch, carica dati
    if(tabName === 'fetch') loadFetchData();
}

// Fetch dati esterni (GitHub o altro endpoint)
async function loadFetchData() {
    const fetchBox = document.getElementById('fetch-box');
    try {
        const response = await fetch('https://raw.githubusercontent.com/tuo-username/tuo-repo/main/dati.txt');
        if (!response.ok) throw new Error('Errore caricamento dati');
        const data = await response.text();
        fetchBox.textContent = data;
    } catch (err) {
        fetchBox.textContent = 'Errore: ' + err.message;
    }
}