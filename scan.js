let tutteLeCarte = [];
let cartaAttiva = null;
let filtroAttivo = null;

// Carica le carte da localStorage o dal JSON incorporato
function caricaCarte() {
  const carteSalvate = localStorage.getItem("carte");
  if (carteSalvate) {
    try {
      tutteLeCarte = JSON.parse(carteSalvate);
      console.log("Caricate carte da localStorage");
    } catch (e) {
      console.error("Errore nel parsing delle carte salvate, usando fallback", e);
      fetch('carte.json')
        .then(response => response.json())
        .then(data => {
          tutteLeCarte = data;
          render(tutteLeCarte);
        })
        .catch(error => {
          console.error("Errore nel caricamento del JSON:", error);
          tutteLeCarte = [];
        });
    }
  } else {
    console.log("Nessuna carta in localStorage, carico da JSON");
    fetch('carte.json')
      .then(response => response.json())
      .then(data => {
        tutteLeCarte = data;
        render(tutteLeCarte);
      })
      .catch(error => {
        console.error("Errore nel caricamento del JSON:", error);
        tutteLeCarte = [];
      });
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
  document.getElementById("modal-prezzo").value = carta.prezzo || 0;
  document.getElementById("modal").classList.remove('hidden');
  document.getElementById("modal").classList.add('flex');
}

function chiudiModal() {
  document.getElementById("modal").classList.add('hidden');
  document.getElementById("modal").classList.remove('flex');
}

// Modifica la quantità nella modale
function modificaQuantita(delta) {
  const input = document.getElementById("modal-quantita");
  let nuovaQuantita = parseInt(input.value) + delta;
  if (nuovaQuantita < 0) nuovaQuantita = 0;
  input.value = nuovaQuantita;
}

// Salva le modifiche dalla modale
function salvaModifiche() {
  if (cartaAttiva !== null) {
    const carta = tutteLeCarte[cartaAttiva];
    carta.nome = document.getElementById("modal-nome").value;
    carta.numero = document.getElementById("modal-numero").value;
    carta.rarita = document.getElementById("modal-rarita").value;
    carta.quantita = parseInt(document.getElementById("modal-quantita").value) || 0;
    carta.prezzo = parseFloat(document.getElementById("modal-prezzo").value) || 0;

    salvaCarte();
    render(tutteLeCarte);
    chiudiModal();
  }
}

// Elimina una carta
function eliminaCarta() {
  if (cartaAttiva !== null && confirm("Sei sicuro di voler eliminare questa carta?")) {
    tutteLeCarte.splice(cartaAttiva, 1);
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

// Mostra l'anteprima della carta
function mostraAnteprima(carta, event) {
  const preview = document.getElementById("card-preview");
  preview.style.display = 'block';
  preview.style.left = `${event.clientX + 20}px`;
  preview.style.top = `${event.clientY + 20}px`;
  
  document.getElementById("preview-img").src = carta.immagine;
  document.getElementById("preview-name").textContent = carta.nome;
  document.getElementById("preview-number").textContent = `#${carta.numero}`;
  document.getElementById("preview-rarity").textContent = carta.rarita;
  document.getElementById("preview-quantity").textContent = carta.quantita || 0;
  document.getElementById("preview-value").textContent = `€${((carta.prezzo || 0) * (carta.quantita || 0)).toFixed(2)}`;
}

function nascondiAnteprima() {
  document.getElementById("card-preview").style.display = 'none';
}

// Aggiorna le statistiche della collezione
function aggiornaStatistiche() {
  const totaleCarte = tutteLeCarte.length;
  const carteCompletate = tutteLeCarte.filter(c => c.quantita > 0).length;
  const percentualeCompletamento = (carteCompletate / totaleCarte) * 100;

  const valoreCollezione = tutteLeCarte.reduce((acc, carta) => 
    acc + (carta.prezzo * (carta.quantita || 0)), 0);

  document.getElementById("completion-bar").style.width = `${percentualeCompletamento}%`;
  document.getElementById("completion-percent").textContent = `${Math.round(percentualeCompletamento)}%`;
  document.getElementById("completion-text").textContent = 
    `${percentualeCompletamento.toFixed(1)}% completato (${carteCompletate}/${totaleCarte} carte)`;
  document.getElementById("total-value").textContent = 
    `€${valoreCollezione.toFixed(2)}`;
  
  // Per questo esempio, il totale speso è una stima (puoi aggiungere un campo specifico)
  document.getElementById("total-spent").textContent = 
    `€${(valoreCollezione * 0.7).toFixed(2)}`; // Stima del 70% del valore
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
      c.numero === carta.numero && c.nome === carta.nome && c.rarita === carta.rarita);
    
    const div = document.createElement('div');
    div.className = 'card-container';
    
    // Determina la classe di rarità
    let rarityClass = 'rarity-common';
    if (carta.rarita.includes('Non Comune')) rarityClass = 'rarity-uncommon';
    else if (carta.rarita.includes('Holo')) rarityClass = 'rarity-holo';
    else if (carta.rarita.includes('EX')) rarityClass = 'rarity-ex';
    
    div.innerHTML = `
      <span class="rarity-badge ${rarityClass}">${carta.rarita}</span>
      <img src="${carta.immagine}" alt="${carta.nome}" loading="lazy" 
           onmouseenter="mostraAnteprima(${JSON.stringify(carta).replace(/"/g, '&quot;')}, event)"
           onmouseleave="nascondiAnteprima()" />
      <div class="info w-full mt-2">
        <h2 class="font-semibold truncate text-center">${carta.nome}</h2>
        <p class="text-sm text-center">#${carta.numero}</p>
        <p class="text-xs text-gray-600 text-center">${carta.prezzo ? '€' + carta.prezzo.toFixed(2) : 'N/D'}</p>
        <p class="mt-1 text-center">Quantità: <span class="font-bold">${carta.quantita || 0}</span></p>
      </div>
      <div class="card-actions mt-2">
        <button class="bg-red-500 hover:bg-red-600 text-white p-1 rounded rimuovi" data-index="${originalIndex}">
          <i class="fas fa-minus"></i>
        </button>
        <button class="bg-green-500 hover:bg-green-600 text-white p-1 rounded aggiungi" data-index="${originalIndex}">
          <i class="fas fa-plus"></i>
        </button>
        <button class="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded modifica" data-index="${originalIndex}">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    `;
    
    // Evidenzia le carte possedute
    if (carta.quantita > 0) {
      div.classList.add('ring-2', 'ring-green-500');
    }
    
    container.appendChild(div);
  });

  // Aggiungi event listener ai pulsanti
  document.querySelectorAll(".aggiungi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, 1, e));
  });
  
  document.querySelectorAll(".rimuovi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, -1, e));
  });
  
  document.querySelectorAll(".modifica").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      mostraModal(tutteLeCarte[+btn.dataset.index], +btn.dataset.index);
    });
  });

  aggiornaStatistiche();
}

