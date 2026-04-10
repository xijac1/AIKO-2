const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ANKI_ENDPOINT = "http://127.0.0.1:8765";
const CONTEXT_MENU_ID = "aiko-anki-create-card";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Create Anki card",
    contexts: ["all"]
  });
});

async function readClipboardFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        return "";
      }
    }
  });

  return results?.[0]?.result || "";
}

async function getStoredSettings() {
  const result = await chrome.storage.local.get([
    "groqApiKey",
    "groqModel",
    "defaultDeck"
  ]);
  return {
    groqApiKey: result.groqApiKey || "",
    groqModel: result.groqModel || "meta-llama/llama-4-scout-17b-16e-instruct",
    defaultDeck: result.defaultDeck || ""
  };
}

function buildGroqUserContent(text, imageDataUrl, instruction) {
  const parts = [];
  const trimmedText = (text || "").trim();

  if (instruction) {
    parts.push({ type: "text", text: instruction });
  }

  if (trimmedText) {
    parts.push({ type: "text", text: `Text: ${trimmedText}` });
  }

  if (imageDataUrl) {
    parts.push({
      type: "image_url",
      image_url: { url: imageDataUrl }
    });
  }

  return parts;
}

async function requestGroqCard(text, imageDataUrl) {
  const settings = await getStoredSettings();
  if (!settings.groqApiKey) {
    throw new Error("Missing Groq API key. Save it in the popup.");
  }

  if (!text && !imageDataUrl) {
    throw new Error("Provide text, an image, or both.");
  }

  const system =
    "You convert text into an Anki card. Return ONLY strict JSON with keys: front, back. Do not wrap in markdown.";
  const userContent = buildGroqUserContent(
    text,
    imageDataUrl,
    "Create a concise study card from the provided input."
  );

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.groqApiKey}`
    },
    body: JSON.stringify({
      model: settings.groqModel,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = parseGroqJson(content);

  if (!parsed.front || !parsed.back) {
    throw new Error("Groq response missing front/back fields.");
  }

  return parsed;
}

async function requestGroqCards(text, imageDataUrl) {
  const settings = await getStoredSettings();
  if (!settings.groqApiKey) {
    throw new Error("Missing Groq API key. Save it in the popup.");
  }

  if (!text && !imageDataUrl) {
    throw new Error("Provide text, an image, or both.");
  }

  const system =
    "You convert text into Anki cards. Return ONLY strict JSON with key: cards (array of {front, back}). Do not wrap in markdown.";
  const userContent = buildGroqUserContent(
    text,
    imageDataUrl,
    "Create as many valid Anki cards as possible from the provided input. If only one makes sense, return one."
  );

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.groqApiKey}`
    },
    body: JSON.stringify({
      model: settings.groqModel,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = parseGroqJson(content);
  const cards = Array.isArray(parsed.cards) ? parsed.cards : [];

  const cleaned = cards
    .filter((card) => card && card.front && card.back)
    .map((card) => ({
      front: String(card.front).trim(),
      back: String(card.back).trim()
    }))
    .filter((card) => card.front && card.back);

  if (!cleaned.length) {
    throw new Error("Groq returned no valid cards.");
  }

  return cleaned;
}

function parseGroqJson(content) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Groq returned empty content.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch (fencedError) {
        throw new Error("Groq returned invalid JSON in a code block.");
      }
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch (sliceError) {
        throw new Error("Groq returned invalid JSON content.");
      }
    }
  }

  throw new Error("Groq returned invalid JSON.");
}

async function ankiRequest(payload) {
  const response = await fetch(ANKI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AnkiConnect error: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPopupWithSelection") {
    chrome.storage.local.set({
      lastSelectionText: message.text,
      shouldPrefillSelection: true
    });
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {});
    }
    return;
  }

  if (message.action === "generateCard") {
    requestGroqCard(message.text, message.imageDataUrl)
      .then((card) => sendResponse({ ok: true, card }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "generateCards") {
    requestGroqCards(message.text, message.imageDataUrl)
      .then((cards) => sendResponse({ ok: true, cards }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "getDecks") {
    ankiRequest({ action: "deckNames", version: 6 })
      .then((result) => sendResponse({ ok: true, decks: result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "addNote") {
    const note = {
      deckName: message.deck,
      modelName: "Basic",
      fields: {
        Front: message.front,
        Back: message.back
      }
    };

    ankiRequest({ action: "addNote", version: 6, params: { note } })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === "addNotes") {
    const notes = (message.cards || []).map((card) => ({
      deckName: message.deck,
      modelName: "Basic",
      fields: {
        Front: card.front,
        Back: card.back
      }
    }));

    ankiRequest({ action: "addNotes", version: 6, params: { notes } })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  const selection = (info.selectionText || "").trim();
  let text = selection;

  if (!text && tab?.id) {
    text = (await readClipboardFromTab(tab.id)).trim();
  }

  if (text) {
    await chrome.storage.local.set({
      lastSelectionText: text,
      shouldPrefillSelection: true
    });
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {});
    }
  }
});
