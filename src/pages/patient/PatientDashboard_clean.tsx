import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/useToast';
import * as api from '../../services/api';
import type { PatientRecord } from '../../types';
import { Button, Card, CardContent, CardHeader, CardTitle, SearchInput, Select, Badge, LoadingSpinner, Alert, AnimatedSelect, DatePicker } from '../../components/ui';
import { ICONS } from '../../constants.tsx';
import FileUpload from '../../components/FileUpload';
import GrantAccessModal from '../../components/GrantAccessModal';
import AccessRequestsManager from '../../components/AccessRequestsManager';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const PatientDashboard: React.FC = () => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const { addToast } = useToast();
    const [records, setRecords] = useState<PatientRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState('All');
    const [filterDate, setFilterDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadVisible, setIsUploadVisible] = useState(false);
    const [isGrantAccessModalOpen, setIsGrantAccessModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'records' | 'access'>('records');
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<PatientRecord | null>(null);

    // Fetch records
    useEffect(() => {
        const fetchRecords = async () => {
            if (!user?.id) {
                console.log('No user or user.id found, skipping fetch');
                setIsLoading(false);
                return;
            }

            try {
                console.log('Fetching records for user:', user.id);
                const fetchedRecords = await api.getPatientRecords(user.id);
                console.log('Fetched records:', fetchedRecords);
                setRecords(fetchedRecords || []);
                setError(null);
            } catch (error) {
                console.error('Error fetching records:', error);
                setError('Failed to load medical records');
                setRecords([]); // Set empty array on error
                addToast('Failed to load medical records', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecords();
    }, [user, addToast]);

    // Filter records
    const filteredRecords = useMemo(() => {
        // Ensure records is always an array
        const safeRecords = Array.isArray(records) ? records : [];
        
        return safeRecords.filter(record => {
            // Safely handle potentially undefined values - using correct PatientRecord properties
            const recordTitle = record?.title || '';
            const recordType = record?.record_type || '';
            const searchTermSafe = searchTerm || '';
            
            const matchesSearch = recordTitle.toLowerCase().includes(searchTermSafe.toLowerCase()) ||
                                recordType.toLowerCase().includes(searchTermSafe.toLowerCase());
            const matchesType = filterType === 'All' || recordType === filterType;
            const matchesDate = !filterDate || (record?.created_at && new Date(record.created_at) >= new Date(filterDate));
            
            return matchesSearch && matchesType && matchesDate;
        });
    }, [records, searchTerm, filterType, filterDate]);

    // Helper functions
    const getRecordTypeIcon = (type: string | undefined) => {
        const icons: Record<string, string> = {
            'Lab Report': '🧪',
            'Imaging': '🔬',
            'Prescription': '💊',
            'DICOM': '📋',
            'Note': '📝',
            'Other': '📄'
        };
        return icons[type || 'Other'] || '📄';
    };

    const handleUploadSuccess = (newRecord: PatientRecord) => {
        setRecords(prev => [newRecord, ...prev]);
        setIsUploadVisible(false);
        addToast('Medical record uploaded successfully!', 'success');
    };

    const handleDownload = async (record: PatientRecord) => {
        try {
            console.log('Downloading record:', record.id);
            
            // Check if record has a storage path (actual file)
            if (!record.storage_path) {
                addToast('No file available for download', 'error');
                return;
            }
            
            // Get the signed download URL from Supabase storage
            const downloadUrl = await api.getRecordDownloadUrl(record.storage_path);
            
            // Extract original filename from storage path if possible
            const pathParts = record.storage_path.split('/');
            const storageFileName = pathParts[pathParts.length - 1];
            
            // Try to get original filename or create a meaningful one
            const originalExtension = storageFileName.split('.').pop();
            const sanitizedTitle = record.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'medical_record';
            const filename = `${sanitizedTitle}.${originalExtension}`;
            
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.target = '_blank';
            
            // For some file types, we need to fetch and create blob to force download
            try {
                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error('Failed to fetch file');
                
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                
                link.href = blobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up blob URL
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
                
            } catch (fetchError) {
                // Fallback: direct download using signed URL
                console.log('Using direct download fallback');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            addToast('Record download started!', 'success');
            
        } catch (error) {
            console.error('Error downloading record:', error);
            addToast('Failed to download record', 'error');
        }
    };

    const handleViewRecord = async (record: PatientRecord) => {
        try {
            console.log('Viewing record:', record.id);
            
            // Check if record has a storage path (actual file)
            if (!record.storage_path) {
                // Show record details if no file available
                showRecordDetailsPage(record);
                return;
            }
            
            // Get the signed URL for viewing the file
            const viewUrl = await api.getRecordDownloadUrl(record.storage_path);
            
            // Get file extension to determine how to display it
            const fileExtension = record.storage_path.split('.').pop()?.toLowerCase();
            
            // For PDFs and images, create an embedded viewer page
            const directViewTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
            
            if (fileExtension && directViewTypes.includes(fileExtension)) {
                // Create a viewer page with the actual file embedded
                showEmbeddedFileViewer(record, viewUrl, fileExtension);
            } else {
                // For other file types (DICOM, documents, etc.), show a viewer page
                showFileViewerPage(record, viewUrl);
            }
            
        } catch (error) {
            console.error('Error viewing record:', error);
            addToast('Failed to view record', 'error');
        }
    };

    // Function to show embedded file viewer for PDFs and images
    const showEmbeddedFileViewer = (record: PatientRecord, fileUrl: string, fileExtension: string) => {
        const fileName = record.storage_path?.split('/').pop();
        const isDarkTheme = isDarkMode; // Get current theme state
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View ${record.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${isDarkTheme ? '#0f172a' : '#f8fafc'};
            color: ${isDarkTheme ? '#e2e8f0' : '#334155'};
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: ${isDarkTheme ? '#1e293b' : 'white'};
            border-bottom: 1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'};
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }
        .header-info {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }
        .badge {
            background: ${isDarkTheme ? '#1e40af' : '#dbeafe'};
            color: ${isDarkTheme ? '#bfdbfe' : '#1d4ed8'};
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8rem;
        }
        .download-btn {
            background: ${isDarkTheme ? '#3b82f6' : '#000000'};
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .download-btn:hover {
            background: ${isDarkTheme ? '#2563eb' : '#374151'};
            transform: translateY(-1px);
        }
        .viewer-container {
            flex: 1;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 0;
        }
        .file-viewer {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 12px;
            background: ${isDarkTheme ? '#1e293b' : 'white'};
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .image-viewer {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            background: ${isDarkTheme ? '#1e293b' : 'white'};
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 16px;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid ${isDarkTheme ? '#334155' : '#e2e8f0'};
            border-top: 3px solid ${isDarkTheme ? '#3b82f6' : '#000000'};
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
            .header {
                padding: 16px;
            }
            .header-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            .viewer-container {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 ${record.title}</h1>
        <div class="header-info">
            <div class="info-item">
                <span>📅</span>
                <span>${record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 'Unknown'}</span>
            </div>
            <div class="info-item">
                <span class="badge">${record.record_type}</span>
            </div>
            <div class="info-item">
                <span>📁</span>
                <span>${fileName}</span>
            </div>
            <a href="${fileUrl}" download="${fileName}" class="download-btn">
                ⬇️ Download
            </a>
        </div>
    </div>
    
    <div class="viewer-container">
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <span>Loading ${fileExtension.toUpperCase()} file...</span>
        </div>
        
        ${fileExtension === 'pdf' ? `
            <iframe 
                id="fileViewer"
                src="${fileUrl}" 
                class="file-viewer"
                style="display: none;"
                onload="hideLoading()"
                onerror="showError()">
            </iframe>
        ` : `
            <img 
                id="fileViewer"
                src="${fileUrl}" 
                alt="${record.title}"
                class="image-viewer"
                style="display: none;"
                onload="hideLoading()"
                onerror="showError()"
            />
        `}
    </div>
    
    <script>
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('fileViewer').style.display = 'block';
        }
        
        function showError() {
            document.getElementById('loading').innerHTML = \`
                <div style="text-align: center;">
                    <span style="font-size: 2rem;">⚠️</span>
                    <p>Unable to load the file.</p>
                    <p style="font-size: 0.9rem; margin-top: 8px;">
                        <a href="${fileUrl}" download="${fileName}" style="color: #3b82f6;">
                            Click here to download the file instead
                        </a>
                    </p>
                </div>
            \`;
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.location.href = '${fileUrl}';
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
        
        // Auto-focus for accessibility
        document.body.focus();
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        if (newWindow) {
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            addToast('File opened in new tab', 'success');
        } else {
            addToast('Please allow popups to view the file', 'error');
        }
    };

    // Function to show a viewer page for other file types
    const showFileViewerPage = (record: PatientRecord, fileUrl: string) => {
        const fileName = record.storage_path?.split('/').pop();
        const fileExtension = record.storage_path?.split('.').pop()?.toLowerCase();
        const isDarkTheme = isDarkMode;

        // Helper function to get file icon
        const getFileIcon = (extension: string | undefined) => {
            const icons: { [key: string]: string } = {
                'dcm': '🏥',
                'dicom': '🏥',
                'doc': '📄',
                'docx': '📄',
                'txt': '📝',
                'rtf': '📝',
                'xls': '📊',
                'xlsx': '📊',
                'ppt': '📋',
                'pptx': '📋',
                'zip': '📦',
                'rar': '📦',
                'mp4': '🎥',
                'avi': '🎥',
                'wav': '🎵',
                'mp3': '🎵'
            };
            return icons[extension || ''] || '📄';
        };
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View ${record.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${isDarkTheme ? '#0f172a' : '#f8fafc'};
            color: ${isDarkTheme ? '#e2e8f0' : '#334155'};
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: ${isDarkTheme ? '#1e293b' : 'white'};
            border-bottom: 1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'};
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }
        .header-info {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }
        .badge {
            background: ${isDarkTheme ? '#1e40af' : '#dbeafe'};
            color: ${isDarkTheme ? '#bfdbfe' : '#1d4ed8'};
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8rem;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .btn-primary {
            background: ${isDarkTheme ? '#3b82f6' : '#000000'};
            color: white;
        }
        .btn-primary:hover {
            background: ${isDarkTheme ? '#2563eb' : '#374151'};
            transform: translateY(-1px);
        }
        .btn-secondary {
            background: ${isDarkTheme ? '#374151' : '#f1f5f9'};
            color: ${isDarkTheme ? '#d1d5db' : '#475569'};
            border: 1px solid ${isDarkTheme ? '#4b5563' : '#d1d5db'};
        }
        .btn-secondary:hover {
            background: ${isDarkTheme ? '#4b5563' : '#e2e8f0'};
        }
        .viewer-container {
            flex: 1;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .viewer-content {
            max-width: 600px;
            padding: 40px;
            background: ${isDarkTheme ? '#1e293b' : 'white'};
            border-radius: 16px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .file-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        .file-info h2 {
            font-size: 1.5rem;
            margin-bottom: 8px;
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
        }
        .file-info p {
            margin-bottom: 16px;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
        }
        .actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 24px;
        }
        .special-note {
            background: ${isDarkTheme ? '#1e40af' : '#dbeafe'};
            color: ${isDarkTheme ? '#bfdbfe' : '#1d4ed8'};
            padding: 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.9rem;
        }
        @media (max-width: 768px) {
            .header {
                padding: 16px;
            }
            .header-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }
            .viewer-container {
                padding: 20px 16px;
            }
            .viewer-content {
                padding: 30px 20px;
            }
            .actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 ${record.title}</h1>
        <div class="header-info">
            <div class="info-item">
                <span>📅</span>
                <span>${record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : 'Unknown'}</span>
            </div>
            <div class="info-item">
                <span class="badge">${record.record_type}</span>
            </div>
            <div class="info-item">
                <span>📁</span>
                <span>${fileName}</span>
            </div>
        </div>
    </div>
    
    <div class="viewer-container">
        <div class="viewer-content">
            <div class="file-icon">
                ${getFileIcon(fileExtension)}
            </div>
            
            <div class="file-info">
                <h2>${fileName}</h2>
                <p>File Type: ${fileExtension ? fileExtension.toUpperCase() : 'Unknown'}</p>
                <p>Record Type: ${record.record_type}</p>
            </div>
            
            ${fileExtension === 'dcm' || fileExtension === 'dicom' ? `
                <div class="special-note">
                    📱 This is a DICOM medical imaging file. For best viewing experience, 
                    download and open with specialized medical imaging software.
                </div>
            ` : ''}
            
            <div class="actions">
                <a href="${fileUrl}" download="${fileName}" class="btn btn-primary">
                    ⬬ Download File
                </a>
                <a href="${fileUrl}" target="_blank" class="btn btn-secondary">
                    🔗 Open in Browser
                </a>
                <button onclick="window.close()" class="btn btn-secondary">
                    ✕ Close
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.location.href = '${fileUrl}';
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        if (newWindow) {
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            addToast('File viewer opened in new tab', 'success');
        } else {
            addToast('Please allow popups to view the file', 'error');
        }
    };

    // Function to show record details when no file is available
    const showRecordDetailsPage = (record: PatientRecord) => {
        const isDarkTheme = isDarkMode;
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${record.title} - Details</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${isDarkTheme ? '#0f172a' : '#f8fafc'};
            color: ${isDarkTheme ? '#e2e8f0' : '#334155'};
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: ${isDarkTheme ? '#1e293b' : 'white'};
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .header {
            background: linear-gradient(135deg, ${isDarkTheme ? '#1e40af' : '#000000'}, ${isDarkTheme ? '#3b82f6' : '#374151'});
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2rem;
            margin-bottom: 8px;
        }
        .header p {
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .detail-item {
            background: ${isDarkTheme ? '#0f172a' : '#f8fafc'};
            padding: 20px;
            border-radius: 8px;
            border: 1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'};
        }
        .detail-label {
            font-weight: 600;
            color: ${isDarkTheme ? '#94a3b8' : '#64748b'};
            font-size: 0.9rem;
            margin-bottom: 8px;
        }
        .detail-value {
            color: ${isDarkTheme ? '#f1f5f9' : '#1e293b'};
            font-size: 1.1rem;
        }
        .badge {
            background: ${isDarkTheme ? '#1e40af' : '#dbeafe'};
            color: ${isDarkTheme ? '#bfdbfe' : '#1d4ed8'};
            padding: 6px 16px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            display: inline-block;
        }
        .close-btn {
            background: ${isDarkTheme ? '#3b82f6' : '#000000'};
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.2s;
            display: block;
            margin: 0 auto;
        }
        .close-btn:hover {
            background: ${isDarkTheme ? '#2563eb' : '#374151'};
            transform: translateY(-1px);
        }
        .no-file-notice {
            text-align: center;
            padding: 20px;
            background: ${isDarkTheme ? '#1e40af' : '#dbeafe'};
            color: ${isDarkTheme ? '#bfdbfe' : '#1d4ed8'};
            border-radius: 8px;
            margin-bottom: 20px;
        }
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .header {
                padding: 20px;
            }
            .header h1 {
                font-size: 1.5rem;
            }
            .content {
                padding: 20px;
            }
            .detail-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 ${record.title}</h1>
            <p>Medical Record Details</p>
        </div>
        
        <div class="content">
            <div class="no-file-notice">
                📄 This record contains information only - no file attachment available
            </div>
            
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Record Type</div>
                    <div class="detail-value">
                        <span class="badge">${record.record_type}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Date Created</div>
                    <div class="detail-value">
                        ${record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : 'Unknown'}
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="badge">Active</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Record ID</div>
                    <div class="detail-value">${record.id}</div>
                </div>
            </div>
            
            <button onclick="window.close()" class="close-btn">
                ✕ Close Window
            </button>
        </div>
    </div>
    
    <script>
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        if (newWindow) {
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            addToast('Record details opened in new tab', 'success');
        } else {
            addToast('Please allow popups to view the record details', 'error');
        }
    };

    const handleDeleteRecord = async (record: PatientRecord) => {
        try {
            await api.deleteRecord(record.id);
            setRecords(prev => prev.filter(r => r.id !== record.id));
            addToast('Record deleted successfully', 'success');
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        } catch (error) {
            console.error('Error deleting record:', error);
            addToast('Failed to delete record', 'error');
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

                            <motion.div 
                                className="flex flex-col sm:flex-row gap-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                            >
                                <Button
                                    onClick={() => setIsUploadVisible(true)}
                                    className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 ${
                                        isDarkMode 
                                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                                            : 'bg-black hover:bg-gray-800 text-white shadow-lg shadow-gray-900/25'
                                    }`}
                                >
                                    <span className="mr-2">📤</span>
                                    Upload Record
                                </Button>
                                <Button
                                    onClick={() => setIsGrantAccessModalOpen(true)}
                                    variant="outline"
                                    className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 ${
                                        isDarkMode 
                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="mr-2">🔐</span>
                                    Grant Access
                                </Button>
                            </motion.div>
                        </motion.div>

                        {/* Right Content - Statistics */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="lg:justify-self-end"
                        >
                            <div className="grid grid-cols-2 gap-6">
                                <motion.div 
                                    className={`p-6 rounded-2xl ${
                                        isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'
                                    } backdrop-blur-sm border ${
                                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl mb-2">📊</div>
                                    <div className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {filteredRecords.length}
                                    </div>
                                    <div className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Total Records
                                    </div>
                                </motion.div>

                                <motion.div 
                                    className={`p-6 rounded-2xl ${
                                        isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'
                                    } backdrop-blur-sm border ${
                                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl mb-2">🔒</div>
                                    <div className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        100%
                                    </div>
                                    <div className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Secure Storage
                                    </div>
                                </motion.div>

                                <motion.div 
                                    className={`p-6 rounded-2xl ${
                                        isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'
                                    } backdrop-blur-sm border ${
                                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl mb-2">⚡</div>
                                    <div className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        24/7
                                    </div>
                                    <div className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Availability
                                    </div>
                                </motion.div>

                                <motion.div 
                                    className={`p-6 rounded-2xl ${
                                        isDarkMode ? 'bg-slate-800/50' : 'bg-white/80'
                                    } backdrop-blur-sm border ${
                                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="text-3xl mb-2">🌐</div>
                                    <div className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        Global
                                    </div>
                                    <div className={`text-sm ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Access
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
                <motion.div 
                    className={`flex rounded-2xl p-2 ${
                        isDarkMode ? 'bg-slate-800' : 'bg-white'
                    } shadow-xl border ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                >
                    <button
                        onClick={() => setActiveTab('records')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            activeTab === 'records'
                                ? isDarkMode 
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-black text-white shadow-lg'
                                : isDarkMode
                                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        📋 Medical Records
                        <Badge variant="secondary" className="ml-2">
                            {filteredRecords.length}
                        </Badge>
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            activeTab === 'access'
                                ? isDarkMode 
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-black text-white shadow-lg'
                                : isDarkMode
                                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        🔐 Access Control
                    </button>
                </motion.div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">
                    {activeTab === 'records' ? (
                        <motion.div
                            key="records"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* Search and Filters */}
                            <Card className={`${
                                isDarkMode ? 'bg-slate-800 border-gray-700' : 'bg-white border-gray-200'
                            }`}>
                                <CardHeader>
                                    <CardTitle className={`${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        📄 Your Medical Records
                                    </CardTitle>
                                    <p className={`${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Securely manage and view your medical documents
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <SearchInput
                                            placeholder="Search medical records..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`${
                                                isDarkMode 
                                                    ? 'bg-slate-700 border-gray-600 text-white placeholder-gray-400' 
                                                    : 'bg-white border-gray-300'
                                            }`}
                                        />
                                        <AnimatedSelect
                                            value={filterType}
                                            onValueChange={setFilterType}
                                            placeholder="All Types"
                                            options={[
                                                { value: 'All', label: '❤️ All Types' },
                                                { value: 'Lab Report', label: '🧪 Lab Report' },
                                                { value: 'Imaging', label: '🔬 Imaging' },
                                                { value: 'Prescription', label: '💊 Prescription' },
                                                { value: 'DICOM', label: '📋 DICOM' },
                                                { value: 'Note', label: '📝 Note' },
                                                { value: 'Other', label: '📄 Other' }
                                            ]}
                                            className={`${
                                                isDarkMode 
                                                    ? 'bg-slate-700 border-gray-600 text-white' 
                                                    : 'bg-white border-gray-300'
                                            }`}
                                        />
                                        <DatePicker
                                            value={filterDate}
                                            onChange={setFilterDate}
                                            placeholder="Filter from date..."
                                            className={`${
                                                isDarkMode 
                                                    ? 'bg-slate-700 border-gray-600 text-white' 
                                                    : 'bg-white border-gray-300'
                                            }`}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Records Display */}
                            {error ? (
                                <Alert variant="destructive">
                                    <span className="text-red-600">{error}</span>
                                </Alert>
                            ) : filteredRecords.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`text-center py-16 rounded-2xl ${
                                        isDarkMode ? 'bg-slate-800' : 'bg-white'
                                    } border ${
                                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="text-6xl mb-4">📋</div>
                                    <h3 className={`text-xl font-semibold mb-2 ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        No medical records found
                                    </h3>
                                    <p className={`${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    } mb-6`}>
                                        Upload your first medical record to get started
                                    </p>
                                    <Button
                                        onClick={() => setIsUploadVisible(true)}
                                        className={`${
                                            isDarkMode 
                                                ? 'bg-blue-600 hover:bg-blue-500' 
                                                : 'bg-black hover:bg-gray-800'
                                        } text-white`}
                                    >
                                        <span className="mr-2">📤</span>
                                        Upload Your First Record
                                    </Button>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredRecords.map((record, index) => (
                                        <motion.div
                                            key={record.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: index * 0.1 }}
                                            whileHover={{ scale: 1.02 }}
                                            className={`rounded-2xl p-6 border transition-all duration-300 ${
                                                isDarkMode 
                                                    ? 'bg-slate-800 border-gray-700 hover:border-blue-500' 
                                                    : 'bg-white border-gray-200 hover:border-blue-400'
                                            } shadow-lg hover:shadow-xl`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">
                                                        {getRecordTypeIcon(record.record_type)}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-semibold text-lg truncate ${
                                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                                        }`}>
                                                            {record.title}
                                                        </h3>
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`${
                                                                isDarkMode 
                                                                    ? 'bg-blue-900 text-blue-200' 
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}
                                                        >
                                                            {record.record_type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between">
                                                    <span className={`text-sm ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        Date
                                                    </span>
                                                    <span className={`text-sm font-medium ${
                                                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                    }`}>
                                                        {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className={`text-sm ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        Status
                                                    </span>
                                                    <span className="text-sm">
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`${
                                                                isDarkMode 
                                                                    ? 'bg-green-900 text-green-200' 
                                                                    : 'bg-green-100 text-green-800'
                                                            }`}
                                                        >
                                                            Active
                                                        </Badge>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleDownload(record)}
                                                    className={`flex-1 ${
                                                        isDarkMode 
                                                            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                            : 'bg-black hover:bg-gray-800 text-white'
                                                    }`}
                                                    size="sm"
                                                >
                                                    📥 Download
                                                </Button>
                                                <Button
                                                    onClick={() => handleViewRecord(record)}
                                                    variant="outline"
                                                    className={`flex-1 ${
                                                        isDarkMode 
                                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                    size="sm"
                                                >
                                                    👁️ View
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="access"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <AccessRequestsManager />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isUploadVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                        onClick={() => setIsUploadVisible(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`w-full max-w-2xl ${
                                isDarkMode ? 'bg-slate-800' : 'bg-white'
                            } rounded-2xl shadow-2xl overflow-hidden`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={`p-6 border-b ${
                                isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <h2 className={`text-2xl font-bold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        📤 Upload Medical Record
                                    </h2>
                                    <Button
                                        onClick={() => setIsUploadVisible(false)}
                                        variant="ghost"
                                        size="sm"
                                        className={`${
                                            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6">
                                <FileUpload onUploadSuccess={handleUploadSuccess} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {isGrantAccessModalOpen && (
                    <GrantAccessModal
                        isOpen={isGrantAccessModalOpen}
                        onClose={() => setIsGrantAccessModalOpen(false)}
                    />
                )}

                {isDeleteModalOpen && recordToDelete && (
                    <ConfirmDeleteModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRecordToDelete(null);
                        }}
                        onConfirm={() => handleDeleteRecord(recordToDelete)}
                        recordTitle={recordToDelete.title}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PatientDashboard;