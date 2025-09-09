-- Modify Schema for Separate Hospital and Patient Logins
-- This script creates separate authentication and user management for hospitals and patients
-- Run this in your Supabase Dashboard SQL Editor

-- ==========================================
-- STEP 1: CREATE NEW TABLES FOR SEPARATE LOGINS
-- ==========================================

-- Create separate patients table
CREATE TABLE IF NOT EXISTS public.patients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add missing columns if table already exists
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Create separate hospitals table
CREATE TABLE IF NOT EXISTS public.hospitals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add missing columns if hospitals table already exists
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS hospital_name text,
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS specialty text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- ==========================================
-- STEP 2: MODIFY EXISTING TABLES
-- ==========================================

-- First, let's check what data exists and migrate it properly
-- Temporarily disable the foreign key constraint
ALTER TABLE public.patient_records DROP CONSTRAINT IF EXISTS patient_records_patient_id_fkey;

-- Add new columns for the separate uploader tracking
ALTER TABLE public.patient_records 
ADD COLUMN IF NOT EXISTS uploaded_by_hospital_id uuid,
ADD COLUMN IF NOT EXISTS uploaded_by_patient_id uuid;

-- ==========================================
-- STEP 2A: MIGRATE EXISTING DATA
-- ==========================================

-- First, let's check if we need to populate auth_user_id for existing records
UPDATE public.patients SET auth_user_id = id WHERE auth_user_id IS NULL;
UPDATE public.hospitals SET auth_user_id = id WHERE auth_user_id IS NULL;

-- Migrate existing profiles to new tables based on role
-- First, migrate patients
INSERT INTO public.patients (id, auth_user_id, email, name, created_at, updated_at)
SELECT 
    p.id,
    p.id as auth_user_id,
    u.email,
    p.name,
    p.created_at,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'patient'
AND NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p.id)
ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name;

-- Then, migrate hospitals
INSERT INTO public.hospitals (id, auth_user_id, email, name, hospital_name, license_number, created_at, updated_at)
SELECT 
    p.id,
    p.id as auth_user_id,
    u.email,
    p.name,
    COALESCE(p.name, 'Unknown Hospital') as hospital_name,
    'MIGRATED_' || p.id::text as license_number,
    p.created_at,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'hospital'
AND NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id = p.id)
ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    hospital_name = EXCLUDED.hospital_name,
    license_number = EXCLUDED.license_number;

-- Handle unique constraint for license_number by updating existing records
UPDATE public.hospitals 
SET license_number = 'MIGRATED_' || id::text 
WHERE license_number IS NULL;

-- Update patient_records to use the migrated patient IDs
-- Set uploaded_by_patient_id for records uploaded by patients
UPDATE public.patient_records 
SET uploaded_by_patient_id = uploaded_by
WHERE uploaded_by IN (SELECT id FROM public.patients)
AND uploaded_by_patient_id IS NULL;

-- Set uploaded_by_hospital_id for records uploaded by hospitals
UPDATE public.patient_records 
SET uploaded_by_hospital_id = uploaded_by
WHERE uploaded_by IN (SELECT id FROM public.hospitals)
AND uploaded_by_hospital_id IS NULL;

-- Now we can safely add the foreign key constraints
ALTER TABLE public.patient_records 
DROP CONSTRAINT IF EXISTS patient_records_patient_id_fkey;

ALTER TABLE public.patient_records 
ADD CONSTRAINT patient_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- Add other constraints only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'patient_records_uploaded_by_hospital_fkey') THEN
        ALTER TABLE public.patient_records 
        ADD CONSTRAINT patient_records_uploaded_by_hospital_fkey 
        FOREIGN KEY (uploaded_by_hospital_id) REFERENCES public.hospitals(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'patient_records_uploaded_by_patient_fkey') THEN
        ALTER TABLE public.patient_records 
        ADD CONSTRAINT patient_records_uploaded_by_patient_fkey 
        FOREIGN KEY (uploaded_by_patient_id) REFERENCES public.patients(id);
    END IF;
END $$;

-- Add constraint to ensure either hospital or patient uploaded the record
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_uploader') THEN
        ALTER TABLE public.patient_records 
        ADD CONSTRAINT check_uploader 
        CHECK (
            (uploaded_by_hospital_id IS NOT NULL AND uploaded_by_patient_id IS NULL) OR
            (uploaded_by_hospital_id IS NULL AND uploaded_by_patient_id IS NOT NULL)
        );
    END IF;
END $$;

