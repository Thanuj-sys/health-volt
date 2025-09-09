-- Complete Schema Reset and Rebuild for Separate Hospital and Patient Logins
-- This script completely removes the existing schema and creates a new one from scratch
-- ⚠️ WARNING: This will delete ALL existing data permanently!
-- Run this in your Supabase Dashboard SQL Editor

-- ==========================================
-- STEP 1: COMPLETE CLEANUP - DELETE EVERYTHING
-- ==========================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Patients can view own records" ON public.patient_records;
DROP POLICY IF EXISTS "Hospitals can view permitted records" ON public.patient_records;
DROP POLICY IF EXISTS "Users can insert records" ON public.patient_records;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patients;
DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patients;
DROP POLICY IF EXISTS "Hospitals can view patients with access" ON public.patients;
DROP POLICY IF EXISTS "Hospitals can view their own profile" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals can update their own profile" ON public.hospitals;
DROP POLICY IF EXISTS "Patients can view hospitals they granted access to" ON public.hospitals;

-- Drop all existing views
DROP VIEW IF EXISTS public.patient_records_with_details CASCADE;
DROP VIEW IF EXISTS public.active_permissions_with_details CASCADE;
DROP VIEW IF EXISTS public.active_permissions CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created_patient ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_hospital ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_patient_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_hospital_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_type() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_patient_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_hospital_id() CASCADE;

-- Drop all existing tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS public.access_permissions CASCADE;
DROP TABLE IF EXISTS public.patient_records CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.hospitals CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Clear all storage objects
DELETE FROM storage.objects WHERE bucket_id = 'records';

-- Clear all auth users (this will cascade and remove all related data)
DELETE FROM auth.users;

-- ==========================================
-- STEP 2: CREATE STORAGE BUCKET
-- ==========================================

-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'records',
    'records',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STEP 3: CREATE NEW TABLES FROM SCRATCH
-- ==========================================

-- Create patients table
CREATE TABLE public.patients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    phone text,
    date_of_birth date,
    address text,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create hospitals table
CREATE TABLE public.hospitals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    hospital_name text NOT NULL,
    license_number text UNIQUE NOT NULL,
    phone text,
    address text,
    department text,
    specialty text,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create patient_records table
CREATE TABLE public.patient_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploaded_by_hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
    uploaded_by_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
    record_type text NOT NULL CHECK (record_type IN ('Lab Report', 'Imaging', 'Prescription', 'DICOM', 'Note')),
    title text NOT NULL,
    notes text,
    storage_path text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure exactly one uploader is specified
    CONSTRAINT check_single_uploader CHECK (
        (uploaded_by_hospital_id IS NOT NULL AND uploaded_by_patient_id IS NULL) OR
        (uploaded_by_hospital_id IS NULL AND uploaded_by_patient_id IS NOT NULL)
    )
);

-- Create access_permissions table
CREATE TABLE public.access_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Unique constraint to prevent duplicate pending/active permissions
    UNIQUE(patient_id, hospital_id)
);

-- ==========================================
-- STEP 4: CREATE UTILITY FUNCTIONS
-- ==========================================

-- Function to get current user type
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text AS $$
DECLARE
    user_type text;
BEGIN
    -- Check if user is a patient
    SELECT 'patient' INTO user_type
    FROM public.patients 
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
    
    IF user_type IS NOT NULL THEN
        RETURN user_type;
    END IF;
    
    -- Check if user is a hospital
    SELECT 'hospital' INTO user_type
    FROM public.hospitals 
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
    
    IF user_type IS NOT NULL THEN
        RETURN user_type;
    END IF;
    
    RETURN 'unknown';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current patient ID
CREATE OR REPLACE FUNCTION public.get_current_patient_id()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM public.patients 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current hospital ID
CREATE OR REPLACE FUNCTION public.get_current_hospital_id()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM public.hospitals 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: CREATE SIGNUP TRIGGERS
-- ==========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
BEGIN
    -- Create patient profile if role is patient
    IF NEW.raw_user_meta_data->>'role' = 'patient' THEN
        INSERT INTO public.patients (
            auth_user_id,
            email,
            name
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
        );
    
    -- Create hospital profile if role is hospital
    ELSIF NEW.raw_user_meta_data->>'role' = 'hospital' THEN
        INSERT INTO public.hospitals (
            auth_user_id,
            email,
            name,
            hospital_name,
            license_number
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'hospital_name', 'Unknown Hospital'),
            COALESCE(NEW.raw_user_meta_data->>'license_number', 'TEMP_' || NEW.id::text)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ==========================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_permissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 7: CREATE RLS POLICIES
