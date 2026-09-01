import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar
} from 'recharts';
import { 
  Tablet, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  PenTool, 
  Keyboard, 
  Zap, 
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function PublicDashboard() {
  const { config, updateGlobalSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("ทั้งหมด");
  const [selectedRoom, setSelectedRoom] = useState("ทั้งหมด");

  const [gradeComparisonData, setGradeComparisonData] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const devList = await deviceService.getDevices({
        academicYear: config.current_academic_year,
        grade: selectedGrade,
        room: selectedRoom
      });
      setDevices(devList);

      const dashboardStats = await inspectionService.getDashboardStats(
        devList,
        config.current_academic_year,
        config.current_round
      );
      setStats(dashboardStats);

      // Compute grade breakdown stats for comparison chart
      const inspections = await inspectionService.getInspections(
        config.current_academic_year,
        config.current_round
      );

      const gradeMap = { "ม.4": { total: 0, checked: 0, normal: 0, damaged: 0 },
                         "ม.5": { total: 0, checked: 0, normal: 0, damaged: 0 },
                         "ม.6": { total: 0, checked: 0, normal: 0, damaged: 0 },
                         "ครู": { total: 0, checked: 0, normal: 0, damaged: 0 } };

      devList.forEach(dev => {
        const gKey = dev.type === 'teacher' ? 'ครู' : dev.grade;
        if (gradeMap[gKey]) {
          gradeMap[gKey].total++;
          const ins = inspections[dev.serial_no];
          if (ins) {
            gradeMap[gKey].checked++;
            const hasDamaged = Object.values(ins.items || {}).some(it => it.status === 'damaged');
            if (hasDamaged) gradeMap[gKey].damaged++;
            else gradeMap[gKey].normal++;
          }
        }
      });

      const compList = Object.keys(gradeMap).map(k => ({
        name: k === 'ครู' ? 'ครูผู้สอน' : `ชั้น ${k}`,
        total: gradeMap[k].total,
        checked: gradeMap[k].checked,
        normal: gradeMap[k].normal,
        damaged: gradeMap[k].damaged,
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
    { name: 'ยังไม่ได้ตรวจเช็ค', value: stats.uncheckedCount, color: '#CBD5E1' }
  ];

  // Data for 6 Category Breakdown Bar Chart
  const categoryBarData = [
    { name: 'Tablet', count: stats.damagedBreakdown.tablet, fill: '#3B82F6' },
    { name: 'S Pen', count: stats.damagedBreakdown.spen, fill: '#8B5CF6' },
    { name: 'คีย์บอร์ด', count: stats.damagedBreakdown.keyboard, fill: '#6366F1' },
    { name: 'สาย Tablet', count: stats.damagedBreakdown.cable_white, fill: '#F59E0B' },
    { name: 'สาย KB', count: stats.damagedBreakdown.cable_black, fill: '#64748B' },
    { name: 'Adapter', count: stats.damagedBreakdown.adapter, fill: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Sub-Header Control Bar */}
      <div className="modern-glass rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3 text-xs font-bold text-slate-700">
          <div className="flex items-center space-x-1.5 bg-blue-50 text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200/80">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>ปีการศึกษา:</span>
            <select 
              value={config.current_academic_year}
              onChange={(e) => updateGlobalSettings({ academicYear: e.target.value })}
              className="bg-transparent text-blue-950 font-extrabold focus:outline-none cursor-pointer"
            >
              {(config.academic_years || ["2569"]).map(yr => (
                <option key={yr} value={yr}>พ.ศ. {yr}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300/80">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>รอบการตรวจเช็ค: <strong>รอบที่ {config.current_round || 1} / 5</strong></span>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center space-x-2">
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

      {/* Hero Banner with Stats Overview */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-blue relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แดชบอร์ดสรุปผลการตรวจเช็คระบบ Tablet</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              ภาพรวมการตรวจเช็คอุปกรณ์ Tablet
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-light max-w-xl">
              โครงการ Anywhere Anytime โรงเรียนหนองวัวซอพิทยาคม • แสดงสถิติกราฟวิเคราะห์ข้อมูลแบบปฏิสัมพันธ์ (Interactive Charts)
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
              <span className="text-xs text-amber-200 font-bold block uppercase tracking-wider">ตรวจเช็คแล้ว</span>
              <p className="text-xs text-slate-200 mt-0.5">{stats.checkedCount} / {stats.totalDevices} เครื่อง</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Row 1: Donut Pie Chart & Category Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Donut Pie Chart (Overall Status Breakdown) */}
        <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">สัดส่วนสถานะอุปกรณ์ทั้งหมด</h3>
                <p className="text-xs text-slate-500">ปกติ vs ชำรุด vs ยังไม่ได้ตรวจ</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
              รวม {stats.totalDevices} เครื่อง
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
                  formatter={(value, name) => [`${value} เครื่อง`, name]}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Summary Inside Donut */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none mb-6">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{stats.checkedCount}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">ตรวจเช็คแล้ว</span>
            </div>
          </div>
        </div>

        {/* CHART 2: Bar Chart (6 Equipment Category Breakdown) */}
        <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">จำนวนอุปกรณ์ที่แจ้งชำรุด (6 รายการ)</h3>
                <p className="text-xs text-slate-500">แยกตามประเภทชิ้นส่วนอุปกรณ์</p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl">
              ชำรุด {stats.damagedCount} เครื่อง
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  formatter={(val) => [`${val} รายการ`, 'จำนวนชำรุด']}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1200}>
                  {categoryBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Interactive Charts Row 2: Grade Level Progress Comparison Bar Chart */}
      <div className="modern-glass-card rounded-3xl p-6 border border-white/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">เปรียบเทียบการตรวจเช็คแยกตามระดับชั้น (ม.4 - ม.6 & ครู)</h3>
              <p className="text-xs text-slate-500">จำนวนเครื่องที่ตรวจแล้ว ปกติ และ ชำรุด แยกตามชั้น</p>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeComparisonData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="normal" name="ปกติ" fill="#10B981" radius={[6, 6, 0, 0]} stackId="a" />
              <Bar dataKey="damaged" name="ชำรุด" fill="#EF4444" radius={[6, 6, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table of Damaged Devices Log */}
      <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200/60 flex items-center justify-between bg-white/60">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              ตารางแสดงรายการอุปกรณ์ที่ชำรุด
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงเฉพาะอุปกรณ์ที่ได้รับแจ้งชำรุดในรอบการตรวจที่ {config.current_round}
            </p>
          </div>
          <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
            {stats.damagedDetailsList.length} รายการ
          </span>
        </div>

        {stats.damagedDetailsList.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-slate-700">ไม่พบรายการชำรุด</p>
            <p className="text-xs text-slate-400">อุปกรณ์ทั้งหมดที่ผ่านการตรวจเช็คอยู่ในสภาพปกติ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 text-xs border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">1. ประเภท</th>
                  <th className="px-5 py-3.5 text-blue-700 font-extrabold">2. Serial No.</th>
                  <th className="px-5 py-3.5 text-slate-900 font-extrabold">3. ชื่อ - นามสกุล</th>
                  <th className="px-5 py-3.5">4. ระดับชั้น/ห้อง</th>
                  <th className="px-5 py-3.5">5. เลข BOX</th>
                  <th className="px-5 py-3.5">อุปกรณ์ที่ชำรุด</th>
                  <th className="px-5 py-3.5">รายละเอียดอาการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/60">
                {stats.damagedDetailsList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                        item.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type === 'teacher' ? 'ครู' : 'นักเรียน'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-extrabold text-blue-700 text-base">{item.serial_no}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 text-base">{item.owner}</td>
                    <td className="px-5 py-4 font-semibold text-xs text-slate-800">{item.grade_room}</td>
                    <td className="px-5 py-4 font-mono text-xs">{item.box_no}</td>
                    <td className="px-5 py-4">
                      <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs inline-flex items-center space-x-1 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1" />
                        {item.item_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
