# Quick Setup Instructions for HealthVolt

## Immediate Solution: Check Your Supabase Dashboard

1. **Go to https://supabase.com/dashboard**
2. **Sign in with your account**
3. **Look for your project "smart-health-records" or similar**

### If Project Exists:
- Check if it shows "PAUSED" status
- Free tier projects pause after inactivity
- Click "Resume Project" if paused

### If No Project Exists:
You need to create a new one following these steps:

## Create New Supabase Project

1. **New Project**: Click "New Project"
2. **Name**: "health-volt" 
3. **Database Password**: Create a strong password (SAVE THIS!)
4. **Region**: Choose closest to your location
5. **Wait**: Project creation takes 1-2 minutes

## Get Connection Details

After project is ready:
1. Go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (long token)

## Update Your App

Replace the values in your `.env` file:
```
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_URL.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci_YOUR_NEW_KEY
```

## Set Up Database

Run this SQL in your Supabase SQL Editor: