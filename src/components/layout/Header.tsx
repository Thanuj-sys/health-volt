
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
            <h1 className="text-xl font-bold gradient-text">
              HealthVolt
            </h1>
            <p className="text-sm text-slate-500 capitalize">
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
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-sm text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
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
                  className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-depth border border-white/20 z-50"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="p-1">
                    {/* User info in dropdown */}
                    <div className="px-4 py-3 border-b border-slate-200/50">
                      <p className="font-semibold text-sm text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                      <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                    </div>
                    
                    {/* Logout button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-3 text-left hover:bg-red-50 hover:text-red-600 transition-colors duration-200 rounded-lg m-1"
                        onClick={handleLogout}
                      >
                        <div className="text-slate-500 hover:text-red-500">
                          {ICONS.logout}
                        </div>
                        <span className="ml-3 font-medium">Logout</span>
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
