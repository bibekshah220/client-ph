# Vercel Deployment Guide

## Understanding the Error: FUNCTION_INVOCATION_FAILED

### 1. **The Fix**

#### Immediate Steps:

1. **Set Environment Variable in Vercel:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-domain.com/api`
   - Make sure to set it for **Production**, **Preview**, and **Development** environments
   - Redeploy your application

2. **Deploy Your Backend Separately:**
   - Your Express.js backend (`server/` folder) needs to be deployed separately
   - Options:
     - **Railway** (recommended for Node.js)
     - **Render**
     - **Heroku**
     - **DigitalOcean App Platform**
     - **AWS EC2/Elastic Beanstalk**
   - Once deployed, use that URL as your `VITE_API_BASE_URL`

3. **Verify vercel.json Configuration:**
   - The updated `vercel.json` now includes proper SPA routing rewrites
   - This ensures all routes are handled by your React app

### 2. **Root Cause Analysis**

#### What Was Happening vs. What Should Happen:

**What Was Happening:**
- Your React app was deployed to Vercel as a static site
- The app tried to make API calls to `http://localhost:5000/api` (the default fallback)
- Vercel might have been intercepting `/api/*` routes, trying to run them as serverless functions
- Since no serverless functions exist, Vercel threw `FUNCTION_INVOCATION_FAILED`
- Alternatively, the app might have crashed during initialization when trying to connect to a non-existent backend

**What Should Happen:**
- React app (client) is deployed to Vercel as a **static site** (SPA)
- Backend (Express.js server) is deployed separately to a Node.js hosting service
- Client makes API calls to the external backend URL via `fetch()` from the browser
- Environment variable `VITE_API_BASE_URL` points to the production backend

#### Conditions That Triggered This:

1. **Missing Environment Variable**: `VITE_API_BASE_URL` not set in Vercel
2. **Architecture Mismatch**: Backend not deployed, so API calls fail
3. **Route Interception**: Vercel might try to handle `/api/*` as serverless functions
4. **Build-Time Errors**: If the app tries to make API calls during build (unlikely with Vite, but possible)

#### The Misconception:

The misconception was treating this as a **monolithic deployment** when it's actually a **separated frontend/backend architecture**:
- Frontend (React) = Static site → Vercel
- Backend (Express) = Node.js server → Separate hosting

Vercel is optimized for:
- Static sites (SPAs)
- Serverless functions (API routes in `/api` folder)
- NOT traditional Express.js servers

### 3. **Understanding the Concept**

#### Why This Error Exists:

**Vercel's Serverless Function Model:**
- Vercel expects serverless functions in `/api` folder (for Next.js) or configured routes
- When it sees `/api/*` routes, it tries to execute them as serverless functions
- If no function exists or the function crashes, you get `FUNCTION_INVOCATION_FAILED`
- This protects you from deploying broken serverless functions

**The Correct Mental Model:**

```
┌─────────────────┐         HTTP Requests          ┌──────────────────┐
│                 │ ───────────────────────────────> │                  │
│  React App      │                                 │  Express Backend │
│  (Vercel)       │ <─────────────────────────────── │  (Separate Host) │
│  Static Site    │         JSON Responses           │  Node.js Server  │
└─────────────────┘                                 └──────────────────┘
     Browser                                              MongoDB
```

**Key Principles:**
1. **Separation of Concerns**: Frontend and backend are separate applications
2. **Client-Side API Calls**: All API calls happen from the browser using `fetch()`
3. **Environment Variables**: API URL is configured at build/runtime via env vars
4. **CORS**: Backend must allow requests from your Vercel domain

#### How This Fits Into the Framework:

**Vite (Build Tool):**
- Builds your React app into static files (`dist/` folder)
- Replaces `import.meta.env.VITE_API_BASE_URL` at build time
- No server-side rendering by default

