import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { isDarkMode } = useTheme();
  const { addToast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);

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
      if (!record.fileUrl) {
        addToast('File not found', 'error');
        return;
      }

      const downloadUrl = await api.getRecordDownloadUrl(record.fileUrl);
      
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
        return '�';
      case 'prescription':
        return '💊';
      case 'consultation':
        return '👨‍⚕️';
      case 'surgery':
        return '🏥';
      case 'dicom':
        return '🏥';
      case 'note':
        return '📝';
      default:
        return '�';
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
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">HealthVolt</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">General</div>
          
          {[
            { id: 'dashboard', label: 'Dashboard', active: true },
            { id: 'medical-records', label: 'Medical Records', badge: records.length },
            { id: 'access-control', label: 'Access Control' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                activeNav === item.id
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
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
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Hello, {user?.email?.split('@')[0] || 'John Worker'} 👋
              </h1>
              <p className="text-sm text-gray-400">Welcome to the HealthVolt Patient Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <SearchInput
                  placeholder="Search anything..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'J'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user?.email?.split('@')[0] || 'John Worker'}</p>
                  <p className="text-xs text-gray-400">Patient</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-auto">
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
            {activeNav === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Records */}
                  <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Total Records</p>
                        <p className="text-3xl font-bold">{records.length}+</p>
                        <p className="text-cyan-100 text-sm">+15% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Access Requests */}
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm font-medium">Access Requests</p>
                        <p className="text-3xl font-bold">5+</p>
                        <p className="text-yellow-100 text-sm">-2% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Shared Files */}
                  <div className="bg-gradient-to-r from-pink-400 to-pink-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100 text-sm font-medium">Shared Files</p>
                        <p className="text-3xl font-bold">12+</p>
                        <p className="text-pink-100 text-sm">+8% from last month</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Storage Used */}
                  <div className="bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Storage Used</p>
                        <p className="text-3xl font-bold">2.4GB</p>
                        <p className="text-purple-100 text-sm">of 10GB available</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Records Statistics */}
                  <div className="lg:col-span-2">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white">Records Statistics</CardTitle>
                        <select className="bg-gray-700 border-gray-600 text-white text-sm rounded px-2 py-1">
                          <option>Last 7 Days</option>
                          <option>Last 30 Days</option>
                          <option>Last 6 Months</option>
                        </select>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-end justify-center space-x-2">
                          <div className="flex items-end space-x-1 h-full">
                            {Array.from({ length: 12 }, (_, i) => (
                              <div
                                key={i}
                                className="w-6 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                                style={{ 
                                  height: `${Math.random() * 60 + 20}%`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                            <span className="text-gray-300">Uploads</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-300">Downloads</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-gray-300">Shares</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Storage Usage */}
                  <div>
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white">Storage Usage</CardTitle>
                        <select className="bg-gray-700 border-gray-600 text-white text-sm rounded px-2 py-1">
                          <option>All Time</option>
                          <option>This Month</option>
                        </select>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-4">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              stroke="#374151"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              stroke="#14b8a6"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray="251.2"
                              strokeDashoffset="62.8"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">75%</div>
                              <div className="text-xs text-gray-400">Used</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">2.4GB</p>
                          <p className="text-sm text-gray-400">of 10GB</p>
                        </div>
                        <div className="w-full mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Images</span>
                            <span className="text-white">1.2GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Documents</span>
                            <span className="text-white">0.8GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Other</span>
                            <span className="text-white">0.4GB</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Recent Records Table */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Recent Medical Records</CardTitle>
                    <Button 
                      onClick={() => setActiveNav('medical-records')}
                      className="bg-teal-500 hover:bg-teal-600 text-white"
                      size="sm"
                    >
                      See All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {records.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Records Yet</h3>
                        <p className="text-gray-400 mb-4">Upload your first medical record to get started</p>
                        <Button 
                          onClick={() => {
                            setActiveNav('medical-records');
                            setIsUploadVisible(true);
                          }}
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                          Upload Record
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left text-gray-400 font-medium py-3">Name</th>
                              <th className="text-left text-gray-400 font-medium py-3">Type</th>
                              <th className="text-left text-gray-400 font-medium py-3">Date</th>
                              <th className="text-left text-gray-400 font-medium py-3">Status</th>
                              <th className="text-left text-gray-400 font-medium py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.slice(0, 5).map((record) => (
                              <tr key={record.id} className="border-b border-gray-700/50">
                                <td className="py-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                                      <span className="text-teal-400">{getRecordTypeIcon(record.type)}</span>
                                    </div>
                                    <span className="text-white font-medium">{record.name}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                    {record.type}
                                  </Badge>
                                </td>
                                <td className="py-4 text-gray-300">{record.uploadDate}</td>
                                <td className="py-4">
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                                    Active
                                  </span>
                                </td>
                                <td className="py-4">
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewRecord(record)}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      👁️
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadRecord(record)}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      ⬇️
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeNav === 'medical-records' ? (
              <motion.div
                key="medical-records"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Welcome Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">
                      Welcome back, {user?.email?.split('@')[0] || 'Patient'}
                    </h2>
                    <p className="text-teal-100 mb-4">
                      Manage your medical records securely and efficiently
                    </p>
                    {!isUploadVisible && (
                      <Button 
                        className="bg-white text-teal-600 hover:bg-gray-100"
                        onClick={() => setIsUploadVisible(true)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Upload New Record
                      </Button>
                    )}
                  </div>
                  {/* Doctor Image */}
                  <div className="absolute right-4 top-0 bottom-0 flex items-center">
                    <img 
                      src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=250&fit=crop&crop=face" 
                      alt="Doctor" 
                      className="w-32 h-40 object-cover rounded-lg"
                    />
                  </div>
                </div>

                {/* Upload Section */}
                {isUploadVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white">Upload Medical Record</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsUploadVisible(false)}
                            className="text-gray-400 hover:text-white"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-bold text-white">
                            {records.length}
                          </p>
                          <p className="text-sm text-gray-400">
                            Total Records
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-bold text-white">
                            100%
                          </p>
                          <p className="text-sm text-gray-400">
                            Encrypted
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-2xl font-bold text-white">
                            HIPAA
                          </p>
                          <p className="text-sm text-gray-400">
                            Compliant
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters and Search */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <CardTitle className="text-white">
                        Your Medical Records
                      </CardTitle>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <SearchInput
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-64 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        />
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="px-3 py-2 border rounded-md bg-gray-700 border-gray-600 text-white"
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
                        <div className="w-24 h-24 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-white">
                          {searchTerm || filterType !== 'All' ? 'No Records Found' : 'No Medical Records Yet'}
                        </h3>
                        <p className="text-gray-400">
                          {searchTerm || filterType !== 'All' 
                            ? 'Try adjusting your search or filters' 
                            : 'Upload your first medical record to get started'}
                        </p>
                        {!searchTerm && filterType === 'All' && (
                          <Button 
                            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white"
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
                              <Card className="h-full bg-gray-700 border-gray-600 hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center text-2xl">
                                        {getRecordTypeIcon(record.type)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-white">
                                          {record.name}
                                        </h4>
                                        <Badge variant="secondary" className="text-xs mt-1 bg-gray-600 text-gray-300">
                                          {record.type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="space-y-3">
                                    <div className="text-xs text-gray-400">
                                      Uploaded: {record.uploadDate}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500 hover:text-white"
                                        onClick={() => handleViewRecord(record)}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500 hover:text-white"
                                        onClick={() => handleDownloadRecord(record)}
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 border-gray-500"
                                        onClick={() => handleDeleteRecord(record)}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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