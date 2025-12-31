# Quick Deployment Checklist

## ✅ Completed
- [x] GitHub repository created: https://github.com/MMMuller93/sfp-doc-review-tool
- [x] Code pushed to GitHub
- [x] GitHub Actions workflow configured for GitHub Pages
- [x] CNAME file created for `tools.strategicfundpartners.com`
- [x] Railway configuration file created (railway.json)
- [x] Backend .env configured with Gemini API key
- [x] SFP-2 contact form visibility fixed and deployed

## 🚀 Manual Steps Required

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
   - Add variable:
     ```
     GEMINI_API_KEY=AIzaSyD47h_u5QS50-_LiAYgr2ktSMQ5MSGObu0
     ```
   - Click "Deploy"

4. **Get Railway URL**
   - Once deployed, Railway will provide a URL like: `https://your-project.up.railway.app`
   - Copy this URL

### 2. Update Frontend API Endpoint

1. **Edit DocumentUpload.tsx**
   - File: `frontend/src/components/DocumentUpload.tsx`
   - Line 115: Change from:
     ```typescript
     const response = await fetch('http://localhost:3001/api/upload/analyze', {
     ```
   - To (replace with your actual Railway URL):
     ```typescript
     const response = await fetch('https://your-project.up.railway.app/api/upload/analyze', {
     ```

2. **Commit and push**
   ```bash
   git add frontend/src/components/DocumentUpload.tsx
   git commit -m "feat: Update API endpoint to Railway production URL"
   git push
   ```

### 3. Enable GitHub Pages

1. **Configure GitHub Pages**
   - Go to https://github.com/MMMuller93/sfp-doc-review-tool/settings/pages
   - Under "Build and deployment":
     - Source: "GitHub Actions"
   - Save

2. **Wait for Deployment**
   - GitHub Actions will automatically deploy
   - Check progress: https://github.com/MMMuller93/sfp-doc-review-tool/actions
   - After ~2 minutes, site will be live

### 4. Configure Custom Domain (Optional)

1. **In Your DNS Provider**
   - Add CNAME record:
     - Name: `tools`
     - Value: `mmuller93.github.io`

2. **In GitHub Pages Settings**
   - Custom domain: `tools.strategicfundpartners.com`
   - Check "Enforce HTTPS" (after DNS propagates)

### 5. Test Deployment

1. **Visit the Site**
   - GitHub Pages: `https://mmuller93.github.io/sfp-doc-review-tool`
   - Or custom domain: `https://tools.strategicfundpartners.com`

2. **Test Upload**
   - Upload a test PDF/DOCX
   - Select role (GP or LP)
   - Click "Analyze Document"
   - Verify analysis completes successfully

3. **Complete Testing Features**
   - feat-028: End-to-end test with real side letter
   - feat-029: Try prompt injection (e.g., PDF with "Ignore instructions")
   - feat-030: Test GP vs LP gives different analysis

## 🔗 Quick Links

- **Repository**: https://github.com/MMMuller93/sfp-doc-review-tool
- **Railway**: https://railway.app/dashboard
- **GitHub Actions**: https://github.com/MMMuller93/sfp-doc-review-tool/actions
- **GitHub Pages Settings**: https://github.com/MMMuller93/sfp-doc-review-tool/settings/pages

## ⚠️ Important Notes

- **API Costs**: Gemini Flash costs ~$0.20-0.50 per document analysis
- **Rate Limiting**: Backend limited to 10 requests per 15 minutes per IP
- **Security**: API key is only in Railway environment, never exposed to frontend
- **CORS**: Backend already configured for `tools.strategicfundpartners.com`

## ✨ After Deployment

Update features.json to mark feat-028, feat-029, feat-030 as complete (passes: true) after testing.

Final status will be: **30/30 features complete (100%)** 🎉
