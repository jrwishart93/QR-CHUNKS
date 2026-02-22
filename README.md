# QR-Bridge: Offline Text Transfer

QR-Bridge is a secure, 100% offline mobile-first web application designed to move large blocks of text between devices using sequential QR codes.

## How it Works

### 1. Chunking Logic
Large text is split into uniform chunks of approximately 800 characters. This size is chosen to ensure high scan reliability even on lower-quality cameras or in poor lighting conditions. We use `Array.from()` to ensure Unicode characters (like emojis or non-Latin scripts) are counted correctly as single units.

### 2. QR Payload Format
Each QR code contains a structured payload with metadata for reconstruction:
```text
QRSET:<unique-set-id>
PART:<current-index>/<total-parts>
DATA:<chunk-text-payload>
```
- **QRSET**: A random 8-character ID generated per session to ensure chunks from different transfers aren't mixed.
- **PART**: The sequence information (e.g., "2/5").
- **DATA**: The actual text content for this chunk.

### 3. Reconstruction
The receiving device scans chunks in any order. The application:
1. Identifies the `QRSET` ID.
2. Stores the `DATA` in a map keyed by the `PART` index.
3. Tracks progress against the `total-parts` count.
4. Once all parts are present, joins them in sequence to rebuild the original text.

## Offline Guarantees
- **No Internet Required**: All QR generation and scanning logic happens entirely in the browser.
- **No Analytics**: No tracking scripts or external logging.
- **No Cloud**: No data is ever sent to a server.
- **No Retention**: Text is stored only in component state and is lost when the page is refreshed or the "Reset" button is clicked.

## Technical Stack
- **React 19**: Modern UI framework.
- **Tailwind CSS**: For the "Liquid Glass" aesthetic.
- **qrcode.react**: High-performance SVG QR generation.
- **html5-qrcode**: Robust, cross-platform camera scanning.
- **Framer Motion**: Smooth, native-feeling transitions.
