# QRPilot - Advanced QR Code Generator & Scanner

A modern, feature-rich web application for generating highly customizable QR codes and scanning them with ease. Built with React, Vite, and Tailwind CSS, QRPilot offers a seamless experience for both personal and professional use.

## 🌐 Live Demo

Try the live version of the app here:  
👉 [QRPilot Live](https://sahilkhatkar11.github.io/qrpilot/)

No installation required — just open the link and start using the app instantly.

## 🚀 Features

### 🎨 QR Generation
- **Multiple Types**: Generate QR codes for URLs, WiFi, VCards, WhatsApp, SMS, App Store links, and even Multi-URL "Linktree-style" pages.
- **Custom Templates**: One-click professional templates for social media (Instagram Gradient, Facebook, X, etc.).
- **Deep Customization**: 
  - Custom foreground and background colors.
  - Multiple patterns (Dots, Rounded, Classy, etc.).
  - Stylish frames with custom text.
  - High-quality logo embedding.

### 🔍 Advanced Scanner
- **Real-time Camera**: High-performance scanning using `html5-qrcode`.
- **Image Upload**: Scan QR codes directly from your photo gallery.
- **Robust Detection**: Uses native `BarcodeDetector` API with `jsQR` fallback for maximum compatibility.

### 🛠️ Utilities
- **Scan History**: Keep track of your generated and scanned codes (stored locally).
- **Instant Export**: Download your creations as high-resolution PNG files.
- **Responsive Design**: Fully optimized for Desktop and Mobile views.
- **Dark Mode**: Beautifully crafted dark and light themes.

## 🛠️ Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **QR Engine**: [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) & [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SahilKhatkar11/qr-pilot.git
   cd qr-pilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
To create an optimized production build:
```bash
npm run build
```
The static files will be generated in the `dist/` directory.

## 🌐 Deployment
This app is a pure Client-Side Application (SPA) and can be hosted for free on **GitHub Pages**, **Netlify**, or **Vercel**.

To deploy to GitHub Pages:
1. The repository is already configured with a GitHub Actions workflow in `.github/workflows/deploy.yml`.
2. Push your code to the `main` branch.
3. Go to your repository settings on GitHub, navigate to **Pages**, and under **Build and deployment > Source**, select **GitHub Actions**.
4. The app will be automatically built and deployed.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
