# AIKO 2: Anki Card Maker (Local)

Local-only Chrome extension for macOS. Generates Anki cards from selected text or images using Groq and sends them to Anki Desktop via AnkiConnect.

## Requirements

- Anki Desktop running locally.
- AnkiConnect (code: 2055492159).
- A Groq API key.

## Setup

1) Install Anki Desktop.
2) Install AnkiConnect (code: 2055492159) and restart Anki.
3) Configure AnkiConnect CORS allowlist to include your extension ID:

{
  "webCorsOriginList": [
    "chrome-extension://<EXTENSION_ID>",
    "http://127.0.0.1",
    "http://localhost"
  ]
}

4) Load this folder as an unpacked extension in chrome://extensions.
5) Open the popup, click the Settings icon, then save your Groq API key (and model if desired).

## Configuration

- Groq API key: stored in the popup Settings panel (masked input).
- Groq model: optional; defaults to meta-llama/llama-4-scout-17b-16e-instruct.

## Usage

- Highlight text on any page, right-click, then choose "Create Anki card" to open the popup with the selection.
- Or paste text directly into the popup.
- Optionally add an image (drag/drop or file picker).
- Click "Generate card" for a single card or "Generate multiple" for several cards.
- Review/edit the fields, select the deck, then click "Add to Anki".
- Use "Keep image" to append the image to the back of a card.

## Notes

- Anki must be open for AnkiConnect to work.
- Uses 127.0.0.1:8765 for local AnkiConnect calls.
