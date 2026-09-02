import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Clock, 
  RefreshCw, 
  Sparkles,
  Calendar,
  Filter,
  BarChart2,
  HelpCircle,
  Package
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function PublicDashboard() {
  const { config } = useAuth();
  
  // Dashboard view mode: 'round' (single round) vs 'annual' (all 5 rounds overview)
  const [viewMode, setViewMode] = useState('round'); 
  const [selectedGrade, setSelectedGrade] = useState("ทั้งหมด");
  const [selectedRoom, setSelectedRoom] = useState("ทั้งหมด");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [annualStats, setAnnualStats] = useState(null);
  const [gradeComparisonData, setGradeComparisonData] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const devList = await deviceService.getDevices({
        academicYear: config.current_academic_year,
        grade: selectedGrade,
        room: selectedRoom
      });

      // 1. Single round stats
      const st = await inspectionService.getDashboardStats(
        devList, 
        config.current_academic_year, 
        config.current_round
      );
      setStats(st);

      // 2. Annual stats
      const annSt = await inspectionService.getAnnualDashboardStats(
        devList,
        config.current_academic_year
      );
      setAnnualStats(annSt);

      // 3. Grade level item-level comparison data (Unit: Pieces / ชิ้น)
      const insMap = await inspectionService.getInspections(config.current_academic_year, config.current_round);
      
      const gradeMap = {
        'ม.4': { total: 0, checked: 0, normalItems: 0, damagedItems: 0, lostItems: 0 },
        'ม.5': { total: 0, checked: 0, normalItems: 0, damagedItems: 0, lostItems: 0 },
        'ม.6': { total: 0, checked: 0, normalItems: 0, damagedItems: 0, lostItems: 0 },
        'ครู': { total: 0, checked: 0, normalItems: 0, damagedItems: 0, lostItems: 0 }
      };

      devList.forEach(dev => {
        const gKey = dev.type === 'teacher' ? 'ครู' : dev.grade;
        if (gradeMap[gKey]) {
          gradeMap[gKey].total++;
          const ins = insMap[dev.serial_no];
          if (ins) {
            gradeMap[gKey].checked++;
            const items = ins.items || {};
            
            // Loop through all 6 checklist items for item-level precision (หน่วย: ชิ้น)
            ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'].forEach(cat => {
              if (items[cat]) {
                const stVal = items[cat].status;
                if (stVal === 'damaged') gradeMap[gKey].damagedItems++;
                else if (stVal === 'lost') gradeMap[gKey].lostItems++;
                else if (stVal === 'normal') gradeMap[gKey].normalItems++;
              }
            });
          }
        }
      });

      const compList = Object.keys(gradeMap).map(k => ({
        name: k === 'ครู' ? 'ครูผู้สอน' : `ชั้น ${k}`,
        total: gradeMap[k].total,
        checked: gradeMap[k].checked,
        normalItems: gradeMap[k].normalItems,
        damagedItems: gradeMap[k].damagedItems,
        lostItems: gradeMap[k].lostItems,
        totalItemsInspected: gradeMap[k].checked * 6,
        percent: gradeMap[k].total > 0 ? Math.round((gradeMap[k].checked / gradeMap[k].total) * 100) : 0
      }));

      setGradeComparisonData(compList);

    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [config.current_academic_year, config.current_round, selectedGrade, selectedRoom]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 font-bold text-sm">กำลังคำนวณสถิติและกราฟแสดงผลแบบเรียลไทม์...</p>
      </div>
    );
  }

  // Data for Donut Pie Chart (Overall Status)
  const donutPieData = [
    { name: 'ใช้งานได้ปกติ', value: stats.normalCount, color: '#10B981' },
    { name: 'พบอุปกรณ์ชำรุด', value: stats.damagedCount, color: '#EF4444' },
    { name: 'อุปกรณ์สูญหาย', value: stats.lostCount || 0, color: '#8B5CF6' },
    { name: 'ยังไม่ได้ตรวจเช็ค', value: stats.uncheckedCount, color: '#CBD5E1' }
  ];

  // Data for 6 Category Breakdown Progress Bars
  const totalDamagedItemsCount = Object.values(stats.damagedBreakdown).reduce((a, b) => a + b, 0);

  const categoryProgressList = [
    { label: 'Tablet', count: stats.damagedBreakdown.tablet, unit: 'เครื่อง', color: 'bg-blue-600' },
    { label: 'ปากกา S Pen', count: stats.damagedBreakdown.spen, unit: 'ด้าม', color: 'bg-purple-600' },
    { label: 'คีย์บอร์ด', count: stats.damagedBreakdown.keyboard, unit: 'ชิ้น', color: 'bg-indigo-600' },
    { label: 'สาย Tablet (ขาว)', count: stats.damagedBreakdown.cable_white, unit: 'เส้น', color: 'bg-amber-500' },
    { label: 'สาย KB (ดำ)', count: stats.damagedBreakdown.cable_black, unit: 'เส้น', color: 'bg-slate-700' },
    { label: 'Adapter', count: stats.damagedBreakdown.adapter, unit: 'หัว', color: 'bg-emerald-600' }
  ];

  const maxDamagedCount = Math.max(...categoryProgressList.map(c => c.count), 1);

  // Annual Damaged Breakdown List across all 5 rounds
  const annualCategoryProgressList = annualStats ? [
    { label: 'Tablet', count: annualStats.annualDamagedBreakdown.tablet, unit: 'เครื่อง', color: 'bg-blue-600' },
    { label: 'ปากกา S Pen', count: annualStats.annualDamagedBreakdown.spen, unit: 'ด้าม', color: 'bg-purple-600' },
    { label: 'คีย์บอร์ด', count: annualStats.annualDamagedBreakdown.keyboard, unit: 'ชิ้น', color: 'bg-indigo-600' },
    { label: 'สาย Tablet (ขาว)', count: annualStats.annualDamagedBreakdown.cable_white, unit: 'เส้น', color: 'bg-amber-500' },
    { label: 'สาย KB (ดำ)', count: annualStats.annualDamagedBreakdown.cable_black, unit: 'เส้น', color: 'bg-slate-700' },
    { label: 'Adapter', count: annualStats.annualDamagedBreakdown.adapter, unit: 'หัว', color: 'bg-emerald-600' }
  ] : [];

  const maxAnnualDamagedCount = Math.max(...annualCategoryProgressList.map(c => c.count), 1);

  // Custom Recharts Tooltip for Item-Level Grade Bar Chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-sarabun space-y-2 min-w-[200px]">
          <p className="font-extrabold font-prompt text-amber-300 border-b border-slate-700 pb-1.5 text-sm flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[11px] font-mono text-slate-300 font-normal">ตรวจแล้ว {data.checked}/{data.total} ชุด</span>
          </p>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between font-bold text-rose-400">
              <span>ชิ้นอุปกรณ์ชำรุด:</span>
              <span className="font-mono text-xs">{data.damagedItems} ชิ้น</span>
            </div>
            <div className="flex justify-between font-bold text-purple-400">
              <span>ชิ้นอุปกรณ์สูญหาย:</span>
              <span className="font-mono text-xs">{data.lostItems} ชิ้น</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-400 pt-1 border-t border-slate-700">
              <span>ชิ้นอุปกรณ์ปกติ:</span>
              <span className="font-mono text-xs">{data.normalItems} ชิ้น</span>
            </div>
            <div className="flex justify-between font-extrabold text-blue-300 pt-1 border-t border-slate-700">
              <span>รวมชิ้นอุปกรณ์ที่ตรวจแล้ว:</span>
              <span className="font-mono text-xs">{data.totalItemsInspected} ชิ้น</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Header Control Bar & View Mode Switcher */}
      <div className="modern-glass rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        
        {/* View Mode Switcher Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-200/80 rounded-2xl">
          <button
            onClick={() => setViewMode('round')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
              viewMode === 'round' 
                ? 'bg-white text-blue-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>สถิติประจำรอบ (รอบที่ {config.current_round})</span>
          </button>

          <button
            onClick={() => setViewMode('annual')}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
              viewMode === 'annual' 
                ? 'bg-amber-400 text-slate-950 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>สรุปภาพรวมทั้งปีการศึกษา (5 รอบ)</span>
          </button>
        </div>

        {/* Global Academic Context */}
        <div className="flex items-center space-x-3 text-xs">
          {viewMode === 'round' && (
            <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300/80">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>รอบการตรวจเช็ค: <strong>รอบที่ {config.current_round || 1} / 5</strong></span>
            </div>
          )}

          {/* Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGrade}
              onChange={(e) => { setSelectedGrade(e.target.value); setSelectedRoom("ทั้งหมด"); }}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ทั้งหมด">ทุกระดับชั้น (ม.4 - ม.6)</option>
              <option value="ม.4">ม.4</option>
              <option value="ม.5">ม.5</option>
              <option value="ม.6">ม.6</option>
              <option value="ครู">ครูผู้สอน</option>
            </select>

            {selectedGrade !== "ทั้งหมด" && selectedGrade !== "ครู" && (
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
              >
                <option value="ทั้งหมด">ทุกห้อง (1-4)</option>
                <option value="1">ห้อง 1</option>
                <option value="2">ห้อง 2</option>
                <option value="3">ห้อง 3</option>
                <option value="4">ห้อง 4</option>
              </select>
            )}
          </div>

          <button
            onClick={loadDashboardData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* --- VIEW MODE 1: SINGLE ROUND DASHBOARD --- */}
      {viewMode === 'round' && (
        <div className="space-y-6">
          
          {/* Hero Banner with Stats Overview */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-blue relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold border border-white/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>แดชบอร์ดสรุปผลการตรวจเช็คระบบ Tablet (รอบที่ {config.current_round})</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight font-prompt">
                  ภาพรวมการตรวจเช็คอุปกรณ์ Tablet
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm font-light max-w-xl">
                  โครงการ Anywhere Anytime โรงเรียนหนองวัวซอพิทยาคม
                </p>
              </div>

              {/* Overall Progress Gauge Widget */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center space-x-4 shrink-0">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      stroke="#F59E0B" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={163.3}
                      strokeDashoffset={163.3 - (163.3 * stats.progressPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute font-extrabold text-amber-300 text-sm font-mono">{stats.progressPercent}%</span>
                </div>

                <div>
                  <span className="text-xs text-amber-200 font-bold block uppercase tracking-wider">ความคืบหน้า</span>
                  <p className="text-xs text-slate-200 mt-0.5">ตรวจแล้ว {stats.checkedCount} / {stats.totalDevices} ชุด</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Charts Row 1: Donut Pie Chart & Category Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CHART 1: Donut Pie Chart */}
            <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PieIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 font-prompt">สัดส่วนสถานะอุปกรณ์ทั้งหมด</h3>
                    <p className="text-xs text-slate-500">ปกติ vs ชำรุด vs สูญหาย vs ยังไม่ได้ตรวจ (รอบที่ {config.current_round})</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                  รวม {stats.totalDevices} ชุด
                </span>
              </div>

              <div className="h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1200}
                    >
                      {donutPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                      formatter={(value, name) => [`${value} ชุด`, name]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute flex flex-col items-center justify-center pointer-events-none mb-6">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">{stats.checkedCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ตรวจเช็คแล้ว (ชุด)</span>
                </div>
              </div>
            </div>

            {/* CHART 2: Clean Horizontal Progress Bars */}
            <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                    📊 จำนวนพบปัญหา 6 รายการ (รอบที่ {config.current_round})
                  </h3>
                </div>
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold border border-rose-200">
                  รวม {totalDamagedItemsCount} รายการ
                </span>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                {categoryProgressList.map((item, idx) => {
                  const barPercent = item.count > 0 ? Math.max(Math.round((item.count / maxDamagedCount) * 100), 12) : 0;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="font-prompt">{item.label}</span>
                        <span className="font-mono text-slate-900">{item.count} {item.unit}</span>
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-full h-3.5 p-0.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${item.color}`} 
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Interactive Charts Row 2: Precision Item-Level Defect/Loss Bar Chart per Grade Level */}
          <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-md space-y-5">
            
            {/* Header & Grade Level Progress Cards */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-prompt">
                    จำนวนชิ้นอุปกรณ์ที่พบปัญหาแยกตามระดับชั้น (ม.4 - ม.6 & ครู)
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงจำนวนชิ้นอุปกรณ์ที่พบปัญหา <span className="font-bold text-rose-600">ชำรุด</span> และ <span className="font-bold text-purple-600">สูญหาย</span> (หน่วย: ชิ้น • คิดจากอุปกรณ์ 6 รายการต่อชุด)
                  </p>
                </div>
              </div>

              {/* Progress Summary Cards per Grade */}
              <div className="flex flex-wrap gap-2 text-xs">
                {gradeComparisonData.map((g, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl flex items-center space-x-1.5 font-sarabun">
                    <span className="font-extrabold text-slate-800">{g.name}:</span>
                    <span className="font-mono font-bold text-blue-700">ตรวจแล้ว {g.checked}/{g.total} ชุด</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-bold">
                      {g.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Precision Item-Level Recharts Bar Chart (Unit: Pieces / ชิ้น) */}
            <div className="h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={gradeComparisonData} 
                  margin={{ top: 25, right: 25, left: -15, bottom: 10 }}
                  barCategoryGap="25%"
                >
                  <defs>
                    <linearGradient id="barRedItem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#E11D48" stopOpacity={0.95} />
                    </linearGradient>
                    <linearGradient id="barPurpleItem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#7E22CE" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                  
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 13, fill: '#1E293B', fontWeight: 800, fontFamily: 'Prompt' }} 
                    axisLine={{ stroke: '#CBD5E1', strokeWidth: 1.5 }} 
                    tickLine={false} 
                    dy={8}
                  />
                  
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  
                  <Tooltip content={<CustomBarTooltip />} />
                  
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    wrapperStyle={{ paddingBottom: '15px' }} 
                    iconType="circle"
                  />
                  
                  <Bar 
                    dataKey="damagedItems" 
                    name="อุปกรณ์ชำรุด (หน่วย: ชิ้น)" 
                    fill="url(#barRedItem)" 
                    radius={[8, 8, 0, 0]} 
                    animationDuration={1000}
                  />
                  <Bar 
                    dataKey="lostItems" 
                    name="อุปกรณ์สูญหาย (หน่วย: ชิ้น)" 
                    fill="url(#barPurpleItem)" 
                    radius={[8, 8, 0, 0]} 
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table of Damaged & Lost Devices Log */}
          <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/60 flex items-center justify-between bg-white/60">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                  ตารางแสดงรายการอุปกรณ์ที่ชำรุด / สูญหาย
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แสดงเฉพาะอุปกรณ์ที่ได้รับแจ้งชำรุดหรือสูญหายในรอบการตรวจที่ {config.current_round}
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold border border-rose-200">
                {stats.damagedDetailsList.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-800 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5 text-blue-900 font-extrabold">Serial No.</th>
                    <th className="p-3.5 font-extrabold text-slate-900">ผู้ครอบครอง</th>
                    <th className="p-3.5">ชั้น/ห้อง</th>
                    <th className="p-3.5 font-mono">BOX / KB</th>
                    <th className="p-3.5">สถานะ / รายการอุปกรณ์</th>
                    <th className="p-3.5">รายละเอียดอาการ / การสูญหาย</th>
                    <th className="p-3.5 text-right">วันที่แจ้ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {stats.damagedDetailsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                        🎉 ไม่พบอุปกรณ์ชำรุดหรือสูญหายในรอบการตรวจนี้ (อุปกรณ์ทุกเครื่องสมบูรณ์ 100%)
                      </td>
                    </tr>
                  ) : (
                    stats.damagedDetailsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-extrabold text-blue-900">{item.serial_no}</td>
                        <td className="p-3.5 font-bold text-slate-900 font-prompt">{item.owner}</td>
                        <td className="p-3.5 font-semibold text-slate-800">{item.grade_room}</td>
                        <td className="p-3.5 font-mono text-slate-500">{item.box_no} / {item.box_kb_no}</td>
                        <td className="p-3.5">
                          {item.status_type === 'lost' ? (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold border border-purple-200 inline-flex items-center space-x-1">
                              <HelpCircle className="w-3 h-3 text-purple-700" />
                              <span>{item.item_name} (สูญหาย)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold border border-rose-200 inline-flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>{item.item_name} (ชำรุด)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">{item.note}</td>
                        <td className="p-3.5 text-right font-mono text-slate-400">
                          {item.inspected_at ? new Date(item.inspected_at).toLocaleDateString('th-TH') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- VIEW MODE 2: ANNUAL ACADEMIC YEAR OVERVIEW (5 ROUNDS) --- */}
      {viewMode === 'annual' && annualStats && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Annual Hero Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-amber relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold border border-white/20">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>แดชบอร์ดสรุปผลทั้งปีการศึกษา {config.current_academic_year} (รอบ 1 - 5)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight font-prompt">
                  สรุปแนวโน้มการตรวจเช็คอุปกรณ์ 5 รอบ
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm font-light max-w-xl">
                  เปรียบเทียบผลการตรวจเช็ค จำนวนอุปกรณ์ปกติ อุปกรณ์ชำรุด และสูญหาย ตลอดทั้งปีการศึกษา
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-center shrink-0">
                <span className="text-xs text-amber-200 font-bold block uppercase tracking-wider">อุปกรณ์ในระบบทั้งหมด</span>
                <p className="text-3xl font-extrabold text-white font-mono mt-1">{annualStats.totalDevices} ชุด</p>
              </div>
            </div>
          </div>

          {/* Recharts LineChart Trend across 5 rounds */}
          <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                    📈 กราฟแนวโน้มผลการตรวจเช็คตลอดปีการศึกษา (รอบที่ 1 ถึง รอบที่ 5)
                  </h3>
                  <p className="text-xs text-slate-500">เปรียบเทียบจำนวนเครื่องที่ตรวจแล้ว ปกติ ชำรุด และ สูญหาย ในแต่ละรอบ</p>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annualStats.roundsData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" dataKey="checkedCount" name="ตรวจเช็คแล้ว (ชุด)" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="normalCount" name="ปกติ (ชุด)" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="damagedCount" name="ชำรุด (ชุด)" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="lostCount" name="สูญหาย (ชุด)" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5-Round Cumulative Table & Category Progress Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table comparing 5 rounds */}
            <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden space-y-3 p-5">
              <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                📋 ตารางเปรียบเทียบสถิติการตรวจเช็คทั้ง 5 รอบ
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">รอบการตรวจ</th>
                      <th className="p-3 text-blue-900">ตรวจแล้ว</th>
                      <th className="p-3 text-emerald-700">ปกติ</th>
                      <th className="p-3 text-rose-700">ชำรุด</th>
                      <th className="p-3 text-purple-700">สูญหาย</th>
                      <th className="p-3 text-right">% ความคืบหน้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/60">
                    {annualStats.roundsData.map((rd) => (
                      <tr key={rd.round} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-extrabold text-slate-900 font-prompt">
                          รอบที่ {rd.round}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-900">{rd.checkedCount} ชุด</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{rd.normalCount} ชุด</td>
                        <td className="p-3 font-mono font-bold text-rose-700">{rd.damagedCount} ชุด</td>
                        <td className="p-3 font-mono font-bold text-purple-700">{rd.lostCount || 0} ชุด</td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-900">{rd.progressPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Annual Cumulative Damaged Items Breakdown */}
            <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 font-prompt">
                    📦 รวมจำนวนชำรุด/สูญหายสะสม 6 รายการ ทั้งปีการศึกษา
                  </h3>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                {annualCategoryProgressList.map((item, idx) => {
                  const barPercent = item.count > 0 ? Math.max(Math.round((item.count / maxAnnualDamagedCount) * 100), 12) : 0;

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="font-prompt">{item.label}</span>
                        <span className="font-mono text-slate-900">{item.count} {item.unit}</span>
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-full h-3.5 p-0.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${item.color}`} 
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
