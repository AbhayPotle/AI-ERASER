# AI Eraser / Sensitive Info Blurring Tool

This application runs entirely in your browser using TensorFlow.js. No images are sent to any server.

## Features
- **Face Blurring**: Uses `BlazeFace` to detect and blur faces.
- **Body Blurring**: Uses `BodyPix` to segment and blur people.
- **Sensitive Text**: Uses `Tesseract.js` (OCR) and Regex to find and blur emails, phone numbers.
- **License Plates**: Uses OCR and heuristics to blur alphanumeric plates (experimental).

## How to Run
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:5173

## Note on Performance
- The first time you load the page, it will download several AI models (~30-50MB). This may take a moment.
- Processing high-resolution images might be slow on older devices.
- Enable hardware acceleration in your browser for best performance.

## Privacy
- All processing is local. Your data stays on your machine.
