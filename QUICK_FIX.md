# Quick Fix for Vercel FUNCTION_INVOCATION_FAILED Error

## Immediate Action Required

### Step 1: Set Environment Variable in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend-url.com/api` (replace with your actual backend URL)
   - **Environments:** Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application (go to Deployments → click "..." → Redeploy)

### Step 2: Deploy Your Backend
Your Express.js backend (`server/` folder) needs to be deployed separately:

**Recommended: Railway**
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repo
4. Select the `server/` folder
5. Add environment variables (MONGO_URI, JWT secrets, etc.)
6. Deploy
7. Copy the generated URL and use it as `VITE_API_BASE_URL`

**Alternative: Render**
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your repo
4. Set root directory to `server/`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables
8. Deploy and copy URL

### Step 3: Update Backend CORS
The backend CORS has been updated to allow Vercel domains. Make sure your backend is deployed with the latest code.

### Step 4: Verify
1. Check Vercel deployment logs (should show successful build)
2. Open your deployed app
3. Check browser console for API errors
4. Verify API calls go to your backend URL (not localhost)

## What Was Fixed

✅ Updated `vercel.json` with proper SPA routing rewrites
✅ Updated backend CORS to allow Vercel domains (including regex for all `*.vercel.app` subdomains)
✅ Created comprehensive deployment guide (`VERCEL_DEPLOYMENT.md`)

## Common Issues

**Still seeing errors?**
- Make sure you redeployed after adding environment variables
- Check that backend is actually running and accessible
- Verify CORS is configured correctly in backend
- Check browser console for specific error messages

**CORS errors?**
- Backend CORS now allows all `*.vercel.app` domains
- Make sure `FRONTEND_URL` env var is set in backend if using custom domain

**API calls still going to localhost?**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check that environment variable name is exactly `VITE_API_BASE_URL`

## Need More Help?

See `VERCEL_DEPLOYMENT.md` for:
- Detailed explanation of the error
- Architecture diagrams
- Alternative deployment strategies
- Troubleshooting guide

