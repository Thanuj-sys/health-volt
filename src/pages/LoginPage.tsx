import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Alert, LoadingSpinner } from '../components/ui';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, signInAsPatient, signInAsHospital } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            HealthVolt
          </h1>
          <p className="text-slate-600 text-sm">
            Smart Health Records - Secure Medical Data Management
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4 bg-gradient-to-b from-slate-50 to-white rounded-t-lg">

                      <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center mb-4"
        >
          <h3 className="text-lg font-bold text-slate-800">
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
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0' 
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
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-0' 
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
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <div className="flex items-center text-red-700">
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
                    <Alert variant="success" className="border-green-200 bg-green-50">
                      <div className="flex items-center text-green-700">
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
                        <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="Enter your email"
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          placeholder="Enter your password"
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
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
                        <Label htmlFor="name" className="text-slate-700 font-medium">
                          {role === 'patient' ? 'Full Name' : 'Contact Name'}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          placeholder={role === 'patient' ? 'Your full name' : 'Contact person name'}
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
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
                              <Label htmlFor="hospitalName" className="text-slate-700 font-medium">Hospital Name</Label>
                              <Input
                                id="hospitalName"
                                name="hospitalName"
                                type="text"
                                required
                                placeholder="Hospital/Clinic name"
                                className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <Label htmlFor="licenseNumber" className="text-slate-700 font-medium">License Number</Label>
                              <Input
                                id="licenseNumber"
                                name="licenseNumber"
                                type="text"
                                required
                                placeholder="Medical license number"
                                className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          placeholder="Enter your email"
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          placeholder="Create a password"
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                          placeholder="Confirm your password"
                          className="mt-1 text-slate-900 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
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

              <div className="text-center mt-6 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium transition-all duration-200 text-sm"
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
          className="text-center text-slate-600 mt-4"
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 inline-block shadow-sm text-xs">
            🔒 Secure • 🏥 HIPAA Compliant • 🔐 End-to-End Encrypted
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
