import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Tablet, 
  Building2, 
  UserCheck, 
  Calendar,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportsView() {
  const { config } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState(config.current_academic_year);
  const [selectedRound, setSelectedRound] = useState(config.current_round);
  const [selectedGrade, setSelectedGrade] = useState("ทั้งหมด");
  const [selectedRoom, setSelectedRoom] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด"); // 'ทั้งหมด', 'damaged', 'normal'

  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [inspections, setInspections] = useState({});
  const [roomInspectors, setRoomInspectors] = useState([]);
  const [stats, setStats] = useState(null);

  const reportRef = useRef();

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

      const st = await inspectionService.getDashboardStats(devList, selectedYear, selectedRound);
      setStats(st);

      // Extract unique inspector names directly from the inspected devices for this selection
      const activeInspectorsSet = new Set();
      devList.forEach(dev => {
        const ins = insMap[dev.serial_no];
        if (ins && ins.inspector) {
          const name = String(ins.inspector).trim();
          if (
            name !== '' && 
            name !== 'ครูประจำชั้น' && 
            name !== 'ครูผู้ตรวจเช็ค' && 
            name !== 'นาย' && 
            name !== 'นางสาว' && 
            name !== 'นาง'
          ) {
            activeInspectorsSet.add(name);
          }
        }
      });

      setRoomInspectors(Array.from(activeInspectorsSet));

    } catch (e) {
      console.error("Failed to load report data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedYear, selectedRound, selectedGrade, selectedRoom]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const dataToExport = devices.map((dev, idx) => {
      const ins = inspections[dev.serial_no];
      const items = ins ? (ins.items || {}) : {};
      
      const damagedList = [];
      ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'].forEach(cat => {
        if (items[cat] && items[cat].status === 'damaged') {
          damagedList.push(`${getCategoryLabel(cat)}${items[cat].note ? ` (${items[cat].note})` : ''}`);
        }
      });

      const isChecked = !!ins;
      const isDamaged = damagedList.length > 0;

      return {
        'ลำดับ': idx + 1,
        'ประเภท': dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน',
        'คำนำหน้า': dev.prefix || 'นาย',
        'ชื่อ': dev.first_name,
        'นามสกุล': dev.last_name,
        'ระดับชั้น': dev.type === 'teacher' ? 'ครู' : dev.grade,
        'ห้อง': dev.type === 'teacher' ? '-' : dev.room,
        'Serial No': dev.serial_no,
        'เลข BOX': dev.box_no,
        'เลข BOX KB': dev.box_kb_no,
        'สถานะการตรวจ': isChecked ? (isDamaged ? 'ชำรุด' : 'ปกติ') : 'ยังไม่ได้ตรวจ',
        'รายการชำรุด / หมายเหตุ': damagedList.join(', ') || '-',
        'ครูผู้ตรวจเช็ค': ins ? (ins.inspector || 'ครูผู้ตรวจเช็ค') : '-',
        'วันที่ตรวจเช็ค': ins && ins.inspected_at ? new Date(ins.inspected_at).toLocaleDateString('th-TH') : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานการตรวจเช็ค");
    
    XLSX.writeFile(workbook, `รายงานการตรวจเช็ค_ปี${selectedYear}_รอบที่${selectedRound}_${selectedGrade}_${selectedRoom}.xlsx`);
  };

  const filteredDevicesList = devices.filter(dev => {
    const ins = inspections[dev.serial_no];
    if (statusFilter === 'damaged') {
      if (!ins) return false;
      const items = ins.items || {};
      return Object.values(items).some(it => it.status === 'damaged');
    }
    if (statusFilter === 'normal') {
      if (!ins) return false;
      const items = ins.items || {};
      return Object.values(items).every(it => it.status === 'normal');
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner & Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <FileText className="w-3.5 h-3.5" />
            <span>ระบบออกรายงานและพิมพ์เอกสารอย่างเป็นทางการ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            รายงานผลการตรวจเช็ค Tablet
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            โรงเรียนหนองวัวซอพิทยาคม • โครงการ Anywhere Anytime
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-emerald-600/30 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-amber-400/30 flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน / เซฟ PDF</span>
          </button>
        </div>
      </div>

      {/* Print Advice Banner (Hidden on Print) */}
      <div className="bg-amber-50/90 border border-amber-300/80 text-amber-950 rounded-2xl p-4 px-5 text-xs font-sarabun flex items-center space-x-3.5 shadow-xs no-print">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="font-extrabold font-prompt text-amber-950 text-sm">💡 คำแนะนำสำหรับการสั่งพิมพ์ / บันทึกไฟล์ PDF ที่สมบูรณ์ที่สุด:</p>
          <p className="text-amber-900 text-xs mt-0.5 leading-relaxed">
            ในหน้าต่างสั่งพิมพ์ (Print Dialog) ควรตั้งค่าขนาดกระดาษเป็น <strong>A4 (แนวนอน / Landscape)</strong> และตั้งค่า <strong>ระยะขอบ (Margins) เป็น "ตามค่าเริ่มต้น (Default)"</strong> ระบบได้จัดระยะขอบบน-ล่างไว้ 22 มม. อย่างสวยงามเรียบร้อยแล้วครับ
          </p>
        </div>
      </div>

      {/* Filter Controls (Hidden on Print) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 no-print">
        <h3 className="text-sm font-bold font-prompt text-slate-900 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>กรองรายงานเพื่อพิมพ์หรือส่งออก:</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">ปีการศึกษา:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {(config.academic_years || ["2569"]).map(yr => (
                <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">รอบการตรวจเช็ค:</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {[1, 2, 3, 4, 5].map(r => (
                <option key={r} value={r}>รอบที่ {r}</option>
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
      <div ref={reportRef} className="printable-document bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
        
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
                <th className="p-2.5 border border-slate-300 text-blue-900 font-extrabold">Serial No.</th>
                <th className="p-2.5 border border-slate-300 font-extrabold">ชื่อ - นามสกุล ผู้ครองครอง</th>
                <th className="p-2.5 border border-slate-300 text-center">ชั้น/ห้อง</th>
                <th className="p-2.5 border border-slate-300 font-mono">BOX</th>
                <th className="p-2.5 border border-slate-300 font-mono">BOX KB</th>
                <th className="p-2.5 border border-slate-300 text-center">ผลการตรวจ</th>
                <th className="p-2.5 border border-slate-300">รายการอุปกรณ์ที่ชำรุด / หมายเหตุ</th>
                <th className="p-2.5 border border-slate-300 text-slate-900 font-bold">ครูผู้ตรวจเช็ค</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevicesList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-slate-500 font-medium border border-slate-300">
                    ไม่พบรายการอุปกรณ์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredDevicesList.map((dev, idx) => {
                  const ins = inspections[dev.serial_no];
                  const items = ins ? (ins.items || {}) : {};

                  const damagedList = [];
                  ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'].forEach(cat => {
                    if (items[cat] && items[cat].status === 'damaged') {
                      damagedList.push(`${getCategoryLabel(cat)}${items[cat].note ? `: ${items[cat].note}` : ''}`);
                    }
                  });

                  const isDamaged = damagedList.length > 0;

                  return (
                    <tr key={dev.id} className="border border-slate-300 hover:bg-slate-50">
                      <td className="p-2 border border-slate-300 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">
                        {dev.serial_no}
                      </td>
                      <td className="p-2 border border-slate-300 font-bold text-slate-900">
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
                      <td className="p-2 border border-slate-300 font-semibold text-slate-800">
                        {ins ? (ins.inspector || 'ครูผู้ตรวจเช็ค') : <span className="text-slate-400">-</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Teacher & Admin Configured Signatures Footer Block */}
        <div className="signature-block mt-12 pt-6 flex flex-wrap justify-around gap-6 text-center text-xs text-slate-700">
          {roomInspectors.length > 0 ? (
            roomInspectors.map((tName, idx) => (
              <div key={idx} className="min-w-[220px]">
                <p>ลงชื่อ..............................................................</p>
                <p className="mt-1.5 font-bold">({tName})</p>
                <p className="text-slate-500 mt-0.5 font-semibold">
                  ครูผู้ตรวจเช็คอุปกรณ์ {roomInspectors.length > 1 ? `(${idx + 1})` : ''}
                </p>
              </div>
            ))
          ) : (
            <div className="min-w-[220px]">
              <p>ลงชื่อ..............................................................</p>
              <p className="mt-1.5 font-bold">(............................................................)</p>
              <p className="text-slate-500 mt-0.5 font-semibold">ครูที่ปรึกษา / ผู้ตรวจเช็คอุปกรณ์</p>
            </div>
          )}

          {/* Render Configured Project Head / Certifier Signatures */}
          {(config.report_signatures && config.report_signatures.length > 0) ? (
            config.report_signatures.map((sig, sIdx) => (
              <div key={sig.id || sIdx} className="min-w-[220px]">
                <p>ลงชื่อ..............................................................</p>
                <p className="mt-1.5 font-bold">({sig.name && sig.name.trim() !== '' ? sig.name.trim() : '............................................................'})</p>
                <p className="text-slate-500 mt-0.5 font-semibold">{sig.title || 'หัวหน้าโครงการ / ผู้รับรองรายงาน'}</p>
              </div>
            ))
          ) : (
            <div className="min-w-[220px]">
              <p>ลงชื่อ..............................................................</p>
              <p className="mt-1.5 font-bold">(............................................................)</p>
              <p className="text-slate-500 mt-0.5 font-semibold">หัวหน้าโครงการ / ผู้รับรองรายงาน</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
