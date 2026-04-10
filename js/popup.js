const selectionEl = document.getElementById("selection");
const generateBtn = document.getElementById("generate");
const generateMultipleBtn = document.getElementById("generateMultiple");
const refreshDecksBtn = document.getElementById("refreshDecks");
const frontEl = document.getElementById("front");
const backEl = document.getElementById("back");
const deckEl = document.getElementById("deck");
const addToAnkiBtn = document.getElementById("addToAnki");
const clearAllBtn = document.getElementById("clearAll");
const selectAllBtn = document.getElementById("selectAll");
const cardsPanel = document.getElementById("cardsPanel");
const cardsListEl = document.getElementById("cardsList");
const statusEl = document.getElementById("status");
const toggleSettingsBtn = document.getElementById("toggleSettings");
const settingsPanel = document.getElementById("settingsPanel");
const mainPanel = document.getElementById("mainPanel");
const singleCardPanel = document.getElementById("singleCardPanel");
const groqKeyEl = document.getElementById("groqKey");
const groqModelEl = document.getElementById("groqModel");
const saveSettingsBtn = document.getElementById("saveSettings");
const imageDropEl = document.getElementById("imageDrop");
const imageInputEl = document.getElementById("imageInput");
const imageMetaEl = document.getElementById("imageMeta");
const clearImageBtn = document.getElementById("clearImage");
const keepImageSingleEl = document.getElementById("keepImageSingle");

let generatedCards = [];
let imageDataUrl = "";
let imageName = "";
let lastMode = "single";

async function saveDraftState() {
  const draftState = {
    selectionText: selectionEl.value,
    front: frontEl.value,
    back: backEl.value,
    generatedCards,
    imageDataUrl,
    imageName,
    keepImageSingle: keepImageSingleEl.checked,
    lastMode
  };

  await chrome.storage.local.set({ draftState });
}

async function loadDraftState() {
  const result = await chrome.storage.local.get(["draftState"]);
  const draft = result.draftState;
  if (!draft) {
    return false;
  }

  selectionEl.value = draft.selectionText || "";
  frontEl.value = draft.front || "";
  backEl.value = draft.back || "";
  keepImageSingleEl.checked = Boolean(draft.keepImageSingle);
  imageDataUrl = draft.imageDataUrl || "";
  imageName = draft.imageName || "";
  lastMode = draft.lastMode || "single";

  generatedCards = Array.isArray(draft.generatedCards)
    ? draft.generatedCards
    : [];
  renderCards(generatedCards);
  updateImageMeta();
  return true;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#7B4997";
}

function renderCards(cards) {
  cardsListEl.innerHTML = "";
  if (!cards.length) {
    singleCardPanel.classList.remove("hidden");
    cardsPanel.classList.add("hidden");
    return;
  }

  singleCardPanel.classList.add("hidden");
  cardsPanel.classList.remove("hidden");

  cards.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card-item";

    const header = document.createElement("div");
    header.className = "card-item-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.index = String(index);
    checkbox.className = "card-select";

    const label = document.createElement("span");
    label.textContent = `Card ${index + 1}`;

    header.appendChild(checkbox);
    header.appendChild(label);

    const front = document.createElement("textarea");
    front.rows = 2;
    front.value = card.front || "";
    front.placeholder = "Front";
    front.addEventListener("input", (event) => {
      generatedCards[index].front = event.target.value;
      saveDraftState();
    });

    const back = document.createElement("textarea");
    back.rows = 3;
    back.value = card.back || "";
    back.placeholder = "Back";
    back.addEventListener("input", (event) => {
      generatedCards[index].back = event.target.value;
      saveDraftState();
    });

    const keepImageRow = document.createElement("div");
    keepImageRow.className = "inline-option";

    const keepImageInput = document.createElement("input");
    keepImageInput.type = "checkbox";
    keepImageInput.checked = Boolean(card.keepImage);
    keepImageInput.disabled = !imageDataUrl;
    keepImageInput.addEventListener("change", (event) => {
      generatedCards[index].keepImage = event.target.checked;
      saveDraftState();
    });

    const keepImageLabel = document.createElement("label");
    keepImageLabel.textContent = "Keep image";

    keepImageRow.appendChild(keepImageInput);
    keepImageRow.appendChild(keepImageLabel);

    cardEl.appendChild(header);
    cardEl.appendChild(front);
    cardEl.appendChild(back);
    cardEl.appendChild(keepImageRow);
    cardsListEl.appendChild(cardEl);
  });
}

