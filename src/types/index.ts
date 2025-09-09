// Core Types for Smart Health Records

export type UserRole = 'patient' | 'hospital';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at?: string;
  updated_at?: string;
}

// Separate Patient interface
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

// Separate Hospital interface
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

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  created_at: string;
  updated_at: string;
}

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

export interface AccessPermission {
  id: string;
  patient_id: string;
  hospital_id: string;
  granted: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsentHistory {
  id: string;
  hospitalName: string;
  grantDate: string;
  expiryDate?: string;
  status: 'Active' | 'Expired' | 'Revoked';
}

export interface PatientWithAccess {
  id: string;
  name: string;
  email: string;
  accessGrantedOn: string;
  accessExpiresOn?: string;
}

export interface FileUploadData {
  file: File;
  recordType: string;
  title: string;
  notes?: string;
}

export type RecordType = 'Lab Report' | 'Imaging' | 'Prescription' | 'DICOM' | 'Note';

export const RECORD_TYPES: RecordType[] = [
  'Lab Report',
  'Imaging', 
  'Prescription',
  'DICOM',
  'Note'
];
