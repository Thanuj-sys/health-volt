import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import type { MedicalRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, SearchInput, Badge, Alert } from '../../components/ui';
import FileUpload from '../../components/FileUpload';
import AccessRequestsManager from '../../components/AccessRequestsManager';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const location = useLocation();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('medical-records');
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [pendingAccessCount, setPendingAccessCount] = useState(0);

  // Check URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab === 'access-control') {
      setActiveNav('access-control');
    }
  }, [location.search]);

  // Fetch pending access requests count
  useEffect(() => {
    const fetchPendingAccessCount = async () => {
      try {
        const pendingRequests = await api.getPendingAccessRequests();
        setPendingAccessCount(pendingRequests.length);
      } catch (error) {
        console.error('Error fetching pending access requests:', error);
      }
    };

    if (user) {
      fetchPendingAccessCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingAccessCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch records on mount
  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) {
        addToast('Please log in to view your records', 'error');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getMyRecords();
        
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
          uploadedBy: 'You'
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
      .filter(record => !searchTerm || 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [records, filterType, searchTerm]);

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

      const downloadUrl = await api.getRecordDownloadUrl(record.fileUrl);
      window.open(downloadUrl, '_blank');
      
    } catch (error) {
      console.error('Error viewing record:', error);
      addToast('Failed to view record', 'error');
    }
  };

  const handleDownloadRecord = async (record: MedicalRecord) => {
    try {
      console.log('Downloading file:', record.name, 'File URL:', record.fileUrl);
      
      if (!record.fileUrl) {
        addToast('File URL not available', 'error');
        return;
      }

      // Get the signed download URL
      const downloadUrl = await api.getRecordDownloadUrl(record.fileUrl);
      console.log('Signed download URL:', downloadUrl);

      // Method 1: Try direct download with fetch
      try {
        const response = await fetch(downloadUrl);
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
        link.href = downloadUrl;
        link.download = record.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addToast('Download initiated', 'info');
      }
      
    } catch (error) {
      console.error('Error downloading record:', error);
      addToast('Failed to download record', 'error');
    }
  };

  const handleDeleteRecord = async (record: MedicalRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      await api.deleteRecord(recordToDelete.id);
      
      // Refresh records from database
      const data = await api.getMyRecords();
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
      console.error('Error deleting record:', error);
      addToast('Failed to delete record', 'error');
    } finally {
      setRecordToDelete(null);
    }
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'lab results':
      case 'lab report':
        return '🧪';
      case 'imaging':
        return '📷';
      case 'prescription':
        return '💊';
      case 'consultation':
        return '👨‍⚕️';
      case 'surgery':
        return '🏥';
      case 'dicom':
        return '📷';
      case 'note':
        return '📝';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex`}>
      {/* Left Sidebar */}
      <div className={`w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex flex-col border-r`}>
        {/* Logo */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>HealthVolt</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider mb-4`}>General</div>
          
          {[
            { id: 'medical-records', label: 'Medical Records', badge: records.length },
            { id: 'access-control', label: 'Access Control', badge: pendingAccessCount > 0 ? pendingAccessCount : undefined },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeNav === item.id
                  ? 'bg-teal-500 text-white shadow-lg'
                  : isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Hello, {user?.email?.split('@')[0] || 'John Worker'} 👋
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Welcome to the HealthVolt Patient Dashboard</p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className={`flex-1 p-6 overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Alert variant="destructive" className="bg-red-900/20 border-red-600 text-red-300">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </Alert>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {activeNav === 'medical-records' ? (
              <motion.div
                key="medical-records"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Welcome Header */}
                <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-teal-50 border-gray-200'} rounded-2xl p-6 relative overflow-hidden border`}>
                  <div className="relative z-10">
                    <h2 
                      className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}
                      style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                    >
                      Welcome back, {user?.email?.split('@')[0] || 'Patient'}
                    </h2>
                    <p 
                      className={`${isDarkMode ? 'text-gray-300' : 'text-black'} mb-4 font-medium`}
                      style={{ color: isDarkMode ? '#d1d5db' : '#000000' }}
                    >
                      Manage your medical records securely and efficiently
                    </p>
                    {!isUploadVisible && (
                      <Button 
                        className={`text-white transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 border-gray-700' 
                            : 'bg-teal-500 hover:bg-teal-600 border-teal-500'
                        }`}
                        onClick={() => setIsUploadVisible(true)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Upload New Record
                      </Button>
                    )}
                  </div>
                </div>

                {/* Upload Section */}
                {isUploadVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Medical Record</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsUploadVisible(false)}
                            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <FileUpload onSuccess={handleUploadSuccess} />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 gap-6">
                  <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm max-w-sm`}>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 ${isDarkMode ? 'bg-teal-900' : 'bg-teal-100'} rounded-lg flex items-center justify-center`}>
                          <svg className={`w-6 h-6 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p 
                            className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}
                            style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                          >
                            {records.length}
                          </p>
                          <p 
                            className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-black'} font-bold`}
                            style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                          >
                            Total Records
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters and Search */}
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <CardTitle 
                        className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-black text-2xl`}
                        style={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                      >
                        Your Medical Records
                      </CardTitle>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <SearchInput
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full sm:w-64 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500'}`}
                        />
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className={`px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        >
                          <option value="All">All Types</option>
                          <option value="Lab Report">Lab Report</option>
                          <option value="Imaging">Imaging</option>
                          <option value="Prescription">Prescription</option>
                          <option value="DICOM">DICOM</option>
                          <option value="Note">Note</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <div className={`w-24 h-24 mx-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-4`}>
                          <svg className={`w-12 h-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {searchTerm || filterType !== 'All' ? 'No Records Found' : 'No Medical Records Yet'}
                        </h3>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {searchTerm || filterType !== 'All' 
                            ? 'Try adjusting your search or filters' 
                            : 'Upload your first medical record to get started'}
                        </p>
                        {!searchTerm && filterType === 'All' && (
                          <Button 
                            className="mt-4 bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={() => setIsUploadVisible(true)}
                          >
                            Upload Record
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                          {filteredRecords.map((record, index) => (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ y: -4 }}
                            >
                              <Card className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:shadow-lg'} transition-all duration-300`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-12 h-12 ${isDarkMode ? 'bg-teal-900' : 'bg-teal-100'} rounded-lg flex items-center justify-center text-2xl`}>
                                        {getRecordTypeIcon(record.type)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 
                                          className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}
                                          style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                                        >
                                          {record.name}
                                        </h4>
                                        <Badge variant="secondary" className={`text-xs mt-1 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'}`}>
                                          {record.type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-3">
                                    <div 
                                      className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                      style={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}
                                    >
                                      Uploaded: {record.uploadDate}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`flex-1 text-xs ${isDarkMode ? 'bg-blue-900/30 border-blue-500 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800'}`}
                                        onClick={() => handleViewRecord(record)}
                                      >
                                        <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`flex-1 text-xs ${isDarkMode ? 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-800/50 hover:text-green-200' : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-800'}`}
                                        onClick={() => handleDownloadRecord(record)}
                                      >
                                        <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`text-xs ${isDarkMode ? 'bg-red-900/30 border-red-500 text-red-300 hover:bg-red-800/50 hover:text-red-200' : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800'}`}
                                        onClick={() => handleDeleteRecord(record)}
                                      >
                                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
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
            ) : activeNav === 'access-control' ? (
              <motion.div
                key="access-control"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AccessRequestsManager />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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