-- ==========================================

-- Patients table policies
CREATE POLICY "Patients can view their own profile" ON public.patients
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Patients can update their own profile" ON public.patients
    FOR UPDATE USING (auth_user_id = auth.uid());

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

-- Hospitals table policies
CREATE POLICY "Hospitals can view their own profile" ON public.hospitals
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Hospitals can update their own profile" ON public.hospitals
    FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Patients can view hospitals they granted access to" ON public.hospitals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.hospital_id = id
            AND ap.patient_id = public.get_current_patient_id()
            AND ap.status = 'approved'
        )
    );

-- Patient records policies
CREATE POLICY "Patients can view their own records" ON public.patient_records
    FOR SELECT USING (patient_id = public.get_current_patient_id());

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

CREATE POLICY "Patients can insert their own records" ON public.patient_records
    FOR INSERT WITH CHECK (
        patient_id = public.get_current_patient_id() AND
        uploaded_by_patient_id = public.get_current_patient_id()
    );

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

-- Access permissions policies
CREATE POLICY "Hospitals can request access" ON public.access_permissions
    FOR INSERT WITH CHECK (
        hospital_id = public.get_current_hospital_id() AND
        status = 'pending'
    );

CREATE POLICY "Patients can manage their own access requests" ON public.access_permissions
    FOR UPDATE USING (
        patient_id = public.get_current_patient_id()
    ) WITH CHECK (
        status IN ('approved', 'rejected', 'revoked')
    );

CREATE POLICY "Patients can view their own permissions" ON public.access_permissions
    FOR SELECT USING (patient_id = public.get_current_patient_id());

CREATE POLICY "Hospitals can view permissions they requested" ON public.access_permissions
    FOR SELECT USING (hospital_id = public.get_current_hospital_id());

-- ==========================================
-- STEP 8: CREATE STORAGE POLICIES
-- ==========================================

-- Storage policies for the records bucket
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'records' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view files they have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'records' AND
        auth.role() = 'authenticated' AND (
            -- Patients can view their own files
            (storage.foldername(name))[1] = public.get_current_patient_id()::text OR
            -- Hospitals can view files from patients who granted access
            EXISTS (
                SELECT 1 FROM public.access_permissions ap
                WHERE ap.patient_id::text = (storage.foldername(name))[1]
                AND ap.hospital_id = public.get_current_hospital_id()
                AND ap.status = 'approved'
                AND (ap.expires_at IS NULL OR ap.expires_at > now())
            )
        )
    );

-- ==========================================
-- STEP 9: CREATE HELPFUL VIEWS
-- ==========================================

-- View for patient records with uploader details
CREATE VIEW public.patient_records_with_details AS
SELECT 
    pr.*,
    p.name as patient_name,
    p.email as patient_email,
    CASE 
        WHEN pr.uploaded_by_patient_id IS NOT NULL THEN pat.name
        WHEN pr.uploaded_by_hospital_id IS NOT NULL THEN h.name
        ELSE 'Unknown'
    END as uploaded_by_name,
    CASE 
        WHEN pr.uploaded_by_patient_id IS NOT NULL THEN 'patient'
        WHEN pr.uploaded_by_hospital_id IS NOT NULL THEN 'hospital'
        ELSE 'unknown'
    END as uploaded_by_role
FROM public.patient_records pr
JOIN public.patients p ON p.id = pr.patient_id
LEFT JOIN public.patients pat ON pat.id = pr.uploaded_by_patient_id
LEFT JOIN public.hospitals h ON h.id = pr.uploaded_by_hospital_id;

-- View for active access permissions
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
WHERE ap.granted = true
AND (ap.expires_at IS NULL OR ap.expires_at > now());

-- ==========================================
-- STEP 10: VERIFICATION AND COMPLETION
-- ==========================================

SELECT '🎉 Complete schema rebuild successful!' as status;

-- Verify tables are created
SELECT 'Tables created:' as info;
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('patients', 'hospitals', 'patient_records', 'access_permissions')
ORDER BY table_name;

-- Verify functions are created
SELECT 'Functions created:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%current%'
ORDER BY routine_name;

-- Verify RLS policies are created
SELECT 'RLS Policies created:' as info;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Final status
SELECT '✅ New separate login system is ready!' as final_status;
SELECT 'You can now register patients and hospitals separately.' as next_step;
SELECT 'Use the new API service to interact with the updated schema.' as instruction;
