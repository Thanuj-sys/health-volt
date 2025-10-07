import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import type { MedicalRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, SearchInput, Select, Badge, LoadingSpinner, Alert, AnimatedSelect, DatePicker } from '../../components/ui';
import { ICONS } from '../../constants.tsx';
import FileUpload from '../../components/FileUpload';
import GrantAccessModal from '../../components/GrantAccessModal';
import AccessRequestsManager from '../../components/AccessRequestsManager';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

console.log('🏥 Patient Dashboard is being initialized');

const PatientDashboard: React.FC = () => {
    console.log('🏥 Patient Dashboard is rendering');
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
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
            <div className={`min-h-screen p-6 transition-all duration-300 ${
                isDarkMode 
                    ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' 
                    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
            }`}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <motion.div 
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl ${
                            isDarkMode 
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </motion.div>
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>Loading Your Dashboard</h3>
                        <p className={`font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>Securing your medical records...</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-all duration-300 ${
            isDarkMode 
                ? 'bg-slate-900' 
                : 'bg-gray-50'
        }`}>
            {/* Modern Hero Section */}
            <div className={`relative ${
                isDarkMode 
                    ? 'bg-gradient-to-r from-slate-800 to-slate-900' 
                    : 'bg-gradient-to-r from-white to-gray-100'
            } transition-all duration-300`}>
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-8"
                        >
                            <div className="space-y-4">
                                <motion.h1 
                                    className="text-6xl lg:text-7xl font-black leading-tight"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                >
                                    <span className="text-black">Your Health,</span>
                                    <br />
                                    <span className={`${
                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>Simplified</span>
                                </motion.h1>
                                <motion.p 
                                    className={`text-xl font-medium max-w-lg ${
                                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                >
                                    Take control of your medical data with our secure, intuitive platform designed for modern healthcare.
                                </motion.p>
                            </div>
                            
                            {/* Action Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                            >
                                {activeTab === 'records' && (
                                    <Button 
                                        onClick={() => setIsUploadVisible(!isUploadVisible)} 
                                        size="lg"
                                        className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
                                    >
                                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        {isUploadVisible ? 'Cancel' : 'Add Record'}
                                    </Button>
                                )}
                            </motion.div>
                        </motion.div>
                        
                        {/* Right Content - Modern Stats Cards */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Main Stats Card */}
                            <div className={`p-8 rounded-3xl shadow-2xl ${
                                isDarkMode 
                                    ? 'bg-slate-800 border border-slate-700' 
                                    : 'bg-white border border-gray-200'
                            }`}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>Overview</h3>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="text-center">
                                        <div className={`text-4xl font-black mb-2 ${
                                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                        }`}>
                                            {records.length}
                                        </div>
                                        <div className={`text-sm font-medium ${
                                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            Total Records
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-4xl font-black mb-2 ${
                                            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                        }`}>
                                            100%
                                        </div>
                                        <div className={`text-sm font-medium ${
                                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                            Secured
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Quick Action Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <motion.div 
                                    className={`p-6 rounded-2xl shadow-xl cursor-pointer transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' 
                                            : 'bg-white hover:bg-gray-50 border border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                                        isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                                    }`}>
                                        <svg className={`w-6 h-6 ${
                                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h4 className={`font-bold text-lg mb-1 ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>Records</h4>
                                    <p className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>Manage files</p>
                                </motion.div>
                                
                                <motion.div 
                                    className={`p-6 rounded-2xl shadow-xl cursor-pointer transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' 
                                            : 'bg-white hover:bg-gray-50 border border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab('access')}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                                        isDarkMode ? 'bg-purple-900' : 'bg-purple-100'
                                    }`}>
                                        <svg className={`w-6 h-6 ${
                                            isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h4 className={`font-bold text-lg mb-1 ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>Access</h4>
                                    <p className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>Control sharing</p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="w-full px-6">
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

                {/* Modern Tab Navigation */}
                <motion.div 
                    className={`flex gap-4 mb-8 p-2 rounded-3xl shadow-xl transition-all duration-300 ${
                        isDarkMode 
                            ? 'bg-slate-800 border border-slate-700' 
                            : 'bg-white border border-gray-200'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.button
                        onClick={() => setActiveTab('records')}
                        className={`flex-1 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 ${
                            activeTab === 'records'
                                ? 'bg-black text-white shadow-xl'
                                : isDarkMode 
                                    ? 'text-gray-300 hover:text-white hover:bg-slate-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Medical Records
                        {activeTab === 'records' && (
                            <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                layoutId="activeIndicator"
                                transition={{ duration: 0.3 }}
                            />
                        )}
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('access')}
                        className={`flex-1 px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 ${
                            activeTab === 'access'
                                ? 'bg-black text-white shadow-xl'
                                : isDarkMode 
                                    ? 'text-gray-300 hover:text-white hover:bg-slate-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Access Control
                        {activeTab === 'access' && (
                            <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                layoutId="activeIndicator"
                                transition={{ duration: 0.3 }}
                            />
                        )}
                    </motion.button>
                </motion.div>

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

                            <Card className={`border-0 shadow-2xl backdrop-blur-sm rounded-3xl transition-all duration-300 ${
                                isDarkMode 
                                    ? 'bg-slate-800/90 border-slate-600' 
                                    : 'bg-white/90 border-slate-200'
                            }`}>
                                <CardHeader className="pb-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                        <div className="space-y-3">
                                            <CardTitle className={`text-3xl flex items-center gap-4 ${
                                                isDarkMode ? 'text-white' : 'text-slate-900'
                                            }`}>
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span>Your Medical Records</span>
                                            </CardTitle>
                                            <p className={`text-lg font-medium ${
                                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                            }`}>Securely manage and share your medical documents</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className={`text-base px-4 py-2 border transition-all duration-300 ${
                                                isDarkMode 
                                                    ? 'bg-blue-900/50 text-blue-200 border-blue-700' 
                                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                            }`}>
                                                {records.length} {records.length === 1 ? 'Record' : 'Records'}
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                        <div className="flex flex-col">
                                            <SearchInput
                                                placeholder="Search medical records..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <AnimatedSelect 
                                                value={filterType} 
                                                onValueChange={setFilterType}
                                                placeholder="Filter by Type"
                                                options={[
                                                    { value: 'All', label: 'All Types', icon: 'Heart' },
                                                    { value: 'Lab Report', label: 'Lab Report', icon: 'Activity' },
                                                    { value: 'Imaging', label: 'Imaging', icon: 'Brain' },
                                                    { value: 'Prescription', label: 'Prescription', icon: 'Stethoscope' },
                                                    { value: 'DICOM', label: 'DICOM', icon: 'Heart' },
                                                    { value: 'Note', label: 'Note', icon: 'Activity' }
                                                ]}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <DatePicker 
                                                value={filterDate} 
                                                onDateChange={setFilterDate}
                                                placeholder="Filter from date..."
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                <CardContent>
                                    {filteredRecords.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-20"
                                        >
                                            {/* Interactive Empty State */}
                                            <div className="relative mb-8">
                                                <motion.div
                                                    className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${
                                                        isDarkMode 
                                                            ? 'bg-gradient-to-br from-slate-700 to-slate-800' 
                                                            : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                                                    }`}
                                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <svg className={`w-16 h-16 ${
                                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </motion.div>
                                                
                                                {/* Floating Icons */}
                                                <motion.div
                                                    className={`absolute -top-2 -right-2 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${
                                                        isDarkMode 
                                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                                                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                    }`}
                                                    animate={{ y: [-3, 3, -3] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                </motion.div>
                                                
                                                <motion.div
                                                    className={`absolute -bottom-2 -left-2 w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl ${
                                                        isDarkMode 
                                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                                                            : 'bg-gradient-to-br from-emerald-500 to-green-600'
                                                    }`}
                                                    animate={{ y: [3, -3, 3] }}
                                                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                                >
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </motion.div>
                                            </div>
                                            
                                            <h3 className={`text-3xl font-bold mb-4 ${
                                                isDarkMode ? 'text-white' : 'text-slate-800'
                                            }`}>
                                                {searchTerm || filterType !== 'All' || filterDate ? 'No Records Found' : 'Start Your Health Journey'}
                                            </h3>
                                            <p className={`leading-relaxed max-w-lg mx-auto font-medium text-lg mb-8 ${
                                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                            }`}>
                                                {searchTerm || filterType !== 'All' || filterDate 
                                                    ? 'No records match your search criteria. Try adjusting your filters.' 
                                                    : 'Begin building your comprehensive digital health record. Upload your first medical document and take control of your health data.'}
                                            </p>
                                            {!searchTerm && filterType === 'All' && !filterDate && (
                                                <Button 
                                                    onClick={() => setIsUploadVisible(true)}
                                                    size="lg"
                                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 px-10 py-4 text-lg"
                                                >
                                                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    Upload Your First Record
                                                </Button>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            <AnimatePresence>
                                                {filteredRecords.map((record, index) => (
                                                    <motion.div
                                                        key={record.id}
                                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                                        transition={{ delay: index * 0.1, duration: 0.4 }}
                                                        whileHover={{ y: -8, scale: 1.02 }}
                                                        className="group"
                                                    >
                                                        <Card className={`h-full border-0 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden ${
                                                            isDarkMode 
                                                                ? 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800' 
                                                                : 'bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-blue-50'
                                                        }`}>
                                                            {/* Card Header with Icon */}
                                                            <div className={`p-6 border-b ${
                                                                isDarkMode ? 'border-slate-700' : 'border-gray-200'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-4">
                                                                        <motion.div 
                                                                            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg"
                                                                            whileHover={{ rotate: 5 }}
                                                                            transition={{ duration: 0.2 }}
                                                                        >
                                                                            {getRecordTypeIcon(record.type)}
                                                                        </motion.div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className={`font-bold text-xl mb-1 ${
                                                                                isDarkMode ? 'text-white' : 'text-gray-900'
                                                                            }`}>
                                                                                {record.name}
                                                                            </h4>
                                                                            <Badge 
                                                                                variant="secondary" 
                                                                                className={`text-sm px-3 py-1 ${
                                                                                    isDarkMode 
                                                                                        ? 'bg-blue-900/50 text-blue-200 border-blue-700' 
                                                                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                                                                }`}
                                                                            >
                                                                                {record.type}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.1 }}
                                                                        whileTap={{ scale: 0.9 }}
                                                                        className={`p-2 rounded-xl transition-colors ${
                                                                            isDarkMode 
                                                                                ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                                                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                                                        }`}
                                                                    >
                                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                        </svg>
                                                                    </motion.button>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Card Content */}
                                                            <CardContent className="p-6">
                                                                <div className="space-y-6">
                                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                                        <div className="space-y-1">
                                                                            <p className={`font-medium ${
                                                                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                            }`}>
                                                                                Date
                                                                            </p>
                                                                            <p className={`font-bold ${
                                                                                isDarkMode ? 'text-white' : 'text-gray-900'
                                                                            }`}>
                                                                                {new Date(record.upload_date).toLocaleDateString()}
                                                                            </p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className={`font-medium ${
                                                                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                            }`}>
                                                                                Size
                                                                            </p>
                                                                            <p className={`font-bold ${
                                                                                isDarkMode ? 'text-white' : 'text-gray-900'
                                                                            }`}>
                                                                                {(record.file_size / 1024 / 1024).toFixed(2)} MB
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Action Buttons */}
                                                                    <div className="flex gap-3 pt-4">
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => handleDownload(record)}
                                                                            className="flex-1 bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                            </svg>
                                                                            Download
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => handleViewRecord(record)}
                                                                            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                                                                                isDarkMode 
                                                                                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600' 
                                                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            View
                                                                        </motion.button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                            
                                                            {/* Hover Effect Overlay */}
                                                            <motion.div
                                                                className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                                    isDarkMode 
                                                                        ? 'bg-gradient-to-br from-blue-500/5 to-indigo-600/5' 
                                                                        : 'bg-gradient-to-br from-blue-500/5 to-indigo-600/5'
                                                                }`}
                                                                initial={{ opacity: 0 }}
                                                                whileHover={{ opacity: 1 }}
                                                            />
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                                                                isDarkMode ? 'text-white' : 'text-slate-900'
                                                                            }`}>{record.name}</h4>
                                                                            <p className={`text-sm font-medium ${
                                                                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                                                            }`}>Uploaded by {record.uploadedBy}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant={getRecordTypeBadge(record.type)} className="text-sm font-medium">
                                                                        {record.type}
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>
                                                            
                                                            <CardContent className="pt-0">
                                                                <div className="space-y-4">
                                                                    <div className={`flex justify-between text-sm rounded-lg p-3 ${
                                                                        isDarkMode 
                                                                            ? 'bg-slate-600/50' 
                                                                            : 'bg-slate-50/50'
                                                                    }`}>
                                                                        <span className={`font-medium ${
                                                                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                                                        }`}>Upload Date:</span>
                                                                        <span className={`font-semibold ${
                                                                            isDarkMode ? 'text-white' : 'text-slate-900'
                                                                        }`}>{record.uploadDate}</span>
                                                                    </div>
                                                                    
                                                                    <div className={`pt-4 border-t flex gap-2 ${
                                                                        isDarkMode ? 'border-slate-600' : 'border-slate-100'
                                                                    }`}>
                                                                        <Button 
                                                                            onClick={() => handleViewRecord(record)}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className={`flex-1 font-medium transition-all duration-200 ${
                                                                                isDarkMode 
                                                                                    ? 'border-blue-400 text-blue-400 hover:bg-blue-900/30 hover:border-blue-300' 
                                                                                    : 'border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600'
                                                                            }`}
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
                                                                            className={`flex-1 font-medium transition-all duration-200 ${
                                                                                isDarkMode 
                                                                                    ? 'border-emerald-400 text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-300' 
                                                                                    : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600'
                                                                            }`}
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
                                                                            className={`flex-1 font-medium transition-all duration-200 ${
                                                                                isDarkMode 
                                                                                    ? 'border-red-400 text-red-400 hover:bg-red-900/30 hover:border-red-300' 
                                                                                    : 'border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600'
                                                                            }`}
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
