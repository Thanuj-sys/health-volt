-- Reset user authentication status
-- Run this if your account exists but can't sign in

-- 1. First, check if user exists and get their details
SELECT 
    id, 
    email, 
    email_confirmed_at, 
    raw_user_meta_data,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your actual email

-- 2. If email is not confirmed, manually confirm it
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your actual email
AND email_confirmed_at IS NULL;

-- 3. Check if user has proper profile in patients or hospitals table
-- For patient:
SELECT * FROM public.patients WHERE email = 'YOUR_EMAIL_HERE';

-- For hospital:
SELECT * FROM public.hospitals WHERE email = 'YOUR_EMAIL_HERE';

-- 4. If profile is missing, you may need to recreate it
-- This depends on whether you're a patient or hospital user