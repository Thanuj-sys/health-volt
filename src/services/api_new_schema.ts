import { supabase } from '../lib/supabase';
import type { User, Patient, Hospital, PatientRecord, AccessPermission, UserRole, FileUploadData } from '../types/index';

// ==================== Authentication ====================

export async function signUp(
  email: string, 
  password: string, 
  role: UserRole, 
  name: string,
  additionalData?: { hospital_name?: string; license_number?: string }
): Promise<{ user: any; needsEmailConfirmation: boolean }> {
  const metadata = {
    role,
    name,
    ...additionalData
  };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // The triggers will automatically create the patient or hospital record
  // based on the role in metadata

  return {
    user: authData.user,
    needsEmailConfirmation: !authData.session
  };
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed');

  return await getCurrentUser();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return await getUserProfile(user.id);
}

export async function getUserProfile(userId: string): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to get patient profile first
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (!patientError && patient) {
    return {
      id: patient.id,
      email: patient.email,
      role: 'patient',
      name: patient.name
    };
  }

  // Try to get hospital profile
  const { data: hospital, error: hospitalError } = await supabase
    .from('hospitals')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (!hospitalError && hospital) {
    return {
      id: hospital.id,
      email: hospital.email,
      role: 'hospital',
      name: hospital.name
    };
  }

  throw new Error('Profile not found');
}

// ==================== Patient-specific functions ====================

export async function getCurrentPatient(): Promise<Patient | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error) return null;
  return patient;
}

export async function getCurrentHospital(): Promise<Hospital | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: hospital, error } = await supabase
    .from('hospitals')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error) return null;
  return hospital;
}

// ==================== Patient Records ====================

export async function getMyRecords(): Promise<PatientRecord[]> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPatientRecords(patientId: string): Promise<PatientRecord[]> {
  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadRecord(
  patientId: string,
  recordData: {
    record_type: string;
    title: string;
    notes?: string;
    storage_path: string;
  }
): Promise<PatientRecord> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  const insertData: any = {
    patient_id: patientId,
    record_type: recordData.record_type,
    title: recordData.title,
    notes: recordData.notes,
    storage_path: recordData.storage_path
  };

  // Set uploader based on user role
  if (currentUser.role === 'patient') {
    const patient = await getCurrentPatient();
    if (!patient) throw new Error('Patient profile not found');
    insertData.uploaded_by_patient_id = patient.id;
  } else if (currentUser.role === 'hospital') {
    const hospital = await getCurrentHospital();
    if (!hospital) throw new Error('Hospital profile not found');
    insertData.uploaded_by_hospital_id = hospital.id;
  }

  const { data, error } = await supabase
    .from('patient_records')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== File Upload ====================

export async function uploadFile(file: File, patientId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${patientId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('records')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  return filePath;
}

export async function getRecordDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('records')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
}

// ==================== Access Permissions ====================

export async function getMyAccessPermissions(): Promise<AccessPermission[]> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { data, error } = await supabase
    .from('access_permissions')
    .select(`
      *,
      hospitals (
        id,
        name,
        hospital_name
      )
    `)
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function grantHospitalAccess(
  hospitalEmail: string,
  expiresAt?: string
): Promise<AccessPermission> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  // Find hospital by email
  const { data: hospital, error: hospitalError } = await supabase
    .from('hospitals')
    .select('id')
    .eq('email', hospitalEmail)
    .single();

  if (hospitalError) throw new Error('Hospital not found');

  const { data, error } = await supabase
    .from('access_permissions')
    .insert({
      patient_id: patient.id,
      hospital_id: hospital.id,
      granted: true,
      expires_at: expiresAt
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeHospitalAccess(hospitalId: string): Promise<void> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { error } = await supabase
    .from('access_permissions')
    .update({ granted: false })
    .eq('patient_id', patient.id)
    .eq('hospital_id', hospitalId);

  if (error) throw error;
}

// ==================== Hospital-specific functions ====================

export async function getPatientsWithAccess(): Promise<any[]> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  const { data, error } = await supabase
    .from('access_permissions')
    .select(`
      *,
      patients (
        id,
        name,
        email
      )
    `)
    .eq('hospital_id', hospital.id)
    .eq('granted', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(permission => ({
    id: permission.patients.id,
    name: permission.patients.name,
    email: permission.patients.email,
    accessGrantedOn: permission.created_at,
    accessExpiresOn: permission.expires_at
  }));
}

// ==================== Medical Record Types ====================

export interface MedicalRecord {
  id: string;
  patientId: string;
  type: string;
  name: string;
  uploadDate: string;
  fileUrl: string;
  uploadedBy: string;
}

// Transform PatientRecord to MedicalRecord for backwards compatibility
export function transformToMedicalRecord(record: PatientRecord): MedicalRecord {
  return {
    id: record.id,
    patientId: record.patient_id,
    type: record.record_type,
    name: record.title,
    uploadDate: new Date(record.created_at).toLocaleDateString(),
    fileUrl: record.storage_path || '',
    uploadedBy: record.uploaded_by_patient_id ? 'Patient' : 'Hospital'
  };
}
