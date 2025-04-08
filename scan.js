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
    tutteLeCarte = [];
  }
}

// Funzione per caricare le carte da file JSON
async function caricaCarteDaFile() {
  try {
    const response = await fetch('carte.json');
    if (!response.ok) throw new Error("Impossibile caricare il file JSON.");
    tutteLeCarte = await response.json();
    salvaCarte();
    render(tutteLeCarte);
  } catch (error) {
    console.error("Errore:", error);
  }
}

// Chiude la modale
function chiudiModal() {
  document.getElementById("modal").style.display = 'none';
}

// Salva le modifiche effettuate alla carta dalla modale
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

// Mostra la modale con i dati della carta
function mostraModal(carta, index) {
  cartaAttiva = index;
  document.getElementById("modal-img").src = carta.immagine;
  document.getElementById("modal-nome").value = carta.nome;
  document.getElementById("modal-numero").value = carta.numero;
  document.getElementById("modal-rarita").value = carta.rarita;
  document.getElementById("modal-quantita").value = carta.quantita || 0;
  document.getElementById("modal").style.display = 'flex';
}

// Aggiunge o rimuove quantità da una carta
function aggiornaQuantita(index, delta, event) {
  event.stopPropagation();
  const attuale = tutteLeCarte[index].quantita || 0;
  if (tutteLeCarte[index].quantita + delta >= 0) {
    tutteLeCarte[index].quantita += delta;
    salvaCarte();
    render(tutteLeCarte);
  }
}

// Aggiorna le statistiche
function aggiornaStatistiche() {
  const totaleCarte = tutteLeCarte.length;
  const carteCompletate = tutteLeCarte.filter(c => c.quantita > 0).length;
  const percentualeCompletamento = (carteCompletate / totaleCarte) * 100;

  const valoreCollezione = tutteLeCarte.reduce((acc, carta) => acc + (carta.prezzo * carta.quantita), 0);

  document.getElementById("completion-bar").style.width = `${percentualeCompletamento}%`;
  document.getElementById("completion-text").textContent = `${percentualeCompletamento.toFixed(2)}% completato`;
  document.getElementById("total-value").textContent = `Valore della collezione: €${valoreCollezione.toFixed(2)}`;
}

// Renderizza tutte le carte nella griglia
function render(carte) {
  carte.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));

  const container = document.getElementById("carte");
  container.innerHTML = '';

  carte.forEach((carta, index) => {
    const div = document.createElement('div');
    div.classList.add('card-container');
    div.id = `card-${index}`;
    div.onclick = () => mostraModal(carta, index);

    div.innerHTML = `
      <img src="${carta.immagine}" alt="${carta.nome}" />
      <div class="info">
        <h2>${carta.nome}</h2>
        <p>${carta.numero}</p>
        <p class="text-sm text-gray-600">Rarità: ${carta.rarita}</p>
        <p>Quantità: ${carta.quantita || 0}</p>
      </div>
      <div class="card-actions">
        <button class="aggiungi" data-index="${index}">Aggiungi</button>
        <button class="rimuovi remove" data-index="${index}">Rimuovi</button>
      </div>
    `;
    container.appendChild(div);
  });

  // Aggiunge gli event listener per i nuovi bottoni creati dinamicamente
  document.querySelectorAll(".aggiungi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, 1, e));
  });  

  document.querySelectorAll(".rimuovi").forEach(btn => {
    btn.addEventListener("click", e => aggiornaQuantita(+btn.dataset.index, -1, e));
  });

  aggiornaStatistiche();
}

// Scorri fino alla carta selezionata
function scrollToCarta(cartaIndex) {
  const cartaElement = document.getElementById(`card-${cartaIndex}`);
  if (cartaElement) {
    cartaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Funzione di ricerca in tempo reale
function cercaCarte() {
  const filtro = document.getElementById("filtro").value.toLowerCase();

  const carteTrovate = tutteLeCarte.filter(carta =>
    carta.nome.toLowerCase().includes(filtro) || carta.numero.includes(filtro)
  );

  const cardPreview = document.getElementById("card-preview");
  if (filtro === "") {
    cardPreview.style.display = 'none';
    render(tutteLeCarte);
  } else if (carteTrovate.length > 0) {
    const cartaTrovata = carteTrovate[0];
    cardPreview.style.display = 'block';
    document.getElementById("preview-img").src = cartaTrovata.immagine;
    document.getElementById("preview-name").textContent = cartaTrovata.nome;
    document.getElementById("preview-number").textContent = `Numero: ${cartaTrovata.numero}`;
    document.getElementById("preview-rarity").textContent = `Rarità: ${cartaTrovata.rarita}`;
    document.getElementById("preview-quantity").textContent = `Quantità: ${cartaTrovata.quantita || 0}`;

    document.getElementById("card-preview").onclick = () => {
      scrollToCarta(tutteLeCarte.indexOf(cartaTrovata));
    };

    render(carteTrovate);
  } else {
    cardPreview.style.display = 'none';
    render([]);
  }
}

// Eventi al caricamento pagina
window.onload = async () => {
  if (localStorage.getItem("carte")) {
    caricaCarte();
    render(tutteLeCarte);
  } else {
    await caricaCarteDaFile();
  }

  document.getElementById("filtro").addEventListener("input", cercaCarte);
  document.getElementById("modal-salva").addEventListener("click", salvaModifiche); // Assicurati che l'ID sia corretto
};
