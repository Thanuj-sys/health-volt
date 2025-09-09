import { supabase } from '../lib/supabase';
import type { User, Profile, PatientRecord, AccessPermission, UserRole, FileUploadData } from '../types/index';

// ==================== Authentication ====================

export async function signUp(
  email: string, 
  password: string, 
  role: UserRole, 
  name: string
): Promise<{ user: any; needsEmailConfirmation: boolean }> {
  console.log('🔧 Starting signup with role:', role, 'name:', name);
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        name
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  console.log('✅ Auth user created:', authData.user.id);

  // Always try to create profile, even if email confirmation is required
  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        role,
        name
      });

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      // Don't throw error, as user auth was successful
      console.log('⚠️ Will retry profile creation on login');
    } else {
      console.log('✅ Profile created successfully');
    }
  } catch (error) {
    console.error('❌ Profile creation error:', error);
  }

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

  return await getUserProfile(data.user.id);
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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // If profile doesn't exist, create it from user metadata
  if (error || !profile) {
    console.log('⚠️ Profile not found, creating from user metadata...');
    
    const role = (user.user_metadata?.role || 'patient') as UserRole;
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    console.log('🔧 Creating profile with role:', role, 'name:', name);
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        role,
        name
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create profile:', createError);
      throw new Error('Failed to create user profile');
    }

    console.log('✅ Profile created successfully');
    
    return {
      id: newProfile.id,
      email: user.email || '',
      role: newProfile.role,
      name: newProfile.name
    };
  }

  return {
    id: profile.id,
    email: user.email || '',
    role: profile.role,
    name: profile.name
  };
}

// ==================== Patient Records ====================

export async function getMyRecords(): Promise<PatientRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .eq('patient_id', user.id)
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
  uploadData: FileUploadData
): Promise<PatientRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate unique file path
  const fileExtension = uploadData.file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const filePath = `${patientId}/${fileName}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('records')
    .upload(filePath, uploadData.file);

  if (uploadError) throw uploadError;

  // Create record in database
  const { data, error } = await supabase
    .from('patient_records')
    .insert({
      patient_id: patientId,
      uploaded_by: user.id,
      record_type: uploadData.recordType,
      title: uploadData.title,
      notes: uploadData.notes,
      storage_path: filePath
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecordDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('records')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteRecord(recordId: string): Promise<void> {
  // First get the record to find the storage path
  const { data: record, error: fetchError } = await supabase
    .from('patient_records')
    .select('storage_path')
    .eq('id', recordId)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage if path exists
  if (record.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('records')
      .remove([record.storage_path]);
    
    if (storageError) console.warn('Storage deletion failed:', storageError);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('patient_records')
    .delete()
    .eq('id', recordId);

  if (deleteError) throw deleteError;
}

// ==================== Access Permissions ====================

export async function grantHospitalAccess(
  hospitalId: string,
  expiryDays?: number
): Promise<AccessPermission> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let expiresAt: string | undefined;
  if (expiryDays) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    expiresAt = expiryDate.toISOString();
  }

  const { data, error } = await supabase
    .from('access_permissions')
    .upsert({
      patient_id: user.id,
      hospital_id: hospitalId,
      granted: true,
      expires_at: expiresAt
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeHospitalAccess(hospitalId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('access_permissions')
    .update({ granted: false })
    .eq('patient_id', user.id)
    .eq('hospital_id', hospitalId);

  if (error) throw error;
}

export async function getMyAccessPermissions(): Promise<AccessPermission[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('access_permissions')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPatientsWithAccess(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('access_permissions')
    .select(`
      id,
      patient_id,
      hospital_id,
      granted,
      expires_at,
      created_at,
      updated_at,
      patient:profiles!access_permissions_patient_id_fkey(name, id)
    `)
    .eq('hospital_id', user.id)
    .eq('granted', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ==================== Hospital Management ====================

export async function getAllHospitals(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'hospital')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getAllPatients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'patient')
    .order('name');

  if (error) throw error;
  return data || [];
}
