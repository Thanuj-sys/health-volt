import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import type { UserRole } from '../types';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Alert, LoadingSpinner } from '../components/ui';

const LoginPage: React.FC = () => {
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signIn, signUp, signInAsPatient, signInAsHospital } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Check navigation state for initial mode
  useEffect(() => {
    if (location.state?.mode === 'signup') {
      setMode('signup');
    } else if (location.state?.mode === 'login') {
      setMode('login');
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // Use role-specific signin based on selected tab
      if (role === 'patient') {
        await signInAsPatient(email, password);
      } else {
        await signInAsHospital(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const name = formData.get('name') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      let result;
      
      if (role === 'hospital') {
        const hospitalName = formData.get('hospitalName') as string || name;
        const licenseNumber = formData.get('licenseNumber') as string || `TEMP_${Date.now()}`;
        
        // Use the new hospital signup API
        const { signUpHospital } = await import('../services/api');
        result = await signUpHospital(email, password, name, hospitalName, licenseNumber);
      } else {
        // Use the new patient signup API
        const { signUpPatient } = await import('../services/api');
        result = await signUpPatient(email, password, name);
      }
      
      if (result.needsEmailConfirmation) {
        setSuccess('Account created! Please check your email to confirm your account before signing in.');
        setMode('login');
      } else {
        setSuccess('Account created successfully! You are now signed in.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-300 flex items-center justify-center p-4 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className="max-w-md w-full">
        {/* Theme Toggle - positioned like landing page */}
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-slate-800'
          }`}>
            HealthVolt
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Smart Health Records - Secure Medical Data Management
          </p>
        </motion.div>

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
            <CardHeader className={`text-center pb-4 rounded-t-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-700 to-slate-800' 
                : 'bg-gradient-to-b from-slate-50 to-white'
            }`}>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-center mb-4"
              >
                <h3 className={`text-lg font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>
                  {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
                </h3>
              </motion.div>
        
              {/* Role Selection */}
              <div className="flex justify-center space-x-2">
                <Button
                  type="button"
                  onClick={() => setRole('patient')}
                  variant={role === 'patient' ? 'default' : 'outline'}
                  size="sm"
                  className={`min-w-[100px] font-medium transition-all duration-200 ${
                    role === 'patient' 
                      ? isDarkMode
                        ? 'bg-blue-800 hover:bg-blue-700 text-white shadow-lg border-0' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0'
                      : isDarkMode
                        ? 'border-2 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                        : 'border-2 border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient
                </Button>
                <Button
                  type="button"
                  onClick={() => setRole('hospital')}
                  variant={role === 'hospital' ? 'default' : 'outline'}
                  size="sm"
                  className={`min-w-[100px] font-medium transition-all duration-200 ${
                    role === 'hospital' 
                      ? isDarkMode
                        ? 'bg-emerald-800 hover:bg-emerald-700 text-white shadow-lg border-0' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-0'
                      : isDarkMode
                        ? 'border-2 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                        : 'border-2 border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Hospital
                </Button>
              </div>
            </CardHeader>            <CardContent className="pt-0 px-6 pb-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <Alert variant="destructive" className={`transition-all duration-300 ${
                      isDarkMode 
                        ? 'border-red-600 bg-red-900/20 text-red-300' 
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-sm">{error}</span>
                      </div>
                    </Alert>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <Alert variant="success" className={`transition-all duration-300 ${
                      isDarkMode 
                        ? 'border-green-600 bg-green-900/20 text-green-300' 
                        : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-sm">{success}</span>
                      </div>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                    onSubmit={handleLogin}
                  >
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="email" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>Email address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="Enter your email"
                          className={`mt-1 transition-all duration-200 ${
                            isDarkMode 
                              ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                              : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            placeholder="Enter your password"
                            className={`mt-1 pr-10 transition-all duration-200 ${
                              isDarkMode 
                                ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                                : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                              isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {showPassword ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className={`w-full font-semibold transition-all duration-200 ${
                        role === 'patient'
                          ? isDarkMode
                            ? 'bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                          : isDarkMode
                            ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-white'
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                      }`}
                      size="default"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Signing in...</span>
                        </div>
                      ) : (
                        'Sign in'
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                    onSubmit={handleSignup}
                  >
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="name" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>
                          {role === 'patient' ? 'Full Name' : 'Contact Name'}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          placeholder={role === 'patient' ? 'Your full name' : 'Contact person name'}
                          className={`mt-1 transition-all duration-200 ${
                            isDarkMode 
                              ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                              : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </div>

                      <AnimatePresence>
                        {role === 'hospital' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            <div>
                              <Label htmlFor="hospitalName" className={`font-medium ${
                                isDarkMode ? 'text-slate-200' : 'text-slate-700'
                              }`}>Hospital Name</Label>
                              <Input
                                id="hospitalName"
                                name="hospitalName"
                                type="text"
                                required
                                placeholder="Hospital/Clinic name"
                                className={`mt-1 transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'text-white bg-slate-700 border-slate-600 focus:border-emerald-400 focus:ring-emerald-400 placeholder:text-slate-400' 
                                    : 'text-slate-900 bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                                }`}
                              />
                            </div>
                            <div>
                              <Label htmlFor="licenseNumber" className={`font-medium ${
                                isDarkMode ? 'text-slate-200' : 'text-slate-700'
                              }`}>License Number</Label>
                              <Input
                                id="licenseNumber"
                                name="licenseNumber"
                                type="text"
                                required
                                placeholder="Medical license number"
                                className={`mt-1 transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'text-white bg-slate-700 border-slate-600 focus:border-emerald-400 focus:ring-emerald-400 placeholder:text-slate-400' 
                                    : 'text-slate-900 bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                                }`}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <Label htmlFor="email" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>Email address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="Enter your email"
                          className={`mt-1 transition-all duration-200 ${
                            isDarkMode 
                              ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                              : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showSignupPassword ? "text" : "password"}
                            required
                            placeholder="Create a password"
                            className={`mt-1 pr-10 transition-all duration-200 ${
                              isDarkMode 
                                ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                                : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                              isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {showSignupPassword ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword" className={`font-medium ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="Confirm your password"
                            className={`mt-1 pr-10 transition-all duration-200 ${
                              isDarkMode 
                                ? 'text-white bg-slate-700 border-slate-600 focus:border-blue-400 focus:ring-blue-400 placeholder:text-slate-400' 
                                : 'text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                              isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {showConfirmPassword ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className={`w-full font-semibold transition-all duration-200 ${
                        role === 'patient'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                      }`}
                      size="default"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Creating account...</span>
                        </div>
                      ) : (
                        `Create ${role} account`
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className={`text-center mt-6 pt-4 border-t transition-colors duration-200 ${
                isDarkMode ? 'border-slate-600' : 'border-slate-200'
              }`}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                    setSuccess('');
                  }}
                  className={`font-medium transition-all duration-200 text-sm ${
                    isDarkMode 
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-700' 
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {mode === 'login' 
                    ? "Don't have an account? Sign up" 
                    : 'Already have an account? Sign in'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`text-center mt-4 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          <div className={`backdrop-blur-sm rounded-lg px-3 py-2 inline-block shadow-sm text-xs transition-all duration-200 ${
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

export default LoginPage;
