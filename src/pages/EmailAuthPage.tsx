import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, Button, LoadingSpinner, Alert } from '../components/ui';

const EmailAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { addToast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  
  // Get token and type from URL parameters
  const token = searchParams.get('token');
  const type = searchParams.get('type'); // 'confirm' for email confirmation, 'reset' for password reset

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid authentication link. No token provided.');
      return;
    }

    verifyToken();
  }, [token, type]);

  const verifyToken = async () => {
    try {
      setStatus('loading');
      
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate different scenarios based on token
      if (token === 'expired') {
        setStatus('expired');
        setMessage('This authentication link has expired. Please request a new one.');
      } else if (token === 'invalid') {
        setStatus('error');
        setMessage('Invalid authentication link. Please check your email for the correct link.');
      } else {
        // Successful verification
        if (type === 'confirm') {
          setStatus('success');
          setMessage('Your email has been successfully verified! You can now sign in to your account.');
          addToast('Email verified successfully!', 'success');
        } else if (type === 'reset') {
          setStatus('success');
          setMessage('Password reset verified. You can now set a new password.');
          addToast('Password reset verified!', 'success');
        } else {
          setStatus('success');
          setMessage('Authentication successful!');
          addToast('Authentication successful!', 'success');
        }
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setStatus('error');
      setMessage('An error occurred while verifying your authentication. Please try again.');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      if (type === 'reset') {
        // Redirect to password reset page with token
        navigate(`/reset-password?token=${token}`);
      } else {
        // Redirect to login page
        navigate('/login');
      }
    } else if (status === 'expired' || status === 'error') {
      navigate('/');
    }
  };

  const handleResendEmail = () => {
    // Here you would implement resending the email
    addToast('Verification email sent! Please check your inbox.', 'info');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <LoadingSpinner size="lg" />;
      case 'success':
        return (
          <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-16 h-16 text-amber-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'expired':
        return 'text-amber-700';
      default:
        return isDarkMode ? 'text-white' : 'text-slate-800';
    }
  };

  const getButtonText = () => {
    if (status === 'success') {
      return type === 'reset' ? 'Set New Password' : 'Continue to Sign In';
    } else if (status === 'expired' || status === 'error') {
      return 'Back to Home';
    }
    return 'Please wait...';
  };

  return (
    <div className={`min-h-screen transition-all duration-300 flex items-center justify-center p-4 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="max-w-md w-full">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`fixed top-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' 
              : 'bg-white hover:bg-slate-50 text-slate-800'
          }`}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </motion.button>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-800'
          }`}>
            HealthVolt
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Email Authentication
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className={`border-0 shadow-xl backdrop-blur-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800/95 border-slate-600' 
              : 'bg-white/95 border-slate-200'
          }`}>
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", bounce: 0.5 }}
                className="mb-4"
              >
                {getStatusIcon()}
              </motion.div>
              <CardTitle className={`text-xl font-bold ${getStatusColor()}`}>
                {status === 'loading' && 'Verifying Authentication...'}
                {status === 'success' && 'Authentication Successful!'}
                {status === 'error' && 'Authentication Failed'}
                {status === 'expired' && 'Link Expired'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`leading-relaxed ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {message}
              </motion.p>

              {status !== 'loading' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-4"
                >
                  <Button
                    onClick={handleContinue}
                    className={`w-full font-semibold transition-all duration-200 ${
                      status === 'success'
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                    size="lg"
                  >
                    {getButtonText()}
                  </Button>

                  {(status === 'expired' || status === 'error') && type === 'confirm' && (
                    <Button
                      onClick={handleResendEmail}
                      variant="outline"
                      className={`w-full transition-all duration-300 ${
                        isDarkMode
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      size="lg"
                    >
                      Resend Verification Email
                    </Button>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className={`text-center mt-6 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          <div className={`backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-sm text-xs transition-all duration-200 ${
            isDarkMode 
              ? 'bg-slate-800/60 border border-slate-600' 
              : 'bg-white/60'
          }`}>
            🔒 Secure • 🏥 HIPAA Compliant • 🔐 End-to-End Encrypted
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmailAuthPage;