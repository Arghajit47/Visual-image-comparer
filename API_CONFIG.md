# 🎛️ API Configuration Guide

## Overview

The `/api/compare-images` endpoint supports extensive configuration options for image comparison.

---

## 📋 Request Body Structure

```json
{
  "baseImageSource": "data:image/png;base64,..." or "https://...",
  "actualImageSource": "data:image/png;base64,..." or "https://...",
  "threshold": 5,
  "options": {
    // See sections below
  }
}
```

---

## 🎨 Configuration Options

### 1. **Pixelmatch Algorithm** (`options.pixelmatch`)

Controls pixel comparison sensitivity and visualization.

> **⚠️ Important**: All pixelmatch options are **optional**. Only include options you want to customize. Omitting options uses pixelmatch defaults.

```json
{
  "options": {
    "pixelmatch": {
      "threshold": 0.1,          // Color difference threshold (0-1), default: 0.1
      "includeAA": false,         // Include anti-aliased pixels, default: false
      "alpha": 0.1,               // Opacity of unchanged pixels (0-1), optional
      "diffColor": [255, 0, 255], // RGB array for diff highlight, optional
      "aaColor": [255, 255, 0],   // RGB array for AA pixels, optional
      "diffColorAlt": [0, 255, 0],// Alternative diff color RGB, optional
      "diffMask": false           // Show only differences, optional
    }
  }
}
```

**Parameter Details:**

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `threshold` | number | 0.0-1.0 | 0.1 | Matching threshold (lower = stricter) |
| `includeAA` | boolean | - | false | Include anti-aliased pixels in diff |
| `alpha` | number | 0.0-1.0 | - | Blending opacity (0=invisible, 1=opaque) |
| `diffColor` | [R,G,B] | 0-255 each | [255,0,0] | Main diff highlight color |
| `aaColor` | [R,G,B] | 0-255 each | [255,255,0] | Anti-aliasing pixel color |
| `diffColorAlt` | [R,G,B] | 0-255 each | - | Alternative diff color |
| `diffMask` | boolean | - | false | Show only diffs (black background) |

**Examples:**

```bash
# High sensitivity (detect tiny differences)
curl -X POST http://localhost:3000/api/compare-images -d '{
  "baseImageSource": "...",
  "actualImageSource": "...",
  "options": { "pixelmatch": { "threshold": 0.01 } }
}'

# Highlight differences in red
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": { "pixelmatch": { "diffColor": [255, 0, 0] } }
}'

# Custom colors with transparency
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": { 
    "pixelmatch": { 
      "diffColor": [255, 0, 255],
      "aaColor": [255, 255, 0],
      "alpha": 0.2
    } 
  }
}'

# Strict comparison (ignore anti-aliasing)
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": { 
    "pixelmatch": { 
      "threshold": 0.05,
      "includeAA": false
    } 
  }
}'
```

**💡 Best Practices:**

- **UI Testing**: Use `threshold: 0.01` + `includeAA: false` for strict pixel-perfect matching
- **Screenshot Comparison**: Use `threshold: 0.1` + `includeAA: true` to ignore font rendering differences
- **Photo Comparison**: Use `threshold: 0.2` for JPEG compression artifacts
- **Debugging**: Use `diffMask: true` to see only differences on black background

**⚠️ Common Pitfalls:**

- ❌ **Don't** pass `undefined` values - omit the property entirely
- ❌ **Don't** use string colors like `"#ff00ff"` - use RGB arrays `[255, 0, 255]`
- ✅ **Do** omit optional parameters if you want defaults
- ✅ **Do** validate RGB values are 0-255

---

### 2. **Image Resizing** (`options.resize`)

Auto-resize images to match dimensions before comparison.

```json
{
  "options": {
    "resize": {
      "enabled": true, // Auto-resize (default: true)
      "strategy": "fill", // 'fit' | 'fill' | 'cover' | 'contain'
      "width": 1920, // Force specific width
      "height": 1080, // Force specific height
      "maintainAspectRatio": true
    }
  }
}
```

**Examples:**

```bash
# Disable auto-resize (strict dimension matching)
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": { "resize": { "enabled": false } }
}'

# Force both images to 1920x1080
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": {
    "resize": {
      "width": 1920,
      "height": 1080,
      "strategy": "fill"
    }
  }
}'
```

---

### 3. **Output Format** (`options.output`)

