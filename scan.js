let tutteLeCarte = [];
let cartaAttiva = null;

// Funzione per caricare e salvare le carte in localStorage
function salvaCarte() {
  localStorage.setItem("carte", JSON.stringify(tutteLeCarte));
  aggiornaStatistiche();
}

// Funzione per caricare le carte da localStorage
function caricaCarte() {
  const carteSalvate = localStorage.getItem("carte");
  if (carteSalvate) {
    tutteLeCarte = JSON.parse(carteSalvate);
  } else {
    tutteLeCarte = []; // Se non ci sono carte salvate, inizializza un array vuoto
  }
}

// Funzione per chiudere la modale
function chiudiModal() {
  document.getElementById("modal").style.display = 'none';
}

// Funzione per mostrare la modale con i dettagli della carta
function mostraModal(carta, index) {
  cartaAttiva = index;
  document.getElementById("modal-img").src = carta.immagine;
  document.getElementById("modal-nome").value = carta.nome;
  document.getElementById("modal-numero").value = carta.numero;
  document.getElementById("modal-rarita").value = carta.rarita;
  document.getElementById("modal-quantita").value = carta.quantita || 0;
  document.getElementById("modal").style.display = 'flex';  // Mostra la modale
}

// Funzione per salvare le modifiche alla carta
function salvaModifiche() {
  if (cartaAttiva !== null) {
    tutteLeCarte[cartaAttiva].nome = document.getElementById("modal-nome").value;
    tutteLeCarte[cartaAttiva].numero = document.getElementById("modal-numero").value;
    tutteLeCarte[cartaAttiva].rarita = document.getElementById("modal-rarita").value;
    tutteLeCarte[cartaAttiva].quantita = parseInt(document.getElementById("modal-quantita").value);
    salvaCarte();
    render(tutteLeCarte);
    chiudiModal();
  }
}

// Funzione per aggiornare la quantità della carta
function aggiornaQuantita(index, delta, event) {
  event.stopPropagation();  // Impedisce che il clic propaghi al click della carta
  if (tutteLeCarte[index].quantita + delta >= 0) {
    tutteLeCarte[index].quantita += delta;
    salvaCarte();
    render(tutteLeCarte);
  }
}

// Funzione per aggiornare la barra di completamento e le statistiche
function aggiornaStatistiche() {
  const totaleCarte = tutteLeCarte.length;
  const carteCompletate = tutteLeCarte.filter(c => c.quantita > 0).length;
  const percentualeCompletamento = (carteCompletate / totaleCarte) * 100;

  const valoreCollezione = tutteLeCarte.reduce((acc, carta) => acc + (carta.prezzo * carta.quantita), 0);

  // Aggiorna la barra di completamento
  document.getElementById("completion-bar").style.width = `${percentualeCompletamento}%`;
  // Visualizza la percentuale con 2 decimali
  document.getElementById("completion-text").textContent = `${percentualeCompletamento.toFixed(2)}% completato`;

  // Aggiorna i valori totali
  document.getElementById("total-value").textContent = `Valore della collezione: €${valoreCollezione.toFixed(2)}`;
}

// Funzione per renderizzare le carte nella pagina
function render(carte) {
  // Ordina le carte per numero del set (in ordine crescente)
  carte.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

  const container = document.getElementById("carte");
  container.innerHTML = "";
  carte.forEach((carta, index) => {
    container.innerHTML += `
      <div class="card-container" onclick="mostraModal(tutteLeCarte[${index}], ${index})">
        <img src="${carta.immagine}" alt="${carta.nome}" />
        <h2 class="font-semibold text-lg">${carta.numero} ${carta.nome}</h2>
        <p class="text-sm text-gray-500">${carta.rarita}</p>
        <p class="text-green-600 font-bold mt-1">€${parseFloat(carta.prezzo).toFixed(2)}</p>
        <p class="text-sm text-gray-600">Quantità: ${carta.quantita || 0}</p>
        <div class="card-actions">
          <button onclick="aggiornaQuantita(${index}, 1, event)" class="bg-green-500">+1</button>
          <button onclick="aggiornaQuantita(${index}, -1, event)" class="remove" ${carta.quantita <= 0 ? 'disabled' : ''}>-1</button>
        </div>
      </div>
    `;
  });

  aggiornaStatistiche();
}

// Funzione per gestire il filtro per nome delle carte
document.getElementById("filtro").addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtrate = tutteLeCarte.filter(c => c.nome.toLowerCase().includes(val));
  render(filtrate);
});

// Carica i dati da carte.json
fetch('carte.json')
  .then(res => res.json())
  .then(data => {
    // Carica le carte da localStorage
    caricaCarte();
    // Se non ci sono carte salvate, inizializza con i dati dal file JSON
    if (tutteLeCarte.length === 0) {
      tutteLeCarte = data.map(c => ({ ...c, quantita: 0 }));  // Inizializza la quantità a 0
      salvaCarte(); // Salva inizialmente i dati
    }
    render(tutteLeCarte);
  })
  .catch(err => console.error("Errore nel caricamento dei dati delle carte:", err));

// Funzione per la scansione (aggiungi carta manualmente)
const scannerInput = document.getElementById("scannerInput");
scannerInput.addEventListener("input", () => {
  const barcode = scannerInput.value.trim();

  if (barcode.length > 0) {
    // Logica di scansione (gestione della carta trovata)
    const carta = tutteLeCarte.find(c => c.numero === barcode || c.nome.toLowerCase() === barcode.toLowerCase());
    
    if (carta) {
      mostraModal(carta, tutteLeCarte.indexOf(carta));
    } else {
      alert("Carta non trovata!");
    }
    
    scannerInput.value = "";
  }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registrato con successo:', registration);
        })
        .catch(error => {
          console.log('Errore durante la registrazione del Service Worker:', error);
        });
    });
  }
  
  self.addEventListener('sync', event => {
    if (event.tag === 'syncData') {
      event.waitUntil(syncData());
    }
  });
  
  function syncData() {
    return fetch('/api/sync', {  // Questo endpoint dovrebbe esistere sul tuo server
      method: 'POST',
      body: JSON.stringify({
        // Qui dovresti aggiungere i dati che desideri sincronizzare
        carte: tutteLeCarte  // Per esempio, potresti voler inviare la lista delle carte
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(data => {
      console.log('Sincronizzazione completata', data);
    })
    .catch(error => {
      console.error('Errore durante la sincronizzazione:', error);
    });
  }
  
  