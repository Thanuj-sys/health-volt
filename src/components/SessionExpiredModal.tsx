import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReLogin: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ 
  isOpen, 
  onClose, 
  onReLogin 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-depth w-full max-w-md border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 text-center">
              <motion.div 
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  Session Expired
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Your session has expired for security reasons. Please log in again to continue accessing your account.
                </p>
              </motion.div>
            </div>

            {/* Security info */}
            <motion.div 
              className="mx-6 mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                  <svg 
                    className="w-3 h-3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12l2 2 4-4m5.586-2.586L18 8l5 5m-1.5-1.5L21 11" 
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Automatic Logout</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Sessions automatically expire after 24 hours of inactivity to protect your medical data.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div 
              className="px-6 py-4 bg-slate-50/50 backdrop-blur-sm flex justify-end gap-3 rounded-b-2xl border-t border-slate-200/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                variant="outline" 
                onClick={onClose}
                className="hover:bg-slate-100"
              >
                Close
              </Button>
              <Button 
                onClick={onReLogin}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
              >
                <div className="flex items-center space-x-2">
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" 
                    />
                  </svg>
                  <span>Login Again</span>
                </div>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionExpiredModal;