Control diff image format and response data.

```json
{
  "options": {
    "output": {
      "format": "png", // 'png' | 'jpeg' | 'webp'
      "includeOriginals": false, // Include processed originals
      "includeDiffBounds": true, // Bounding box of differences
      "includeMetadata": true // Image sizes, processing time
    }
  }
}
```

**Examples:**

```bash
# Get detailed metadata
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": {
    "output": {
      "includeMetadata": true,
      "includeDiffBounds": true
    }
  }
}'

# Response:
{
  "differencePercentage": 12.5,
  "status": "Failed",
  "diffImageUrl": "...",
  "metadata": {
    "baseImage": { "width": 1920, "height": 1080, "size": 125000 },
    "actualImage": { "width": 1920, "height": 1080, "size": 130000 },
    "comparison": {
      "totalPixels": 2073600,
      "diffPixels": 259200,
      "processingTime": 1250,
      "algorithm": "pixelmatch"
    }
  },
  "diffBounds": {
    "left": 100,
    "top": 50,
    "right": 500,
    "bottom": 300,
    "width": 401,
    "height": 251
  }
}
```

---

### 4. **Quality Settings** (`options.quality`)

Adjust output image quality.

```json
{
  "options": {
    "quality": {
      "png": 6, // Compression level 0-9 (higher = smaller file)
      "jpeg": 90, // Quality 1-100
      "webp": 80 // Quality 1-100
    }
  }
}
```

**Examples:**

```bash
# High quality JPEG diff
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": {
    "output": { "format": "jpeg" },
    "quality": { "jpeg": 95 }
  }
}'

# Small file size PNG
curl -X POST http://localhost:3000/api/compare-images -d '{
  "options": {
    "output": { "format": "png" },
    "quality": { "png": 9 }
  }
}'
```

---

## 🎯 Common Use Cases

### UI/UX Testing (Strict)

```json
{
  "threshold": 0.1,
  "options": {
    "pixelmatch": {
      "threshold": 0.01,
      "includeAA": false
    },
    "resize": { "enabled": false },
    "output": { "includeDiffBounds": true }
  }
}
```

### Screenshot Comparison (Flexible)

```json
{
  "threshold": 5,
  "options": {
    "pixelmatch": {
      "threshold": 0.2,
      "includeAA": true
    },
    "resize": { "enabled": true },
    "output": { "includeMetadata": true }
  }
}
```

### Performance Optimized

```json
{
  "options": {
    "resize": { "width": 1280, "height": 720 },
    "output": { "format": "webp" },
    "quality": { "webp": 60 }
  }
}
```

---

## 📊 Full Example

```bash
curl -X POST http://localhost:3000/api/compare-images \
  -H "Content-Type: application/json" \
  -d '{
    "baseImageSource":"https://i.sstatic.net/lWUlB.jpg",
    "actualImageSource":"https://i.sstatic.net/gz9Kf.jpg",
    "threshold": 5,
    "options": {
      "pixelmatch": {
        "threshold": 0.1,
        "diffColor": [255, 0, 255],
        "includeAA": false
      },
      "resize": {
        "enabled": true,
        "strategy": "fill"
      },
      "output": {
        "format": "png",
        "includeMetadata": true,
        "includeDiffBounds": true
      },
      "quality": {
        "png": 6
      }
    }
  }'
```

---

## 📖 Response Schema

```typescript
{
  differencePercentage: number;    // 0-100
  status: 'Passed' | 'Failed';
  diffImageUrl: string | null;     // Base64 data URI
  error: string | null;

  // Optional fields (if requested)
  metadata?: {
    baseImage: { width, height, size };
    actualImage: { width, height, size };
    comparison: { totalPixels, diffPixels, processingTime, algorithm };
  };
  diffBounds?: { left, top, right, bottom, width, height };
  processedImages?: { baseImageUrl, actualImageUrl };
}
```

---

## 🖼️ Supported Image Formats

| Format   | Extensions  | Support      | Notes                 |
| -------- | ----------- | ------------ | --------------------- |
| **PNG**  | .png        | ✅ Native    | Lossless, best for UI |
| **JPEG** | .jpg, .jpeg | ✅ Native    | Lossy, photos         |
| **WebP** | .webp       | ✅ Native    | Modern, efficient     |
| **GIF**  | .gif        | ✅ Native    | Animated support      |
| **AVIF** | .avif       | ✅ Native    | Next-gen format       |
| **TIFF** | .tiff, .tif | ✅ Native    | Professional          |
| **SVG**  | .svg        | ✅ Converted | Vector to raster      |
| **HEIF** | .heic       | ✅ Native    | iOS photos            |

