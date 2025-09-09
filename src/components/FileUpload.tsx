import React, { useState, useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import type { MedicalRecord } from '../types';
import { Button, Select, Card, CardContent, CardHeader, CardTitle, LoadingSpinner, Badge } from './ui';

interface FileUploadProps {
  onSuccess: (newRecord: MedicalRecord) => void;
  patientIdForHospital?: string; // Optional for hospital use
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, patientIdForHospital }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordType, setRecordType] = useState<MedicalRecord['type']>('Lab Report');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  // Explicitly type Dropzone options
  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/dicom': ['.dcm'],
    },
    multiple: true,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {},
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const handleUpload = async () => {
    if (!files.length || (!user && !patientIdForHospital)) return;

    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const patientId = patientIdForHospital || user!.id;

      const newRecordData = await api.uploadRecord(patientId, {
        file: files[0],
        recordType: recordType,
        title: files[0].name,
        notes: ''
      });

      const formattedRecord: MedicalRecord = {
        id: newRecordData.id,
        name: newRecordData.title,
        type: newRecordData.record_type,
        uploadDate: new Date(newRecordData.created_at).toLocaleDateString(),
        patientId: newRecordData.patient_id,
        uploadedBy: newRecordData.uploaded_by || 'You',
        fileUrl: '', // Optional: call getRecordDownloadUrl(newRecordData.storage_path)
      };

      setUploadProgress(100);
      setTimeout(() => {
        onSuccess(formattedRecord);
        setFiles([]);
        setUploading(false);
      }, 500);
    } catch (error) {
      console.error('Upload failed', error);
      setUploading(false);
      clearInterval(interval);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('dicom')) return '🏥';
    return '📎';
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'Lab Report': return 'success';
      case 'Imaging': return 'default';
      case 'Prescription': return 'warning';
      case 'DICOM': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            Upload Medical Record
          </CardTitle>
          <p className="text-slate-600">Upload your medical documents securely</p>
        </CardHeader>

        <CardContent>
          <div
            {...getRootProps()}
            className={`relative p-12 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <motion.div
              className="flex flex-col items-center"
              animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                isDragActive ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-8 h-8 transition-colors ${
                  isDragActive ? 'text-blue-600' : 'text-slate-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {isDragActive ? 'Drop files here!' : 'Upload your files'}
              </h3>
              <p className="text-slate-600 mb-2">
                {isDragActive ? 'Release to upload' : 'Drag and drop files here, or click to browse'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="text-xs">PDF</Badge>
                <Badge variant="outline" className="text-xs">JPG</Badge>
                <Badge variant="outline" className="text-xs">PNG</Badge>
                <Badge variant="outline" className="text-xs">DICOM</Badge>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {files.length > 0 && !uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">Selected Files</h4>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getFileTypeIcon(file.type)}</span>
                          <div>
                            <p className="font-medium text-slate-900 truncate max-w-xs">{file.name}</p>
                            <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Record Type
                    </label>
                    <Select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value as MedicalRecord['type'])}
                      className="w-full"
                    >
                      <option value="Lab Report">Lab Report</option>
                      <option value="Imaging">Imaging</option>
                      <option value="Prescription">Prescription</option>
                      <option value="DICOM">DICOM</option>
                      <option value="Note">Note</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleUpload} 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center pt-2">
                  <Badge variant={getRecordTypeColor(recordType)} className="text-sm">
                    Will be uploaded as: {recordType}
                  </Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 bg-blue-50 rounded-xl border border-blue-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <LoadingSpinner size="sm" />
                  <div>
                    <p className="font-semibold text-blue-900">Uploading...</p>
                    <p className="text-sm text-blue-700">{files[0]?.name}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-900">{uploadProgress}%</span>
              </div>
              
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              
              <p className="text-xs text-blue-600 mt-2 text-center">
                {uploadProgress < 100 ? 'Please wait while we securely upload your file...' : 'Upload complete!'}
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FileUpload;
