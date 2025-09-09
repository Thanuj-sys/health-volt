
import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ICONS } from '../../constants.tsx';
import { Button } from '../ui';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const { addToast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      addToast('Successfully logged out', 'success');
    } catch (error) {
      console.error('Logout failed:', error);
      addToast('Failed to log out. Please try again.', 'error');
    }
  };

  const patientLinks = [
    { to: '/dashboard', icon: ICONS.dashboard, label: 'Dashboard' },
    { to: '/history', icon: ICONS.history, label: 'Consent History' },
  ];

  const hospitalLinks = [
    { to: '/dashboard', icon: ICONS.dashboard, label: 'Patient Dashboard' },
  ];

  const links = user?.role === 'patient' ? patientLinks : hospitalLinks;

  const sidebarVariants = {
    open: { x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  const linkVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className="fixed lg:relative inset-y-0 left-0 w-64 z-30 flex flex-col lg:translate-x-0"
        variants={sidebarVariants}
        animate={sidebarOpen ? "open" : "closed"}
        initial={false}
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Logo section */}
        <motion.div 
          className="flex items-center justify-center h-20 border-b border-white/20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center space-x-3">
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
            <h1 className="text-xl font-bold gradient-text">HealthVolt</h1>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map((link, index) => (
            <motion.div
              key={link.to}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={linkVariants}
            >
              <NavLink
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => 
                  `group flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-800 hover:shadow-sm'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.div
                      className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {link.icon}
                    </motion.div>
                    <span>{link.label}</span>
                    {isActive && (
                      <motion.div
                        className="ml-auto w-2 h-2 bg-white rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* User section */}
        <motion.div 
          className="p-4 border-t border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {/* User info */}
          <div className="mb-4 p-3 rounded-xl bg-white/40 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md">
                <span className="text-xs font-semibold text-white">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="ghost" 
              className="w-full justify-start space-x-3 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 rounded-xl p-3" 
              onClick={handleLogout}
            >
              <div className="text-slate-500">
                {ICONS.logout}
              </div>
              <span>Logout</span>
            </Button>
          </motion.div>
        </motion.div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
