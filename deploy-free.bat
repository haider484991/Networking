@echo off
echo.
echo ========================================
echo   FREE DEPLOYMENT - VERCEL + RAILWAY
echo ========================================
echo.
echo This will guide you through deploying your ISP Bandwidth Tracker for FREE!
echo.
echo 📋 What you'll need:
echo   - GitHub account (free)
echo   - Vercel account (free) 
echo   - Railway account (free)
echo   - Supabase project (free)
echo.
echo 💰 Total cost: $0/month
echo ⏱️  Setup time: ~10 minutes
echo.
pause

echo.
echo Step 1: Push your code to GitHub
echo ================================
echo.
echo 1. Create a new repository on GitHub
echo 2. Push your current code:
echo.
echo    git init
echo    git add .
echo    git commit -m "Initial commit - ISP Bandwidth Tracker"
echo    git branch -M main
echo    git remote add origin https://github.com/yourusername/your-repo.git
echo    git push -u origin main
echo.
echo Press any key when you've pushed to GitHub...
pause > nul

echo.
echo Step 2: Deploy Backend to Railway
echo ==================================
echo.
echo 1. Go to: https://railway.app
echo 2. Sign up with your GitHub account
echo 3. Click "New Project" → "Deploy from GitHub repo"
echo 4. Select your repository
echo 5. Railway will auto-detect Python and deploy
echo.
echo 6. Add these environment variables in Railway:
echo    SUPABASE_URL=your-supabase-project-url
echo    SUPABASE_KEY=your-supabase-anon-key
echo    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
echo    API_HOST=0.0.0.0
echo    API_PORT=8000
echo.
echo 7. Copy your Railway URL (e.g., https://your-app.railway.app)
echo.
set /p RAILWAY_URL="Enter your Railway URL: "

echo.
echo Step 3: Deploy Frontend to Vercel
echo ==================================
echo.
echo 1. Go to: https://vercel.com
echo 2. Sign up with your GitHub account
echo 3. Click "Import Git Repository"
echo 4. Select your repository
echo 5. Configure:
echo    - Framework: Next.js
echo    - Root Directory: frontend
echo    - Build Command: npm run build
echo.
echo 6. Add these environment variables in Vercel:
echo    NEXT_PUBLIC_API_URL=%RAILWAY_URL%
echo    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
echo    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
echo.
echo 7. Deploy!
echo.
set /p VERCEL_URL="Enter your Vercel URL: "

echo.
echo Step 4: Update Railway CORS
echo ============================
echo.
echo 1. Go back to Railway dashboard
echo 2. Add this environment variable:
echo    FRONTEND_URL=%VERCEL_URL%
echo 3. Redeploy the service
echo.
pause

echo.
echo 🎉 DEPLOYMENT COMPLETE!
echo ========================
echo.
echo Your ISP Bandwidth Tracker is now LIVE and FREE!
echo.
echo 🌐 Frontend: %VERCEL_URL%
echo 🔌 API: %RAILWAY_URL%
echo 📊 API Docs: %RAILWAY_URL%/docs
echo.
echo ✨ Features available:
echo   • Real-time bandwidth monitoring
echo   • VLAN/Interface traffic charts  
echo   • NTTN aggregated link monitoring
echo   • Reseller management (CRUD)
echo   • Modern glass morphism UI
echo   • Mobile responsive design
echo.
echo 📱 Test on mobile: %VERCEL_URL%
echo.
echo 🎯 Share with your client:
echo   "Check out our ISP monitoring system: %VERCEL_URL%"
echo.
echo Press any key to open your live app...
pause > nul
start %VERCEL_URL%

echo.
echo 🚀 Ready to impress your client!
pause 