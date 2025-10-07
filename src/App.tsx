import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import PatientRecordViewerPage from './pages/hospital/PatientRecordViewerPage';
import ConsentHistoryPage from './pages/patient/ConsentHistoryPage';
import EmailAuthPage from './pages/EmailAuthPage';
import MainLayout from './components/layout/MainLayout';

// Enhanced loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    {/* Background gradient */}
    <div 
      className="fixed inset-0 -z-10"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #f1f5f9 50%, #e0e7ff 75%, #f8fafc 100%)'
      }}
    />
    
    <motion.div 
      className="flex flex-col items-center space-y-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo */}
      <motion.div 
        className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 360] 
        }}
        transition={{ 
          scale: { duration: 2, repeat: Infinity },
          rotate: { duration: 3, repeat: Infinity, ease: "linear" }
        }}
      >
        <svg 
          className="w-8 h-8 text-white" 
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
      </motion.div>

      {/* Loading text */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold gradient-text mb-2">HealthVolt</h2>
        <p className="text-slate-600 text-sm">Loading your secure dashboard...</p>
      </motion.div>

      {/* Loading bar */}
      <motion.div 
        className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  </div>
);

// Main app router component
const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('AppRouter - user:', user, 'loading:', loading);

  if (loading) {
    console.log('Showing loading spinner...');
    return <LoadingSpinner />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* If user is not authenticated, show landing page and login */}
        {!user ? (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth" element={<EmailAuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Patient routes */}
            {user.role === 'patient' && (
              <Route path="/" element={<MainLayout />}>
                <Route path="dashboard" element={<PatientDashboard />} />
                <Route path="history" element={<ConsentHistoryPage />} />
              </Route>
            )}

            {/* Hospital routes */}
            {user.role === 'hospital' && (
              <Route path="/" element={<MainLayout />}>
                <Route path="dashboard" element={<HospitalDashboard />} />
                <Route path="patient/:patientId" element={<PatientRecordViewerPage />} />
              </Route>
            )}

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </AnimatePresence>
  );
};

// Main App component
const App: React.FC = () => {
  console.log('App component rendering...');
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen">
              <AppRouter />
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
