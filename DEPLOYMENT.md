# 🚀 Deployment Guide

## Architecture

- **Frontend**: Netlify (Static Next.js site)
- **Backend API**: Render (Node.js with canvas dependencies)

---

## 📦 Prerequisites

1. GitHub account with this repo
2. Render account (free tier)
3. Netlify account (free tier)

---

## 🔧 Backend Deployment (Render)

### Step 1: Connect GitHub

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository

### Step 2: Configure Service

Render will auto-detect `render.yaml`, but verify:

- **Name**: `visual-image-comparer-api`
- **Runtime**: `Node`
- **Build Command**: `bash render.sh`
- **Start Command**: `npm run start`
- **Plan**: `Free`

### Step 3: Set Environment Variables

Add these in Render dashboard:

ALLOWED_ORIGIN = \* (change to your Netlify URL after frontend deploy)
NODE_ENV = production

### Step 4: Deploy

- Click **Create Web Service**
- Wait 5-10 minutes for build (installing canvas dependencies)
- Note your backend URL: `https://visual-image-comparer-api.onrender.com`

### Step 5: Test Backend

```bash
curl https://your-render-app.onrender.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "canvas": { "available": true, "error": null },
  "nodeVersion": "v22.8.0",
  "platform": "linux",
  "arch": "x64"
}
```

---

## 🎨 Frontend Deployment (Netlify)

### Step 1: Connect GitHub

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository

### Step 2: Configure Build

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Base directory**: (leave empty)

### Step 3: Set Environment Variables

Add in Netlify dashboard under **Site settings** → **Environment variables**:

NEXT_PUBLIC_API_URL = https://your-render-app.onrender.com

### Step 4: Deploy

- Click **Deploy site**
- Wait 2-3 minutes
- Note your frontend URL: `https://your-site-name.netlify.app`

---

## 🔐 Final CORS Configuration

### Update Backend CORS

1. Go back to Render dashboard
2. Find your web service → **Environment**
3. Update `ALLOWED_ORIGIN`:
   ```
   ALLOWED_ORIGIN = https://your-site-name.netlify.app
   ```
4. Save and wait for automatic redeploy

---

## ✅ Testing

### Test Health Check (from browser console on Netlify site)

```javascript
fetch("https://your-render-app.onrender.com/api/health")
  .then((r) => r.json())
  .then(console.log);
```

### Test Image Comparison

1. Open your Netlify site
2. Upload two images
3. Click "Compare Images"
4. Should see difference percentage and diff overlay

---

## 🐛 Troubleshooting

### Canvas Not Available

**Error**: `"canvas": { "available": false }`

**Fix**:

1. Check Render build logs for errors
2. Ensure `render.sh` has execute permissions: `chmod +x render.sh`
3. Verify build command is `bash render.sh` not `npm run build`

### CORS Errors

**Error**: `Access to fetch at '...' from origin '...' has been blocked by CORS`

**Fix**:

1. Check `ALLOWED_ORIGIN` in Render matches exact Netlify URL
2. Don't forget `https://` prefix
3. No trailing slash in URL

### 503 Service Unavailable

**Cause**: Render free tier spins down after inactivity

**Fix**: First request takes 30-60 seconds to wake up (normal behavior)

---

## 📊 Monitoring

- **Render Logs**: https://dashboard.render.com/ → Your service → Logs
- **Netlify Logs**: https://app.netlify.com/ → Your site → Deploys
- **Health Check**: `https://your-render-app.onrender.com/api/health`

---

## 💰 Cost

- **Render Free**: 750 hours/month (enough for hobby project)
- **Netlify Free**: 100GB bandwidth, 300 build minutes/month
- **Total**: $0/month for both! 🎉

---

## 🔄 Future Updates

1. Push to `main` branch on GitHub
2. Both Netlify and Render auto-deploy
3. Wait ~5 minutes for both to rebuild

---

## 🆘 Need Help?

Check:

1. Render build logs
2. Netlify deploy logs
3. Browser console for frontend errors
4. `/api/health` endpoint for backend status
