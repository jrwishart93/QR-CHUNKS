# QR Chunks (Offline Mobile Web App)

QR Chunks is a mobile-first web app for moving large text offline between devices using sequential QR codes.

## Why React + Vite?
- **Offline reliability:** Static assets can run locally and can be cached by the browser; generation and scan logic are fully on-device.
- **QR stability:** `qrcode.react` (generation) and `html5-qrcode` (camera decode) are mature libraries with reliable mobile support.
- **Fast iteration:** Vite + TypeScript keeps the app lightweight and easy to run offline.

## QR Payload Format
Every QR code contains metadata + payload:

```text
QRSET:<unique-id>
PART:<current>/<total>
DATA:<chunk-text>
```

Example:
```text
QRSET:AB12CD34
PART:2/4
DATA:<actual text chunk>
```

## Chunking Logic
- Default chunk size: **900 chars** (conservative range 800–1000).
- Uses `Array.from(text)` to split by Unicode code points.
- Preserves all spacing/newlines/Unicode by joining chunks exactly.

## Reconstruction Logic
- Receiver scans chunks in any order.
- Chunks are grouped by `QRSET`.
- `PART` index places each chunk in a map.
- Once all `1..total` entries exist, text is reassembled exactly and can be copied.

## Privacy and Offline Guarantees
- No network calls are required for generation/scanning.
- No analytics, cloud sync, login, or background logging.
- Data is kept only in local app state unless user manually copies it.
- Manual clear button removes current text/chunks state.

## Run
```bash
npm install
npm run dev
```

## Test
```bash
npm test
```

Tests cover:
- chunk splitting behavior,
- payload parsing/formatting,
- reassembly fidelity with Unicode.
