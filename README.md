# Ultimate Barcode Studio

**Create Any QR Code. Design Any Barcode. Unlimited Possibilities.**

Ultimate Barcode Studio is a full-stack SaaS QR Code & Barcode Design Studio built with React, TypeScript, Vite, Tailwind CSS, `qr-code-styling`, `bwip-js`, `jsPDF`, `jsQR`, and Firebase Authentication & Firestore.

## Key Capabilities

- **15 Structured QR Categories**: Website URL, Plain Text, Phone Call, WhatsApp, SMS, Email, WiFi (`WPA`/`WEP`/Open), Contact vCard 3.0, UPI Payment (`upi://pay`), Paytm/VPA, GPS Location / Google Maps, Calendar Event (`.ics`), Hosted Image URL, Social Media, and Custom URI.
- **13 International Barcode Standards**: CODE 128, CODE 39, CODE 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, ITF, Codabar, ISBN-10, ISBN-13, and GS1-128 with real-time Mod-10/Mod-11 check-digit validation.
- **QR Design Studio**: 12 style presets, linear/radial color gradients, 6 dot shapes, custom finder eyes, drag-and-drop center logo embedding with automatic ECC boost, 7 frames, undo/redo history, and live contrast + `jsQR` scan reliability checks.
- **UPI Payment Poster Studio**: High-resolution printable shop standee generator (`1000x1400` PNG and A4 PDF) with 4 counter themes.
- **Batch Label Sheet & Scanner**:
  - Generate multi-page A4 label sheet PDFs (up to 50 QR codes or barcodes per batch via CSV/TXT or line-by-line input).
  - Decode and inspect QR/barcodes client-side via image upload or live camera feed, and re-open payloads directly in Design Studio.
- **Multi-Format Exports & Clipboard**: High-DPI PNG (`512px`–`4096px`), vector SVG, JPEG, print-ready A4 PDF, and 1-click PNG clipboard copy.
- **Guest Mode + Firebase Cloud Sync**: Instant guest access to all generators; Firebase Authentication (Google & Email/Password with verification) and owner-isolated Cloud Firestore sync for saved projects, favorites, and export history.

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Run pure-logic unit tests:

```bash
npx --yes tsx --test src/utils/*.test.ts
```
