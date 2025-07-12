# 🆓 Free Deployment Guide - Vercel + Railway

Deploy your ISP Bandwidth Tracker for **FREE** in 10 minutes!

## 📋 What You'll Get
- ✅ **Professional URLs**: `https://your-app.vercel.app`
- ✅ **100% Free**: No credit card required
- ✅ **Global CDN**: Fast worldwide access
- ✅ **SSL Certificate**: Automatic HTTPS
- ✅ **Auto-scaling**: Handles traffic spikes

## 🚀 Step-by-Step Deployment

### Step 1: Deploy Backend to Railway (FREE)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub (free account)
3. **Create New Project** → **Deploy from GitHub repo**
4. **Connect your repository**
5. **Configure environment variables**:
   ```
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   API_HOST=0.0.0.0
   API_PORT=8000
   ```
6. **Deploy** (Railway will auto-detect Python and use our Dockerfile)
7. **Copy your Railway URL** (e.g., `https://your-app.railway.app`)

### Step 2: Deploy Frontend to Vercel (FREE)

1. **Go to Vercel**: https://vercel.com
2. **Sign up** with GitHub (free account)
3. **Import Git Repository** → Select your repo
4. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

6. **Deploy** (Vercel will build and deploy automatically)
7. **Copy your Vercel URL** (e.g., `https://your-app.vercel.app`)

### Step 3: Update API Configuration

Update the Railway backend to allow requests from your Vercel domain:

1. **Go to Railway dashboard**
2. **Add environment variable**:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. **Redeploy** the Railway service

## 🔧 Quick Setup Commands

If you have the Vercel and Railway CLIs installed:

```bash
# Install CLIs (optional)
npm i -g vercel railway

# Deploy to Railway
railway login
railway link
railway up

# Deploy to Vercel
cd frontend
vercel --prod
```

## 🌍 Your Live URLs

After deployment, you'll have:

- **🎯 Main App**: `https://your-app.vercel.app`
- **🔌 API**: `https://your-railway-app.railway.app`
- **📊 API Docs**: `https://your-railway-app.railway.app/docs`

## 💡 Free Tier Limits

### Vercel (Frontend)
- ✅ **100GB bandwidth/month**
- ✅ **Unlimited static requests**
- ✅ **100 serverless function executions/day**
- ✅ **Custom domains**

### Railway (Backend)
- ✅ **500 hours/month** (enough for 24/7)
- ✅ **1GB RAM**
- ✅ **1GB storage**
- ✅ **Unlimited bandwidth**

## 🎯 Demo URLs to Share

Once deployed, share these with your client:

```
🌐 ISP Bandwidth Tracker Demo
Frontend: https://your-app.vercel.app
API: https://your-railway-app.railway.app

✨ Features:
• Real-time bandwidth monitoring
• VLAN/Interface traffic charts
• NTTN aggregated link monitoring  
• Reseller management (CRUD)
• Modern glass morphism UI
• Mobile responsive design
```

## 🛠 Troubleshooting

### Frontend Issues
```bash
# Check Vercel deployment logs
vercel logs

# Local test
cd frontend
npm run build
npm start
```

### Backend Issues
```bash
# Check Railway logs
railway logs

# Test API health
curl https://your-railway-app.railway.app/health
```

### CORS Issues
If you get CORS errors, add this to your Railway environment:
```
CORS_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
```

## 🔄 Updates

To update your live deployment:

1. **Push to GitHub** (both services auto-deploy)
2. **Or use CLIs**:
   ```bash
   # Update Railway
   railway up
   
   # Update Vercel
   cd frontend && vercel --prod
   ```

## 📱 Mobile Testing

Your app will be live and mobile-ready at:
- `https://your-app.vercel.app`

Test on:
- ✅ iPhone/Android browsers
- ✅ Tablet devices  
- ✅ Desktop browsers

## 🎉 Ready for Client Demo!

Your professional ISP monitoring system is now live and ready to impress your client with:

- **Real-time charts** showing bandwidth usage
- **Professional UI** with glass morphism design
- **Full CRUD operations** for reseller management
- **Mobile responsive** design
- **Free hosting** with professional URLs

---

**Total Cost: $0/month** 🎉
**Setup Time: ~10 minutes** ⚡
**Professional Result: Priceless** 💎 