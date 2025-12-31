# Quick Deployment Checklist

## ✅ Completed
- [x] GitHub repository created: https://github.com/MMMuller93/sfp-doc-review-tool
- [x] Code pushed to GitHub
- [x] GitHub Actions workflow configured for GitHub Pages
- [x] CNAME file created for `tools.strategicfundpartners.com`
- [x] Railway configuration file created (railway.json)
- [x] Backend .env configured with Gemini API key locally
- [x] SFP-2 contact form visibility fixed and deployed
- [x] Repository made public for GitHub Pages
- [x] Git history cleaned (no exposed keys)

## 🚀 Next Steps

### 1. Deploy Backend to Railway (5 minutes)

1. **Login to Railway**
   - Go to https://railway.app
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `MMMuller93/sfp-doc-review-tool`
   - Railway will auto-detect the backend configuration

3. **Set Environment Variable**
   - In Railway dashboard, go to your service
   - Click "Variables" tab
   - Add variable: `GEMINI_API_KEY` with your API key from backend/.env
   - Click "Deploy"

4. **Get Railway URL**
   - Once deployed, copy the URL (e.g., `https://your-project.up.railway.app`)

### 2. Update Frontend API Endpoint

1. **Edit DocumentUpload.tsx**
   - File: `frontend/src/components/DocumentUpload.tsx`
   - Line 115: Change from:
     ```typescript
     const response = await fetch('http://localhost:3001/api/upload/analyze', {
     ```
   - To (replace with your Railway URL):
     ```typescript
     const response = await fetch('https://your-project.up.railway.app/api/upload/analyze', {
     ```

2. **Commit and push**
   ```bash
   git add frontend/src/components/DocumentUpload.tsx
   git commit -m "feat: Update API endpoint to Railway production URL"
   git push
   ```

### 3. Verify GitHub Pages Deployment

- GitHub Actions will automatically deploy on push
- Check: https://github.com/MMMuller93/sfp-doc-review-tool/actions
- Site will be live at: `https://mmuller93.github.io/sfp-doc-review-tool`

### 4. Configure Custom Domain (Optional)

1. **In Your DNS Provider**
   - Add CNAME record:
     - Name: `tools`
     - Value: `mmuller93.github.io`

2. **In GitHub Pages Settings**
   - Go to: https://github.com/MMMuller93/sfp-doc-review-tool/settings/pages
   - Custom domain: `tools.strategicfundpartners.com`
   - Check "Enforce HTTPS" (after DNS propagates)

### 5. Test Deployment

1. **Visit the Site**
   - `https://mmuller93.github.io/sfp-doc-review-tool`
   - Or: `https://tools.strategicfundpartners.com` (after DNS setup)

2. **Test Upload**
   - Upload a test PDF/DOCX
   - Select role (GP or LP)
   - Click "Analyze Document"
   - Verify analysis completes

3. **Complete Testing Features**
   - feat-028: End-to-end test with real side letter
   - feat-029: Test prompt injection resistance
   - feat-030: Compare GP vs LP analysis outputs

## 🔗 Quick Links

- **Repository**: https://github.com/MMMuller93/sfp-doc-review-tool
- **Railway**: https://railway.app/dashboard
- **GitHub Actions**: https://github.com/MMMuller93/sfp-doc-review-tool/actions
- **GitHub Pages Settings**: https://github.com/MMMuller93/sfp-doc-review-tool/settings/pages

## ⚠️ Security Notes

- API key is ONLY in `backend/.env` (gitignored, never committed)
- Use Railway environment variables for production
- Frontend cannot access API key (backend only)
- CORS configured for specific domains only

## ✨ After Deployment

Update features.json to mark feat-028, feat-029, feat-030 as complete after testing.

**Final Status: 30/30 features (100%)** 🎉
