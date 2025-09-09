import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import type { Patient, AccessPermission } from '../types';
import { useToast } from '../hooks/useToast';
import { Modal, Button, SearchInput, Badge, LoadingSpinner, Alert } from './ui';

interface PatientRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PatientRequestModal: React.FC<PatientRequestModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Partial<Patient>[]>([]);
  const [accessStatuses, setAccessStatuses] = useState<Record<string, AccessPermission | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen, searchTerm]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const patientsData = await api.getAllPatientsForHospital(searchTerm);
      setPatients(patientsData);

      // Check access status for each patient
      const statuses: Record<string, AccessPermission | null> = {};
      for (const patient of patientsData) {
        if (patient.id) {
          try {
            const status = await api.getAccessStatusForPatient(patient.id);
            statuses[patient.id] = status;
          } catch (error) {
            statuses[patient.id] = null;
          }
        }
      }
      setAccessStatuses(statuses);
    } catch (error: any) {
      setError('Failed to load patients');
      addToast('Failed to load patients', 'error');
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (patientId: string) => {
    try {
      await api.requestPatientAccess(patientId);
      addToast('Access request sent successfully!', 'success');
      
      // Update the access status for this patient
      const newStatus = await api.getAccessStatusForPatient(patientId);
      setAccessStatuses(prev => ({
        ...prev,
        [patientId]: newStatus
      }));
    } catch (error: any) {
      addToast(error.message || 'Failed to request access', 'error');
      console.error('Error requesting access:', error);
    }
  };

  const getStatusBadge = (patientId: string) => {
    const status = accessStatuses[patientId];
    
    if (!status) {
      return (
        <Button
          onClick={() => handleRequestAccess(patientId)}
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Request Access
        </Button>
      );
    }

    switch (status.status) {
      case 'pending':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Request Patient Access
            </h2>
            <p className="text-slate-600 mt-1">Search and request access to patient medical records</p>
          </div>
          <Button 
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          placeholder="Search patients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </Alert>
        )}

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-slate-600">Searching patients...</p>
              </div>
            </div>
          ) : patients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Patients Found</h3>
              <p className="text-slate-600">
                {searchTerm ? 'No patients match your search criteria.' : 'No patients available for access requests.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {patients.map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {patient.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                          {patient.name}
                        </h3>
                        <p className="text-sm text-slate-600 group-hover:text-blue-700 transition-colors">
                          {patient.email}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(patient.id!)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white hover:bg-slate-50"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PatientRequestModal;
