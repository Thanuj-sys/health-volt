-- Check all current RLS policies on patient_records table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'patient_records'
ORDER BY cmd, policyname;

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'patient_records';

-- Show current user (for debugging)
SELECT auth.uid() as current_user_id, auth.role() as current_role;