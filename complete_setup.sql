-- Complete Database Setup for Smart Health Records
-- Run this ENTIRE script in your Supabase Dashboard SQL Editor

-- ===== STEP 1: Create profiles table =====
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id uuid references auth.users(id) ON DELETE CASCADE primary key,
    role text not null check (role in ('patient', 'hospital')),
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== STEP 2: Create RLS Policies for profiles =====
-- Allow anyone to read profiles (for hospital/patient lists)
CREATE POLICY "Allow public read access" ON public.profiles
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own profile


CREATE POLICY "Allow authenticated insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ===== STEP 3: Create patient_records table =====
DROP TABLE IF EXISTS public.patient_records CASCADE;
CREATE TABLE public.patient_records (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references auth.users(id) ON DELETE CASCADE not null,
    uploaded_by uuid references auth.users(id) ON DELETE CASCADE not null,
    record_type text not null check (record_type in ('Lab Report', 'Imaging', 'Prescription', 'DICOM', 'Note')),
    title text not null,
    notes text,
    storage_path text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

-- ===== STEP 4: Create access_permissions table =====
DROP TABLE IF EXISTS public.access_permissions CASCADE;
CREATE TABLE public.access_permissions (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references auth.users(id) ON DELETE CASCADE not null,
    hospital_id uuid references auth.users(id) ON DELETE CASCADE not null,
    granted boolean default true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(patient_id, hospital_id)
);

-- Enable RLS
ALTER TABLE public.access_permissions ENABLE ROW LEVEL SECURITY;

-- ===== STEP 5: Create RLS Policies for patient_records =====
-- Patients can view their own records
CREATE POLICY "Patients can view own records" ON public.patient_records
    FOR SELECT USING (auth.uid() = patient_id);

-- Hospitals with access can view patient records
CREATE POLICY "Hospitals can view permitted records" ON public.patient_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.access_permissions
            WHERE hospital_id = auth.uid()
            AND patient_id = patient_records.patient_id
            AND granted = true
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- Users can insert their own records
CREATE POLICY "Users can insert own records" ON public.patient_records
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Users can update their own records
CREATE POLICY "Users can update own records" ON public.patient_records
    FOR UPDATE USING (auth.uid() = patient_id);

-- Users can delete their own records
CREATE POLICY "Users can delete own records" ON public.patient_records
    FOR DELETE USING (auth.uid() = patient_id);

-- ===== STEP 6: Create RLS Policies for access_permissions =====
-- Users can view permissions where they are involved
CREATE POLICY "Users can view related permissions" ON public.access_permissions
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = hospital_id);

-- Patients can manage their own permissions
CREATE POLICY "Patients can manage permissions" ON public.access_permissions
    FOR ALL USING (auth.uid() = patient_id);

-- ===== STEP 7: Create updated_at trigger function =====
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== STEP 8: Create triggers =====
DROP TRIGGER IF EXISTS handle_updated_at_profiles ON public.profiles;
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_records ON public.patient_records;
CREATE TRIGGER handle_updated_at_records
    BEFORE UPDATE ON public.patient_records
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_permissions ON public.access_permissions;
CREATE TRIGGER handle_updated_at_permissions
    BEFORE UPDATE ON public.access_permissions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- ===== STEP 9: Create storage bucket and policies =====
-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) 
VALUES ('records', 'records', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own records" ON storage.objects;
CREATE POLICY "Users can upload own records" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'records' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own records" ON storage.objects;
CREATE POLICY "Users can view own records" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'records'
        AND (
            -- Patient accessing their own records
            auth.uid()::text = (storage.foldername(name))[1]
            OR
            -- Hospital with permission accessing patient records
            EXISTS (
                SELECT 1 FROM public.access_permissions
                WHERE hospital_id = auth.uid()
                AND patient_id::text = (storage.foldername(name))[1]
                AND granted = true
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

-- ===== STEP 10: Verify setup =====
SELECT 'Setup completed successfully!' as status;
SELECT 'Profiles table:' as info, count(*) as row_count FROM public.profiles;
SELECT 'Patient records table:' as info, count(*) as row_count FROM public.patient_records;
SELECT 'Access permissions table:' as info, count(*) as row_count FROM public.access_permissions;
