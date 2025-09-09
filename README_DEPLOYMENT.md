# HealthVolt - Smart Health Records

A secure medical records management system built with React, Vite, and Supabase.

## 🚀 Deployment to Netlify

### Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Netlify account

### Option 1: Deploy via Git (Recommended)

1. **Push your code to a Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/healthvolt.git
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose your Git provider and repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Click "Deploy site"

3. **Set Environment Variables**:
   - In Netlify dashboard, go to Site settings > Environment variables
   - Add these variables:
     ```
     VITE_SUPABASE_URL=https://mrltorlzehiiqreyluwv.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybHRvcmx6ZWhpaXFyZXlsdXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODcxMDIsImV4cCI6MjA3MTk2MzEwMn0.4iPNuIcgRtHEQ2Ks289c5LabkMOiLr9OyTyRLW4O_hQ
     ```

### Option 2: Manual Deploy

1. **Build the project locally**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder to Netlify's deploy area
   - Your site will be deployed instantly

### Option 3: Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and deploy**:
   ```bash
   netlify login
   netlify deploy --prod --dir=dist
   ```

## 🔧 Build Configuration

The project is configured with:
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **SPA redirects**: Configured in `netlify.toml`
- **Environment variables**: Automatically loaded from Netlify

## 🌐 Custom Domain (Optional)

1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

## 🔐 Security Headers

The `netlify.toml` file includes security headers:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

## 📱 Features

- **Patient Dashboard**: Upload and manage medical records
- **Hospital Dashboard**: View patient records with permission
- **Access Management**: Grant/revoke hospital access
- **File Operations**: View, download, and delete records
- **Responsive Design**: Works on all devices

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Supabase (Database + Storage + Auth)
- **Build Tool**: Vite
- **Deployment**: Netlify

## 📋 Environment Variables

Required environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚨 Important Notes

1. **Environment Variables**: Never commit `.env` files to Git
2. **Database Setup**: Ensure Supabase database is properly configured
3. **CORS Settings**: Configure Supabase to allow your Netlify domain
4. **File Storage**: Supabase storage bucket should be configured for file uploads

## 🔄 Continuous Deployment

Once connected to Git, Netlify will automatically:
- Build and deploy on every push to main branch
- Show build logs and deployment status
- Support branch deployments for testing

## 📞 Support

For deployment issues:
1. Check Netlify build logs
2. Verify environment variables
3. Ensure all dependencies are installed
4. Check Supabase connection settings
