import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import * as api from '../services/api';
import { Button, Input, Label, Select } from './ui';

interface Hospital {
  id: string;
  name: string;
}

interface GrantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

const GrantAccessModal: React.FC<GrantAccessModalProps> = ({ isOpen, onClose, patientId }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [duration, setDuration] = useState(7);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real hospitals from API on mount
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const data = await api.getAllHospitals(); // Get all hospitals
        setHospitals(data);
        if (data.length > 0) setHospitalId(data[0].id);
      } catch (err) {
        console.error(err);
        addToast('Failed to fetch hospitals', 'error');
      }
    };

    if (isOpen) fetchHospitals();
  }, [isOpen, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hospitalId || duration <= 0) return;

    setIsLoading(true);
    try {
      // Call your real API to grant access
      await api.grantHospitalAccess(hospitalId, duration); // Grant hospital access

      const hospital = hospitals.find(h => h.id === hospitalId);
      addToast(`Access granted to ${hospital?.name} for ${duration} days.`, 'success');
      onClose();
    } catch (error) {
      console.error(error);
      addToast('Failed to grant access.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-depth w-full max-w-md border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200/50">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <svg 
                    className="w-5 h-5 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Grant Record Access</h2>
                  <p className="text-sm text-slate-500">Share your medical records securely</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm">
                Share your records with a verified hospital for a limited time.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                {/* Hospital selection */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="hospital" className="text-sm font-medium text-slate-700">
                    Select Hospital
                  </Label>
                  <Select
                    id="hospital"
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    className="w-full"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </Select>
                </motion.div>

                {/* Duration selection */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="duration" className="text-sm font-medium text-slate-700">
                    Access Duration (days)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={90}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Maximum 90 days. Access will automatically expire after this period.
                  </p>
                </motion.div>

                {/* Access info */}
                <motion.div 
                  className="p-4 rounded-xl bg-blue-50 border border-blue-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                      <svg 
                        className="w-3 h-3 text-white" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Security Notice</p>
                      <p className="text-xs text-blue-700 mt-1">
                        The hospital will only have read access to your records. You can revoke access at any time.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <motion.div 
                className="px-6 py-4 bg-slate-50/50 backdrop-blur-sm flex justify-end gap-3 rounded-b-2xl border-t border-slate-200/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !hospitalId}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Granting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg 
                        className="w-4 h-4" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      <span>Grant Access</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GrantAccessModal;
