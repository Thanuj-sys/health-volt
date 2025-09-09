-- Complete database setup with optimized schema
-- Drop existing tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS access_permissions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table (base user information)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'hospital')),
    avatar_url TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients table (specific patient information)
CREATE TABLE patients (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    blood_type TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hospitals table (specific hospital information)
CREATE TABLE hospitals (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    license_number TEXT NOT NULL UNIQUE,
    hospital_type TEXT NOT NULL DEFAULT 'general' CHECK (hospital_type IN ('general', 'specialty', 'clinic', 'emergency', 'rehabilitation')),
    specialties TEXT[] DEFAULT '{}',
    bed_capacity INTEGER DEFAULT 0,
    established_year INTEGER,
    accreditation_status TEXT DEFAULT 'pending' CHECK (accreditation_status IN ('pending', 'verified', 'suspended')),
    website_url TEXT,
    emergency_services BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Medical records table
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    uploaded_by_profile_id UUID NOT NULL REFERENCES profiles(id),
    record_type TEXT NOT NULL CHECK (record_type IN ('Lab Report', 'Imaging', 'Prescription', 'DICOM', 'Clinical Note', 'Discharge Summary', 'Vaccination Record')),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    file_size BIGINT,
    file_type TEXT,
    is_critical BOOLEAN DEFAULT false,
    visit_date DATE,
    doctor_name TEXT,
    hospital_name TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Access permissions table
CREATE TABLE access_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    granted_by_profile_id UUID NOT NULL REFERENCES profiles(id),
    permission_type TEXT NOT NULL DEFAULT 'read' CHECK (permission_type IN ('read', 'write', 'admin')),
    specific_record_types TEXT[] DEFAULT '{}', -- empty array means all types
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, hospital_id) -- One permission per patient-hospital pair
);

-- 6. Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    performed_by_profile_id UUID REFERENCES profiles(id),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_type ON medical_records(record_type);
CREATE INDEX idx_medical_records_created_at ON medical_records(created_at DESC);
CREATE INDEX idx_access_permissions_patient_id ON access_permissions(patient_id);
CREATE INDEX idx_access_permissions_hospital_id ON access_permissions(hospital_id);
CREATE INDEX idx_access_permissions_expires_at ON access_permissions(expires_at);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by_profile_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_access_permissions_updated_at BEFORE UPDATE ON access_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_hospitals AFTER INSERT OR UPDATE OR DELETE ON hospitals FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_medical_records AFTER INSERT OR UPDATE OR DELETE ON medical_records FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_access_permissions AFTER INSERT OR UPDATE OR DELETE ON access_permissions FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Storage setup
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', false);

-- Row Level Security Policies

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Hospitals can view patient profiles they have access to" ON profiles
    FOR SELECT USING (
        role = 'patient' AND 
        EXISTS (
            SELECT 1 FROM access_permissions ap
            JOIN hospitals h ON h.id = ap.hospital_id
            WHERE ap.patient_id = profiles.id 
            AND h.id = auth.uid()
            AND ap.is_active = true
            AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
        )
    );

-- Patients policies
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own data" ON patients
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Hospitals can view patients they have access to" ON patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_permissions ap
            JOIN hospitals h ON h.id = ap.hospital_id
            WHERE ap.patient_id = patients.id 
            AND h.id = auth.uid()
            AND ap.is_active = true
            AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
        )
    );

-- Hospitals policies
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospitals can manage own data" ON hospitals
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Patients can view hospitals for granting access" ON hospitals
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient')
    );

-- Medical records policies
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage own records" ON medical_records
    FOR ALL USING (
        patient_id = auth.uid() OR
        uploaded_by_profile_id = auth.uid()
    );

CREATE POLICY "Hospitals can view records they have access to" ON medical_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_permissions ap
            JOIN hospitals h ON h.id = ap.hospital_id
            WHERE ap.patient_id = medical_records.patient_id 
            AND h.id = auth.uid()
            AND ap.is_active = true
            AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
            AND (
                array_length(ap.specific_record_types, 1) IS NULL OR
                medical_records.record_type = ANY(ap.specific_record_types)
            )
        )
    );

CREATE POLICY "Hospitals can insert records for patients they have access to" ON medical_records
    FOR INSERT WITH CHECK (
        uploaded_by_profile_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM access_permissions ap
            JOIN hospitals h ON h.id = ap.hospital_id
            WHERE ap.patient_id = medical_records.patient_id 
            AND h.id = auth.uid()
            AND ap.is_active = true
            AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
            AND ap.permission_type IN ('write', 'admin')
        )
    );

-- Access permissions policies
ALTER TABLE access_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage their access permissions" ON access_permissions
    FOR ALL USING (
        patient_id = auth.uid() OR
        granted_by_profile_id = auth.uid()
    );

CREATE POLICY "Hospitals can view permissions granted to them" ON access_permissions
    FOR SELECT USING (hospital_id = auth.uid());

-- Audit logs policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their own actions" ON audit_logs
    FOR SELECT USING (performed_by_profile_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'medical-records' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical-records' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Hospitals can view files they have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical-records' AND
        EXISTS (
            SELECT 1 FROM access_permissions ap
            JOIN hospitals h ON h.id = ap.hospital_id
            WHERE ap.patient_id::text = (storage.foldername(name))[1]
            AND h.id = auth.uid()
            AND ap.is_active = true
            AND (ap.expires_at IS NULL OR ap.expires_at > NOW())
        )
    );

-- Utility functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE access_permissions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
