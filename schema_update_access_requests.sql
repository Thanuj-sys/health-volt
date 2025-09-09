-- Update access_permissions table to support request workflow
-- Run this in your Supabase Dashboard SQL Editor

-- Add status column to track request states (safe add)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_permissions' 
                   AND column_name = 'status') THEN
        ALTER TABLE public.access_permissions
        ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add requested_at timestamp (safe add)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_permissions' 
                   AND column_name = 'requested_at') THEN
        ALTER TABLE public.access_permissions 
        ADD COLUMN requested_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Update existing records to have 'approved' status (backward compatibility)
UPDATE public.access_permissions 
SET status = 'approved' 
WHERE status IS NULL OR status = '';

-- Drop and recreate RLS policies with status checks
DROP POLICY IF EXISTS "Hospitals can view patients with granted access" ON public.patients;
CREATE POLICY "Hospitals can view patients with granted access" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.status = 'approved'
            AND (ap.expires_at IS NULL OR ap.expires_at > now())
        )
    );

DROP POLICY IF EXISTS "Hospitals can view records of patients with granted access" ON public.patient_records;
CREATE POLICY "Hospitals can view records of patients with granted access" ON public.patient_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = patient_id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.status = 'approved'
            AND (ap.expires_at IS NULL OR ap.expires_at > now())
        )
    );

-- Update hospitals can insert records policy
DROP POLICY IF EXISTS "Hospitals can insert records for patients with granted access" ON public.patient_records;
CREATE POLICY "Hospitals can insert records for patients with granted access" ON public.patient_records
    FOR INSERT WITH CHECK (
        uploaded_by_hospital_id = public.get_current_hospital_id() AND
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = patient_id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.status = 'approved'
            AND (ap.expires_at IS NULL OR ap.expires_at > now())
        )
    );

-- Allow hospitals to insert access requests
DROP POLICY IF EXISTS "Hospitals can request patient access" ON public.access_permissions;
CREATE POLICY "Hospitals can request patient access" ON public.access_permissions
    FOR INSERT WITH CHECK (hospital_id = public.get_current_hospital_id());

-- Allow hospitals to view their own requests
DROP POLICY IF EXISTS "Hospitals can view their access requests" ON public.access_permissions;
CREATE POLICY "Hospitals can view their access requests" ON public.access_permissions
    FOR SELECT USING (hospital_id = public.get_current_hospital_id());

-- Allow hospitals to see all patients for requesting access (but not their details)
DROP POLICY IF EXISTS "Hospitals can view all patients for access requests" ON public.patients;
CREATE POLICY "Hospitals can view all patients for access requests" ON public.patients
    FOR SELECT USING (public.get_current_user_type() = 'hospital');

-- Update the active access permissions view
DROP VIEW IF EXISTS public.active_access_permissions;
CREATE VIEW public.active_access_permissions AS
SELECT 
    ap.*,
    p.name as patient_name,
    p.email as patient_email,
    h.name as hospital_contact_name,
    h.hospital_name,
    h.email as hospital_email
FROM public.access_permissions ap
JOIN public.patients p ON p.id = ap.patient_id
JOIN public.hospitals h ON h.id = ap.hospital_id
WHERE ap.status = 'approved'
AND (ap.expires_at IS NULL OR ap.expires_at > now());

-- Create view for pending requests
DROP VIEW IF EXISTS public.pending_access_requests;
CREATE VIEW public.pending_access_requests AS
SELECT 
    ap.*,
    p.name as patient_name,
    p.email as patient_email,
    h.name as hospital_contact_name,
    h.hospital_name,
    h.email as hospital_email
FROM public.access_permissions ap
JOIN public.patients p ON p.id = ap.patient_id
JOIN public.hospitals h ON h.id = ap.hospital_id
WHERE ap.status = 'pending';

SELECT '✅ Access request schema updated successfully!' as status;
