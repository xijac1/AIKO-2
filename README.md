# AIKO 2: Anki Card Maker (Local)

Local-only Chrome extension for macOS. Generates Anki cards from selected text using Groq and sends them to Anki Desktop via AnkiConnect.

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
5) Open the popup and add your Groq API key in storage (for now, use DevTools -> Application -> Storage -> Local Storage).

## Usage

- Highlight text on any page.
- Click "Create Anki Card" floating button.
- Open the popup, click "Generate card".
- Review the card and click "Add to Anki".

## Notes

- Anki must be open for AnkiConnect to work.
- Uses 127.0.0.1:8765 for local AnkiConnect calls.
