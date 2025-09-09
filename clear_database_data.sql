-- Clear Database Data - Keep Schema and Tables
-- This script removes all data but preserves the table structure and schema
-- Run this in your Supabase Dashboard SQL Editor

-- ==========================================
-- STEP 1: DISABLE TRIGGERS TEMPORARILY
-- ==========================================
-- This prevents any triggers from firing during data deletion

ALTER TABLE public.profiles DISABLE TRIGGER ALL;
ALTER TABLE public.patient_records DISABLE TRIGGER ALL;
ALTER TABLE public.access_permissions DISABLE TRIGGER ALL;

-- ==========================================
-- STEP 2: CLEAR ALL DATA FROM TABLES
-- ==========================================
-- Delete in correct order to respect foreign key constraints

-- Clear access permissions first (references patient_records and profiles)
TRUNCATE TABLE public.access_permissions CASCADE;

-- Clear patient records (references profiles)
TRUNCATE TABLE public.patient_records CASCADE;

-- Clear profiles (references auth.users)
DELETE FROM public.profiles;

-- ==========================================
-- STEP 3: CLEAR AUTH USERS
-- ==========================================
-- Remove all users from auth.users table
-- This will cascade to remove related data

DELETE FROM auth.users;

-- ==========================================
-- STEP 4: CLEAR STORAGE BUCKET DATA
-- ==========================================
-- Remove all files from the storage bucket
-- Note: This deletes the actual files, not just references

DELETE FROM storage.objects WHERE bucket_id = 'records';

-- ==========================================
-- STEP 5: RE-ENABLE TRIGGERS
-- ==========================================
-- Re-enable triggers after data clearing

ALTER TABLE public.profiles ENABLE TRIGGER ALL;
ALTER TABLE public.patient_records ENABLE TRIGGER ALL;
ALTER TABLE public.access_permissions ENABLE TRIGGER ALL;

-- ==========================================
-- STEP 6: RESET SEQUENCES (if any)
-- ==========================================
-- Reset any auto-incrementing sequences to start from 1
-- Note: Our tables use UUIDs, so this is mainly for completeness

-- No sequences to reset as we use UUID primary keys

-- ==========================================
-- STEP 7: VERIFICATION
-- ==========================================
-- Verify that all data has been cleared

SELECT 'Data clearing verification:' as info;

SELECT 'auth.users count:' as table_name, COUNT(*) as record_count FROM auth.users
UNION ALL
SELECT 'profiles count:', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'patient_records count:', COUNT(*) FROM public.patient_records
UNION ALL
SELECT 'access_permissions count:', COUNT(*) FROM public.access_permissions
UNION ALL
SELECT 'storage.objects count:', COUNT(*) FROM storage.objects WHERE bucket_id = 'records';

-- ==========================================
-- STEP 8: VERIFY TABLE STRUCTURE INTACT
-- ==========================================
-- Confirm that all tables and schema are still intact

SELECT 'Table structure verification:' as info;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'patient_records', 'access_permissions')
ORDER BY table_name;

-- Show column structure for main tables
SELECT 'profiles table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'patient_records table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'patient_records'
ORDER BY ordinal_position;

SELECT 'access_permissions table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'access_permissions'
ORDER BY ordinal_position;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

SELECT '✅ Database data cleared successfully!' as status;
SELECT 'All user data, records, and files have been removed.' as note;
SELECT 'Tables, schema, and RLS policies remain intact.' as confirmation;
SELECT 'You can now test with fresh data.' as next_step;
