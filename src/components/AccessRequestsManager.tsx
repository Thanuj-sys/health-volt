import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import type { AccessPermissionWithDetails } from '../types';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, LoadingSpinner, Alert } from './ui';

const AccessRequestsManager: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<AccessPermissionWithDetails[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<AccessPermissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const { addToast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pending, approved] = await Promise.all([
        api.getPendingAccessRequests(),
        api.getMyAccessPermissions()
      ]);
      setPendingRequests(pending);
      setApprovedRequests(approved);
    } catch (error: any) {
      setError('Failed to load access requests');
      addToast('Failed to load access requests', 'error');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (hospitalId: string, approve: boolean) => {
    try {
      await api.respondToAccessRequest(hospitalId, approve);
      addToast(
        approve ? 'Access granted successfully!' : 'Access request rejected',
        approve ? 'success' : 'info'
      );
      await fetchRequests(); // Refresh the lists
    } catch (error: any) {
      addToast(error.message || 'Failed to respond to request', 'error');
      console.error('Error responding to request:', error);
    }
  };

  const handleRevoke = async (hospitalId: string) => {
    try {
      await api.revokeHospitalAccess(hospitalId);
      addToast('Access revoked successfully!', 'success');
      await fetchRequests(); // Refresh the lists
    } catch (error: any) {
      addToast(error.message || 'Failed to revoke access', 'error');
      console.error('Error revoking access:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-700 font-medium">Loading access requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-700 bg-amber-50'
              : 'border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pending Requests
          {pendingRequests.length > 0 && (
            <Badge variant="warning" className="ml-2">
              {pendingRequests.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-8 py-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'approved'
              ? 'border-green-500 text-green-700 bg-green-50'
              : 'border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approved Access
          {approvedRequests.length > 0 && (
            <Badge variant="success" className="ml-2">
              {approvedRequests.length}
            </Badge>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pending' ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white rounded-t-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Pending Access Requests
                </CardTitle>
                <p className="text-slate-700">Review and respond to hospital access requests</p>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Pending Requests</h3>
                    <p className="text-slate-700">No hospitals have requested access to your records.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {pendingRequests.map((request, index) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="group hover:shadow-lg transition-all duration-300 border border-slate-200 bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {request.hospital_name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{request.hospital_name}</h4>
                                    <p className="text-sm text-slate-700">{request.hospital_contact_name}</p>
                                    <p className="text-xs text-slate-600">{request.hospital_email}</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex space-x-3">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResponse(request.hospital_id, false)}
                                      className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Reject
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      size="sm"
                                      onClick={() => handleResponse(request.hospital_id, true)}
                                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Approve
                                    </Button>
                                  </motion.div>
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
            key="approved"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white rounded-t-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  Approved Access Permissions
                </CardTitle>
                <p className="text-slate-700">Manage hospitals that have access to your records</p>
              </CardHeader>
              <CardContent>
                {approvedRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Approved Access</h3>
                    <p className="text-slate-700">No hospitals currently have access to your records.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {approvedRequests.map((request, index) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="group hover:shadow-lg transition-all duration-300 border border-slate-200 bg-white">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {request.hospital_name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{request.hospital_name}</h4>
                                    <p className="text-sm text-slate-700">{request.hospital_contact_name}</p>
                                    <p className="text-xs text-slate-600">{request.hospital_email}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                      <p className="text-xs text-slate-600">
                                        Granted: {new Date(request.created_at).toLocaleDateString()}
                                      </p>
                                      {request.expires_at && (
                                        <p className="text-xs text-slate-600">
                                          Expires: {new Date(request.expires_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge variant="success">
                                    Active
                                  </Badge>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRevoke(request.hospital_id)}
                                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      Revoke Access
                                    </Button>
                                  </motion.div>
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccessRequestsManager;
