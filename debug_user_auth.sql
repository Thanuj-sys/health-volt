-- Check user status and authentication issues
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    p.id as patient_id,
    p.name as patient_name,
    p.role as patient_role,
    h.id as hospital_id,
    h.name as hospital_name,
    h.role as hospital_role
FROM auth.users u
LEFT JOIN public.patients p ON u.id = p.id
LEFT JOIN public.hospitals h ON u.id = h.id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your actual email
ORDER BY u.created_at DESC;

-- Check if email is confirmed
SELECT 
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'Email not confirmed'
        ELSE 'Email confirmed'
    END as confirmation_status
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your actual email