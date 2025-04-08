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
  // Ordina le carte per numero in modo numerico
  carte.sort((a, b) => {
    const numeroA = parseInt(a.numero); // Converti a numero
    const numeroB = parseInt(b.numero); // Converti b numero
    return numeroA - numeroB; // Confronta come numeri
  });

  const container = document.getElementById("carte");
  container.innerHTML = ''; // Rimuovi i vecchi elementi

  carte.forEach((carta, index) => {
    const div = document.createElement('div');
    div.classList.add('card-container');
    div.id = `card-${index}`;  // Aggiungi ID univoco alla carta
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
        <button onclick="aggiornaQuantita(${index}, 1, event)">Aggiungi</button>
        <button onclick="aggiornaQuantita(${index}, -1, event)" class="remove">Rimuovi</button>
      </div>
    `;
    container.appendChild(div);
  });

  aggiornaStatistiche();
}

// Funzione per scrollare alla carta selezionata
function scrollToCarta(cartaIndex) {
  const cartaElement = document.getElementById(`card-${cartaIndex}`);
  if (cartaElement) {
    cartaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Funzione per la ricerca delle carte in tempo reale
function cercaCarte() {
  const filtro = document.getElementById("filtro").value.toLowerCase();
  
  // Trova tutte le carte che il nome o il numero contiene la stringa della ricerca
  const carteTrovate = tutteLeCarte.filter(carta => {
    return carta.nome.toLowerCase().includes(filtro) || carta.numero.includes(filtro);
  });

  // Mostra tutte le carte nella vetrina, indipendentemente dalla ricerca
  const cardPreview = document.getElementById("card-preview");
  if (filtro === "") {
    cardPreview.style.display = 'none'; // Nascondi la preview se il campo è vuoto
    render(tutteLeCarte); // Mostra tutte le carte nella vetrina
  } else if (carteTrovate.length > 0) {
    // Mostra la preview con la prima carta trovata
    const cartaTrovata = carteTrovate[0]; // Puoi modificare questo per mostrare altre carte se vuoi
    cardPreview.style.display = 'block';
    document.getElementById("preview-img").src = cartaTrovata.immagine;
    document.getElementById("preview-name").textContent = cartaTrovata.nome;
    document.getElementById("preview-number").textContent = `Numero: ${cartaTrovata.numero}`;
    document.getElementById("preview-rarity").textContent = `Rarità: ${cartaTrovata.rarita}`;
    document.getElementById("preview-quantity").textContent = `Quantità: ${cartaTrovata.quantita || 0}`;

    // Aggiungi un evento per il clic sulla preview
    document.getElementById("card-preview").onclick = () => {
      scrollToCarta(tutteLeCarte.indexOf(cartaTrovata));  // Scorri fino alla carta trovata
    };
  } else {
    cardPreview.style.display = 'none'; // Se nessuna carta è trovata, nascondi la preview
    render([]); // Nascondi le carte
  }
}

// Event listener per la ricerca in tempo reale
document.getElementById("filtro").addEventListener("input", cercaCarte);

// Carica le carte al caricamento della pagina
window.onload = () => {
  caricaCarte();
  render(tutteLeCarte);
};

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

window.onload = () => {
  if (localStorage.getItem("carte")) {
    caricaCarte();
    render(tutteLeCarte);
  } else {
    caricaCarteDaFile();
  }
};