**Vercel (Hosting Platform):**
- Serves static files from `dist/` folder
- Can run serverless functions (but you're not using them)
- Handles routing for SPAs via rewrites

**Express.js (Backend Framework):**
- Runs as a traditional Node.js server
- Needs persistent connection (not serverless)
- Must be deployed separately

### 4. **Warning Signs to Recognize**

#### Red Flags That Indicate This Issue:

1. **Hardcoded Localhost URLs:**
   ```typescript
   // ❌ BAD
   const API_URL = 'http://localhost:5000/api';
   
   // ✅ GOOD
   const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
   ```

2. **Missing Environment Variables:**
   - No `.env` file in repository (good for security)
   - But also no documentation about required env vars
   - No environment variables set in deployment platform

3. **API Calls During Build:**
   ```typescript
   // ❌ BAD - Runs at build time
   const data = await fetch('http://localhost:5000/api/data');
   
   // ✅ GOOD - Runs in browser
   useEffect(() => {
     fetch('http://localhost:5000/api/data');
   }, []);
   ```

4. **Mixed Deployment Assumptions:**
   - Code assumes backend is on same domain
   - No CORS configuration in backend
   - No environment variable for API URL

5. **Vercel Configuration Issues:**
   - `vercel.json` missing or incomplete
   - No rewrites for SPA routing
   - Framework detection might be wrong

#### Code Smells:

- **"localhost" in production code**
- **No environment variable fallbacks**
- **API calls in module scope (not in functions/hooks)**
- **Missing error handling for network failures**
- **No CORS configuration in backend**

### 5. **Alternative Approaches & Trade-offs**

#### Option 1: Separate Deployments (Current Approach) ✅ Recommended

**Setup:**
- Frontend: Vercel (static site)
- Backend: Railway/Render/Heroku (Node.js server)

**Pros:**
- ✅ Best performance (CDN for frontend)
- ✅ Scalable (backend can scale independently)
- ✅ Cost-effective (Vercel free tier for frontend)
- ✅ Clear separation of concerns
- ✅ Easy to update frontend/backend independently

**Cons:**
- ❌ Need to manage two deployments
- ❌ CORS configuration required
- ❌ Two separate services to monitor

**When to Use:**
- Production applications
- When you need backend flexibility
- When frontend and backend have different scaling needs

---

#### Option 2: Convert Backend to Vercel Serverless Functions

**Setup:**
- Create `/api` folder in client directory
- Convert Express routes to individual serverless functions
- Deploy everything to Vercel

**Example:**
```typescript
// api/auth/login.ts
export default async function handler(req, res) {
  // Your login logic here
  return res.json({ success: true });
}
```

**Pros:**
- ✅ Single deployment
- ✅ No CORS issues
- ✅ Automatic scaling
- ✅ Serverless benefits (pay per use)

**Cons:**
- ❌ Requires significant refactoring
- ❌ Cold starts (first request slower)
- ❌ Function timeout limits (10s on free tier)
- ❌ Database connections need to be managed differently
- ❌ More complex for traditional Express apps

**When to Use:**
- Small to medium applications
- When you want serverless benefits
- When you're willing to refactor

---

#### Option 3: Full-Stack Framework (Next.js)

**Setup:**
- Migrate to Next.js
- Use API routes for backend
- Deploy to Vercel

**Pros:**
- ✅ Single deployment
- ✅ Built-in API routes
- ✅ Server-side rendering
- ✅ Optimized for Vercel

**Cons:**
- ❌ Requires complete migration
- ❌ Learning curve
- ❌ Different architecture

**When to Use:**
- Starting a new project
- Need SSR/SSG
- Want Vercel-optimized stack

---

#### Option 4: Monolithic Deployment (Docker)

**Setup:**
- Combine frontend and backend in Docker
- Deploy to Railway/Render/DigitalOcean

**Pros:**
- ✅ Single deployment
- ✅ No CORS issues
- ✅ Traditional architecture

**Cons:**
- ❌ Not using Vercel's strengths
- ❌ More expensive
- ❌ Slower frontend (no CDN)

**When to Use:**
- When you need full control
- When backend and frontend are tightly coupled
- When you prefer traditional hosting

---

## Quick Fix Checklist

- [ ] Set `VITE_API_BASE_URL` in Vercel environment variables
- [ ] Deploy backend to separate hosting service
- [ ] Update backend CORS to allow Vercel domain
- [ ] Verify `vercel.json` has SPA rewrites
- [ ] Test API connection from deployed frontend
- [ ] Check Vercel deployment logs for errors
- [ ] Verify environment variables are set for all environments

## Testing Locally

1. **Start Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd client
   npm install
   # Create .env file with:
   # VITE_API_BASE_URL=http://localhost:5000/api
   npm run dev
   ```

3. **Test Connection:**
   - Open browser console
   - Check for API errors
   - Verify network requests go to correct URL

## Common Issues & Solutions

### Issue: CORS Errors
**Solution:** Update backend CORS to include your Vercel domain:
```javascript
const allowedOrigins = [
  'https://your-app.vercel.app',
  process.env.FRONTEND_URL
];
```

### Issue: Environment Variable Not Working
**Solution:** 
- Restart Vercel deployment after adding env vars
- Check variable name matches exactly (case-sensitive)
- Verify it's set for the correct environment

### Issue: API Calls Still Going to Localhost
**Solution:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check build logs to verify env var was included

### Issue: 404 on Page Refresh
**Solution:** Already fixed with `rewrites` in `vercel.json`

## Next Steps

1. Deploy backend to Railway or Render
2. Set environment variables in Vercel
3. Update backend CORS configuration
4. Test the full deployment
5. Monitor both services for errors

