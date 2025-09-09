# 🚀 Netlify Deployment Checklist

## ✅ Pre-Deployment Checklist

- [x] Project builds successfully (`npm run build`)
- [x] `dist` folder contains built files
- [x] `netlify.toml` configuration file created
- [x] Environment variables identified
- [x] Supabase credentials available

## 🔧 Deployment Steps

### Method 1: Manual Deployment (Quickest)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `dist` folder
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Method 2: Git Deployment (Recommended for continuous deployment)
1. Create a Git repository
2. Push your code to GitHub/GitLab/Bitbucket
3. Connect repository to Netlify
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Set environment variables in Netlify dashboard

## 🔐 Environment Variables

Copy these values to Netlify:

```
VITE_SUPABASE_URL=https://mrltorlzehiiqreyluwv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybHRvcmx6ZWhpaXFyZXlsdXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODcxMDIsImV4cCI6MjA3MTk2MzEwMn0.4iPNuIcgRtHEQ2Ks289c5LabkMOiLr9OyTyRLW4O_hQ
```

## 🌐 Post-Deployment

- [ ] Test all pages load correctly
- [ ] Test user registration/login
- [ ] Test file upload functionality
- [ ] Test patient/hospital dashboards
- [ ] Verify Supabase connectivity

## 🔗 Useful Links

- [Netlify Dashboard](https://app.netlify.com/)
- [Supabase Dashboard](https://app.supabase.com/)
- [Project Documentation](./README_DEPLOYMENT.md)

## 🆘 Troubleshooting

### Common Issues:

1. **Build fails**: Check environment variables in Netlify
2. **404 errors**: Ensure `netlify.toml` redirects are configured
3. **Supabase connection fails**: Verify environment variables
4. **CORS errors**: Add your Netlify domain to Supabase allowed origins

### Build Logs Location:
Netlify Dashboard → Site Overview → Production Deploys → Click on deploy → View logs
