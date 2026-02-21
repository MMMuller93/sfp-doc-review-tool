# Deployment Guide

This document provides step-by-step instructions for deploying the Private Fund Document Review Tool.

## Architecture Overview

- **Frontend**: Static React app deployed to GitHub Pages
- **Backend**: Node.js/Express API deployed to Railway
- **AI Model**: Google Gemini 3 Flash via API

## Prerequisites

- GitHub account with repository access
- Railway account ([railway.app](https://railway.app))
- Gemini API key from Google AI Studio

---

## Frontend Deployment (GitHub Pages)

### 1. Prepare Repository

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`.

### 2. Enable GitHub Pages

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**:
   - Source: **GitHub Actions**
4. Save the settings

### 3. Configure Custom Domain (Optional)

The `CNAME` file is configured for `tools.strategicfundpartners.com`.

To use a custom domain:
1. Update `frontend/public/CNAME` with your domain
2. Configure DNS:
   - Add a CNAME record pointing to `<username>.github.io`
   - Or A records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

### 4. Deploy

Push to the `main` branch:

```bash
git push origin main
```

The workflow will automatically:
- Install dependencies
- Build the frontend
- Deploy to GitHub Pages

### 5. Verify Deployment

Visit your GitHub Pages URL (found in repository Settings → Pages).

---

## Backend Deployment (Railway)

### 1. Create Railway Project

1. Log in to [Railway](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose this repository
5. Railway will auto-detect the Express app

### 2. Configure Environment Variables

In Railway project settings, add:

```
GEMINI_API_KEY=<your-gemini-api-key>
PORT=3001
NODE_ENV=production
```

**To get a Gemini API key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

### 3. Configure Build Settings

Railway should auto-detect the build configuration from `railway.json`, but verify:

- **Root Directory**: `/backend`
- **Build Command**: Auto-detected by Nixpacks
- **Start Command**: `node src/index.js`

### 4. Update CORS Origins

Once deployed, update `backend/src/index.js` to include your production frontend URL:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://tools.strategicfundpartners.com',  // Your GitHub Pages URL
  ],
  credentials: true
}));
```

Commit and push this change.

### 5. Deploy

Railway will automatically deploy on push to `main`.

**Manual deployment:**
1. Go to your Railway project
2. Click **Deployments**
3. Click **Deploy**

### 6. Get Backend URL

After deployment:
1. Go to **Settings** → **Domains**
2. Railway provides a URL like: `<project-name>.up.railway.app`
3. Copy this URL

### 7. Update Frontend API Endpoint

Update `frontend/src/components/DocumentUpload.tsx`:

```typescript
const response = await fetch('https://<your-railway-url>/api/upload/analyze', {
  method: 'POST',
  body: formData,
});
```

Replace `http://localhost:3001` with your Railway URL.

Commit, push, and GitHub Actions will redeploy the frontend.

---

## Environment Variables Reference

### Frontend
- No environment variables needed (static site)

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | API key for Google Gemini |
| `PORT` | No | Port number (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |

---

## Verification Checklist

### Frontend
- [ ] Site loads at GitHub Pages URL
- [ ] Landing page displays correctly
- [ ] Mobile responsive (test on phone or DevTools)
- [ ] No console errors

### Backend
- [ ] Railway deployment successful
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] CORS configured for production frontend
- [ ] Environment variables set correctly

### End-to-End
- [ ] Upload a test PDF/DOCX
- [ ] Analysis completes successfully
- [ ] Results display correctly
- [ ] Export to Word works
- [ ] Export to JSON works

---

## Troubleshooting

### Frontend Issues

**Build fails in GitHub Actions:**
- Check `package.json` dependencies
- Verify `vite.config.ts` is correct
- Check workflow logs in Actions tab

**Site loads but blank page:**
- Check browser console for errors
- Verify Vite base path configuration
- Check that dist/ was built correctly

### Backend Issues

**Railway deployment fails:**
- Check build logs in Railway dashboard
- Verify `package.json` has correct start script
- Ensure all dependencies are in `dependencies`, not `devDependencies`

**CORS errors:**
- Verify frontend URL is in CORS origins list
- Check that Railway deployment is live
- Ensure protocol matches (https/https)

**Gemini API errors:**
- Verify API key is set correctly in Railway
- Check API key hasn't expired or hit quota
- Test API key with curl:
  ```bash
  curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY"
  ```

**Rate limiting:**
- Implement request throttling if needed
- Consider upgrading Gemini API quota

---

## Cost Estimates

### GitHub Pages
- **Free** for public repositories

### Railway
- **Starter Plan**: $5/month (500 hours of execution)
- **Pro Plan**: $20/month (includes custom domains, more resources)

### Gemini API
- **Free tier**: 60 requests/minute
- **Paid**: ~$0.50 per analysis (assuming 50k tokens input, 10k output)
  - 100 analyses/month ≈ $50
  - 1000 analyses/month ≈ $500

---

## Monitoring

### Frontend (GitHub Pages)
- Check GitHub Actions for build status
- Monitor Google Analytics (if configured)

### Backend (Railway)
- Railway provides:
  - CPU and memory usage
  - Request logs
  - Error logs
  - Deployment history

### Recommended Monitoring
- Set up Railway webhooks for deployment notifications
- Monitor Gemini API usage in Google Cloud Console
- Track costs in Railway dashboard

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables only
2. **Enable rate limiting** - Already configured in backend
3. **Monitor API usage** - Watch for unusual spikes
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Use HTTPS only** - Both GitHub Pages and Railway enforce this

---

## Rollback Procedure

### Frontend
1. Go to GitHub Actions
2. Find last successful deployment
3. Re-run that workflow

Or:
```bash
git revert <commit-hash>
git push origin main
```

### Backend
1. Go to Railway project
2. Click **Deployments**
3. Find last working deployment
4. Click **Redeploy**

---

## Support

For issues:
1. Check deployment logs
2. Review this documentation
3. Test locally first
4. Check Railway/GitHub status pages