-- Update access_permissions table foreign keys
ALTER TABLE public.access_permissions 
DROP CONSTRAINT IF EXISTS access_permissions_patient_id_fkey,
DROP CONSTRAINT IF EXISTS access_permissions_hospital_id_fkey,
ADD CONSTRAINT access_permissions_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
ADD CONSTRAINT access_permissions_hospital_id_fkey 
FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- ==========================================
-- STEP 3: CREATE USER TYPE FUNCTIONS
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
-- STEP 4: CREATE PROFILE TRIGGERS
-- ==========================================

-- Trigger function to create patient profile
CREATE OR REPLACE FUNCTION public.handle_patient_signup()
RETURNS trigger AS $$
BEGIN
    -- Only create patient profile if user has metadata indicating patient role
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create hospital profile
CREATE OR REPLACE FUNCTION public.handle_hospital_signup()
RETURNS trigger AS $$
BEGIN
    -- Only create hospital profile if user has metadata indicating hospital role
    IF NEW.raw_user_meta_data->>'role' = 'hospital' THEN
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

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created_patient ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_hospital ON auth.users;

CREATE TRIGGER on_auth_user_created_patient
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_patient_signup();

CREATE TRIGGER on_auth_user_created_hospital
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_hospital_signup();

-- ==========================================
-- STEP 5: UPDATE RLS POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Patients table policies
CREATE POLICY "Patients can view their own profile" ON public.patients
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Patients can update their own profile" ON public.patients
    FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Hospitals can view patients with access" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.granted = true
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
            AND ap.granted = true
        )
    );

-- Update patient_records policies
DROP POLICY IF EXISTS "Patients can view own records" ON public.patient_records;
DROP POLICY IF EXISTS "Hospitals can view permitted records" ON public.patient_records;
DROP POLICY IF EXISTS "Users can insert records" ON public.patient_records;

CREATE POLICY "Patients can view own records" ON public.patient_records
    FOR SELECT USING (patient_id = public.get_current_patient_id());

CREATE POLICY "Hospitals can view permitted records" ON public.patient_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = patient_id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.granted = true
            AND (ap.expires_at IS NULL OR ap.expires_at > now())
        )
    );

CREATE POLICY "Patients can insert own records" ON public.patient_records
    FOR INSERT WITH CHECK (
        patient_id = public.get_current_patient_id() AND
        uploaded_by_patient_id = public.get_current_patient_id()
    );

CREATE POLICY "Hospitals can insert records for permitted patients" ON public.patient_records
    FOR INSERT WITH CHECK (
        uploaded_by_hospital_id = public.get_current_hospital_id() AND
        EXISTS (
            SELECT 1 FROM public.access_permissions ap
            WHERE ap.patient_id = patient_id
            AND ap.hospital_id = public.get_current_hospital_id()
            AND ap.granted = true
            AND (ap.expires_at IS NULL OR ap.expires_at > now())
        )
    );

-- ==========================================
-- STEP 6: CREATE VIEWS FOR EASY ACCESS
-- ==========================================

-- View for patient records with uploader details
CREATE OR REPLACE VIEW public.patient_records_with_details AS
SELECT 
    mr.*,
    CASE 
        WHEN mr.uploaded_by_patient_id IS NOT NULL THEN p.name
        WHEN mr.uploaded_by_hospital_id IS NOT NULL THEN h.name
        ELSE 'Unknown'
    END as uploaded_by_name,
    CASE 
        WHEN mr.uploaded_by_patient_id IS NOT NULL THEN 'patient'
        WHEN mr.uploaded_by_hospital_id IS NOT NULL THEN 'hospital'
        ELSE 'unknown'
    END as uploaded_by_role,
    patient.name as patient_name
FROM public.patient_records mr
LEFT JOIN public.patients p ON p.id = mr.uploaded_by_patient_id
LEFT JOIN public.hospitals h ON h.id = mr.uploaded_by_hospital_id
JOIN public.patients patient ON patient.id = mr.patient_id;

-- View for active permissions with details
CREATE OR REPLACE VIEW public.active_permissions_with_details AS
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
-- STEP 7: CLEANUP OLD DATA (OPTIONAL)
-- ==========================================

-- After successful migration, you can optionally remove the old profiles table
-- Uncomment the following lines if you want to clean up:

-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Or keep it for reference and just rename it
-- ALTER TABLE public.profiles RENAME TO profiles_backup;

-- ==========================================
-- STEP 8: VERIFICATION
-- ==========================================

SELECT 'Schema modification completed!' as status;

-- Check new tables structure
SELECT 'New tables created:' as info;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('patients', 'hospitals')
ORDER BY table_name;

-- Check functions
SELECT 'Functions created:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%current%'
ORDER BY routine_name;

-- Check policies
SELECT 'RLS Policies created:' as info;
SELECT tablename, policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('patients', 'hospitals', 'patient_records')
ORDER BY tablename, policyname;
