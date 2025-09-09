import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import type { AccessPermissionWithDetails } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, SearchInput, CardDescription, Badge, LoadingSpinner, Alert } from '../../components/ui';
import PatientRequestModal from '../../components/PatientRequestModal';

const HospitalDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<AccessPermissionWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                setError(null);
                console.log('HospitalDashboard: Fetching patients for user:', user);
                
                // Get patients with access to hospital
                const data = await api.getPatientsWithAccess();
                console.log('HospitalDashboard: Received data:', data);
                setPatients(data);
            } catch (error) {
                console.error('HospitalDashboard: Error fetching patients:', error);
                setError(`Failed to fetch patient list: ${error.message}`);
                addToast(`Failed to fetch patient list: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatients();
    }, [user, addToast]);

    const filteredPatients = useMemo(() => {
        return patients.filter(p =>
            p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.patient_email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [patients, searchTerm]);

    const refreshPatients = async () => {
        try {
            const data = await api.getPatientsWithAccess();
            setPatients(data);
        } catch (error) {
            console.error(error);
            addToast('Failed to refresh patient list', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-slate-600">Loading your dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header Section */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Hospital Dashboard
                            </h1>
                            <p className="text-slate-600 mt-1">Manage patient access and view medical records</p>
                        </div>
                        <Button 
                            onClick={() => setShowRequestModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Request Patient Access
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Alert variant="destructive">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        </Alert>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                        <CardHeader className="pb-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle className="text-2xl flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        Patients with Active Access
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        The following patients have granted you access to their medical records.
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                    {patients.length} {patients.length === 1 ? 'Patient' : 'Patients'}
                                </Badge>
                            </div>
                            
                            <div className="mt-6">
                                <SearchInput
                                    placeholder="Search by patient name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        
                        <CardContent>
                            {filteredPatients.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-16"
                                >
                                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-3">No Patients Found</h3>
                                    <p className="text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
                                        {searchTerm ? 'No patients match your search criteria.' : 'No patients have granted you access yet. Request access to start viewing patient records.'}
                                    </p>
                                    {!searchTerm && (
                                        <Button 
                                            onClick={() => setShowRequestModal(true)}
                                            size="lg"
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        >
                                            Request Patient Access
                                        </Button>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    <AnimatePresence>
                                        {filteredPatients.map((permission, index) => (
                                            <motion.div
                                                key={permission.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-slate-50 hover:from-white hover:to-white">
                                                    <CardHeader className="pb-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                                    {permission.patient_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-900">{permission.patient_name}</h4>
                                                                    <p className="text-sm text-slate-600">{permission.patient_email}</p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="success" className="text-xs">
                                                                Active
                                                            </Badge>
                                                        </div>
                                                    </CardHeader>
                                                    
                                                    <CardContent className="pt-0">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-slate-600">Access Granted:</span>
                                                                <span className="font-medium">{new Date(permission.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-slate-600">Expires:</span>
                                                                <span className="font-medium">
                                                                    {permission.expires_at 
                                                                        ? new Date(permission.expires_at).toLocaleDateString()
                                                                        : 'No expiry'
                                                                    }
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="pt-4 border-t border-slate-100">
                                                                <Button 
                                                                    onClick={() => navigate(`/patient/${permission.patient_id}`)}
                                                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group-hover:shadow-lg transition-all duration-300"
                                                                    size="sm"
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    View Medical Records
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <PatientRequestModal 
                isOpen={showRequestModal} 
                onClose={() => {
                    setShowRequestModal(false);
                    refreshPatients(); // Refresh the list when modal closes
                }} 
            />
        </div>
    );
};

export default HospitalDashboard;
