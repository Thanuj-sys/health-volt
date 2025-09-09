

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Background with gradient */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #f1f5f9 50%, #e0e7ff 75%, #f8fafc 100%)'
        }}
      />
      
      {/* Hide sidebar for now */}
      {false && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header setSidebarOpen={setSidebarOpen} />
        
        <motion.main 
          className="flex-1 overflow-x-hidden overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background: 'transparent'
          }}
        >
          <Outlet />
        </motion.main>
      </div>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
