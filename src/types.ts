
export type UserRole = 'patient' | 'hospital';

// Base user interface for auth context
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

// Patient profile from new schema
export interface Patient {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Hospital profile from new schema
export interface Hospital {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  hospital_name: string;
  license_number: string;
  phone?: string;
  address?: string;
  department?: string;
  specialty?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// Patient record from new schema
export interface PatientRecord {
  id: string;
  patient_id: string;
  uploaded_by_hospital_id?: string;
  uploaded_by_patient_id?: string;
  record_type: 'Lab Report' | 'Imaging' | 'Prescription' | 'DICOM' | 'Note';
  title: string;
  notes?: string;
  storage_path?: string;
  created_at: string;
  updated_at: string;
}

// Access permission from new schema
export interface AccessPermission {
  id: string;
  patient_id: string;
  hospital_id: string;
  granted?: boolean; // Legacy field, keep for compatibility
  status: 'pending' | 'approved' | 'rejected';
  expires_at?: string;
  requested_at: string;
  created_at: string;
  updated_at: string;
}

// File upload data interface
export interface FileUploadData {
  file: File;
  recordType: 'Lab Report' | 'Imaging' | 'Prescription' | 'DICOM' | 'Note';
  title: string;
  notes?: string;
}

// Extended interfaces with joined data
export interface PatientRecordWithDetails extends PatientRecord {
  patient_name: string;
  patient_email: string;
  uploaded_by_name: string;
  uploaded_by_role: 'patient' | 'hospital' | 'unknown';
}

export interface AccessPermissionWithDetails extends AccessPermission {
  patient_name: string;
  patient_email: string;
  hospital_contact_name: string;
  hospital_name: string;
  hospital_email: string;
}

// Legacy interfaces for backward compatibility
export interface MedicalRecord {
  id: string;
  patientId: string;
  type: 'Lab Report' | 'Imaging' | 'Prescription' | 'DICOM' | 'Note';
  name: string;
  uploadDate: string;
  fileUrl: string;
  uploadedBy: string;
}

export interface Consent {
  id: string;
  hospitalId: string;
  hospitalName: string;
  patientId: string;
  grantDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired';
}

export interface AccessLog {
  id: string;
  hospitalName: string;
  recordId: string;
  recordName: string;
  accessDate: string;
}

export interface PatientWithAccess {
  id: string;
  name: string;
  email: string;
  accessGrantedOn: string;
  accessExpiresOn: string;
}
