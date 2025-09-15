-- Fix delete policy for patient_records table
-- This allows patients to delete their own records

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'patient_records';

-- Create delete policy for patients to delete their own records
CREATE POLICY "patients_can_delete_own_records" 
ON "public"."patient_records"
FOR DELETE 
TO authenticated
USING (
  patient_id = auth.uid()
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'patient_records' AND policyname = 'patients_can_delete_own_records';

-- Test query to ensure the policy works (replace the UUID with an actual record ID)
-- SELECT id, patient_id, title FROM patient_records WHERE patient_id = auth.uid();