---

## 🚀 Performance Tips

1. **Resize large images**: Use `options.resize` to reduce dimensions
2. **Use WebP output**: Smaller files, faster transfer
3. **Lower PNG compression**: Use `quality.png: 3` for speed
4. **Enable early exit**: Stop comparison when threshold exceeded
5. **Limit image size**: Keep under 4096x4096 for best performance

---

## 🗜️ Automatic Image Compression

### Overview

The API **automatically compresses images > 3MB** to prevent Netlify's 6MB payload limit from causing 500 errors.

### Compression Strategy

When an image exceeds 3MB, the API applies **progressive compression** in 3 steps:

#### **Step 1: Quality Compression**

Format-specific compression is applied first:

| Format | Compression Applied |
|--------|---------------------|
| **JPEG/JPG** | Quality 75% + Progressive encoding |
| **PNG** | Compression level 9 + Adaptive filtering |
| **WebP** | Quality 70% |
| **Others** | Convert to JPEG at 75% quality |

#### **Step 2: Resize to 2048px** (if still > 3MB)

- Maintains aspect ratio (`fit: 'inside'`)
- Never enlarges smaller images (`withoutEnlargement: true`)
- Reapplies format-specific compression

#### **Step 3: Resize to 1024px** (if still > 3MB)

- Further dimension reduction
- Lower quality:
  - JPEG: 70%
  - WebP: 65%
  - PNG: Compression level 9

### Example Flow

```
Input: 8MB PNG image
↓
Step 1: PNG compression (level 9) → 5.2MB (still > 3MB)
↓
Step 2: Resize to 2048px + compress → 2.5MB ✅
↓
Use compressed image for comparison
```

### Netlify Limits

| Limit Type | Free Tier | Pro Tier | Description |
|------------|-----------|----------|-------------|
| **Request Size** | 6MB | 6MB | Total payload size |
| **Function Timeout** | 10s | 26s | Max execution time |
| **Memory** | 1GB | 1GB | RAM limit |
| **Image Data** | 6MB | 6MB | Per image (base64) |

### When Compression Fails

If images are **still > 6MB after automatic compression**, you'll receive:

```json
{
  "differencePercentage": null,
  "status": null,
  "diffImageUrl": null,
  "error": "Images are too large (6.8MB) even after automatic compression. Netlify has a 6MB limit. Please use smaller images."
}
```

**HTTP Status**: `413 Payload Too Large`

### Compression Logs

The API logs compression steps for debugging:

```log
[API] Image size 8.5MB > 3MB, compressing...
[API] Still 5.2MB after compression, resizing to 2048px...
[API] Compression complete: 8.5MB → 2.5MB
```

### Best Practices

✅ **Do:**
- Send images < 3MB when possible (no compression needed)
- Use JPEG for photos (better compression)
- Pre-resize images on client-side for faster API response
- Monitor compression logs to optimize image sizes

❌ **Don't:**
- Send images > 10MB (likely to fail even with compression)
- Use uncompressed BMP/TIFF formats
- Assume compression maintains exact pixel accuracy (minor quality loss)

### Disabling Auto-Compression

**Auto-compression cannot be disabled** as it's a safety feature to prevent 500 errors on Netlify.

If you need pixel-perfect comparison without compression, ensure both images are < 3MB.

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Status | Cause | Solution |
|------|--------|-------|----------|
| **200** | Success | Comparison completed | - |
| **400** | Bad Request | Invalid input (missing images, bad threshold) | Check request body format |
| **413** | Payload Too Large | Images > 6MB even after compression | Use smaller images |
| **500** | Internal Server Error | Unexpected error (decode failure, memory) | Check image format, reduce size |
| **504** | Gateway Timeout | Processing > 10s (free) or > 26s (pro) | Reduce image dimensions |

### Common Errors

#### 1. **"Request size exceeds Netlify's 6MB limit"**

```json
{
  "error": "Request size (7.2MB) exceeds Netlify's 6MB limit. Please use smaller images."
}
```

