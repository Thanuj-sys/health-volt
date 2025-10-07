
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../hooks/useToast';
import { ICONS } from '../../constants.tsx';
import { Button } from '../ui';

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
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
      className={`glass sticky top-0 z-50 border-b transition-all duration-300 ${
        isDarkMode 
          ? 'border-slate-600/50' 
          : 'border-white/20'
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Mobile menu button */}
        <motion.button 
          className={`lg:hidden p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
            isDarkMode 
              ? 'hover:bg-slate-700 text-slate-300' 
              : 'hover:bg-white/50 text-slate-600'
          }`}
          onClick={() => setSidebarOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div>
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
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg ${
            isDarkMode 
              ? 'bg-gradient-to-br from-purple-600 to-purple-800' 
              : 'bg-gradient-to-br from-blue-500 to-purple-600'
          }`}>
            <svg 
              className="w-6 h-6"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z" 
                fill={isDarkMode ? '#a855f7' : '#ffffff'}
                stroke={isDarkMode ? '#a855f7' : '#ffffff'}
                strokeWidth="2"
                style={{
                  filter: isDarkMode 
                    ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.8))' 
                    : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                }}
              />
            </svg>
          </div>
          
          <div>
            <h1 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>
              HealthVolt
            </h1>
            <p className={`text-sm capitalize ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
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
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-full shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400' 
                : 'bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            {isDarkMode ? (
              <svg className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400 stroke-yellow-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={isDarkMode ? {color: '#fbbf24', stroke: '#fbbf24'} : {}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${isDarkMode ? 'text-slate-800 stroke-slate-800' : 'text-slate-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={!isDarkMode ? {color: '#1e293b', stroke: '#1e293b'} : {}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </motion.button>

          {/* User info - hidden on mobile */}
          <div className="hidden sm:flex flex-col text-right">
            <p className={`font-semibold text-sm leading-tight ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>{user?.name}</p>
            <p className={`text-xs capitalize font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>{user?.role}</p>
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
                  className={`absolute right-0 mt-3 w-80 backdrop-blur-xl rounded-2xl shadow-2xl border z-50 overflow-hidden transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-600/50' 
                      : 'bg-white border-slate-200/50'
                  }`}
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
                  <div className={`p-6 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700' 
                      : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
                  }`}>
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
                          className={`font-bold text-lg truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          {user?.name}
                        </motion.h3>
                        <motion.p 
                          className={`text-sm capitalize font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          {user?.role} Portal
                        </motion.p>
                        <motion.p 
                          className={`text-xs truncate mt-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
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
                  <div className={`p-4 ${
                    isDarkMode ? 'bg-slate-800' : 'bg-white'
                  }`}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Button
                        variant="ghost"
                        className={`w-full justify-center px-6 py-4 text-center transition-all duration-300 rounded-xl group font-semibold ${
                          isDarkMode 
                            ? 'hover:bg-red-900/20 hover:text-red-400' 
                            : 'hover:bg-red-50 hover:text-red-600'
                        }`}
                        onClick={handleLogout}
                      >
                        <motion.div 
                          className={`mr-3 transition-colors duration-200 ${
                            isDarkMode 
                              ? 'text-slate-400 group-hover:text-red-400' 
                              : 'text-slate-500 group-hover:text-red-500'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <svg className={`w-5 h-5 ${isDarkMode ? 'text-slate-400 stroke-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={isDarkMode ? {color: '#9ca3af', stroke: '#9ca3af'} : {}}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </motion.div>
                        <span className={`${
                          isDarkMode ? 'group-hover:text-red-400' : 'group-hover:text-red-600'
                        }`}>Sign Out</span>
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
