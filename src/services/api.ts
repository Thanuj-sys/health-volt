// services/api.ts
import { supabase } from './supabaseclient';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'patient' | 'hospital' | 'admin';

export type Hospital = {
  id: string;
  name: string;
};

// ==================== Auth / Signup ====================
export async function signUp(email: string, password: string, role: Role, fullName?: string) {
  // First, try to sign up the user with metadata and disable email confirmation temporarily
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role,
        full_name: fullName
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (authErr) throw authErr;

  const user = authData.user;
  if (!user) throw new Error('No user returned from signUp');

  try {
    // Create the profile immediately after signup
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role,
        name: fullName,
        full_name: fullName,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    // Create role-specific record
    if (role === 'patient') {
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          profile_id: user.id,
          created_at: new Date().toISOString()
        });
      if (patientError) {
        console.error('Patient record creation error:', patientError);
        throw patientError;
      }
    } else if (role === 'hospital') {
      const { error: hospError } = await supabase
        .from('hospitals')
        .insert({
          profile_id: user.id,
          name: fullName ?? 'Hospital',
          created_at: new Date().toISOString()
        });
      if (hospError) {
        console.error('Hospital record creation error:', hospError);
        throw hospError;
      }
    }

    return {
      user,
      session: authData.session,
      confirmEmail: true
    };
  } catch (error) {
    console.error('Error in signup process:', error);
    // If anything fails, attempt to clean up
    await supabase.auth.signOut();
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ==================== Profile ====================
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // First try to get role from user metadata (faster)
  const role = user.user_metadata?.role;
  
  if (role) {
    return {
      id: user.id,
      email: user.email,
      role: role,
      name: user.user_metadata?.full_name || user.email,
      full_name: user.user_metadata?.full_name
    };
  }

  // Fallback to profile table if metadata is not available
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, name, full_name')
    .eq('id', user.id)
    .single();
    
  if (error) {
    console.error('Failed to get profile:', error);
    throw error;
  }
  
  return {
    ...data,
    id: user.id,
    email: user.email,
    role: data.role || 'patient' // Default to patient if role is not set
  };
}

// ==================== Records ====================
export async function listRecordsForMe() {
  // Filter by current user's ID to satisfy common RLS policies
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;
  if (!currentUserId) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .eq('patient_id', currentUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listRecordsForPatient(patientId: string) {
  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadRecord(file: File, patientId: string, recordType: string, title?: string, notes?: string) {
  const fileId = uuidv4();
  const path = `${patientId}/${fileId}-${file.name}`;

  const { error: upErr } = await supabase.storage.from('records').upload(path, file);
  if (upErr) throw upErr;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase.from('patient_records').insert({
    patient_id: patientId,
    uploaded_by: user.id,
    record_type: recordType,
    title: title ?? file.name,
    notes: notes ?? null,
    storage_path: path,
  }).select('*').single();
  if (error) throw error;

  return data;
}

export async function getRecordSignedUrl(storagePath: string, expiresInSec = 60) {
  const { data, error } = await supabase.storage.from('records').createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteRecord(recordId: string) {
  // First get the record to find the storage path
  const { data: record, error: fetchError } = await supabase
    .from('patient_records')
    .select('storage_path')
    .eq('id', recordId)
    .single();
    
  if (fetchError) throw fetchError;
  
  // Delete the file from storage if it exists
  if (record.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('records')
      .remove([record.storage_path]);
    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }
  
  // Delete the record from the database
  const { error } = await supabase
    .from('patient_records')
    .delete()
    .eq('id', recordId);
    
  if (error) throw error;
}

// ==================== Hospitals ====================
export async function listHospitals(): Promise<Hospital[]> {
  const { data, error } = await supabase.from('hospitals').select('id, name');
  if (error) throw error;
  return data ?? [];
}

// ==================== Permissions / Consent ====================
export async function grantAccess(patientId: string, hospitalId: string, durationDays?: number) {
  let expiresAt: string | null = null;
  if (durationDays) {
    const date = new Date();
    date.setDate(date.getDate() + durationDays);
    expiresAt = date.toISOString();
  }

  const { data, error } = await supabase.from('access_permissions').upsert({
    patient_id: patientId,
    hospital_id: hospitalId,
    granted: true,
    expires_at: expiresAt
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function revokeAccess(patientId: string, hospitalId: string) {
  const { data, error } = await supabase.from('access_permissions').update({
    granted: false
  }).eq('patient_id', patientId).eq('hospital_id', hospitalId).select('*').single();
  if (error) throw error;
  return data;
}

export async function listMyPermissions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('access_permissions')
    .select('*, patient:patient_id(full_name), hospital:hospital_id(full_name)')
    .or(`patient_id.eq.${user.id},hospital_id.eq.${user.id}`);
  if (error) throw error;
  return data;
}

export async function getConsentHistory() {
  const { data, error } = await supabase.from('consent_history').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== List Patients with Access ====================
export async function listPatientsWithAccess(hospitalId: string) {
  const { data, error } = await supabase
    .from('access_permissions')
    .select('*, patient:patient_id(id, full_name, email), expires_at')
    .eq('hospital_id', hospitalId)
    .eq('granted', true);

  if (error) throw error;

  return data.map((item: any) => ({
    id: item.patient.id,
    name: item.patient.full_name,
    email: item.patient.email,
    accessExpiresOn: item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'N/A'
  }));
}

// ==================== Function Aliases for Compatibility ====================
// These aliases ensure compatibility with existing component imports

export const getAllHospitals = listHospitals;
export const getMyRecords = listRecordsForMe;
export const getRecordDownloadUrl = getRecordSignedUrl;
export const getMyAccessPermissions = listMyPermissions;
export const getPatientsWithAccess = listPatientsWithAccess;

// Additional missing functions that need to be implemented
export async function grantHospitalAccess(hospitalId: string, durationDays?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return grantAccess(user.id, hospitalId, durationDays);
}

export async function revokeHospitalAccess(hospitalId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return revokeAccess(user.id, hospitalId);
}

export async function getPendingAccessRequests() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Get access requests for the current hospital
  const { data, error } = await supabase
    .from('access_permissions')
    .select('*, patient:patient_id(name, email)')
    .eq('hospital_id', user.id)
    .eq('granted', false)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function respondToAccessRequest(requestId: string, approve: boolean) {
  const { data, error } = await supabase
    .from('access_permissions')
    .update({ granted: approve })
    .eq('id', requestId)
    .select('*')
    .single();
    
  if (error) throw error;
  return { success: true, data };
}

export async function getAllPatientsForHospital() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'patient')
    .order('name');
    
  if (error) throw error;
  return data || [];
}

export async function getAccessStatusForPatient(patientId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('access_permissions')
    .select('granted, expires_at')
    .eq('patient_id', patientId)
    .eq('hospital_id', user.id)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  
  return { 
    hasAccess: data?.granted || false,
    expiresAt: data?.expires_at 
  };
}

export async function requestPatientAccess(patientId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('access_permissions')
    .upsert({
      patient_id: patientId,
      hospital_id: user.id,
      granted: false, // Initially not granted, patient needs to approve
      created_at: new Date().toISOString()
    })
    .select('*')
    .single();
    
  if (error) throw error;
  return { success: true, data };
}

export async function getPatientRecords(patientId: string) {
  return listRecordsForPatient(patientId);
}
