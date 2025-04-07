let tutteLeCarte = [];
let cartaAttiva = null;

// Funzione per caricare e salvare le carte in localStorage
function salvaCarte() {
  localStorage.setItem("carte", JSON.stringify(tutteLeCarte));
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
  document.getElementById("modal").style.display = 'flex';  // Mostra la modale
}

// Funzione per salvare le modifiche alla carta
function salvaModifiche() {
  if (cartaAttiva !== null) {
    tutteLeCarte[cartaAttiva].nome = document.getElementById("modal-nome").value;
    tutteLeCarte[cartaAttiva].numero = document.getElementById("modal-numero").value;
    tutteLeCarte[cartaAttiva].rarita = document.getElementById("modal-rarita").value;
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
    tutteLeCarte = data.map(c => ({ ...c, quantita: 0 }));  // Inizializza la quantità a 0
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

// Scansione tramite bottone
document.getElementById("scanButton").addEventListener("click", () => {
  document.getElementById("scannerInput").click();
});

