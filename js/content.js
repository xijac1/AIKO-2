let lastSelection = "";
let inlineButton;

function getSelectedText() {
  const selection = window.getSelection();
  if (!selection) {
    return "";
  }
  return selection.toString().trim();
}

function ensureInlineButton() {
  if (inlineButton) {
    return inlineButton;
  }

  inlineButton = document.createElement("button");
  inlineButton.className = "aiko-anki-inline";
  inlineButton.type = "button";
  inlineButton.textContent = "AIKO 2";
  inlineButton.addEventListener("click", () => {
    const text = getSelectedText() || lastSelection;
    if (text) {
      chrome.runtime.sendMessage({ action: "openPopupWithSelection", text });
    }
  });

  document.body.appendChild(inlineButton);
  return inlineButton;
}

function hideInlineButton() {
  if (inlineButton) {
    inlineButton.style.display = "none";
  }
}

function positionInlineButton() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    hideInlineButton();
    return;
  }

  const text = selection.toString().trim();
  if (!text) {
    hideInlineButton();
    return;
  }

  lastSelection = text;
  chrome.runtime.sendMessage({ action: "selectionUpdated", text });

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const button = ensureInlineButton();

  const top = rect.top + window.scrollY - 34;
  const left = rect.right + window.scrollX - 8;

  button.style.top = `${Math.max(top, 8)}px`;
  button.style.left = `${Math.max(left, 8)}px`;
  button.style.display = "block";
}

document.addEventListener("mouseup", positionInlineButton);
document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" || event.key === "Control" || event.key === "Meta") {
    positionInlineButton();
  }
});

document.addEventListener("selectionchange", () => {
  const text = getSelectedText();
  if (!text) {
    hideInlineButton();
  }
});
