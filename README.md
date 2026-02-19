# 🛡️ AI Eraser | Vibe Coded Privacy Tool

![AI Eraser Hero](https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop)

![Vibe Coding](https://img.shields.org/badge/VIBE-CODED-8A2BE2?style=for-the-badge&logo=codepen&logoColor=white) ![AI Powered](https://img.shields.org/badge/AI-POWERED-00C4CC?style=for-the-badge&logo=tensorflow&logoColor=white) ![Privacy First](https://img.shields.org/badge/PRIVACY-100%25-10B981?style=for-the-badge&logo=shield&logoColor=white)

> **"Privacy is not an option, it's a vibe."**

## 🚀 Overview

**AI Eraser** is a cutting-edge, browser-based privacy tool designed to instantly redact sensitive information from your images. Powered by advanced **TensorFlow.js** models, it detects and blurs faces, body parts, license plates, and private text with a single click—all running locally on your device for maximum security.



This project was built with the **Vibe Coding** philosophy: coding with flow, intuition, and a focus on user experience and aesthetics.

---

## ✨ Features

- **🎭 Multi-Face Detection**: Uses a fusion of **SSD MobileNet V1** + **BlazeFace** to detect and blur faces in group photos with high accuracy.
- **👤 Body Privacy**: Automatically segments and blurs people using **BodyPix** technology.
- **🚗 License Plate Redaction**: Detects vehicle license plates using OCR and intelligent pattern matching.
- **📝 Sensitive Text Hide**: Instantly finds and blurs emails, phone numbers, and private data using **Tesseract.js**.
- **⚡ Local Processing**: No data ever leaves your browser. 100% private and secure.
- **💎 Premium UI**: Glassmorphism design, smooth animations, and a dark mode interface built for the modern web.

---

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **AI Core**: TensorFlow.js
- **Models**:
  - `face-api.js` (SSD MobileNet V1)
  - `BlazeFace`
  - `COCO-SSD` (Object Detection)
  - `BodyPix` (Segmentation)
- **OCR**: Tesseract.js
- **Styling**: CSS3 Variables, Glassmorphism, Responsive Design

---

## 🧠 Deep Dive: How it Works

### 1. Progressive AI Detection Engine
The core of the project lies in `aiService.ts`. AI Eraser uses a **Multi-Model Fusion** strategy to ensure nothing is missed:

*   **Face Detection (Triple-Check)**:
    *   **BlazeFace**: A lightning-fast model for close-up frontal faces. We implemented **Multi-Scale Tiling**—a process where the image is sliced into overlapping crops, scanned individually, and results are mapped back to the main canvas.
    *   **SSD MobileNet V1**: A robust detector that specializes in finding faces at various angles and scales.
    *   **COCO-SSD Head Estimation**: As a fail-safe, the engine uses object detection to find "persons" and intelligently estimates the head region even if the face itself is partially occluded.
*   **Body Segmentation**:
    *   Utilizes **BodyPix** to generate a real-time pixel-perfect mask of human figures for natural-looking blurring.
*   **OCR & Text Heuristics**:
    *   Uses **Tesseract.js** to extract text. A custom regex engine identifies sensitive patterns like emails, phone numbers, and license plate sequences.

### 2. 🛡️ Privacy-First Architecture
*   **100% Client-Side**: All AI models (TensorFlow.js) are loaded and executed directly in your browser.
*   **No Server Uploads**: Images stay on your local machine. Ideal for confidential documents or personal photos.

### 3. 🔥 "Vibe Coding" & Modern Aesthetics
*   **Glassmorphism**: Semi-transparent backgrounds with `backdrop-filter: blur(10px)` and white borders for a premium, futuristic look.
*   **Interactive Design**: Custom controls and smooth CSS transitions provide a responsive feel.

### 4. 🛠️ Technical Fixes & Optimizations
*   **Parallelism**: All detection models run in parallel using `Promise.all` to reduce processing time.
*   **IoU De-duplication**: Implemented an **Intersection over Union (IoU)** algorithm to merge overlapping detection boxes into clean regions.
*   **Build Optimization**: Custom asset pipeline management to ensure high performance and reliability across different environments.

---

## 📸 Screenshots

*(Add your awesome screenshots here)*

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/AbhayPotle/AI-ERASER.git
    cd AI-ERASER
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

---

## 🔮 Roadmap

- [ ] Video redaction support
- [ ] Custom blur shapes and pixelation styles
- [ ] Batch processing for multiple images
- [ ] Mobile app integration

---

## 🤝 Contributing

Contributions are welcome! Start a discussion or open a PR. Let's keep the vibe alive.

## 📄 License

MIT License. Free to use and modify.

---

<p align="center">
  Built with ❤️ and ⚡ by Abhay
</p>
