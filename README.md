# 🎨 Visual Image Comparer

## A powerful pixel-by-pixel image comparison tool with advanced visual diff overlay

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![ResembleJS](https://img.shields.io/badge/ResembleJS-5.0-orange)](https://github.com/rsmbl/Resemble.js)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live Demo](https://visual-test.netlify.app/) • [Features](#-features) • [Quick Start](#-quick-start) • [Deployment](#-deployment)

---

## 📖 Overview

**Visual Image Comparer** is a sophisticated web application that enables precise visual comparison between two images. Built with Next.js and powered by ResembleJS, it provides pixel-level analysis with an interactive diff overlay, similarity percentage calculations, and comprehensive configuration options for various comparison scenarios.

### 🎯 Perfect For

- **UI/UX Testing**: Detect visual regressions in web/mobile interfaces
- **A/B Testing**: Compare design variations side-by-side
- **Screenshot Comparison**: Validate rendering across browsers/devices
- **Quality Assurance**: Automated visual testing in CI/CD pipelines
- **Design Review**: Highlight subtle differences between design iterations
- **Game Development**: Compare textures, sprites, and rendered frames

---

## ✨ Features

### 🔍 Core Capabilities

- **Pixel-Perfect Analysis**: Compare images down to individual pixel differences
- **Visual Diff Overlay**: Interactive color-coded difference highlighting
- **Similarity Percentage**: Precise mismatch calculation (0-100%)
- **Dual Input Methods**: Upload files OR paste image URLs
- **Real-time Preview**: See base, actual, and diff images side-by-side
- **Threshold Control**: Set acceptable difference tolerance (0-100%)
- **Pass/Fail Status**: Automatic comparison verdict based on threshold

### ⚙️ Advanced Configuration

#### **Output Settings**

- **Error Color Customization**: RGB color picker for diff highlighting
- **Error Type**: Choose between flat, movement, or flatDifferenceIntensity
- **Transparency**: Adjust diff overlay opacity (0.0 - 1.0)
- **Large Image Threshold**: Optimize performance for large images
- **Cross-Origin Support**: Handle CORS-protected images

#### **Comparison Options**

- **Scale to Same Size**: Auto-resize images before comparison
- **Ignore Anti-aliasing**: Skip anti-aliasing pixel differences
- **Ignore Colors**: Compare structure only (grayscale)
- **Ignore Alpha Channel**: Exclude transparency from comparison
- **Early Return Threshold**: Stop analysis when threshold exceeded (performance boost)

### 🎨 User Experience

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Mode**: (Coming soon)
- **Drag & Drop**: Upload images effortlessly
- **Image Download**: Export diff results as PNG
- **Reset Functionality**: Clear all inputs and start fresh
- **Tooltips & Help**: User-friendly explanations for all options
- **Loading States**: Visual feedback during processing
- **Error Handling**: Graceful fallbacks with helpful error messages

---

## 🏗️ Architecture

```bash
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Netlify)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js 15.5 + React 18 + TypeScript                │  │
│  │  ├── Client-side ResembleJS (Browser)                │  │
│  │  ├── Shadcn/ui Components                            │  │
│  │  ├── Tailwind CSS                                    │  │
│  │  └── Image Upload & URL Input                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕ HTTPS                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes (Optional Server-side)                   │  │
│  │  ├── /api/health - Health check endpoint            │  │
│  │  └── /api/compare-images - Server comparison        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Render)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js 22.8 + ResembleJS + node-canvas            │  │
│  │  ├── Cairo Graphics Library                          │  │
│  │  ├── CORS-enabled API                                │  │
│  │  └── System Dependencies via render.sh               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 Technology Stack

| Layer               | Technology       | Purpose                              |
| ------------------- | ---------------- | ------------------------------------ |
| **Frontend**        | Next.js 15.5     | React framework with App Router      |
| **UI Library**      | Shadcn/ui        | Accessible component system          |
| **Styling**         | Tailwind CSS     | Utility-first CSS framework          |
| **Image Analysis**  | ResembleJS 5.0   | Pixel comparison engine              |
| **Backend Runtime** | Node.js 22.8     | Server-side JavaScript               |
| **Graphics**        | node-canvas      | Canvas API for server-side rendering |
| **Type Safety**     | TypeScript 5.0   | Static type checking                 |
| **Deployment**      | Netlify + Render | CDN + Backend hosting                |

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0 or yarn >= 1.22.0
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Arghajit47/visual-image-comparer.git
cd visual-image-comparer

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create `.env.local` in the root directory:

```bash
# API Configuration (optional for client-side only)
NEXT_PUBLIC_API_URL=http://localhost:3000

# CORS Configuration (backend)
ALLOWED_ORIGIN=http://localhost:3000

# Node Environment
NODE_ENV=development
```

---

## 💻 Usage

### 1️⃣ **Basic Comparison**

```typescript
// Upload two images or provide URLs
// Click "Compare Images"
// View results: similarity percentage + diff overlay
```

### 2️⃣ **Advanced Configuration**

```typescript
// Expand "Advanced Options" accordion
// Customize error color (default: magenta RGB(255, 0, 255))
// Adjust transparency (default: 0.3)
// Set comparison threshold (default: 0%)
```

### 3️⃣ **API Integration**

```bash
POST /api/compare-images
Content-Type: application/json

{
  "baseImageSource": "data:image/png;base64,...",
  "actualImageSource": "https://example.com/image.png",
  "threshold": 5,
  "options": {
    "errorColor": { "red": 255, "green": 0, "blue": 255 },
    "errorType": "flat",
    "transparency": 0.3,
    "scaleToSameSize": true,
    "ignoreAntialiasing": true
  }
}
```

**Response:**

```json
{
  "differencePercentage": 2.45,
  "status": "Passed",
  "diffImageUrl": "data:image/png;base64,...",
  "error": null
}
```

---

## 🌐 Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete step-by-step guide.

### Quick Deploy Summary

#### **Backend (Render)**

```bash
# Automatic deployment via render.yaml
# Installs canvas dependencies via render.sh
# Exposes /api/health and /api/compare-images
```

#### **Frontend (Netlify)**

```bash
# Build command: npm run build
# Publish directory: .next
# Environment: NEXT_PUBLIC_API_URL
```

---

## 📂 Project Structure

```bash
visual-image-comparer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── compare-images/
│   │   │   │   └── route.ts          # Image comparison endpoint
│   │   │   └── health/
│   │   │       └── route.ts          # Health check endpoint
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui components
│   │   ├── ImageComparer.tsx         # Main comparison component
│   │   └── ImageComparerLoader.tsx   # Client-side loader
│   ├── hooks/                        # Custom React hooks
│   └── lib/
│       └── utils.ts                  # Utility functions
├── .env.example                      # Environment template
├── .env.local                        # Local environment (git-ignored)
├── Dockerfile                        # Docker configuration
├── render.yaml                       # Render deployment config
├── render.sh                         # Canvas dependency installer
├── netlify.toml                      # Netlify config
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
└── README.md                         # You are here!
```

---

## 🔧 Configuration Options

### ResembleJS Options

| Option                 | Type      | Default       | Description                                            |
| ---------------------- | --------- | ------------- | ------------------------------------------------------ |
| `errorColor`           | `{r,g,b}` | `{255,0,255}` | Color for diff highlighting                            |
| `errorType`            | `string`  | `'flat'`      | `'flat'`, `'movement'`, or `'flatDifferenceIntensity'` |
| `transparency`         | `number`  | `0.3`         | Diff overlay opacity (0.0-1.0)                         |
| `largeImageThreshold`  | `number`  | `1200`        | Pixel threshold for performance optimization           |
| `useCrossOrigin`       | `boolean` | `true`        | Enable CORS image loading                              |
| `scaleToSameSize`      | `boolean` | `false`       | Auto-resize images                                     |
| `ignoreAntialiasing`   | `boolean` | `false`       | Ignore anti-aliasing differences                       |
| `ignoreColors`         | `boolean` | `false`       | Compare grayscale only                                 |
| `ignoreAlpha`          | `boolean` | `false`       | Ignore transparency channel                            |
| `returnEarlyThreshold` | `number`  | `0`           | Stop early if mismatch exceeds value                   |

---

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Test health endpoint
curl http://localhost:3000/api/health
```

---

## 🐛 Troubleshooting

### Canvas Dependencies (Render)

**Issue**: `Error: Cannot find module 'canvas'`

**Solution**:

1. Ensure `render.sh` has execute permissions: `chmod +x render.sh`
2. Verify build command in `render.yaml`: `bash render.sh`
3. Check Render logs for system dependency installation

### CORS Errors (Frontend)

**Issue**: `Access-Control-Allow-Origin` blocked

**Solution**:

1. Set `ALLOWED_ORIGIN` in Render to exact Netlify URL
2. Ensure `https://` protocol is included
3. Remove trailing slashes from URLs
4. Check both endpoints have CORS headers

### Large Image Performance

**Issue**: Slow comparison or browser freeze

**Solution**:

1. Enable "Scale to Same Size" option
2. Increase "Large Image Threshold" value
3. Set "Return Early Threshold" to stop at acceptable mismatch
4. Use server-side API for very large images

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[ResembleJS](https://github.com/rsmbl/Resemble.js)** - Powerful image analysis engine
- **[Shadcn/ui](https://ui.shadcn.com/)** - Beautiful component library
- **[Next.js](https://nextjs.org/)** - React framework
- **[Render](https://render.com/)** - Backend hosting
- **[Netlify](https://netlify.com/)** - Frontend hosting

---

## 📞 Support

- 🐛 [Report Bug](https://github.com/Arghajit47/visual-image-comparer/issues)
- 💡 [Request Feature](https://github.com/Arghajit47/visual-image-comparer/issues)
- 📧 Email: [arghajitsingha47@gmail.com](mailto:arghajitsingha47@gmail.com)

---

## 🗺️ Roadmap

- [ ] Dark mode support
- [ ] Batch comparison (multiple image pairs)
- [ ] Comparison history/session management
- [ ] Export comparison reports (PDF/JSON)
- [ ] API rate limiting and authentication
- [ ] Image preprocessing (crop, rotate, filters)
- [ ] Integration with CI/CD platforms
- [ ] WebSocket for real-time comparison status
- [ ] Advanced diff algorithms (SSIM, MSE, PSNR)
- [ ] Browser extension for quick comparisons

---

**Made by [Arghajit Singha](https://github.com/Arghajit47)**

⭐ Star this repo if you find it helpful!
