import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicDashboard from './views/PublicDashboard';
import TeacherInspection from './views/TeacherInspection';
import AdminManagement from './views/AdminManagement';
import ReportsView from './views/ReportsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'inspection' | 'admin' | 'reports'

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sarabun text-slate-800">
        
        {/* Navigation Bar */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <PublicDashboard />}
          {activeTab === 'inspection' && <TeacherInspection />}
          {activeTab === 'admin' && <AdminManagement />}
          {activeTab === 'reports' && <ReportsView />}
        </main>

        {/* Footer */}
        <Footer />

      </div>
    </AuthProvider>
  );
}
