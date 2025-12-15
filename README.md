# 🎨 Visual Image Comparer

## A powerful pixel-by-pixel image comparison tool with advanced visual diff overlay

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![ResembleJS](https://img.shields.io/badge/ResembleJS-5.0-orange)](https://github.com/rsmbl/Resemble.js)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Live Demo](https://visual-test.netlify.app/) • [Features](#-features) • [Quick Start](#-quick-start) • [API Config](API_CONFIG.md) • [Deployment](DEPLOYMENT.md)

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

> **📚 New to the project?** Check out [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide!

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

> **🎛️ Full API Documentation**: See [API_CONFIG.md](API_CONFIG.md) for all configuration options!

```bash
POST /api/compare-images
Content-Type: application/json

{
  "baseImageSource": "data:image/png;base64,...",
  "actualImageSource": "https://example.com/image.png",
  "threshold": 5,
  "options": {
    "pixelmatch": {
      "threshold": 0.1,
      "diffColor": [255, 0, 255]
    },
    "resize": {
      "enabled": true,
      "strategy": "fill"
    },
    "output": {
      "format": "png",
      "includeMetadata": true
    }
  }
}
```

**Response:**

```json
{
  "differencePercentage": 2.45,
  "status": "Passed",
  "diffImageUrl": "data:image/png;base64,...",
  "metadata": {
    "baseImage": { "width": 1920, "height": 1080 },
    "comparison": { "totalPixels": 2073600, "diffPixels": 50803 }
  },
  "error": null
}
```

---

## 🌐 Deployment

> **📖 Complete Guide**: See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions!

### Single-Platform Deploy (Netlify)

**Frontend + Serverless API in one deployment!**

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Netlify
# Dashboard → New site → Import from Git

# 3. Auto-configured via netlify.toml
# Build: npm run build
# Publish: .next
# Functions: Automatic (Next.js API routes)

# 4. Deploy! ✅
```

**Features:**

- ✅ Zero-config serverless functions
- ✅ Automatic HTTPS
- ✅ Preview deployments for PRs
- ✅ 100GB bandwidth/month (free)
- ✅ Support for all image formats (PNG, JPEG, WebP, GIF, SVG, AVIF, TIFF)

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
├── netlify.toml                      # Netlify config (serverless)
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── API_CONFIG.md                     # 🎛️ API configuration guide
├── DEPLOYMENT.md                     # 🚀 Deployment instructions
└── README.md                         # You are here!
```

---

## 🔧 Configuration Options

> **📖 Full Documentation**: See [API_CONFIG.md](API_CONFIG.md) for comprehensive configuration guide!

### Quick Reference

| Category | Options | Description |
|----------|---------|-------------|
| **Pixelmatch** | `threshold`, `diffColor`, `includeAA` | Comparison algorithm settings |
| **Resize** | `enabled`, `strategy`, `width`, `height` | Auto-resize configuration |
| **Output** | `format`, `includeMetadata`, `includeDiffBounds` | Response customization |
| **Quality** | `png`, `jpeg`, `webp` | Output image quality |
| **Performance** | `maxDimension`, `timeout`, `earlyExit` | Performance tuning |

**Example:**

```json
{
  "options": {
    "pixelmatch": { "threshold": 0.1, "diffColor": [255, 0, 255] },
    "resize": { "enabled": true, "strategy": "fill" },
    "output": { "format": "png", "includeMetadata": true }
  }
}
```

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

## 📚 Documentation

- **[README.md](README.md)** - You are here! Project overview and quick start
- **[API_CONFIG.md](API_CONFIG.md)** - Complete API configuration reference
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide

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
