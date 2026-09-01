import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import Papa from 'papaparse';
import { 
  ShieldCheck, 
  Lock, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Key, 
  Calendar, 
  Tablet, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet,
  Save,
  KeyRound,
  RotateCcw
} from 'lucide-react';

export default function AdminManagement() {
  const { isAdmin, loginAdmin, logoutAdmin, config, updateGlobalSettings } = useAuth();
  
  const [passwordInput, setPasswordInput] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [adminSubTab, setAdminSubTab] = useState('devices');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("ทั้งหมด");
  const [filterType, setFilterType] = useState("ทั้งหมด");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'student',
    prefix: 'นาย',
    box_no: '',
    box_kb_no: '',
    serial_no: '',
    first_name: '',
    last_name: '',
    grade: 'ม.4',
    room: '1',
    academic_year: config.current_academic_year
  });

  const [csvFile, setCsvFile] = useState(null);
  const [csvParsed, setCsvParsed] = useState([]);
  const [csvTargetYear, setCsvTargetYear] = useState(config.current_academic_year);
  const [importStatus, setImportStatus] = useState(null);

  const [newYearInput, setNewYearInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  const [roomPins, setRoomPins] = useState({});

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const list = await deviceService.getAllDevices();
      setDevices(list);

      const pins = await deviceService.getRoomPins();
      setRoomPins(pins);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, config.current_academic_year]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginErr("");
    const res = await loginAdmin(passwordInput);
    if (!res.success) {
      setLoginErr(res.message);
    } else {
      setPasswordInput("");
    }
  };

  const handleDeviceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await deviceService.updateDevice(editingId, formData);
        alert("อัปเดตข้อมูลสำเร็จ!");
      } else {
        await deviceService.addDevice(formData);
        alert("เพิ่มข้อมูลอุปกรณ์สำเร็จ!");
      }
      setShowFormModal(false);
      resetForm();
      await loadAdminData();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      type: 'student',
      prefix: 'นาย',
      box_no: '',
      box_kb_no: '',
      serial_no: '',
      first_name: '',
      last_name: '',
      grade: 'ม.4',
      room: '1',
      academic_year: config.current_academic_year
    });
  };

  const handleEdit = (dev) => {
    setEditingId(dev.id);
    setFormData({
      type: dev.type || 'student',
      prefix: dev.prefix || 'นาย',
      box_no: dev.box_no || '',
      box_kb_no: dev.box_kb_no || '',
      serial_no: dev.serial_no || '',
      first_name: dev.first_name || '',
      last_name: dev.last_name || '',
      grade: dev.grade || 'ม.4',
      room: dev.room || '1',
      academic_year: dev.academic_year || config.current_academic_year
    });
    setShowFormModal(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`ยืนยันการลบข้อมูลอุปกรณ์ของ ${name}?`)) {
      await deviceService.deleteDevice(id);
      await loadAdminData();
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm("⚠️ ยืนยันการลบข้อมูลตัวอย่างทั้งหมดออกจากระบบใช่หรือไม่?\n(ระบบจะเริ่มจากฐานข้อมูลว่างเปล่า พร้อมสำหรับนำเข้าข้อมูลจริง)")) {
      await deviceService.clearAllDevices();
      alert("ลบข้อมูลตัวอย่างทั้งหมดเรียบร้อยแล้ว!");
      await loadAdminData();
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvParsed(results.data);
      },
      error: (err) => {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: " + err.message);
      }
    });
  };

  const handleConfirmCsvImport = async () => {
    if (csvParsed.length === 0) return;
    setLoading(true);
    try {
      const res = await deviceService.importCSVDevices(csvParsed, csvTargetYear);
      setImportStatus(res);
      await loadAdminData();
    } catch (e) {
      alert("การนำเข้าข้อมูลล้มเหลว: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = 
`type,prefix,serial_no,first_name,last_name,grade,room,box_no,box_kb_no
student,นาย,R52T100001X,กิตติพงษ์,ใจดี,ม.4,1,BOX-STU-001,KB-STU-001
student,นางสาว,R52T100002X,ชลธิชา,มีสุข,ม.4,2,BOX-STU-002,KB-STU-002
teacher,นาย,R52T200001X,สมชาย,วิชาการ,ครู,-,BOX-TCH-001,KB-TCH-001`;
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_tablet_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMsg("");
    let years = [...(config.academic_years || ["2569"])];

    if (newYearInput && !years.includes(newYearInput.trim())) {
      years.push(newYearInput.trim());
      years.sort();
    }

    await updateGlobalSettings({
      academicYearsList: years,
      adminPassword: newPassInput ? newPassInput.trim() : config.admin_password
    });

    setSettingsMsg("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!");
    setNewYearInput("");
    setNewPassInput("");
    setTimeout(() => setSettingsMsg(""), 3000);
  };

  const handlePinChange = async (roomKey, pinValue) => {
    const updatedPins = await deviceService.updateRoomPin(roomKey, pinValue);
    setRoomPins({ ...updatedPins });
  };

  const filteredDevices = devices.filter(d => {
    if (filterType !== "ทั้งหมด" && d.type !== filterType) return false;
    if (filterGrade !== "ทั้งหมด" && d.grade !== filterGrade) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.serial_no.toLowerCase().includes(q) ||
        (d.prefix && d.prefix.toLowerCase().includes(q)) ||
        d.first_name.toLowerCase().includes(q) ||
        d.last_name.toLowerCase().includes(q) ||
        d.box_no.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="modern-glass-card rounded-3xl p-8 border border-white/80 shadow-xl max-w-md mx-auto space-y-6 animate-fade-in my-12">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-extrabold font-prompt text-slate-900">
            เข้าสู่ระบบหลังบ้าน (Admin)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            โรงเรียนหนองวัวซอพิทยาคม • จัดการข้อมูลและสิทธิ์
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="กรอกรหัสผ่าน Admin..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                required
              />
            </div>
          </div>

          {loginErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
              {loginErr}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-amber-400/30 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>เข้าสู่ระบบหลังบ้าน</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ผู้ดูแลระบบ (Admin) • ระบบหลังบ้าน</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            จัดการข้อมูล Tablet และสิทธิ์การใช้งาน
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            โรงเรียนหนองวัวซอพิทยาคม • ม.4 - ม.6 (ห้อง 1 - 4) และ ครูผู้สอน (ปี {config.current_academic_year})
          </p>
        </div>

        <button
          onClick={logoutAdmin}
          className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-rose-600 text-white border border-white/20 rounded-2xl text-xs font-extrabold transition-colors shadow-xs flex items-center space-x-2"
        >
          <Lock className="w-4 h-4" />
          <span>ออกจากระบบหลังบ้าน</span>
        </button>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminSubTab('devices')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'devices'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tablet className="w-4 h-4" />
          <span>รายการอุปกรณ์ ({devices.length})</span>
        </button>

        <button
          onClick={() => setAdminSubTab('csv')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'csv'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>นำเข้าข้อมูล (CSV)</span>
        </button>

        <button
          onClick={() => setAdminSubTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'settings'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>ตั้งค่าปีการศึกษา & รอบการตรวจ</span>
        </button>

        <button
          onClick={() => setAdminSubTab('pins')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'pins'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>ตั้งค่า PIN ประจำห้องครู (13 ห้อง)</span>
        </button>
      </div>

      {/* --- SUB TAB 1: DEVICE LIST & SINGLE ADD --- */}
      {adminSubTab === 'devices' && (
        <div className="space-y-4">
          
          <div className="modern-glass p-4 rounded-3xl border border-white/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้น Serial No., ชื่อ, เลข BOX..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
                <option value="student">นักเรียน</option>
                <option value="teacher">ครูผู้สอน</option>
              </select>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ระดับชั้น: ทั้งหมด (ม.4-ม.6)</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
                <option value="ครู">ครู</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-auto">
              <button
                onClick={handleClearAllData}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl text-xs transition-colors flex items-center space-x-1.5"
                title="ลบข้อมูลตัวอย่างทั้งหมด"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>ลบข้อมูลตัวอย่างทั้งหมด</span>
              </button>

              <button
                onClick={() => { resetForm(); setShowFormModal(true); }}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-amber-400/20 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอุปกรณ์ทีละเครื่อง</span>
              </button>
            </div>

          </div>

          <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-800 uppercase text-xs border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-5 py-4">1. ประเภท</th>
                    <th className="px-5 py-4 text-blue-700 font-extrabold text-xs">2. Serial No. (สำคัญที่สุด)</th>
                    <th className="px-5 py-4 text-slate-900 font-extrabold text-xs">3. ชื่อ - นามสกุล (สำคัญที่สุด)</th>
                    <th className="px-5 py-4">4. ระดับชั้น / ห้อง</th>
                    <th className="px-5 py-4">5. เลข BOX</th>
                    <th className="px-5 py-4">6. เลข BOX KB</th>
                    <th className="px-5 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                        ไม่พบข้อมูลอุปกรณ์ในระบบ (สามารถกด "นำเข้าข้อมูล (CSV)" หรือ "เพิ่มอุปกรณ์ทีละเครื่อง" ได้)
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            dev.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-extrabold text-blue-700 text-base">
                          {dev.serial_no}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900 font-prompt text-base">
                          {dev.prefix || ''} {dev.first_name} {dev.last_name}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-slate-800">
                          {dev.type === 'teacher' ? 'ครูผู้สอน' : `${dev.grade}/${dev.room}`}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_no}</td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_kb_no}</td>

                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(dev)}
                            className="p-2 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-xl text-xs transition-colors"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dev.id, `${dev.prefix || ''} ${dev.first_name} ${dev.last_name}`)}
                            className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 rounded-xl text-xs transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* --- SUB TAB 2: CSV BATCH IMPORT --- */}
      {adminSubTab === 'csv' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold font-prompt text-slate-900">
                นำเข้าข้อมูลอุปกรณ์และผู้ครอบครองจำนวนมาก (CSV Import)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                รองรับการนำเข้าข้อมูลนักเรียน ม.4 - ม.6 (ห้อง 1-4) และ ครูผู้สอน (รองรับคอลัมน์ prefix: นาย, นางสาว, นาง)
              </p>
            </div>

            <button
              onClick={downloadSampleCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง CSV</span>
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-3xl p-8 text-center bg-white/70 transition-colors">
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-extrabold text-slate-900 text-sm">เลือกไฟล์ CSV เพื่อนำเข้าข้อมูล</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">รองรับไฟล์รูปแบบ .csv เท่านั้น</p>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer shadow-md shadow-blue-600/30 transition-all inline-flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เลือกไฟล์จากเครื่อง...</span>
            </label>
          </div>

          {csvParsed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  ตัวอย่างข้อมูลที่พบในไฟล์ ({csvParsed.length} แถว)
                </span>

                <button
                  onClick={handleConfirmCsvImport}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/30 flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'กำลังบันทึก...' : 'ยืนยันนำเข้าข้อมูลลงฐานข้อมูล'}</span>
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left text-xs font-sarabun text-slate-700">
                  <thead className="bg-slate-50 sticky top-0 font-bold text-slate-900">
                    <tr>
                      <th className="p-2.5 border-b">#</th>
                      <th className="p-2.5 border-b">1. Type</th>
                      <th className="p-2.5 border-b text-blue-700 font-extrabold">2. Serial No.</th>
                      <th className="p-2.5 border-b text-slate-900 font-extrabold">3. ชื่อ - นามสกุล</th>
                      <th className="p-2.5 border-b">4. ชั้น/ห้อง</th>
                      <th className="p-2.5 border-b">5. BOX No</th>
                      <th className="p-2.5 border-b">6. BOX KB No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvParsed.slice(0, 50).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold">{row.type || 'student'}</td>
                        <td className="p-2.5 font-mono font-extrabold text-blue-700 text-sm">{row.serial_no}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.prefix || ''} {row.first_name} {row.last_name}</td>
                        <td className="p-2.5 font-semibold">{row.grade}/{row.room}</td>
                        <td className="p-2.5 font-mono">{row.box_no}</td>
                        <td className="p-2.5 font-mono">{row.box_kb_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUB TAB 3: SETTINGS --- */}
      {adminSubTab === 'settings' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm max-w-2xl space-y-6">
          <h3 className="text-lg font-bold font-prompt text-slate-900 pb-3 border-b border-slate-200/60">
            ตั้งค่าปีการศึกษา รอบการตรวจ และรหัสผ่าน Admin
          </h3>

          {settingsMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold border border-emerald-200">
              {settingsMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-5 text-sm font-sarabun">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ปีการศึกษาปัจจุบันในระบบ:
              </label>
              <select
                value={config.current_academic_year}
                onChange={(e) => updateGlobalSettings({ academicYear: e.target.value })}
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(config.academic_years || ["2569"]).map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา พ.ศ. {yr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กำหนดรอบการตรวจปัจจุบัน (รอบ 1 - 5):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateGlobalSettings({ round: r })}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                      Number(config.current_round) === r
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    รอบที่ {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เพิ่มปีการศึกษาใหม่ (เช่น 2570, 2571):
              </label>
              <input
                type="text"
                placeholder="กรอกปีการศึกษา พ.ศ. เช่น 2570"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เปลี่ยนรหัสผ่าน Admin:
              </label>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านใหม่หากต้องการเปลี่ยน..."
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-blue-600/30 transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </form>
        </div>
      )}

      {/* --- SUB TAB 4: ROOM PINS --- */}
      {adminSubTab === 'pins' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold font-prompt text-slate-900">
              กำหนดรหัส PIN ประจำห้องสำหรับครูที่ปรึกษา (13 ห้อง: ม.4/1 - ม.6/4 & ครู)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ครูที่ปรึกษาแต่ละห้องจะใช้ PIN นี้เพื่อเข้าทำการตรวจเช็คอุปกรณ์ของห้องตนเอง
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(roomPins).map((roomKey) => (
              <div key={roomKey} className="p-4 bg-white/90 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="font-extrabold text-slate-900 text-sm block">
                  ห้อง {roomKey}
                </span>
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <input
                    type="text"
                    value={roomPins[roomKey]}
                    onChange={(e) => handlePinChange(roomKey, e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-extrabold text-blue-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SINGLE DEVICE ADD/EDIT MODAL --- */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modern-glass bg-white/95 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in border border-white">
            <h3 className="text-lg font-bold font-prompt text-slate-900 pb-2 border-b border-slate-100">
              {editingId ? 'แก้ไขข้อมูลอุปกรณ์' : 'เพิ่มข้อมูลอุปกรณ์ใหม่'}
            </h3>

            <form onSubmit={handleDeviceSubmit} className="space-y-4 text-xs font-sarabun">
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. ประเภทผู้ถือครอง:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'student'}
                      onChange={() => setFormData({ ...formData, type: 'student', grade: 'ม.4', room: '1' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">นักเรียน</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'teacher'}
                      onChange={() => setFormData({ ...formData, type: 'teacher', grade: 'ครู', room: '-' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">ครูผู้สอน</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-blue-700 mb-1">2. Serial No. (สำคัญที่สุด):</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น R52T100001X"
                  value={formData.serial_no}
                  onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                  className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-mono font-extrabold text-blue-900 text-sm uppercase"
                />
              </div>

              {/* Title Prefix Dropdown & First / Last Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.1 คำนำหน้า:</label>
                  <select
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="นาง">นาง</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.2 ชื่อ:</label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อผู้ครอบครอง"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.3 นามสกุล:</label>
                  <input
                    type="text"
                    required
                    placeholder="นามสกุล"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {formData.type === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.1 ระดับชั้น:</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="ม.4">ม.4</option>
                      <option value="ม.5">ม.5</option>
                      <option value="ม.6">ม.6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.2 ห้อง:</label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="1">ห้อง 1</option>
                      <option value="2">ห้อง 2</option>
                      <option value="3">ห้อง 3</option>
                      <option value="4">ห้อง 4</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">5. เลข BOX:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น BOX-STU-001"
                    value={formData.box_no}
                    onChange={(e) => setFormData({ ...formData, box_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">6. เลข BOX KB:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น KB-STU-001"
                    value={formData.box_kb_no}
                    onChange={(e) => setFormData({ ...formData, box_kb_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold shadow-md shadow-amber-400/30"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
