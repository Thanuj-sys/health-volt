# HealthVolt - Supabase Connection Fix

## Issue
The current Supabase instance (mrltorlzehiiqreyluwv.supabase.co) is not accessible.

## Solution Steps

### 1. Create New Supabase Project
1. Go to https://supabase.com
2. Sign in to your account
3. Click "New Project"
4. Choose your organization
5. Set project name: "health-volt"
6. Set database password (save this!)
7. Choose region (closest to your location)
8. Click "Create new project"

### 2. Get New Connection Details
After project is created:
1. Go to Project Settings → API
2. Copy the new Project URL
3. Copy the new anon/public key

### 3. Update Environment Variables
Update your .env file with new values:
```
VITE_SUPABASE_URL=YOUR_NEW_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

### 4. Set Up Database Schema
Run the SQL scripts in the supabase/migrations folder to recreate your database structure.

### 5. Test Connection
Run: node debug-login.js to verify connection works.

## Alternative: Check Current Project Status
1. Go to https://supabase.com/dashboard
2. Check if your project "smart-health-records" exists
3. If it exists, check if it's paused (free tier limitation)
4. If paused, you can resume it

## Quick Fix Script
I'll create a script to help you set up a new connection quickly.