// Funzione di ricerca
function cercaCarte() {
  const filtro = document.getElementById("filtro").value.toLowerCase();
  
  if (!filtro) {
    render(tutteLeCarte);
    return;
  }

  const carteTrovate = tutteLeCarte.filter(carta =>
    carta.nome.toLowerCase().includes(filtro) || 
    carta.numero.includes(filtro) ||
    carta.rarita.toLowerCase().includes(filtro)
  );

  render(carteTrovate);
}

// Filtri per rarità
function filtraRarita(rarita) {
  filtroAttivo = rarita;
  const carteFiltrate = tutteLeCarte.filter(carta => 
    carta.rarita.includes(rarita));
  render(carteFiltrate);
}

// Filtra le carte possedute
function filtraPossedute() {
  filtroAttivo = 'possedute';
  const carteFiltrate = tutteLeCarte.filter(carta => 
    carta.quantita > 0);
  render(carteFiltrate);
}

// Resetta i filtri
function resettaFiltri() {
  filtroAttivo = null;
  document.getElementById("filtro").value = '';
  render(tutteLeCarte);
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  caricaCarte();
  
  document.getElementById("filtro").addEventListener("input", cercaCarte);
  
  // Chiudi modale cliccando fuori
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal")) {
      chiudiModal();
    }
  });
  
  // Chiudi antepremma se si clicca fuori
  document.addEventListener('click', (e) => {
    const preview = document.getElementById("card-preview");
    if (preview && !preview.contains(e.target) && e.target.id !== 'filtro') {
      nascondiAnteprima();
    }
  });
});