function updateImageMeta() {
  if (!imageDataUrl) {
    imageMetaEl.textContent = "";
    imageMetaEl.classList.add("hidden");
    clearImageBtn.disabled = true;
    keepImageSingleEl.checked = false;
    keepImageSingleEl.disabled = true;
    return;
  }

  imageMetaEl.textContent = imageName || "Image ready";
  imageMetaEl.classList.remove("hidden");
  clearImageBtn.disabled = false;
  keepImageSingleEl.disabled = false;
}

function clearImageSelection() {
  imageDataUrl = "";
  imageName = "";
  imageInputEl.value = "";
  updateImageMeta();
  generatedCards = generatedCards.map((card) => ({
    ...card,
    keepImage: false
  }));
  renderCards(generatedCards);
  saveDraftState();
}

function readImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Please choose an image file.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = String(reader.result || "");
    imageName = file.name || "Image ready";
    updateImageMeta();
    setStatus("Image loaded.");
    saveDraftState();
  };
  reader.onerror = () => {
    setStatus("Unable to read the image file.", true);
  };
  reader.readAsDataURL(file);
}

async function loadSelection() {
  const result = await chrome.storage.local.get([
    "lastSelectionText",
    "shouldPrefillSelection"
  ]);
  if (result.shouldPrefillSelection) {
    if (result.lastSelectionText) {
      selectionEl.value = result.lastSelectionText;
      saveDraftState();
    }
    await chrome.storage.local.set({ shouldPrefillSelection: false });
  }
}

async function loadLastCard() {
  const result = await chrome.storage.local.get(["lastGeneratedCard"]);
  const card = result.lastGeneratedCard;
  if (card && card.front && card.back) {
    frontEl.value = card.front;
    backEl.value = card.back;
  }
}

async function loadLastMultiCards() {
  const result = await chrome.storage.local.get([
    "lastGeneratedCards",
    "lastMode"
  ]);
  if (result.lastMode === "multi" && Array.isArray(result.lastGeneratedCards)) {
    generatedCards = result.lastGeneratedCards;
    renderCards(generatedCards);
  }
}

async function loadSettings() {
  const result = await chrome.storage.local.get(["groqApiKey", "groqModel"]);
  if (result.groqApiKey) {
    groqKeyEl.value = result.groqApiKey;
  }
  groqModelEl.value =
    result.groqModel || "meta-llama/llama-4-scout-17b-16e-instruct";
}

async function saveSettings() {
  const groqApiKey = groqKeyEl.value.trim();
  const groqModel =
    groqModelEl.value.trim() || "meta-llama/llama-4-scout-17b-16e-instruct";
  await chrome.storage.local.set({ groqApiKey, groqModel });
  setStatus("Settings saved.");
}

async function loadDecks() {
  setStatus("Loading decks...");
  const response = await chrome.runtime.sendMessage({ action: "getDecks" });
  if (!response.ok) {
    setStatus(response.error || "Unable to load decks.", true);
    return;
  }

  deckEl.innerHTML = "";
  response.decks.forEach((deck) => {
    const option = document.createElement("option");
    option.value = deck;
    option.textContent = deck;
    deckEl.appendChild(option);
  });

  const stored = await chrome.storage.local.get(["lastSelectedDeck"]);
  if (stored.lastSelectedDeck && response.decks.includes(stored.lastSelectedDeck)) {
    deckEl.value = stored.lastSelectedDeck;
  }

  setStatus("Decks loaded.");
}

refreshDecksBtn.addEventListener("click", loadDecks);

deckEl.addEventListener("change", async () => {
  const selectedDeck = deckEl.value;
  if (selectedDeck) {
    await chrome.storage.local.set({ lastSelectedDeck: selectedDeck });
  }
});

toggleSettingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
  mainPanel.classList.toggle("hidden");
});

saveSettingsBtn.addEventListener("click", async () => {
  await saveSettings();
  settingsPanel.classList.add("hidden");
  mainPanel.classList.remove("hidden");
});

imageInputEl.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  readImageFile(file);
});

clearImageBtn.addEventListener("click", () => {
  clearImageSelection();
  setStatus("Image removed.");
});

imageDropEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  imageDropEl.classList.add("is-dragover");
});

imageDropEl.addEventListener("dragleave", () => {
  imageDropEl.classList.remove("is-dragover");
});

imageDropEl.addEventListener("drop", (event) => {
  event.preventDefault();
  imageDropEl.classList.remove("is-dragover");
  const file = event.dataTransfer && event.dataTransfer.files[0];
  readImageFile(file);
});

