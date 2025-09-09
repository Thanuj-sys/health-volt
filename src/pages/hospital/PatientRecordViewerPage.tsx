import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import { supabase } from '../../lib/supabase';
import type { User, MedicalRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui';

const PatientRecordViewerPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [patient, setPatient] = useState<User | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

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
              <CardTitle className="text-gray-900 dark:text-white" style={{ color: '#111827' }}>Medical Records for {patient.full_name ?? patient.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-900 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-100 font-semibold">
                    <tr>
                      <th className="px-6 py-3 text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Document</th>
                      <th className="px-6 py-3 text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Type</th>
                      <th className="px-6 py-3 text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Date</th>
                      <th className="px-6 py-3 text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white" style={{ color: '#111827' }}>{record.name}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-100" style={{ color: '#1f2937' }}>{record.type}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-100" style={{ color: '#1f2937' }}>{record.uploadDate}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(record.fileUrl, '_blank')}
                            className="border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600 font-medium"
                            style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = record.fileUrl;
                              link.download = record.name;
                              link.click();
                            }}
                            className="border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-medium"
                            style={{ borderColor: '#22c55e', color: '#15803d' }}
                          >
                            Download
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
              <CardTitle className="text-gray-900 dark:text-white" style={{ color: '#111827' }}>Patient Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}><strong className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Name:</strong> {patient.full_name ?? patient.name}</p>
              <p className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}><strong className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Email:</strong> {patient.email}</p>
              <p className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}><strong className="text-slate-900 dark:text-slate-100" style={{ color: '#111827' }}>Patient ID:</strong> {patient.id}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white" style={{ color: '#111827' }}>Add a New Note</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300" style={{ color: '#374151' }}>Notes are added to the patient's record.</CardDescription>
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
    </motion.div>
  );
};

export default PatientRecordViewerPage;
