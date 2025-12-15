# 🚀 Deployment Guide

## Architecture

- **Frontend**: Netlify (Static Next.js site)
- **Backend API**: Netlify Serverless Functions (powered by AWS Lambda)
- **Image Processing**: Sharp (universal format support)

---

## 📦 Prerequisites

1. GitHub account with this repo
2. Netlify account (free tier)

---

## 🎨 Netlify Deployment (Full Stack)

### Step 1: Connect GitHub

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository

### Step 2: Configure Build

Netlify auto-detects `netlify.toml`, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Functions directory**: `.netlify/functions-internal` (auto-configured)

### Step 3: Set Environment Variables (Optional)

Add in Netlify dashboard under **Site settings** → **Environment variables**:

```bash
# Optional: Restrict CORS (leave empty for development)
ALLOWED_ORIGIN = https://your-site-name.netlify.app

# Optional: Set Node version (default is 18.x)
NODE_VERSION = 18
```

### Step 4: Deploy

- Click **Deploy site**
- Wait 3-5 minutes for build
- Note your site URL: `https://visual-image-comparer.netlify.app`

### Step 5: Verify Deployment

Your API routes are automatically deployed as serverless functions:

```bash
# Test health endpoint
curl https://visual-image-comparer.netlify.app/api/health

# Expected response:
{
  "status": "ok",
  "imageProcessing": {
    "library": "sharp",
    "available": true,
    "version": "0.33.5",
    "supportedFormats": ["PNG", "JPEG", "WebP", "GIF", "AVIF", "TIFF", "SVG"]
  },
  "comparison": {
    "library": "pixelmatch",
    "algorithm": "pixel-by-pixel"
  }
}
```

---

## ✅ Testing

### Test 1: Health Check

```bash
curl https://your-site-name.netlify.app/api/health
```

### Test 2: Image Comparison (Browser)

```javascript
// Open browser console on your Netlify site
fetch('/api/compare-images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    baseImageSource: 'https://i.sstatic.net/lWUlB.jpg',
    actualImageSource: 'https://i.sstatic.net/gz9Kf.jpg',
    threshold: 5,
    options: { output: { includeMetadata: true } }
  })
})
.then(r => r.json())
.then(console.log);
```

### Test 3: Frontend Upload

1. Open `https://visual-image-comparer.netlify.app`
2. Upload two images (supports PNG, JPEG, WebP, GIF, SVG, AVIF, TIFF)
3. Click "Compare Images"
4. View difference percentage and diff overlay

---

## 🐛 Troubleshooting

### Build Fails: "sharp" Installation Error

**Error**: `Error: Cannot find module 'sharp'`

**Fix**:

1. Check Netlify build logs
2. Ensure `netlify.toml` includes `external_node_modules = ["sharp"]`
3. Verify `package.json` has `sharp@^0.33.5` in dependencies
4. Clear Netlify cache: **Site settings** → **Build & deploy** → **Clear cache and retry deploy**

### Function Timeout

**Error**: `Task timed out after 10.00 seconds`

**Fix**:

1. Netlify free tier has 10-second function timeout
2. Reduce image sizes or enable aggressive resizing:

   ```json
   { "options": { "resize": { "width": 1280, "height": 720 } } }
   ```

3. Use WebP format for smaller files:

   ```json
   { "options": { "output": { "format": "webp" } } }
   ```

### CORS Errors (Development)

**Error**: `Access-Control-Allow-Origin` blocked

**Fix**:

1. CORS is auto-handled by Next.js API routes
2. For custom domains, set `ALLOWED_ORIGIN` environment variable
3. Default is `*` (allows all origins)

### Cold Start Delay

**Symptom**: First API request takes 3-5 seconds

**Explanation**: Serverless functions "wake up" on first request (normal behavior)

**Mitigation** Use Netlify Pro for faster cold starts and Or keep functions warm with scheduled pings

---

## 💰 Cost

### Netlify Free Tier

- ✅ **Bandwidth**: 100GB/month
- ✅ **Serverless Functions**: 125K invocations/month
- ✅ **Build Minutes**: 300 minutes/month
- ✅ **Sites**: Unlimited

**Total Cost**: $0/month! 🎉

### Usage Estimates

- ~10K image comparisons/month within free tier
- Average comparison takes <1 second
- No idle server costs (pay per use)

### Upgrade If Needed

- **Netlify Pro** ($19/month): 1TB bandwidth, 1M function invocations

---

## 🔄 Continuous Deployment

1. Push to `main` branch on GitHub
2. Netlify automatically deploys (both frontend + API)
3. Wait ~3-5 minutes for rebuild
4. Changes are live!

### Preview Deployments

- Every pull request gets its own preview URL
- Test changes before merging to `main`
- Preview includes both frontend and API functions

---

## 🆘 Need Help?

### Debug Checklist

1. **Build Logs**: Netlify Dashboard → Site → Deploys → Click latest deploy
2. **Function Logs**: Netlify Dashboard → Functions → Click function → View logs
3. **Browser Console**: F12 → Console tab (frontend errors)
4. **Health Check**: `curl https://your-site.netlify.app/api/health`

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Node version, clear cache |
| Function errors | Check function logs in Netlify |
| Image upload fails | Check file size (<10MB recommended) |
| Slow comparison | Enable resize, use smaller images |

---

## 🚀 Advanced Configuration

### Custom Domain

1. **Netlify Dashboard** → **Domain settings** → **Add custom domain**
2. Update DNS records (Netlify provides instructions)
3. SSL certificate auto-provisioned

### Performance Optimization

```toml
# netlify.toml
[functions]
node_bundler = "esbuild"  # Faster bundling
external_node_modules = ["sharp"]  # Don't bundle native modules

[[headers]]
for = "/api/*"
[headers.values]
  Cache-Control = "public, max-age=0, must-revalidate"
```

### Environment-Specific Config

```bash
ALLOWED_ORIGIN = *
NODE_ENV = production
```

---

## 📊 Monitoring

### Netlify Analytics

1. Enable in Dashboard → Analytics
2. Track function invocations, errors, duration
3. Monitor bandwidth usage

### Health Check Monitoring

Use services like UptimeRobot to ping `/api/health` every 5 minutes:

```bash
https://visual-image-comparer.netlify.app/api/health
```

---

## 🔐 Security

### API Rate Limiting (Recommended)

Add to `src/app/api/compare-images/route.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### Environment Variables

Never commit:

- API keys
- Secret tokens
- Database credentials

Always use Netlify environment variables!

---

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch)
