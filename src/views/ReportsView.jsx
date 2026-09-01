import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import { exportToExcel, triggerPrintReport } from '../utils/exportUtils';
import { 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  Tablet
} from 'lucide-react';

export default function ReportsView() {
  const { config } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState(config.current_academic_year);
  const [selectedRound, setSelectedRound] = useState(config.current_round);
  const [selectedGrade, setSelectedGrade] = useState("ทั้งหมด");
  const [selectedRoom, setSelectedRoom] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [inspections, setInspections] = useState({});
  const [stats, setStats] = useState(null);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const devList = await deviceService.getDevices({
        academicYear: selectedYear,
        grade: selectedGrade,
        room: selectedRoom
      });
      setDevices(devList);

      const insMap = await inspectionService.getInspections(selectedYear, selectedRound);
      setInspections(insMap);

      const dashboardStats = await inspectionService.getDashboardStats(devList, selectedYear, selectedRound);
      setStats(dashboardStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedYear, selectedRound, selectedGrade, selectedRoom]);

  const displayDevices = devices.filter(dev => {
    const ins = inspections[dev.serial_no];
    if (statusFilter === "damaged") {
      if (!ins || !ins.items) return false;
      return Object.values(ins.items).some(it => it.status === 'damaged');
    }
    if (statusFilter === "normal") {
      if (!ins || !ins.items) return false;
      return Object.values(ins.items).every(it => it.status === 'normal');
    }
    return true;
  });

  const handleExcelExport = () => {
    if (!stats) return;
    exportToExcel({
      devices: displayDevices,
      inspections,
      stats,
      academicYear: selectedYear,
      round: selectedRound,
      roomFilter: `${selectedGrade}/${selectedRoom}`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Export Buttons */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-blue flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <Tablet className="w-3.5 h-3.5 text-amber-400" />
            <span>ระบบออกรายงานและส่งออกข้อมูล</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            รายงานการตรวจเช็คอุปกรณ์ Tablet
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            โครงการ Anywhere Anytime โรงเรียนหนองวัวซอพิทยาคม
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExcelExport}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel (.xlsx)</span>
          </button>

          <button
            onClick={triggerPrintReport}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-amber-400/20 transition-all flex items-center space-x-2"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>พิมพ์รายงาน / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="modern-glass p-4 rounded-3xl border border-white/80 shadow-sm space-y-3 no-print">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>ตัวกรองข้อมูลรายงาน:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">ปีการศึกษา:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {(config.academic_years || ["2569"]).map(y => (
                <option key={y} value={y}>ปีการศึกษา พ.ศ. {y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">รอบการตรวจ:</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {[1, 2, 3, 4, 5].map(r => (
                <option key={r} value={r}>รอบการตรวจที่ {r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">ระดับชั้น:</label>
            <select
              value={selectedGrade}
              onChange={(e) => { setSelectedGrade(e.target.value); setSelectedRoom("ทั้งหมด"); }}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ทั้งหมด">ทุกระดับชั้น (ม.4-ม.6)</option>
              <option value="ม.4">ม.4</option>
              <option value="ม.5">ม.5</option>
              <option value="ม.6">ม.6</option>
              <option value="ครู">ครูผู้สอน</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">ห้อง:</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ทั้งหมด">ทุกห้อง (1-4)</option>
              <option value="1">ห้อง 1</option>
              <option value="2">ห้อง 2</option>
              <option value="3">ห้อง 3</option>
              <option value="4">ห้อง 4</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">สถานะอุปกรณ์:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="damaged">เฉพาะที่ชำรุด</option>
              <option value="normal">เฉพาะที่ปกติ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Official Document Container with Professional A4 Margin Formatting */}
      <div className="printable-document bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
        
        {/* Document Header (Page 1 Header) */}
        <div className="text-center pb-5 mb-5 border-b border-slate-300 space-y-1">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <img src="/LOGO-N.png" alt="โลโก้โรงเรียน" className="w-14 h-14 object-contain" />
            <div className="text-left">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight font-prompt">
                รายงานการตรวจเช็คอุปกรณ์ Tablet
              </h2>
              <p className="text-xs sm:text-sm font-bold text-blue-900">
                โครงการ Anywhere Anytime โรงเรียนหนองวัวซอพิทยาคม
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium">
            ปีการศึกษา {selectedYear} • รอบการตรวจเช็คที่ {selectedRound} / 5 • ระดับชั้น/ห้อง: <strong className="text-slate-900">{selectedGrade} / {selectedRoom}</strong>
          </p>
          <p className="text-xs text-slate-500 font-mono">
            วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH')}
          </p>
        </div>

        {/* Top KPI Cards Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 font-bold block">อุปกรณ์ทั้งหมด</span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalDevices} เครื่อง</p>
            </div>
            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200">
              <span className="text-blue-700 font-bold block">ตรวจเช็คแล้ว</span>
              <p className="text-lg sm:text-xl font-extrabold text-blue-800 mt-0.5">{stats.checkedCount} เครื่อง ({stats.progressPercent}%)</p>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
              <span className="text-emerald-700 font-bold block">ปกติ</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-0.5">{stats.normalCount} เครื่อง</p>
            </div>
            <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200">
              <span className="text-rose-700 font-bold block">ชำรุด</span>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 mt-0.5">{stats.damagedCount} เครื่อง</p>
            </div>
          </div>
        )}

        {/* Master Table with Page Break & Header Repeat Safety */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border border-slate-300 font-bold">
                <th className="p-2.5 border border-slate-300 text-center w-10">#</th>
                <th className="p-2.5 border border-slate-300">1. ประเภท</th>
                <th className="p-2.5 border border-slate-300 text-blue-800 font-extrabold">2. Serial No.</th>
                <th className="p-2.5 border border-slate-300 font-extrabold text-slate-900">3. ชื่อ - นามสกุล</th>
                <th className="p-2.5 border border-slate-300 text-center">4. ชั้น/ห้อง</th>
                <th className="p-2.5 border border-slate-300 font-mono">5. เลข BOX</th>
                <th className="p-2.5 border border-slate-300 font-mono">6. เลข BOX KB</th>
                <th className="p-2.5 border border-slate-300 text-center">สถานะ</th>
                <th className="p-2.5 border border-slate-300">รายการชำรุดและรายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {displayDevices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500 border border-slate-300">
                    ไม่พบข้อมูลตรงตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                displayDevices.map((dev, idx) => {
                  const ins = inspections[dev.serial_no];
                  const items = ins ? ins.items : null;
                  
                  let damagedList = [];
                  if (items) {
                    Object.keys(items).forEach(k => {
                      if (items[k].status === 'damaged') {
                        damagedList.push(`${getCategoryLabel(k)} (${items[k].note || 'ชำรุด'})`);
                      }
                    });
                  }

                  const isDamaged = damagedList.length > 0;

                  return (
                    <tr key={dev.id} className={isDamaged ? 'bg-rose-50/40' : ''}>
                      <td className="p-2 border border-slate-300 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-bold">{dev.type === 'teacher' ? 'ครู' : 'นักเรียน'}</td>
                      <td className="p-2 border border-slate-300 font-mono font-extrabold text-blue-800 text-sm">{dev.serial_no}</td>
                      <td className="p-2 border border-slate-300 font-bold text-slate-900 text-sm font-prompt">
                        {dev.prefix || ''} {dev.first_name} {dev.last_name}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-semibold">
                        {dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`}
                      </td>
                      <td className="p-2 border border-slate-300 font-mono text-slate-700">{dev.box_no}</td>
                      <td className="p-2 border border-slate-300 font-mono text-slate-700">{dev.box_kb_no}</td>
                      <td className="p-2 border border-slate-300 text-center font-extrabold">
                        {!ins ? (
                          <span className="text-slate-400">ยังไม่ตรวจ</span>
                        ) : isDamaged ? (
                          <span className="text-rose-600">ชำรุด</span>
                        ) : (
                          <span className="text-emerald-600">ปกติ</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300 text-slate-700">
                        {isDamaged ? (
                          <span className="text-rose-700 font-bold">{damagedList.join('; ')}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Footer Block */}
        <div className="signature-block mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
          <div>
            <p>ลงชื่อ..............................................................</p>
            <p className="mt-1.5 font-bold">(............................................................)</p>
            <p className="text-slate-500 mt-0.5">ครูที่ปรึกษา / ผู้ตรวจเช็คอุปกรณ์</p>
          </div>
          <div>
            <p>ลงชื่อ..............................................................</p>
            <p className="mt-1.5 font-bold">(............................................................)</p>
            <p className="text-slate-500 mt-0.5">หัวหน้าโครงการ / ผู้รับรองรายงาน</p>
          </div>
        </div>

      </div>

    </div>
  );
}
