import { supabase } from '../lib/supabase';
import type { 
  User, 
  Patient, 
  Hospital, 
  PatientRecord, 
  AccessPermission, 
  UserRole, 
  FileUploadData,
  PatientRecordWithDetails,
  AccessPermissionWithDetails
} from '../types';

// ==================== Authentication ====================

export async function signUpPatient(
  email: string, 
  password: string, 
  name: string,
  additionalData?: {
    phone?: string;
    date_of_birth?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }
): Promise<{ user: any; needsEmailConfirmation: boolean }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'patient',
        name,
        ...additionalData
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  return {
    user: authData.user,
    needsEmailConfirmation: !authData.session
  };
}

export async function signUpHospital(
  email: string, 
  password: string, 
  name: string,
  hospital_name: string,
  license_number: string,
  additionalData?: {
    phone?: string;
    address?: string;
    department?: string;
    specialty?: string;
  }
): Promise<{ user: any; needsEmailConfirmation: boolean }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'hospital',
        name,
        hospital_name,
        license_number,
        ...additionalData
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

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

  return await getCurrentUser() as User;
}

export async function signInAsPatient(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed');

  const user = await getCurrentUser() as User;
  
  // Validate that the user is actually a patient
  if (user.role !== 'patient') {
    // Sign out the user since they shouldn't be logged in with wrong role
    await supabase.auth.signOut();
    throw new Error('This account is not registered as a patient. Please use the Hospital tab to login.');
  }

  return user;
}

export async function signInAsHospital(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed');

  const user = await getCurrentUser() as User;
  
  // Validate that the user is actually a hospital user
  if (user.role !== 'hospital') {
    // Sign out the user since they shouldn't be logged in with wrong role
    await supabase.auth.signOut();
    throw new Error('This account is not registered as a hospital/doctor. Please use the Patient tab to login.');
  }

  return user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Check if user is a patient
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (patient) {
    return {
      id: patient.id,
      email: patient.email,
      role: 'patient',
      name: patient.name
    };
  }

  // Check if user is a hospital
  const { data: hospital, error: hospitalError } = await supabase
    .from('hospitals')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (hospital) {
    return {
      id: hospital.id,
      email: hospital.email,
      role: 'hospital',
      name: hospital.name
    };
  }

  return null;
}

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