**Status**: 413  
**Cause**: Total request payload > 6MB  
**Solution**: 
- Reduce image dimensions before upload
- Use JPEG instead of PNG
- Compress images client-side

#### 2. **"Images too large even after automatic compression"**

```json
{
  "error": "Images are too large (6.8MB) even after automatic compression. Netlify has a 6MB limit. Please use smaller images."
}
```

**Status**: 413  
**Cause**: Images > 6MB after 3-step compression  
**Solution**:
- Use images < 5MB initially
- Pre-compress on client-side
- Resize to max 1920x1080 before sending

#### 3. **"Request timed out"**

```json
{
  "error": "Request timed out. Images might be too large to process. Please try smaller images."
}
```

**Status**: 504  
**Cause**: Processing exceeds Netlify timeout (10s free, 26s pro)  
**Solution**:
- Reduce image dimensions (e.g., 1920x1080)
- Use JPEG for faster processing
- Upgrade to Netlify Pro for 26s timeout

#### 4. **"Server ran out of memory"**

```json
{
  "error": "Server ran out of memory processing images. Please use smaller images."
}
```

**Status**: 500  
**Cause**: Images consume > 1GB RAM during processing  
**Solution**:
- Use images < 4096x4096
- Enable auto-resize in options
- Reduce image dimensions

#### 5. **"Invalid image format"**

```json
{
  "error": "Failed to decode image: Input buffer contains unsupported image format. Supported formats: PNG, JPEG, WebP, GIF, AVIF, TIFF, SVG."
}
```

**Status**: 400  
**Cause**: Unsupported format (e.g., BMP, ICO) or corrupted data  
**Solution**:
- Convert to PNG/JPEG
- Validate base64 encoding
- Check data URI format: `data:image/png;base64,...`

---

## 🐛 Troubleshooting

### Error: "is not iterable (cannot read property undefined)"

**Cause**: Invalid pixelmatch options (e.g., `undefined` passed for color arrays)

**Solution**: Only include options you want to set, omit optional ones

```json
// ❌ Bad
{
  "options": {
    "pixelmatch": {
      "threshold": 0.1,
      "diffColor": undefined  // ❌ Don't do this!
    }
  }
}

// ✅ Good
{
  "options": {
    "pixelmatch": {
      "threshold": 0.1
      // Just omit diffColor!
    }
  }
}

// ✅ Also good (custom color)
{
  "options": {
    "pixelmatch": {
      "threshold": 0.1,
      "diffColor": [255, 0, 255]  // ✅ RGB array
    }
  }
}
```

### Error: "Image dimensions don't match"

**Cause**: Images have different sizes and auto-resize is disabled

**Solution**: Enable auto-resize or provide same-size images

```json
{
  "options": {
    "resize": { "enabled": true }
  }
}
```

### Error: "Invalid image source"

**Cause**: Image source is not a valid data URI or HTTP(S) URL

**Valid formats:**

- ✅ `data:image/png;base64,iVBORw0KG...`
- ✅ `https://example.com/image.jpg`
- ❌ `./local/file.png` (file paths not supported)
- ❌ `src/app/favicon.ico` (relative paths not supported)

**Solution**: Convert local files to base64 or serve via HTTP

### Error: "Failed to decode image"

**Cause**: Corrupted image data or unsupported format

**Solution**: Verify image is valid and in supported format (PNG, JPEG, WebP, GIF, SVG, AVIF, TIFF)

### Error: "Task timed out after 10.00 seconds"

**Cause**: Image processing exceeded Netlify function timeout (10s on free tier)

**Solution**: Reduce image size or enable aggressive resizing

```json
{
  "options": {
    "resize": {
      "width": 1280,
      "height": 720
    },
    "output": { "format": "webp" },
    "quality": { "webp": 60 }
  }
}
```

---

## 🔗 Related Documentation

- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

---

## 🆘 Support

**Need help?**

- Open an issue on [GitHub](https://github.com/YOUR_USERNAME/visual-image-comparer/issues)
- Check [Discussions](https://github.com/YOUR_USERNAME/visual-image-comparer/discussions) for Q&A
- Review existing [Issues](https://github.com/YOUR_USERNAME/visual-image-comparer/issues?q=is%3Aissue) for similar problems

**Before opening an issue:**

1. Check the troubleshooting section above
2. Test with `/api/health` endpoint
3. Include example request body
4. Share error messages from browser console
