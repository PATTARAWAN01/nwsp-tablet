import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-slate-200/80 bg-white/70 backdrop-blur-md text-slate-600 text-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        
        {/* Left Side: System & School Name */}
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 text-xs sm:text-sm">
            ระบบลงทะเบียนและบริหารจัดการ Tablet โครงการ Anywhere Anytime
          </p>
          <p className="text-xs text-blue-900 font-semibold">
            โรงเรียนหนองวัวซอพิทยาคม
          </p>
        </div>

        {/* Right Side: Developer Credits */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-100/80 px-4 py-2 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Created and Developed by <strong>Pattarawan Suwanvapee</strong></span>
        </div>

      </div>
    </footer>
  );
}