export async function getPatientRecordsWithDetails(patientId?: string): Promise<PatientRecordWithDetails[]> {
  let query = supabase
    .from('patient_records_with_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function uploadRecord(
  patientId: string,
  uploadData: FileUploadData
): Promise<PatientRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Use current user ID for patients uploading their own records
  const actualPatientId = user.role === 'patient' ? user.id : patientId;

  // Generate unique file path
  const fileExtension = uploadData.file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const filePath = `${actualPatientId}/${fileName}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('records')
    .upload(filePath, uploadData.file);

  if (uploadError) throw uploadError;

  // Create record in database with appropriate uploader
  const insertData: any = {
    patient_id: actualPatientId, // Use the corrected patient ID
    record_type: uploadData.recordType,
    title: uploadData.title,
    notes: uploadData.notes,
    storage_path: filePath
  };

  if (user.role === 'patient') {
    const patient = await getCurrentPatient();
    insertData.uploaded_by_patient_id = patient?.id;
  } else if (user.role === 'hospital') {
    const hospital = await getCurrentHospital();
    insertData.uploaded_by_hospital_id = hospital?.id;
  }

  const { data, error } = await supabase
    .from('patient_records')
    .insert(insertData)
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
    .select('storage_path, id, patient_id, title')
    .eq('id', recordId)
    .single();

  // If we can't find the record, it might already be deleted or not exist
  if (fetchError) {
    // Don't throw error if record doesn't exist - it's already "deleted"
    if (fetchError.code === 'PGRST116') {
      return;
    }
    throw fetchError;
  }

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

export async function requestPatientAccess(patientId: string, expiryDays?: number): Promise<AccessPermission> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  let expiresAt: string | undefined;
  if (expiryDays) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    expiresAt = expiryDate.toISOString();
  }

  const { data, error } = await supabase
    .from('access_permissions')
    .upsert({
      patient_id: patientId,
      hospital_id: hospital.id,
      status: 'pending',
      expires_at: expiresAt,
      requested_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function respondToAccessRequest(hospitalId: string, approve: boolean): Promise<AccessPermission> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const status = approve ? 'approved' : 'rejected';

  const { data, error } = await supabase
    .from('access_permissions')
    .update({ status })
    .eq('patient_id', patient.id)
    .eq('hospital_id', hospitalId)
    .eq('status', 'pending') // Only update pending requests
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingAccessRequests(): Promise<AccessPermissionWithDetails[]> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { data, error } = await supabase
    .from('pending_access_requests')
    .select('*')
    .eq('patient_id', patient.id)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMyAccessRequests(): Promise<AccessPermissionWithDetails[]> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  const { data, error } = await supabase
    .from('access_permissions')
    .select(`
      *,
      patient:patients(name, email),
      hospital:hospitals(name, hospital_name, email)
    `)
    .eq('hospital_id', hospital.id)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function grantHospitalAccess(
  hospitalId: string,
  expiryDays?: number
): Promise<AccessPermission> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  let expiresAt: string | undefined;
  if (expiryDays) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    expiresAt = expiryDate.toISOString();
  }

  const { data, error } = await supabase
    .from('access_permissions')
    .upsert({
      patient_id: patient.id,
      hospital_id: hospitalId,
      status: 'approved',
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
    .update({ status: 'rejected' })
    .eq('patient_id', patient.id)
    .eq('hospital_id', hospitalId);

  if (error) throw error;
}

export async function getMyAccessPermissions(): Promise<AccessPermissionWithDetails[]> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { data, error } = await supabase
    .from('active_access_permissions')
    .select('*')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Test function to check database schema
export async function testDatabaseSchema(): Promise<void> {
  console.log('=== Testing Database Schema ===');
  
  try {
    // Test access_permissions table structure
    const { data: accessTest, error: accessError } = await supabase
      .from('access_permissions')
      .select('*')
      .limit(1);
    
    console.log('access_permissions table test:', { accessTest, accessError });
    
    if (accessTest && accessTest.length > 0) {
      console.log('access_permissions columns:', Object.keys(accessTest[0]));
    }

    // Test patients table
    const { data: patientsTest, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    console.log('patients table test:', { patientsTest, patientsError });

    // Test hospitals table
    const { data: hospitalsTest, error: hospitalsError } = await supabase
      .from('hospitals')
      .select('*')
      .limit(1);
    
    console.log('hospitals table test:', { hospitalsTest, hospitalsError });

    // Test current user functions
    const currentUser = await getCurrentUser();
    const currentHospital = await getCurrentHospital();
    const currentPatient = await getCurrentPatient();
    
    console.log('Current user info:', { currentUser, currentHospital, currentPatient });

  } catch (error) {
    console.error('Database schema test failed:', error);
  }
}

export async function getPatientsWithAccess(): Promise<AccessPermissionWithDetails[]> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  try {
    // First try to get data directly from access_permissions table
    const { data: accessData, error: accessError } = await supabase
      .from('access_permissions')
      .select('*')
      .eq('hospital_id', hospital.id);

    if (accessError) {
      throw accessError;
    }

    if (!accessData || accessData.length === 0) {
      return [];
    }

    // Check if status column exists and filter by status
    const filteredAccess = accessData.filter(permission => {
      // If status column exists, filter by 'approved'
      if ('status' in permission) {
        return permission.status === 'approved';
      }
      // If status column doesn't exist, filter by granted = true (old schema)
      if ('granted' in permission) {
        return permission.granted === true;
      }
      // Default to include if neither column exists
      return true;
    });

    if (filteredAccess.length === 0) {
      return [];
    }

    // Get patient and hospital details for each permission
    const result = [];
    for (const permission of filteredAccess) {
      try {
        // Get patient details
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id, name, email')
          .eq('id', permission.patient_id)
          .single();

        if (patientError) {
          console.error('Error fetching patient:', patientError);
          continue;
        }

        // Get hospital details
        const { data: hospitalData, error: hospitalError } = await supabase
          .from('hospitals')
          .select('id, name, hospital_name, email')
          .eq('id', permission.hospital_id)
          .single();

        if (hospitalError) {
          console.error('Error fetching hospital:', hospitalError);
          continue;
        }

        result.push({
          ...permission,
          patient_name: patient?.name || 'Unknown',
          patient_email: patient?.email || 'Unknown',
          hospital_contact_name: hospitalData?.name || 'Unknown',
          hospital_name: hospitalData?.hospital_name || 'Unknown',
          hospital_email: hospitalData?.email || 'Unknown'
        });
      } catch (err) {
        console.error('Error processing permission:', err);
        continue;
      }
    }

    return result;

  } catch (error) {
    console.error('getPatientsWithAccess: Unexpected error:', error);
    throw error;
  }
}

export async function getAllPatientsForHospital(searchTerm?: string): Promise<Partial<Patient>[]> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  let query = supabase
    .from('patients')
    .select('id, name, email')
    .order('name');

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAccessStatusForPatient(patientId: string): Promise<AccessPermission | null> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  const { data, error } = await supabase
    .from('access_permissions')
    .select('*')
    .eq('patient_id', patientId)
    .eq('hospital_id', hospital.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data;
}

// ==================== Hospital and Patient Management ====================

export async function getAllHospitals(): Promise<Hospital[]> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('*')
    .eq('verified', true)
    .order('hospital_name');

  if (error) throw error;
  return data || [];
}

export async function getAllPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function updatePatientProfile(updates: Partial<Patient>): Promise<Patient> {
  const patient = await getCurrentPatient();
  if (!patient) throw new Error('Not authenticated as patient');

  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patient.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHospitalProfile(updates: Partial<Hospital>): Promise<Hospital> {
  const hospital = await getCurrentHospital();
  if (!hospital) throw new Error('Not authenticated as hospital');

  const { data, error } = await supabase
    .from('hospitals')
    .update(updates)
    .eq('id', hospital.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== Legacy Support Functions ====================

// Legacy signUp function for backward compatibility
export async function signUp(
  email: string, 
  password: string, 
  role: UserRole, 
  name: string
): Promise<{ user: any; needsEmailConfirmation: boolean }> {
  if (role === 'patient') {
    return signUpPatient(email, password, name);
  } else if (role === 'hospital') {
    // For legacy calls, use basic hospital signup with placeholder data
    return signUpHospital(email, password, name, 'Unknown Hospital', `TEMP_${Date.now()}`);
  }
  throw new Error('Invalid role specified');
}
