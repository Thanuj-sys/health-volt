import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import type { MedicalRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, SearchInput, Select, Badge, LoadingSpinner, Alert } from '../../components/ui';
import { ICONS } from '../../constants.tsx';
import FileUpload from '../../components/FileUpload';
import GrantAccessModal from '../../components/GrantAccessModal';
import AccessRequestsManager from '../../components/AccessRequestsManager';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

console.log('🏥 Patient Dashboard is being initialized');

const PatientDashboard: React.FC = () => {
    console.log('🏥 Patient Dashboard is rendering');
    const { user } = useAuth();
    const { addToast } = useToast();
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('All');
    const [filterDate, setFilterDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadVisible, setIsUploadVisible] = useState(false);
    const [isGrantAccessModalOpen, setIsGrantAccessModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'records' | 'access'>('records');
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);

    console.log('🏥 Patient Dashboard - User:', user);
    console.log('🏥 Patient Dashboard - Loading state:', isLoading);

    useEffect(() => {
        console.log('🏥 Patient Dashboard - useEffect triggered');
        const fetchRecords = async () => {
            if (!user) {
                console.error('No user found in PatientDashboard');
                addToast('Please log in to view your records', 'error');
                setIsLoading(false);
                return;
            }

            console.log('Fetching records for user:', user.id);

            try {
                setIsLoading(true);
                setError(null);
                const data = await api.getMyRecords();
                console.log('Fetched records:', data);
                
                // Initialize empty array if no records found
                if (!data) {
                    setRecords([]);
                    return;
                }

                // Transform the data to match MedicalRecord type
                const formattedRecords = data.map(record => ({
                    id: record.id,
                    patientId: record.patient_id,
                    type: record.record_type,
                    name: record.title,
                    uploadDate: new Date(record.created_at).toLocaleDateString(),
                    fileUrl: record.storage_path,
                    uploadedBy: 'You' // You can fetch the actual uploader's name if needed
                }));

                setRecords(formattedRecords);
            } catch (error) {
                console.error('Error fetching records:', error);
                setError('Failed to fetch medical records');
                addToast('Failed to fetch medical records', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecords();
    }, [user, addToast]);

    const filteredRecords = useMemo(() => {
        return records
            .filter(record => filterType === 'All' || record.type === filterType)
            .filter(record => !filterDate || record.uploadDate >= filterDate)
            .filter(record => !searchTerm || 
                record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.type.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [records, filterType, filterDate, searchTerm]);

    const handleUploadSuccess = (newRecord: MedicalRecord) => {
        setRecords(prev => [newRecord, ...prev]);
        setIsUploadVisible(false);
        addToast('File uploaded successfully!', 'success');
    };

    const handleViewRecord = async (record: MedicalRecord) => {
        try {
            if (!record.fileUrl) {
                addToast('File not found', 'error');
                return;
            }

            // Get signed URL for download
            const downloadUrl = await api.getRecordDownloadUrl(record.fileUrl);
            
            // Open in new tab for viewing
            window.open(downloadUrl, '_blank');
            
        } catch (error) {
            console.error('Error viewing record:', error);
            addToast('Failed to view record', 'error');
        }
    };

    const handleDownloadRecord = async (record: MedicalRecord) => {
        try {
            if (!record.fileUrl) {
                addToast('File not found', 'error');
                return;
            }

            // Get signed URL for download
            const downloadUrl = await api.getRecordDownloadUrl(record.fileUrl);
            
            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = record.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            addToast('Download started', 'success');
            
        } catch (error) {
            console.error('Error downloading record:', error);
            addToast('Failed to download record', 'error');
        }
    };

    const handleDeleteRecord = async (record: MedicalRecord) => {
        console.log('🗑️ Dashboard: Delete button clicked for record:', record);
        setRecordToDelete(record);
        setIsDeleteModalOpen(true);
        console.log('🗑️ Dashboard: Delete modal should be opening...');
    };

    const confirmDeleteRecord = async () => {
        console.log('🗑️ Dashboard: confirmDeleteRecord called');
        console.log('🗑️ Dashboard: recordToDelete:', recordToDelete);
        
        if (!recordToDelete) {
            console.log('🗑️ Dashboard: No record to delete, returning early');
            return;
        }

        try {
            console.log('🗑️ Dashboard: Attempting to delete record:', recordToDelete);
            console.log('🗑️ Dashboard: About to call api.deleteRecord with ID:', recordToDelete.id);
            console.log('🗑️ Dashboard: api object:', api);
            console.log('🗑️ Dashboard: api.deleteRecord function:', api.deleteRecord);
            
            await api.deleteRecord(recordToDelete.id);
            
            console.log('🗑️ Dashboard: api.deleteRecord completed successfully');
            console.log('🗑️ Dashboard: Record deleted, refreshing from database...');
            // Force DB refresh instead of just updating local state
            const data = await api.getMyRecords();
            console.log('🗑️ Dashboard: Fresh records from DB:', data);
            
            // Transform the data to match MedicalRecord type
            const formattedRecords = data ? data.map(record => ({
                id: record.id,
                patientId: record.patient_id,
                type: record.record_type,
                name: record.title,
                uploadDate: new Date(record.created_at).toLocaleDateString(),
                fileUrl: record.storage_path,
                uploadedBy: 'You'
            })) : [];

            setRecords(formattedRecords);
            
            addToast('Record deleted successfully', 'success');
        } catch (error) {
            console.error('🗑️ Dashboard: Error deleting record:', error);
            addToast('Failed to delete record', 'error');
        } finally {
            console.log('🗑️ Dashboard: Cleaning up modal state');
            setRecordToDelete(null);
        }
    };

    const getRecordTypeIcon = (type: string) => {
        switch (type) {
            case 'Lab Report': return '🧪';
            case 'Imaging': return '📸';
            case 'Prescription': return '💊';
            case 'DICOM': return '🏥';
            case 'Note': return '📝';
            default: return '📄';
        }
    };

    const getRecordTypeBadge = (type: string) => {
        const variants = {
            'Lab Report': 'success',
            'Imaging': 'default',
            'Prescription': 'warning',
            'DICOM': 'secondary',
            'Note': 'outline'
        };
        return variants[type] || 'secondary';
    };

    // Early return for debugging
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
                <Alert variant="destructive">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No user found. Please log in to access your dashboard.
                    </div>
                </Alert>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-6">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-slate-800 font-medium">Loading your medical records...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
            {/* Header Section */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
                <div className="w-full px-4 py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                                Patient Dashboard
                            </h1>
                            <p className="text-slate-800 mt-1 font-medium">Manage your medical records and access permissions</p>
                        </div>
                        <div className="flex gap-3">
                            {activeTab === 'records' && (
                                <>
                                    <Button 
                                        onClick={() => setIsUploadVisible(!isUploadVisible)} 
                                        variant="outline"
                                        className="bg-white hover:bg-slate-50"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        {isUploadVisible ? 'Cancel Upload' : 'Upload Record'}
                                    </Button>
                                    <Button 
                                        onClick={() => setIsGrantAccessModalOpen(true)}
                                        className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Grant Access
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-4">
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

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 mb-8 bg-white rounded-t-xl">
                    <button
                        onClick={() => setActiveTab('records')}
                        className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
                            activeTab === 'records'
                                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        My Records
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
                            activeTab === 'access'
                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Access Management
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'records' ? (
                        <motion.div
                            key="records"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {isUploadVisible && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6"
                                >
                                    <FileUpload onSuccess={handleUploadSuccess} />
                                </motion.div>
                            )}

                            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                                <CardHeader className="pb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <CardTitle className="text-2xl flex items-center gap-3 text-slate-900">
                                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-slate-900">Your Medical Records</span>
                                            </CardTitle>
                                            <p className="text-slate-800 mt-2 font-medium">Manage and view your uploaded medical documents</p>
                                        </div>
                                        <Badge variant="secondary" className="text-sm">
                                            {records.length} {records.length === 1 ? 'Record' : 'Records'}
                                        </Badge>
                                    </div>
                                    
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <SearchInput
                                            placeholder="Search records..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <Select 
                                            value={filterType} 
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="select-enhanced"
                                        >
                                            <option value="All">All Types</option>
                                            <option value="Lab Report">Lab Report</option>
                                            <option value="Imaging">Imaging</option>
                                            <option value="Prescription">Prescription</option>
                                            <option value="DICOM">DICOM</option>
                                            <option value="Note">Note</option>
                                        </Select>
                                        <input 
                                            type="date" 
                                            value={filterDate} 
                                            onChange={(e) => setFilterDate(e.target.value)}
                                            className="flex h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 hover:border-slate-300"
                                        />
                                    </div>
                                </CardHeader>
                                
                                <CardContent>
                                    {filteredRecords.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-16"
                                        >
                                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 mb-3">No Records Found</h3>
                                            <p className="text-slate-800 mb-6 leading-relaxed max-w-md mx-auto font-medium">
                                                {searchTerm || filterType !== 'All' || filterDate ? 'No records match your search criteria.' : 'You haven\'t uploaded any medical records yet. Upload your first record to get started.'}
                                            </p>
                                            {!searchTerm && filterType === 'All' && !filterDate && (
                                                <Button 
                                                    onClick={() => setIsUploadVisible(true)}
                                                    size="lg"
                                                    className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                                                >
                                                    Upload Your First Record
                                                </Button>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <AnimatePresence>
                                                {filteredRecords.map((record, index) => (
                                                    <motion.div
                                                        key={record.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        transition={{ delay: index * 0.1 }}
                                                    >
                                                        <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-slate-50 hover:from-white hover:to-white">
                                                            <CardHeader className="pb-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                                                                            {getRecordTypeIcon(record.type)}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-bold text-slate-900 truncate">{record.name}</h4>
                                                                            <p className="text-sm text-slate-800 font-medium">Uploaded by {record.uploadedBy}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant={getRecordTypeBadge(record.type)} className="text-xs">
                                                                        {record.type}
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>
                                                            
                                                            <CardContent className="pt-0">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-800 font-medium">Upload Date:</span>
                                                                        <span className="font-medium text-slate-900">{record.uploadDate}</span>
                                                                    </div>
                                                                    
                                                                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                                                                        <Button 
                                                                            onClick={() => handleViewRecord(record)}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600 font-medium"
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            View
                                                                        </Button>
                                                                        <Button 
                                                                            onClick={() => handleDownloadRecord(record)}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-medium"
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                            </svg>
                                                                            Download
                                                                        </Button>
                                                                        <Button 
                                                                            onClick={() => handleDeleteRecord(record)}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600 font-medium"
                                                                        >
                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                            Delete
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
                    ) : (
                        <motion.div
                            key="access"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <AccessRequestsManager />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <GrantAccessModal isOpen={isGrantAccessModalOpen} onClose={() => setIsGrantAccessModalOpen(false)} />
            
            <ConfirmDeleteModal 
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setRecordToDelete(null);
                }}
                onConfirm={confirmDeleteRecord}
                recordName={recordToDelete?.name || ''}
            />
        </div>
    );
};

export default PatientDashboard;
