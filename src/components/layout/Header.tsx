
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ICONS } from '../../constants.tsx';
import { Button } from '../ui';

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false); // Close menu first
    try {
      await signOut();
      addToast('Successfully logged out', 'success');
    } catch (error) {
      console.error('Logout failed:', error);
      addToast('Failed to log out. Please try again.', 'error');
    }
  };
  
  return (
    <motion.header 
      className="glass sticky top-0 z-50 border-b border-white/20"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Mobile menu button */}
        <motion.button 
          className="lg:hidden p-2 rounded-lg hover:bg-white/50 transition-all duration-200 flex items-center justify-center"
          onClick={() => setSidebarOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-slate-600">
            {ICONS.menu}
          </div>
        </motion.button>

        {/* Logo and title - visible on desktop */}
        <motion.div 
          className="hidden lg:flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <svg 
              className="w-6 h-6 text-white" 
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
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              HealthVolt
            </h1>
            <p className="text-sm text-slate-600 capitalize">
              {user?.role} Portal
            </p>
          </div>
        </motion.div>

        <div className="flex-1" />
        
        {/* User section */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {/* User info - hidden on mobile */}
          <div className="hidden sm:flex flex-col text-right">
            <p className="font-semibold text-sm text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-600 capitalize font-medium">{user?.role}</p>
          </div>
          
          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <motion.button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-10 w-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-white text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </motion.button>
            
            {/* User Menu Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div 
                  className="absolute right-0 mt-3 w-80 bg-white backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 z-50 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ 
                    type: "spring",
                    duration: 0.4,
                    bounce: 0.3
                  }}
                >
                  {/* Professional user card */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                    <div className="flex items-center space-x-4">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
                      >
                        <span className="text-xl">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <motion.h3 
                          className="font-bold text-slate-800 text-lg truncate"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          {user?.name}
                        </motion.h3>
                        <motion.p 
                          className="text-sm text-slate-600 capitalize font-medium"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          {user?.role} Portal
                        </motion.p>
                        <motion.p 
                          className="text-xs text-slate-500 truncate mt-1"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {user?.email}
                        </motion.p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Professional sign out section */}
                  <div className="p-4 bg-white">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-center px-6 py-4 text-center hover:bg-red-50 hover:text-red-600 transition-all duration-300 rounded-xl group font-semibold"
                        onClick={handleLogout}
                      >
                        <motion.div 
                          className="text-slate-500 group-hover:text-red-500 mr-3"
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </motion.div>
                        <span className="group-hover:text-red-600">Sign Out</span>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
};

export default Header;
