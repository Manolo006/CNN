let tutteLeCarte = [];
let cartaAttiva = null;

// Dati delle carte (inclusi direttamente nel JS come fallback)
const carteJSON = [
  {
    "nome": "Surskit",
    "numero": "1",
    "rarita": "Comune",
    "prezzo": 0.02,
    "quantita": 0,
    "immagine": "https://images.pokemontcg.io/sv4/1.png"
  },
  // Aggiungi qui tutte le altre carte...
  // (ho omesso il resto per brevità, ma dovresti includere tutte le 266 carte)
];

// Carica le carte da localStorage o dal JSON incorporato
function caricaCarte() {
  const carteSalvate = localStorage.getItem("carte");
  if (carteSalvate) {
    try {
      tutteLeCarte = JSON.parse(carteSalvate);
      console.log("Caricate carte da localStorage");
    } catch (e) {
      console.error("Errore nel parsing delle carte salvate, usando fallback", e);
      tutteLeCarte = [...carteJSON];
    }
  } else {
    console.log("Nessuna carta in localStorage, usando JSON incorporato");
    tutteLeCarte = [...carteJSON];
  }
}

// Salva le carte in localStorage
function salvaCarte() {
  localStorage.setItem("carte", JSON.stringify(tutteLeCarte));
  console.log("Carte salvate in localStorage");
  aggiornaStatistiche();
}

// Mostra/nasconde la modale
function mostraModal(carta, index) {
  cartaAttiva = index;
  document.getElementById("modal-img").src = carta.immagine;
  document.getElementById("modal-nome").value = carta.nome;
  document.getElementById("modal-numero").value = carta.numero;
  document.getElementById("modal-rarita").value = carta.rarita;
  document.getElementById("modal-quantita").value = carta.quantita || 0;
  document.getElementById("modal").style.display = 'flex';
}

function chiudiModal() {
  document.getElementById("modal").style.display = 'none';
}

// Salva le modifiche dalla modale
function salvaModifiche() {
  if (cartaAttiva !== null) {
    const carta = tutteLeCarte[cartaAttiva];
    carta.nome = document.getElementById("modal-nome").value;
    carta.numero = document.getElementById("modal-numero").value;
    carta.rarita = document.getElementById("modal-rarita").value;
    carta.quantita = parseInt(document.getElementById("modal-quantita").value) || 0;

    salvaCarte();
    render(tutteLeCarte);
    chiudiModal();
  }
}

// Aggiorna la quantità di una carta
function aggiornaQuantita(index, delta, event) {
  event.stopPropagation();
  const carta = tutteLeCarte[index];
  const nuovaQuantita = (carta.quantita || 0) + delta;
  
  if (nuovaQuantita >= 0) {
    carta.quantita = nuovaQuantita;
    salvaCarte();
    render(tutteLeCarte);
  }
}

// Aggiorna le statistiche della collezione
function aggiornaStatistiche() {
  const totaleCarte = tutteLeCarte.length;
  const carteCompletate = tutteLeCarte.filter(c => c.quantita > 0).length;
  const percentualeCompletamento = (carteCompletate / totaleCarte) * 100;

  const valoreCollezione = tutteLeCarte.reduce((acc, carta) => 
    acc + (carta.prezzo * (carta.quantita || 0)), 0);

  document.getElementById("completion-bar").style.width = `${percentualeCompletamento}%`;
  document.getElementById("completion-text").textContent = 
    `${percentualeCompletamento.toFixed(1)}% completato (${carteCompletate}/${totaleCarte})`;
  document.getElementById("total-value").textContent = 
    `Valore collezione: €${valoreCollezione.toFixed(2)}`;
}

// Renderizza le carte nella griglia
function render(carte) {
  const container = document.getElementById("carte");
  container.innerHTML = '';

  // Ordina per numero
  const carteOrdinate = [...carte].sort((a, b) => 
    parseInt(a.numero) - parseInt(b.numero));

  carteOrdinate.forEach((carta, index) => {
    const originalIndex = tutteLeCarte.findIndex(c => 
      c.numero === carta.numero && c.nome === carta.nome);
    
    const div = document.createElement('div');
    div.className = 'card-container';
    div.innerHTML = `
      <img src="${carta.immagine}" alt="${carta.nome}" loading="lazy" />
      <div class="info">
        <h2 class="font-semibold truncate">${carta.nome}</h2>
        <p class="text-sm">#${carta.numero}</p>
        <p class="text-xs text-gray-600">${carta.rarita}</p>
        <p class="mt-1">Quantità: <span class="font-bold">${carta.quantita || 0}</span></p>
      </div>
      <div class="card-actions mt-2">
        <button class="aggiungi" data-index="${originalIndex}">+</button>
        <button class="rimuovi" data-index="${originalIndex}">-</button>
      </div>
    `;
    div.onclick = () => mostraModal(carta, originalIndex);
    container.appendChild(div);
  });

  // Aggiungi event listener ai pulsanti
  document.querySelectorAll(".aggiungi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, 1, e));
  });
  
  document.querySelectorAll(".rimuovi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, -1, e));
  });

  aggiornaStatistiche();
}

// Funzione di ricerca
function cercaCarte() {
  const filtro = document.getElementById("filtro").value.toLowerCase();
  const cardPreview = document.getElementById("card-preview");

  if (!filtro) {
    cardPreview.style.display = 'none';
    render(tutteLeCarte);
    return;
  }

  const carteTrovate = tutteLeCarte.filter(carta =>
    carta.nome.toLowerCase().includes(filtro) || 
    carta.numero.includes(filtro)
  );

  if (carteTrovate.length > 0) {
    const cartaTrovata = carteTrovate[0];
    cardPreview.style.display = 'block';
    document.getElementById("preview-img").src = cartaTrovata.immagine;
    document.getElementById("preview-name").textContent = cartaTrovata.nome;
    document.getElementById("preview-number").textContent = `#${cartaTrovata.numero}`;
    document.getElementById("preview-rarity").textContent = cartaTrovata.rarita;
    document.getElementById("preview-quantity").textContent = `Quantità: ${cartaTrovata.quantita || 0}`;
    
    render(carteTrovate);
  } else {
    cardPreview.style.display = 'none';
    render([]);
  }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  caricaCarte();
  render(tutteLeCarte);
  
  document.getElementById("filtro").addEventListener("input", cercaCarte);
  
  // Chiudi modale cliccando fuori
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal")) {
      chiudiModal();
    }
  });
});
