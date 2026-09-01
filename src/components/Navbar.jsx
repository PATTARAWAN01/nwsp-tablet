import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  FilePieChart, 
  ShieldCheck, 
  Lock,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { isAdmin, config } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'inspection', label: 'ตรวจเช็คอุปกรณ์', icon: ClipboardCheck },
    { id: 'reports', label: 'รายงาน & Export', icon: FilePieChart },
    { id: 'admin', label: 'ระบบหลังบ้าน', icon: isAdmin ? ShieldCheck : Lock, isAdminBtn: true }
  ];

  return (
    <header className="modern-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Identity - IBM Plex Sans Thai */}
          <div 
            className="flex items-center space-x-3.5 cursor-pointer group" 
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-sm group-hover:scale-105 transition-all duration-300">
                <img 
                  src="/LOGO-N.png" 
                  alt="โลโก้โรงเรียนหนองวัวซอพิทยาคม" 
                  className="h-full w-auto object-contain" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-xs" title="สีประจำโรงเรียน น้ำเงิน-เหลือง">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">
                  ระบบบริหารจัดการ <span className="text-blue-700">Tablet</span>
                </h1>
                <span className="hidden xl:inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  <span>Anywhere Anytime</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                โรงเรียนหนองวัวซอพิทยาคม
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              if (item.isAdminBtn) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'bg-white text-slate-800 hover:bg-amber-100/60 hover:text-amber-950 border border-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isAdmin ? 'text-emerald-700' : 'text-slate-600'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-white/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-blue-700" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-4 space-y-2 animate-fade-in shadow-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? item.isAdminBtn ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