generateBtn.addEventListener("click", async () => {
  const text = selectionEl.value.trim();
  if (!text && !imageDataUrl) {
    setStatus("Add text, an image, or both.", true);
    return;
  }

  setStatus("Generating card...");
  const response = await chrome.runtime.sendMessage({
    action: "generateCard",
    text,
    imageDataUrl
  });

  if (!response.ok) {
    setStatus(response.error || "Groq generation failed.", true);
    return;
  }

  frontEl.value = response.card.front || "";
  backEl.value = response.card.back || "";
  lastMode = "single";
  await chrome.storage.local.set({ lastGeneratedCard: response.card });
  await chrome.storage.local.set({ lastMode: "single" });
  generatedCards = [];
  renderCards(generatedCards);
  await saveDraftState();
  setStatus("Card generated. Review and add to Anki.");
});

generateMultipleBtn.addEventListener("click", async () => {
  const text = selectionEl.value.trim();
  if (!text && !imageDataUrl) {
    setStatus("Add text, an image, or both.", true);
    return;
  }

  setStatus("Generating multiple cards...");
  const response = await chrome.runtime.sendMessage({
    action: "generateCards",
    text,
    imageDataUrl
  });

  if (!response.ok) {
    setStatus(response.error || "Groq multi generation failed.", true);
    return;
  }

  generatedCards = response.cards || [];
  frontEl.value = "";
  backEl.value = "";
  lastMode = "multi";
  await chrome.storage.local.set({
    lastGeneratedCards: generatedCards,
    lastMode: "multi"
  });
  renderCards(generatedCards);
  await saveDraftState();
  setStatus("Multiple cards generated. Review and add selected.");
});

addToAnkiBtn.addEventListener("click", async () => {
  if (generatedCards.length) {
    await addCardsToAnki(getSelectedCards());
    return;
  }

  const front = frontEl.value.trim();
  const back = backEl.value.trim();
  const deck = deckEl.value;

  if (!front || !back) {
    setStatus("Front and back are required.", true);
    return;
  }

  if (!deck) {
    setStatus("Select a deck first.", true);
    return;
  }

  const finalCard = keepImageSingleEl.checked
    ? withImageInBack({ front, back })
    : { front, back };

  setStatus("Adding note to Anki...");
  const response = await chrome.runtime.sendMessage({
    action: "addNote",
    front: finalCard.front,
    back: finalCard.back,
    deck
  });

  if (!response.ok) {
    setStatus(response.error || "Failed to add note.", true);
    return;
  }

  setStatus("Added to Anki.");
});

clearAllBtn.addEventListener("click", async () => {
  selectionEl.value = "";
  frontEl.value = "";
  backEl.value = "";
  keepImageSingleEl.checked = false;
  clearImageSelection();
  generatedCards = [];
  lastMode = "single";
  renderCards(generatedCards);
  await chrome.storage.local.remove([
    "draftState",
    "lastSelectionText",
    "lastGeneratedCard",
    "lastGeneratedCards",
    "lastMode",
    "shouldPrefillSelection"
  ]);
  setStatus("Cleared.");
});

function getSelectedCards() {
  const selected = [];
  const checkboxes = cardsListEl.querySelectorAll(".card-select");
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const index = Number(checkbox.dataset.index);
      const card = generatedCards[index];
      if (card && card.front && card.back) {
        selected.push(card);
      }
    }
  });
  return selected;
}

function withImageInBack(card) {
  if (!imageDataUrl) {
    return card;
  }

  const imageTag = `<br><img src="${imageDataUrl}" />`;
  return {
    ...card,
    back: `${card.back}${imageTag}`
  };
}

async function addCardsToAnki(cards) {
  const deck = deckEl.value;
  if (!deck) {
    setStatus("Select a deck first.", true);
    return;
  }

  if (!cards.length) {
    setStatus("No cards selected.", true);
    return;
  }

  setStatus("Adding notes to Anki...");
  const response = await chrome.runtime.sendMessage({
    action: "addNotes",
    deck,
    cards: cards.map((card) => (card.keepImage ? withImageInBack(card) : card))
  });

  if (!response.ok) {
    setStatus(response.error || "Failed to add notes.", true);
    return;
  }

  setStatus("Added notes to Anki.");
}

selectAllBtn.addEventListener("click", () => {
  const checkboxes = cardsListEl.querySelectorAll(".card-select");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true;
  });
});

async function init() {
  const loadedDraft = await loadDraftState();
  await loadSelection();
  if (!loadedDraft) {
    await loadLastCard();
    await loadLastMultiCards();
  }
  await loadSettings();
  await loadDecks();
  updateImageMeta();
}

init();

selectionEl.addEventListener("input", saveDraftState);
frontEl.addEventListener("input", saveDraftState);
backEl.addEventListener("input", saveDraftState);
keepImageSingleEl.addEventListener("change", saveDraftState);
