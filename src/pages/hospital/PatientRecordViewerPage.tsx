import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../services/api';
import { supabase } from '../../lib/supabase';
import type { User, MedicalRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const PatientRecordViewerPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDarkMode } = useTheme();

  const [patient, setPatient] = useState<User | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;
      try {
        setIsLoading(true);

        // Fetch patient profile using direct query since we don't have getUserProfile
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (patientError) {
          throw new Error('Failed to fetch patient profile');
        }

        // Convert to User format for compatibility
        const userProfile: User = {
          id: patientData.id,
          email: patientData.email,
          name: patientData.name,
          role: 'patient'
        };
        setPatient(userProfile);

        // Fetch patient's records
        const patientRecords = await api.getPatientRecords(patientId);

        // Map Supabase records to MedicalRecord type
        const mappedRecords: MedicalRecord[] = await Promise.all(
          patientRecords.map(async (r: any) => ({
            id: r.id,
            patientId: r.patient_id,
            name: r.title,
            type: r.record_type,
            uploadDate: new Date(r.created_at).toLocaleDateString(),
            uploadedBy: r.uploaded_by_patient_id ? 'Patient' : 'Hospital',
            fileUrl: r.storage_path ? await api.getRecordDownloadUrl(r.storage_path) : '', // signed URL
          }))
        );

        setRecords(mappedRecords);
      } catch (error) {
        console.error(error);
        addToast('Failed to fetch patient data', 'error');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, addToast, navigate]);

  const handleAddNote = async () => {
    if (!note.trim() || !patientId) return;
    setIsAddingNote(true);
    try {
      // Create a new File object from note text
      const noteFile = new File([note], `note-${Date.now()}.txt`, { type: 'text/plain' });

      const newRecord = await api.uploadRecord(patientId, {
        file: noteFile,
        recordType: 'Note',
        title: 'Clinical Note',
        notes: note
      });

      const formattedRecord: MedicalRecord = {
        id: newRecord.id,
        patientId: newRecord.patient_id,
        name: newRecord.title,
        type: newRecord.record_type,
        uploadDate: new Date(newRecord.created_at).toLocaleDateString(),
        uploadedBy: newRecord.uploaded_by_hospital_id ? 'Hospital' : 'Patient',
        fileUrl: newRecord.storage_path ? await api.getRecordDownloadUrl(newRecord.storage_path) : '',
      };

      setRecords((prev) => [formattedRecord, ...prev]);
      setNote('');
      addToast('Note added successfully', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to add note', 'error');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteRecord = async (record: MedicalRecord) => {
    setRecordToDelete(record);
    setDeleteModalOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteRecord(recordToDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      addToast('Record deleted successfully', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8 text-slate-900 dark:text-slate-100 font-medium">Loading patient records...</div>;
  }

  if (!patient) {
    return <div className="text-center p-8 text-slate-900 dark:text-slate-100 font-medium">Could not find patient data.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        &larr; Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Medical Records for {patient.full_name ?? patient.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-white uppercase bg-slate-600 dark:bg-slate-800 dark:text-white font-semibold">
                    <tr>
                      <th className="px-6 py-3 text-white dark:text-white">Document</th>
                      <th className="px-6 py-3 text-white dark:text-white">Type</th>
                      <th className="px-6 py-3 text-white dark:text-white">Date</th>
                      <th className="px-6 py-3 text-white dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 font-medium" style={{ color: isDarkMode ? '#ffffff' : '#111827' }}>{record.name}</td>
                        <td className="px-6 py-4" style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>{record.type}</td>
                        <td className="px-6 py-4" style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>{record.uploadDate}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(record.fileUrl, '_blank')}
                            className="border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600 font-medium dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900"
                          >
                            <svg className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                console.log('Downloading file:', record.name, 'URL:', record.fileUrl);
                                
                                if (!record.fileUrl) {
                                  addToast('File URL not available', 'error');
                                  return;
                                }

                                // Method 1: Try direct download with fetch
                                try {
                                  const response = await fetch(record.fileUrl);
                                  if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = record.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                  
                                  addToast('File downloaded successfully', 'success');
                                } catch (fetchError) {
                                  console.log('Fetch method failed, trying direct link method:', fetchError);
                                  
                                  // Method 2: Fallback to direct link
                                  const link = document.createElement('a');
                                  link.href = record.fileUrl;
                                  link.download = record.name;
                                  link.target = '_blank';
                                  link.rel = 'noopener noreferrer';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  
                                  addToast('Download initiated', 'info');
                                }
                              } catch (error) {
                                console.error('Download failed:', error);
                                addToast('Failed to download file', 'error');
                              }
                            }}
                            className="border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-medium dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900"
                          >
                            <svg className="w-4 h-4 mr-1 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRecord(record)}
                            className="border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600 font-medium dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900"
                          >
                            <svg className="w-4 h-4 mr-1 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Patient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Name:</strong> {patient.full_name ?? patient.name}</p>
              <p className="text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Email:</strong> {patient.email}</p>
              <p className="text-slate-900 dark:text-white"><strong className="text-slate-900 dark:text-white">Patient ID:</strong> {patient.id}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Add a New Note</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300">Notes are added to the patient's record.</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type clinical notes here..."
                className="w-full h-32 p-3 border border-slate-300 rounded-md bg-white dark:bg-slate-800 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
              />
              <Button onClick={handleAddNote} disabled={isAddingNote || !note.trim()} className="mt-2 w-full">
                {isAddingNote ? 'Saving...' : 'Save Note'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={confirmDeleteRecord}
        recordName={recordToDelete?.name || ''}
      />
    </motion.div>
  );
};

export default PatientRecordViewerPage;
